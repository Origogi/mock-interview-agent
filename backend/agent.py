from typing import TypedDict, List, Dict, Annotated, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from dotenv import load_dotenv
import json
import os

load_dotenv()


# ─────────────────────────────────────────
# State
# ─────────────────────────────────────────
class InterviewState(TypedDict):
    resume_summary: Dict                      # 이력서 파싱 데이터
    messages: Annotated[list, add_messages]   # 채팅 기록
    question_count: int                       # 진행된 질문 수
    max_questions: int                        # 최대 질문 수
    evaluations: List[Dict]                   # 턴별 평가 결과
    final_report: Optional[Dict]              # 최종 리포트


# ─────────────────────────────────────────
# LLM
# ─────────────────────────────────────────
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
eval_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)


# ─────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────
INTERVIEWER_SYSTEM = """당신은 10년 차 시니어 개발자이자 엄격하지만 합리적인 기술 면접관입니다.
지원자의 이력서와 이전 답변을 기반으로 실무 역량을 검증해야 합니다.

[지원자 이력서 요약]
{resume_summary}

[이전 평가 내역]
{evaluations}

[원칙]
1. 단순 개념 질문보다 경험 기반 질문을 하세요 (예: "왜 X 대신 Y를 선택하셨나요?").
2. 한 번에 하나의 질문만 하세요.
3. 이전 답변이 있다면 꼬리 질문을 우선하세요.
4. 반드시 한국어로 질문하세요."""

EVALUATOR_SYSTEM = """지원자의 답변을 평가하세요.

질문: {question}
답변: {answer}

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{{"score": <1~10 정수>, "feedback": "<구체적인 피드백>"}}"""

REPORT_SYSTEM = """면접 평가 내역을 바탕으로 종합 리포트를 생성하세요.

평가 내역:
{evaluations}

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{{"scores": {{"cs_fundamentals": <0-100>, "framework_usage": <0-100>, "problem_solving": <0-100>, "communication": <0-100>}}, "feedback": {{"strengths": "<강점>", "weaknesses": "<약점>", "improvements": ["<개선점1>", "<개선점2>"]}}}}"""


# ─────────────────────────────────────────
# Nodes
# ─────────────────────────────────────────
def interviewer_node(state: InterviewState) -> dict:
    """면접관: 다음 질문 생성 후 Interrupt로 프론트엔드 대기"""
    resume_str = json.dumps(state["resume_summary"], ensure_ascii=False, indent=2)
    evals_str = (
        json.dumps(state.get("evaluations", []), ensure_ascii=False, indent=2)
        if state.get("evaluations")
        else "없음 (첫 번째 질문)"
    )
    system = INTERVIEWER_SYSTEM.format(resume_summary=resume_str, evaluations=evals_str)
    response = llm.invoke([SystemMessage(content=system)] + state.get("messages", []))

    question = response.content
    user_answer = interrupt(question)  # ⏸️ 프론트엔드 대기

    return {
        "messages": [AIMessage(content=question), HumanMessage(content=user_answer)],
        "question_count": state.get("question_count", 0) + 1,
    }


def evaluator_node(state: InterviewState) -> dict:
    """평가자: 마지막 답변을 평가하고 evaluations에 누적"""
    messages = state.get("messages", [])

    last_question, last_answer = "", ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) and not last_answer:
            last_answer = msg.content
        elif isinstance(msg, AIMessage) and not last_question:
            last_question = msg.content
            break

    prompt = EVALUATOR_SYSTEM.format(question=last_question, answer=last_answer)
    response = eval_llm.invoke([HumanMessage(content=prompt)])

    try:
        evaluation = json.loads(response.content)
    except json.JSONDecodeError:
        evaluation = {"score": 5, "feedback": response.content}

    evaluation["question"] = last_question
    evaluation["answer"] = last_answer

    return {"evaluations": state.get("evaluations", []) + [evaluation]}


def report_node(state: InterviewState) -> dict:
    """리포트 생성기: 누적 평가를 종합하여 최종 리포트 생성"""
    evals_str = json.dumps(state.get("evaluations", []), ensure_ascii=False, indent=2)
    prompt = REPORT_SYSTEM.format(evaluations=evals_str)
    response = eval_llm.invoke([HumanMessage(content=prompt)])

    try:
        final_report = json.loads(response.content)
    except json.JSONDecodeError:
        final_report = {"raw": response.content}

    return {"final_report": final_report}


def should_continue(state: InterviewState) -> str:
    """질문 횟수 기반 라우팅"""
    if state.get("question_count", 0) >= state.get("max_questions", 5):
        return "report"
    return "interviewer"


# ─────────────────────────────────────────
# Graph Build
# ─────────────────────────────────────────
memory = MemorySaver()

builder = StateGraph(InterviewState)
builder.add_node("interviewer", interviewer_node)
builder.add_node("evaluator", evaluator_node)
builder.add_node("report", report_node)

builder.add_edge(START, "interviewer")
builder.add_edge("interviewer", "evaluator")
builder.add_conditional_edges(
    "evaluator",
    should_continue,
    {"interviewer": "interviewer", "report": "report"},
)
builder.add_edge("report", END)

graph = builder.compile(checkpointer=memory)
