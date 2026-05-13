from typing import TypedDict, List, Dict, Annotated, Optional, NotRequired
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from dotenv import load_dotenv
from tools import extract_resume_text
import json
import os
import operator

load_dotenv()


# ─────────────────────────────────────────
# State
# ─────────────────────────────────────────
class InterviewState(TypedDict):
    resume_file_path: NotRequired[str]        # 입력 PDF 경로 (Node 1 입력 전용)
    resume_summary: Dict                      # 이력서 파싱 데이터
    messages: Annotated[list, add_messages]   # 채팅 기록
    question_count: int                       # 진행된 질문 수
    max_questions: int                        # 최대 질문 수
    evaluations: Annotated[List[Dict], operator.add]  # 턴별 평가 결과 (누적)
    final_report: Optional[Dict]              # 최종 리포트
    is_early_terminated: NotRequired[bool]    # 조기 종료 플래그 (Should-S8)
    answered_count: NotRequired[int]          # 편의 캐시 (len(evaluations) 동치)


# ─────────────────────────────────────────
# LLM
# ─────────────────────────────────────────
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
eval_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)


# ─────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────
RESUME_PARSER_SYSTEM = """You are an expert technical recruiter and software engineer.
Extract the candidate's professional bio, core technical stack, and key project experiences from the following resume text.

IMPORTANT: All text content (bio, project names, descriptions) MUST be written in Korean. If the original resume is in another language, translate it into natural Korean.

Output strictly in the following JSON format without any markdown blocks:
{
    "bio": "지원자의 역할, 경력 연차, 핵심 역량을 강조하는 2~3문장 분량의 전문적인 프로필 요약 (반드시 한국어로 작성).",
    "work_experience": [
        {
            "company": "회사명 (한국어)",
            "role": "직무 및 포지션",
            "period": "근무 기간 (예: 2020.01 - 2023.05, 모르면 생략)"
        }
    ],
    "tech_stack": ["React", "Python", "FastAPI"],
    "projects": [
        {
            "name": "프로젝트명 (한국어)",
            "description": "해당 프로젝트의 목적과 본인의 기여도를 요약한 1~2문장 (반드시 한국어로 작성).",
            "technologies": ["Tech1", "Tech2"]
        }
    ],
    "strengths": ["지원자가 가진 핵심 역량과 그 근거를 구체적으로 서술한 강점 1 (2~3문장 분량으로 상세히)", "구체적인 강점 2 (2~3문장)"],
    "weaknesses": ["단순한 꼬리 질문이 아닌, 이력서의 공백이나 기술적 한계를 깊게 파고드는 날카로운 약점 분석 및 예상 질문 1 (2~3문장 분량으로 상세히)", "약점 분석 및 예상 질문 2 (2~3문장)"]
}"""

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

REPORT_PARTIAL_CONTEXT = """이번 면접은 {answered}/{max_q} 문항만 답변된 부분 면접입니다.
답변 수가 적으므로 보수적으로 평가하고, 근거가 부족한 역량은 평가 신뢰도가 낮음을 명시하세요.
참여한 답변만으로 점수를 산출하되, 미참여 영역의 추정은 피하고 strengths/weaknesses는 실제 답변에서 드러난 사실만 기반으로 서술하세요."""


# ─────────────────────────────────────────
# Nodes
# ─────────────────────────────────────────
EMPTY_RESUME_SUMMARY: Dict = {
    "bio": "",
    "work_experience": [],
    "tech_stack": [],
    "projects": [],
    "strengths": [],
    "weaknesses": [],
}


def resume_parser_node(state: InterviewState) -> dict:
    """Node 1: PDF 텍스트 추출 → LLM JSON 파싱 → resume_summary 갱신"""
    file_path = state.get("resume_file_path")
    if not file_path:
        return {"resume_summary": EMPTY_RESUME_SUMMARY}

    text = extract_resume_text.invoke({"file_path": file_path})
    response = eval_llm.invoke(
        [
            SystemMessage(content=RESUME_PARSER_SYSTEM),
            HumanMessage(content=f"Resume Text:\n{text[:10000]}"),
        ],
        response_format={"type": "json_object"},
    )

    try:
        parsed = json.loads(response.content)
    except json.JSONDecodeError as e:
        print(f"Resume parsing error: {e}")
        parsed = EMPTY_RESUME_SUMMARY

    return {"resume_summary": parsed}


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
        elif isinstance(msg, AIMessage) and last_answer and not last_question:
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

    return {"evaluations": [evaluation]}


def count_valid_evaluations(evaluations: List[Dict]) -> int:
    """유효한 평가 항목 카운트 (advisor [High]: JSON 파싱 실패한 stale entry 제외).

    유효 기준: score 필드가 int 타입이고 1~10 범위 내인 항목.
    """
    valid = 0
    for ev in evaluations or []:
        if not isinstance(ev, dict):
            continue
        score = ev.get("score")
        if isinstance(score, int) and 1 <= score <= 10:
            valid += 1
    return valid


def report_node(state: InterviewState) -> dict:
    """리포트 생성기: 누적 평가를 종합하여 최종 리포트 생성.

    부분 리포트 분기 (Should-S8):
    - is_early_terminated=True 또는 len(evaluations) < max_questions 인 경우
      시스템 프롬프트에 부분 면접 컨텍스트를 주입하고
      응답에 is_partial=True, disclaimer 필드를 부착한다.
    - 5턴 완주 시(자연 종료)에는 기존 동작과 동일.
    """
    evaluations = state.get("evaluations", [])
    max_q = state.get("max_questions", 5)
    answered = len(evaluations)
    is_partial = bool(state.get("is_early_terminated")) or (answered < max_q)

    evals_str = json.dumps(evaluations, ensure_ascii=False, indent=2)
    prompt = REPORT_SYSTEM.format(evaluations=evals_str)

    base_system = "당신은 기술 면접 분석 전문가입니다. 주어진 면접 평가 내역을 바탕으로 지원자의 역량을 수치화하고 종합 피드백을 제공하세요."
    if is_partial:
        partial_ctx = REPORT_PARTIAL_CONTEXT.format(answered=answered, max_q=max_q)
        system_content = f"{base_system}\n\n{partial_ctx}"
    else:
        system_content = base_system

    response = eval_llm.invoke([
        SystemMessage(content=system_content),
        HumanMessage(content=prompt)
    ])

    try:
        # JSON 문자열만 추출 (간혹 LLM이 마크다운 블록을 포함할 수 있으므로)
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        final_report = json.loads(content)
    except Exception as e:
        print(f"Report JSON parsing error: {e}")
        final_report = {
            "scores": {"cs_fundamentals": 50, "framework_usage": 50, "problem_solving": 50, "communication": 50},
            "feedback": {"strengths": "평가 데이터를 파싱하는 데 문제가 발생했습니다.", "weaknesses": "N/A", "improvements": []}
        }

    # 부분 리포트 메타데이터 부착 (자연 종료엔 추가하지 않아 회귀 영향 0)
    if is_partial:
        final_report["is_partial"] = True
        final_report["disclaimer"] = f"총 {answered}개 답변을 바탕으로 작성된 부분 리포트입니다."

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

# Parser graph (단발 invoke, checkpointer 불필요): /api/upload에서 호출
parser_builder = StateGraph(InterviewState)
parser_builder.add_node("resume_parser", resume_parser_node)
parser_builder.add_edge(START, "resume_parser")
parser_builder.add_edge("resume_parser", END)
parser_graph = parser_builder.compile()

# Interview graph (interrupt 기반): /api/chat에서 호출
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

# Export for streaming route handler
__all__ = [
    "graph",
    "parser_graph",
    "llm",
    "InterviewState",
    "INTERVIEWER_SYSTEM",
    "evaluator_node",
    "report_node",
    "should_continue",
    "count_valid_evaluations",
]
