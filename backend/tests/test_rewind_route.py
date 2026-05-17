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
from agent import DEFAULT_MAX_QUESTIONS, build_question_metadata, graph  # noqa: E402
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
            "max_questions": DEFAULT_MAX_QUESTIONS,
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
    assert data["max_questions"] == DEFAULT_MAX_QUESTIONS
    assert data["questionNumber"] == 1
    assert data["sessionId"] == "cs_fundamentals"
    assert data["sessionQuestionIndex"] == 1
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
            "max_questions": DEFAULT_MAX_QUESTIONS,
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
    assert data["max_questions"] == DEFAULT_MAX_QUESTIONS
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
            "max_questions": DEFAULT_MAX_QUESTIONS,
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


def test_rewind_route_recovers_sync_chat_q2_interrupt_snapshot(monkeypatch):
    class FakeLLM:
        def invoke(self, messages, **_kwargs):
            prompt = messages[0].content
            if "Q3/20" in prompt:
                return SimpleNamespace(content="Q3")
            if "Q2/20" in prompt:
                return SimpleNamespace(content="Q2")
            return SimpleNamespace(content="Q1")

    class FakeEvalLLM:
        def invoke(self, *_args, **_kwargs):
            return SimpleNamespace(content='{"score": 6, "feedback": "ok"}')

    monkeypatch.setattr(agent, "llm", FakeLLM())
    monkeypatch.setattr(agent, "eval_llm", FakeEvalLLM())

    client = TestClient(app)
    thread_id = f"rewind-route-{uuid4()}"

    initial = client.post(
        "/api/chat",
        json={
            "thread_id": thread_id,
            "resume_summary": {},
        },
    )
    assert initial.status_code == 200
    assert initial.json()["question"] == "Q1"

    q2 = client.post(
        "/api/chat",
        json={
            "thread_id": thread_id,
            "user_answer": "A1",
        },
    )
    assert q2.status_code == 200
    assert q2.json()["question"] == "Q2"

    q3 = client.post(
        "/api/chat",
        json={
            "thread_id": thread_id,
            "user_answer": "A2",
        },
    )
    assert q3.status_code == 200
    assert q3.json()["question"] == "Q3"

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
    assert data["sessionId"] == "cs_fundamentals"
    assert data["sessionQuestionIndex"] == 2
    assert len(data["evaluations"]) == 1
    assert data["evaluations"][0]["questionNumber"] == 1
    assert data["messages"][-1] == {"role": "ai", "content": "Q2"}


def test_rewind_route_to_q6_keeps_completed_cs_session_metadata():
    client = TestClient(app)
    thread_id = f"rewind-route-{uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}

    evaluations = []
    messages = []
    for question_number in range(1, 8):
        if question_number > 1:
            previous = question_number - 1
            evaluations.append(
                {
                    "question": f"Q{previous}",
                    "answer": f"A{previous}",
                    "score": 6,
                    "feedback": "ok",
                    **build_question_metadata(previous),
                }
            )
            messages.append(HumanMessage(content=f"A{previous}"))

        messages.append(AIMessage(content=f"Q{question_number}"))
        graph.update_state(
            config,
            {
                "resume_summary": {},
                "messages": list(messages),
                "question_count": question_number,
                "max_questions": DEFAULT_MAX_QUESTIONS,
                "evaluations": list(evaluations),
                "final_report": None,
            },
        )

    response = client.post(
        "/api/interview/rewind",
        json={
            "thread_id": thread_id,
            "target_question_index": 6,
            "source": "page4",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["question"] == "Q6"
    assert data["question_count"] == 6
    assert data["max_questions"] == DEFAULT_MAX_QUESTIONS
    assert data["sessionId"] == "framework_usage"
    assert data["sessionQuestionIndex"] == 1
    assert len(data["evaluations"]) == 5
    assert {ev["sessionId"] for ev in data["evaluations"]} == {"cs_fundamentals"}


def test_rewind_route_guards_stored_readiness_handoff_question():
    client = TestClient(app)
    thread_id = f"rewind-route-{uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}

    prior_evaluations = [
        {
            "question": f"Q{i}",
            "answer": f"A{i}",
            "score": 6,
            "feedback": "ok",
            **build_question_metadata(i),
        }
        for i in range(1, 5)
    ]
    bad_q5 = (
        "이제 CS Fundamentals 세션은 마무리되었습니다. "
        "다음 세션에서는 다른 기술적 주제에 대해 질문을 드리도록 하겠습니다. "
        "준비가 되셨다면 알려주세요."
    )

    graph.update_state(
        config,
        {
            "resume_summary": {},
            "messages": [AIMessage(content=bad_q5)],
            "question_count": 5,
            "max_questions": DEFAULT_MAX_QUESTIONS,
            "evaluations": prior_evaluations,
            "final_report": None,
        },
    )

    graph.update_state(
        config,
        {
            "messages": [HumanMessage(content="준비됐어요"), AIMessage(content="Q6")],
            "question_count": 6,
            "max_questions": DEFAULT_MAX_QUESTIONS,
            "evaluations": [
                *prior_evaluations,
                {
                    "question": bad_q5,
                    "answer": "준비됐어요",
                    "score": 1,
                    "feedback": "기술 답변이 아닙니다.",
                    **build_question_metadata(5),
                },
            ],
            "final_report": None,
        },
    )

    response = client.post(
        "/api/interview/rewind",
        json={
            "thread_id": thread_id,
            "target_question_index": 5,
            "source": "page3",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["question_count"] == 5
    assert data["sessionId"] == "cs_fundamentals"
    assert data["sessionQuestionIndex"] == 5
    assert "CS Fundamentals" not in data["question"]
    assert "세션 질문" not in data["question"]
    assert "준비" not in data["question"]
    assert "알려주세요" not in data["question"]
    assert "설명해 주세요" in data["question"]
    assert data["messages"][-1]["content"] == data["question"]
