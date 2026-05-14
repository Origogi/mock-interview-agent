import sys
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import agent  # noqa: E402
from agent import graph  # noqa: E402
from main import app  # noqa: E402


def test_rewind_route_restores_answer_before_snapshot_without_llm():
    client = TestClient(app)
    thread_id = f"rewind-route-{uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}

    graph.update_state(
        config,
        {
            "resume_summary": {},
            "messages": [AIMessage(content="Q1")],
            "question_count": 1,
            "max_questions": 5,
            "evaluations": [],
            "final_report": None,
        },
    )
    graph.update_state(
        config,
        {
            "messages": [HumanMessage(content="A1"), AIMessage(content="Q2")],
            "question_count": 2,
            "evaluations": [
                {
                    "question": "Q1",
                    "answer": "A1",
                    "score": 6,
                    "feedback": "ok",
                }
            ],
            "final_report": None,
        },
    )

    response = client.post(
        "/api/interview/rewind",
        json={
            "thread_id": thread_id,
            "target_question_index": 1,
            "source": "page3",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["thread_id"] == thread_id
    assert data["question"] == "Q1"
    assert data["question_count"] == 1
    assert data["evaluations"] == []
    assert data["final_report"] is None
    assert data["is_finished"] is False
    assert data["invalidated_from"] == 1
    assert data["messages"] == [{"role": "ai", "content": "Q1"}]


def test_rewind_route_to_q2_keeps_only_prior_answer_and_question():
    client = TestClient(app)
    thread_id = f"rewind-route-{uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}
    q1_eval = {
        "question": "Q1",
        "answer": "A1",
        "score": 6,
        "feedback": "q1 ok",
    }
    q2_eval = {
        "question": "Q2",
        "answer": "A2",
        "score": 7,
        "feedback": "q2 ok",
    }

    graph.update_state(
        config,
        {
            "resume_summary": {},
            "messages": [AIMessage(content="Q1")],
            "question_count": 1,
            "max_questions": 5,
            "evaluations": [],
            "final_report": None,
        },
    )
    graph.update_state(
        config,
        {
            "messages": [HumanMessage(content="A1"), AIMessage(content="Q2")],
            "question_count": 2,
            "evaluations": [q1_eval],
            "final_report": None,
        },
    )
    graph.update_state(
        config,
        {
            "messages": [HumanMessage(content="A2"), AIMessage(content="Q3")],
            "question_count": 3,
            "evaluations": [q1_eval, q2_eval],
            "final_report": None,
        },
    )

    response = client.post(
        "/api/interview/rewind",
        json={
            "thread_id": thread_id,
            "target_question_index": 2,
            "source": "page3",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["question"] == "Q2"
    assert data["question_count"] == 2
    assert data["evaluations"] == [q1_eval]
    assert data["invalidated_from"] == 2
    assert data["messages"] == [
        {"role": "ai", "content": "Q1"},
        {"role": "user", "content": "A1"},
        {"role": "ai", "content": "Q2"},
    ]


def test_chat_initial_question_creates_q1_rewind_checkpoint(monkeypatch):
    class FakeLLM:
        def invoke(self, *_args, **_kwargs):
            return SimpleNamespace(content="Q1")

    monkeypatch.setattr(agent, "llm", FakeLLM())

    client = TestClient(app)
    thread_id = f"rewind-route-{uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}
    q1_eval = {
        "question": "Q1",
        "answer": "A1",
        "score": 6,
        "feedback": "q1 ok",
    }

    initial = client.post(
        "/api/chat",
        json={
            "thread_id": thread_id,
            "resume_summary": {},
        },
    )

    assert initial.status_code == 200
    assert initial.json()["question"] == "Q1"

    graph.update_state(
        config,
        {
            "messages": [HumanMessage(content="A1"), AIMessage(content="Q2")],
            "question_count": 2,
            "evaluations": [q1_eval],
            "final_report": None,
        },
    )

    response = client.post(
        "/api/interview/rewind",
        json={
            "thread_id": thread_id,
            "target_question_index": 1,
            "source": "page3",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["question"] == "Q1"
    assert data["question_count"] == 1
    assert data["evaluations"] == []
    assert data["messages"] == [{"role": "ai", "content": "Q1"}]


def test_rewind_route_recovers_legacy_q1_interrupt_snapshot(monkeypatch):
    class FakeLLM:
        def invoke(self, *_args, **_kwargs):
            return SimpleNamespace(content="Q1")

    monkeypatch.setattr(agent, "llm", FakeLLM())

    client = TestClient(app)
    thread_id = f"rewind-route-{uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}
    q1_eval = {
        "question": "",
        "answer": "A1",
        "score": 6,
        "feedback": "q1 ok",
    }

    # Legacy shape: `/api/chat` exposed Q1 as interrupt but did not persist it
    # in messages. The subsequent streaming turn then produced A1/Q2 only.
    graph.invoke(
        {
            "resume_summary": {},
            "messages": [],
            "question_count": 0,
            "max_questions": 5,
            "evaluations": [],
            "final_report": None,
        },
        config,
    )
    graph.update_state(
        config,
        {
            "messages": [HumanMessage(content="A1"), AIMessage(content="Q2")],
            "question_count": 1,
            "evaluations": [q1_eval],
            "final_report": None,
        },
    )

    response = client.post(
        "/api/interview/rewind",
        json={
            "thread_id": thread_id,
            "target_question_index": 1,
            "source": "page3",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["question"] == "Q1"
    assert data["question_count"] == 1
    assert data["evaluations"] == []
    assert data["messages"] == [{"role": "ai", "content": "Q1"}]
