import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from langchain_core.messages import AIMessage, HumanMessage


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import agent  # noqa: E402
from agent import (  # noqa: E402
    DEFAULT_MAX_QUESTIONS,
    build_question_metadata,
    build_session_summaries,
    ensure_technical_interview_question,
    evaluator_node,
    fallback_interview_question,
    format_interviewer_system,
    has_forbidden_handoff,
    is_session_transition_question,
    report_node,
    should_continue,
    window_interviewer_evaluations,
    window_interviewer_messages,
)


SESSION_LABELS = ("CS Fundamentals", "Framework Usage", "Problem Solving", "Communication")


def assert_no_session_intro(text: str):
    assert "세션 질문입니다" not in text
    assert "세션으로" not in text
    assert "다음 세션" not in text
    for label in SESSION_LABELS:
        assert label not in text


def test_question_metadata_maps_fixed_four_sessions():
    assert DEFAULT_MAX_QUESTIONS == 20

    q1 = build_question_metadata(1)
    assert q1 == {
        "questionNumber": 1,
        "sessionId": "cs_fundamentals",
        "sessionLabel": "CS Fundamentals",
        "sessionIndex": 1,
        "sessionQuestionIndex": 1,
        "sessionTotalQuestions": 5,
        "sessionGoal": q1["sessionGoal"],
    }
    assert "CS 기반" in q1["sessionGoal"]

    q6 = build_question_metadata(6)
    assert q6["sessionId"] == "framework_usage"
    assert q6["sessionLabel"] == "Framework Usage"
    assert q6["sessionIndex"] == 2
    assert q6["sessionQuestionIndex"] == 1

    q20 = build_question_metadata(20)
    assert q20["sessionId"] == "communication"
    assert q20["sessionIndex"] == 4
    assert q20["sessionQuestionIndex"] == 5


def test_interviewer_prompt_includes_current_session_context():
    system = format_interviewer_system(
        resume_summary={"tech_stack": ["FastAPI"]},
        evaluations=[{"score": 7, **build_question_metadata(i)} for i in range(1, 6)],
        question_number=6,
    )

    assert "Q6/20" in system
    assert "Framework Usage" in system
    assert "framework_usage" in system
    assert "1/5" in system
    assert "세션 순서는 고정" in system


def test_interviewer_context_window_keeps_recent_five_evaluations_and_qa_pairs():
    evaluations = [
        {"question": f"Q{i}", "answer": f"A{i}", "score": 6, **build_question_metadata(i)}
        for i in range(1, 9)
    ]
    messages = []
    for i in range(1, 9):
        messages.extend([AIMessage(content=f"Q{i}"), HumanMessage(content=f"A{i}")])

    windowed_evaluations = window_interviewer_evaluations(evaluations)
    windowed_messages = window_interviewer_messages(messages)

    assert [item["questionNumber"] for item in windowed_evaluations] == [4, 5, 6, 7, 8]
    assert [message.content for message in windowed_messages] == [
        "Q4",
        "A4",
        "Q5",
        "A5",
        "Q6",
        "A6",
        "Q7",
        "A7",
        "Q8",
        "A8",
    ]
    assert len(evaluations) == 8
    assert len(messages) == 16


def test_interviewer_prompt_forbids_readiness_only_session_handoffs():
    system = format_interviewer_system(
        resume_summary={"tech_stack": ["PostgreSQL"]},
        evaluations=[{"score": 6, **build_question_metadata(i)} for i in range(1, 4)],
        question_number=5,
    )

    assert "Q5/20" in system
    assert "5/5" in system
    assert "진행 상태, 세션 종료, 남은 질문 수를 안내하지 말고" in system
    assert "Q6, Q11, Q16에서만 허용" in system
    assert 'Q2~Q5, Q7~Q10, Q12~Q15, Q17~Q20에서는 세션명, 세션 안내, "세션 질문입니다" 문구' in system
    assert "사용자의 준비 여부" in system
    assert "준비되셨다면 알려주세요" in system
    assert "응답은 반드시 평가 가능한 하나의 기술 면접 질문으로 끝나야 합니다" in system


def test_question_guard_replaces_session_handoff_with_technical_question_without_session_intro():
    bad_question = (
        "이제 CS Fundamentals 세션은 마무리되었습니다. "
        "다음 세션에서는 다른 기술적 주제에 대해 질문을 드리도록 하겠습니다. "
        "준비가 되셨다면 알려주세요."
    )

    guarded = ensure_technical_interview_question(bad_question, 5)

    assert has_forbidden_handoff(bad_question) is True
    assert guarded != bad_question
    assert guarded.startswith("Q5.")
    assert_no_session_intro(guarded)
    assert "준비" not in guarded
    assert "알려주세요" not in guarded
    assert "설명해 주세요" in guarded


def test_q6_transition_intro_with_technical_question_is_allowed():
    question = (
        "이제 Framework Usage 세션으로 넘어가겠습니다. "
        "이력서에 나온 React 상태 관리 방식을 선택한 기준과 한계를 설명해 주세요."
    )

    guarded = ensure_technical_interview_question(question, 6)

    assert is_session_transition_question(6) is True
    assert guarded == question
    assert "Framework Usage 세션으로 넘어가겠습니다" in guarded
    assert "설명해 주세요" in guarded


def test_q8_mixed_session_intro_is_removed_but_question_is_preserved():
    mixed_question = (
        "Framework Usage 세션 질문입니다. "
        "이력서에 나온 React 상태 관리 방식을 선택한 기준과 한계를 설명해 주세요."
    )

    guarded = ensure_technical_interview_question(mixed_question, 8)

    assert guarded == "이력서에 나온 React 상태 관리 방식을 선택한 기준과 한계를 설명해 주세요."
    assert_no_session_intro(guarded)


def test_q8_handoff_only_fallback_has_no_session_label_prefix():
    guarded = ensure_technical_interview_question("Framework Usage 세션 질문입니다.", 8)

    assert guarded.startswith("Q8.")
    assert_no_session_intro(guarded)
    assert "이력서에 나온 프레임워크나 라이브러리" in guarded
    assert "설명해 주세요" in guarded


@pytest.mark.parametrize(
    ("question_number", "bad_question"),
    [
        (
            8,
            "Q8. Communication의 마지막 질문입니다. 개발 과정에서 마주한 기술적 한계를 어떻게 극복했는지 설명해 주세요.",
        ),
        (
            9,
            "이제 마지막 질문입니다. 프로젝트에서 어떤 기술적 실패를 경험했고 어떤 교훈을 얻었는지 설명해 주세요.",
        ),
    ],
)
def test_mid_interview_progress_phrases_fallback_to_plain_technical_question(question_number, bad_question):
    guarded = ensure_technical_interview_question(bad_question, question_number)

    assert guarded.startswith(f"Q{question_number}.")
    assert "마지막 질문" not in guarded
    assert "마지막 기술 질문" not in guarded
    assert "의 마지막" not in guarded
    assert_no_session_intro(guarded)
    assert "설명해 주세요" in guarded


@pytest.mark.parametrize("question_number", [5, 10, 15, 20])
def test_session_closing_questions_fallback_to_last_technical_question(question_number):
    closing = (
        "이번 세션은 마무리되었습니다. "
        "다음 세션에서 더 깊은 질문을 드리도록 하겠습니다."
    )

    guarded = ensure_technical_interview_question(closing, question_number)

    assert guarded.startswith(f"Q{question_number}.")
    assert_no_session_intro(guarded)
    assert "마무리" not in guarded
    assert "종료" not in guarded
    assert "설명해 주세요" in guarded


@pytest.mark.parametrize(
    "question_number",
    [1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20],
)
def test_non_transition_fallback_has_no_session_label_or_session_question_phrase(question_number):
    fallback = fallback_interview_question(question_number)

    assert fallback.startswith(f"Q{question_number}.")
    assert_no_session_intro(fallback)


def test_transition_fallback_allows_intro_and_technical_question():
    fallback = fallback_interview_question(6)

    assert fallback.startswith("Q6. 이제 Framework Usage 세션으로 넘어가겠습니다.")
    assert "세션 질문입니다" not in fallback
    assert "이력서에 나온 프레임워크나 라이브러리" in fallback
    assert "설명해 주세요" in fallback


def test_evaluator_node_adds_session_metadata(monkeypatch):
    class FakeEvalLLM:
        def invoke(self, *_args, **_kwargs):
            return SimpleNamespace(content='{"score": 8, "feedback": "구체적입니다."}')

    monkeypatch.setattr(agent, "eval_llm", FakeEvalLLM())

    existing_evaluations = [
        {"question": f"Q{i}", "answer": f"A{i}", "score": 6, **build_question_metadata(i)}
        for i in range(1, 6)
    ]
    result = evaluator_node(
        {
            "resume_summary": {},
            "messages": [
                AIMessage(content="Q6"),
                HumanMessage(content="A6"),
            ],
            "question_count": 6,
            "max_questions": DEFAULT_MAX_QUESTIONS,
            "evaluations": existing_evaluations,
            "final_report": None,
        }
    )

    evaluation = result["evaluations"][-1]
    assert evaluation["score"] == 8
    assert evaluation["questionNumber"] == 6
    assert evaluation["sessionId"] == "framework_usage"
    assert evaluation["sessionLabel"] == "Framework Usage"
    assert evaluation["sessionIndex"] == 2
    assert evaluation["sessionQuestionIndex"] == 1
    assert evaluation["sessionTotalQuestions"] == 5


def test_report_node_scores_only_completed_sessions(monkeypatch):
    class FakeEvalLLM:
        def invoke(self, *_args, **_kwargs):
            return SimpleNamespace(
                content=json.dumps(
                    {
                        "scores": {
                            "cs_fundamentals": 99,
                            "framework_usage": 99,
                            "problem_solving": 99,
                            "communication": 99,
                        },
                        "feedback": {
                            "strengths": "강점",
                            "weaknesses": "약점",
                            "improvements": ["개선"],
                        },
                    },
                    ensure_ascii=False,
                )
            )

    monkeypatch.setattr(agent, "eval_llm", FakeEvalLLM())

    evaluations = [
        {"question": f"Q{i}", "answer": f"A{i}", "score": score, **build_question_metadata(i)}
        for i, score in enumerate([6, 7, 8, 9, 10, 9], start=1)
    ]
    report = report_node(
        {
            "resume_summary": {},
            "messages": [],
            "question_count": 6,
            "max_questions": DEFAULT_MAX_QUESTIONS,
            "evaluations": evaluations,
            "final_report": None,
            "is_early_terminated": True,
        }
    )["final_report"]

    assert report["scores"] == {
        "cs_fundamentals": 80,
        "framework_usage": None,
        "problem_solving": None,
        "communication": None,
    }
    assert report["answered_count"] == 6
    assert report["max_questions"] == DEFAULT_MAX_QUESTIONS
    assert report["is_partial"] is True
    assert report["session_summaries"][0]["status"] == "completed"
    assert report["session_summaries"][1]["status"] == "insufficient_evidence"
    assert report["session_summaries"][1]["answeredCount"] == 1


def test_build_session_summaries_uses_position_for_legacy_evaluations():
    summaries = build_session_summaries(
        [{"score": score, "feedback": "legacy"} for score in [5, 5, 5, 5, 5]]
    )

    assert summaries[0]["sessionId"] == "cs_fundamentals"
    assert summaries[0]["score"] == 50
    assert summaries[0]["status"] == "completed"
    assert summaries[1]["score"] is None


def test_should_continue_routes_after_twenty_valid_evaluations():
    nineteen = [{"score": 5} for _ in range(19)]
    twenty = [{"score": 5} for _ in range(20)]

    assert should_continue({"evaluations": nineteen}) == "interviewer"
    assert should_continue({"evaluations": twenty}) == "report"
