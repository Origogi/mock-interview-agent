from typing import List, Dict, Optional, NotRequired
from langgraph.graph import MessagesState, StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from dotenv import load_dotenv
from tools import extract_resume_text
import json
import os
import re

load_dotenv()


# ─────────────────────────────────────────
# Interview Policy
# ─────────────────────────────────────────
SESSION_TOTAL_QUESTIONS = 5
INTERVIEW_CONTEXT_WINDOW_SIZE = 5
INTERVIEW_SESSIONS = (
    {
        "sessionId": "cs_fundamentals",
        "sessionLabel": "CS Fundamentals",
        "sessionGoal": "자료구조, 알고리즘, 운영체제, 네트워크, 데이터베이스 등 CS 기반 이해를 실무 경험과 연결해 검증합니다.",
    },
    {
        "sessionId": "framework_usage",
        "sessionLabel": "Framework Usage",
        "sessionGoal": "이력서에 드러난 프레임워크와 라이브러리 사용 경험, 선택 이유, 한계 인식, 운영 경험을 검증합니다.",
    },
    {
        "sessionId": "problem_solving",
        "sessionLabel": "Problem Solving",
        "sessionGoal": "장애, 성능, 설계 트레이드오프를 구조적으로 파악하고 해결한 과정을 검증합니다.",
    },
    {
        "sessionId": "communication",
        "sessionLabel": "Communication",
        "sessionGoal": "협업, 요구사항 조율, 의사결정 공유, 회고와 개선 커뮤니케이션 역량을 검증합니다.",
    },
)
DEFAULT_MAX_QUESTIONS = len(INTERVIEW_SESSIONS) * SESSION_TOTAL_QUESTIONS
SCORE_KEYS = tuple(session["sessionId"] for session in INTERVIEW_SESSIONS)
SESSION_TRANSITION_QUESTION_NUMBERS = {6, 11, 16}
SESSION_LABELS = tuple(session["sessionLabel"] for session in INTERVIEW_SESSIONS)
FORBIDDEN_HANDOFF_PHRASES = (
    "준비되셨다면",
    "준비가 되셨다면",
    "준비되면",
    "준비가 되면",
    "알려주세요",
    "세션은 마무리",
    "세션을 마무리",
    "다음 세션에서",
    "질문을 드리도록 하겠습니다",
)
DISALLOWED_PROGRESS_PATTERNS = (
    r"(?:이제\s*)?마지막\s*(?:기술\s*)?(?:질문|문항)",
    r"(?:세션(?:의|에서)?\s*)?마지막\s*(?:기술\s*)?(?:질문|문항)",
    r"최종\s*(?:기술\s*)?(?:질문|문항)",
)
QUESTION_MARKERS = (
    "?",
    "까요",
    "나요",
    "해 주세요",
    "설명",
    "말씀",
    "어떤",
    "어떻게",
    "왜",
    "무엇",
    "사례",
    "기준",
    "과정",
    "접근",
    "선택",
    "비교",
    "트레이드오프",
)


def build_question_metadata(question_number: int) -> Dict:
    """Return fixed interview session metadata for a 1-based question number."""
    bounded_number = max(1, min(int(question_number), DEFAULT_MAX_QUESTIONS))
    session_offset = (bounded_number - 1) // SESSION_TOTAL_QUESTIONS
    session_question_index = ((bounded_number - 1) % SESSION_TOTAL_QUESTIONS) + 1
    session = INTERVIEW_SESSIONS[session_offset]

    return {
        "questionNumber": bounded_number,
        "sessionId": session["sessionId"],
        "sessionLabel": session["sessionLabel"],
        "sessionIndex": session_offset + 1,
        "sessionQuestionIndex": session_question_index,
        "sessionTotalQuestions": SESSION_TOTAL_QUESTIONS,
        "sessionGoal": session["sessionGoal"],
    }


def next_question_number(evaluations: List[Dict]) -> int:
    return min(len(evaluations or []) + 1, DEFAULT_MAX_QUESTIONS)


def window_interviewer_evaluations(evaluations: List[Dict]) -> List[Dict]:
    return list(evaluations or [])[-INTERVIEW_CONTEXT_WINDOW_SIZE:]


def window_interviewer_messages(messages: List) -> List:
    interview_messages = [
        message
        for message in messages or []
        if isinstance(message, (AIMessage, HumanMessage))
    ]
    return interview_messages[-INTERVIEW_CONTEXT_WINDOW_SIZE * 2:]


def is_session_transition_question(question_number: int) -> bool:
    return build_question_metadata(question_number)["questionNumber"] in SESSION_TRANSITION_QUESTION_NUMBERS


def format_interviewer_system(
    resume_summary: Dict,
    evaluations: List[Dict],
    question_number: Optional[int] = None,
) -> str:
    evals = evaluations or []
    current_question_number = question_number or next_question_number(evals)
    meta = build_question_metadata(current_question_number)
    resume_str = json.dumps(resume_summary or {}, ensure_ascii=False, indent=2)
    evals_str = (
        json.dumps(evals, ensure_ascii=False, indent=2)
        if evals
        else f"없음 (첫 번째 질문, Q{current_question_number})"
    )

    return INTERVIEWER_SYSTEM.format(
        resume_summary=resume_str,
        evaluations=evals_str,
        max_questions=DEFAULT_MAX_QUESTIONS,
        question_number=meta["questionNumber"],
        session_id=meta["sessionId"],
        session_label=meta["sessionLabel"],
        session_index=meta["sessionIndex"],
        session_question_index=meta["sessionQuestionIndex"],
        session_total_questions=meta["sessionTotalQuestions"],
        session_goal=meta["sessionGoal"],
    )


def has_forbidden_handoff(text: str) -> bool:
    normalized = " ".join(str(text or "").split())
    return any(phrase in normalized for phrase in FORBIDDEN_HANDOFF_PHRASES)


def has_disallowed_progress_phrase(text: str) -> bool:
    normalized = " ".join(str(text or "").split())
    return any(re.search(pattern, normalized) for pattern in DISALLOWED_PROGRESS_PATTERNS)


def _fallback_prefix(meta: Dict) -> str:
    question_number = meta["questionNumber"]
    if is_session_transition_question(question_number):
        return f"Q{question_number}. 이제 {meta['sessionLabel']} 세션으로 넘어가겠습니다."
    return f"Q{question_number}."


def fallback_interview_question(question_number: int) -> str:
    meta = build_question_metadata(question_number)
    session_id = meta["sessionId"]
    prefix = _fallback_prefix(meta)

    if session_id == "cs_fundamentals":
        return (
            f"{prefix} 이력서에 있는 프로젝트 중 데이터 조회나 저장 구조가 중요한 사례를 하나 고르고, "
            "인덱스, 캐시, 트랜잭션, 네트워크 지연 중 어떤 기본 원리를 기준으로 성능 병목을 판단했는지 "
            "측정 방법과 트레이드오프까지 설명해 주세요."
        )
    if session_id == "framework_usage":
        return (
            f"{prefix} 이력서에 나온 프레임워크나 라이브러리 하나를 선택해, 단순 사용법이 아니라 "
            "프로젝트 구조, 상태 관리, 성능, 테스트 관점에서 어떤 기준으로 적용했고 어떤 한계를 경험했는지 설명해 주세요."
        )
    if session_id == "problem_solving":
        return (
            f"{prefix} 실제로 겪었거나 겪을 수 있는 장애 또는 성능 문제 하나를 가정하고, "
            "원인 가설 수립, 검증 방법, 해결안 선택, 재발 방지까지 어떤 순서로 접근할지 설명해 주세요."
        )
    return (
        f"{prefix} 복잡한 기술적 의사결정을 동료나 비기술 이해관계자에게 설명해야 했던 상황을 떠올리고, "
        "어떤 근거와 표현 방식으로 합의를 만들었는지 구체적으로 설명해 주세요."
    )


def _split_sentences(text: str) -> List[str]:
    return [
        match.group(0).strip()
        for match in re.finditer(r"[^.!?。！？\n]+[.!?。！？]?", text)
        if match.group(0).strip()
    ]


def _strip_session_label_phrases(text: str) -> str:
    sanitized = text
    label_pattern = "|".join(re.escape(label) for label in SESSION_LABELS)
    sanitized = re.sub(
        rf"(?:이제\s*)?(?:{label_pattern})\s*세션으로\s*(?:넘어가겠습니다|이동하겠습니다)\s*[:：]?\s*",
        "",
        sanitized,
    )

    for label in SESSION_LABELS:
        escaped_label = re.escape(label)
        sanitized = re.sub(
            rf"{escaped_label}\s*세션\s*(?:질문입니다|입니다)?\s*[:：]?\s*",
            "",
            sanitized,
        )
        sanitized = sanitized.replace(label, "")

    sanitized = re.sub(r"(?:이번|현재)\s*세션(?:에서는|에서|의)?\s*", "", sanitized)
    sanitized = re.sub(r"세션\s*질문입니다\s*[:：]?\s*", "", sanitized)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized


def _is_session_guidance_sentence(text: str) -> bool:
    normalized = " ".join(str(text or "").split())
    if not normalized:
        return True
    if re.fullmatch(r"Q\d+[\).]?", normalized):
        return False

    guidance_markers = (
        "세션 질문",
        "세션입니다",
        "세션으로",
        "세션에서는",
        "세션에서",
        "세션을 시작",
        "세션 시작",
        "넘어가겠습니다",
        "마지막",
        "최종",
        "마무리",
        "종료",
    )
    has_session_label = any(label in normalized for label in SESSION_LABELS)
    return "세션 질문입니다" in normalized or (
        has_session_label and any(marker in normalized for marker in guidance_markers)
    )


def _has_evaluable_question(text: str) -> bool:
    normalized = " ".join(str(text or "").split())
    normalized = re.sub(r"^Q\d+[\).]?\s*", "", normalized)
    if len(normalized) < 16:
        return False
    return any(marker in normalized for marker in QUESTION_MARKERS)


def _remove_disallowed_session_guidance(text: str) -> tuple[str, bool]:
    kept_sentences = []
    changed = False
    for sentence in _split_sentences(text):
        original = sentence.strip()
        cleaned = _strip_session_label_phrases(sentence)
        if has_disallowed_progress_phrase(sentence):
            changed = True
            continue
        if _is_session_guidance_sentence(sentence) and not _has_evaluable_question(cleaned):
            changed = True
            continue
        if cleaned:
            kept_sentences.append(cleaned)
            changed = changed or cleaned != original

    sanitized = " ".join(kept_sentences)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized, changed


def ensure_technical_interview_question(text: str, question_number: int) -> str:
    """Replace readiness-only/session-handoff output with an answerable technical question."""
    if not str(text or "").strip():
        return fallback_interview_question(question_number)

    if has_forbidden_handoff(text) or has_disallowed_progress_phrase(text):
        return fallback_interview_question(question_number)

    if is_session_transition_question(question_number):
        return text

    sanitized, changed = _remove_disallowed_session_guidance(text)
    if not changed:
        return text

    if not _has_evaluable_question(sanitized):
        return fallback_interview_question(question_number)
    return sanitized


# ─────────────────────────────────────────
# State
# ─────────────────────────────────────────
class InterviewState(MessagesState):
    resume_file_path: NotRequired[str]        # 입력 PDF 경로 (Node 1 입력 전용)
    resume_summary: Dict                      # 이력서 파싱 데이터
    question_count: int                       # 진행된 질문 수
    max_questions: int                        # 최대 질문 수
    evaluations: List[Dict]                   # 턴별 평가 결과
    final_report: Optional[Dict]              # 최종 리포트
    is_early_terminated: NotRequired[bool]    # 조기 종료 플래그 (Should-S8)
    answered_count: NotRequired[int]          # 편의 캐시 (len(evaluations) 동치)


# ─────────────────────────────────────────
# LLM
# ─────────────────────────────────────────
DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
INTERVIEW_MODEL = os.getenv("INTERVIEW_MODEL", DEFAULT_OPENAI_MODEL)
EVALUATION_MODEL = os.getenv("EVALUATION_MODEL", DEFAULT_OPENAI_MODEL)

llm = ChatOpenAI(model=INTERVIEW_MODEL, temperature=0.7)
eval_llm = ChatOpenAI(model=EVALUATION_MODEL, temperature=0.2)


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

[현재 질문 컨텍스트]
- 전체 질문 번호: Q{question_number}/{max_questions}
- 현재 세션: {session_label} ({session_id})
- 세션 순서: {session_index}/4
- 세션 내 질문 번호: {session_question_index}/{session_total_questions}
- 현재 세션 목표: {session_goal}

[원칙]
1. 단순 개념 질문보다 경험 기반 질문을 하세요 (예: "왜 X 대신 Y를 선택하셨나요?").
2. 한 번에 하나의 질문만 하세요.
3. 이전 답변이 있다면 꼬리 질문을 우선하세요.
4. 세션 순서는 고정입니다. 현재 세션 목표를 벗어난 질문이나 미래 세션 질문을 앞당기지 마세요.
5. Q1은 안내 없이 바로 첫 기술 질문으로 시작하세요.
6. 세션 전환 안내는 Q6, Q11, Q16에서만 허용됩니다. 이때도 한 문장 이내로 전환을 알리고, 반드시 같은 응답 안에서 실질적인 기술 질문을 바로 하세요.
7. Q2~Q5, Q7~Q10, Q12~Q15, Q17~Q20에서는 세션명, 세션 안내, "세션 질문입니다" 문구를 절대 쓰지 말고 바로 기술 질문만 하세요.
8. Q5, Q10, Q15, Q20에서도 진행 상태, 세션 종료, 남은 질문 수를 안내하지 말고 바로 기술 질문만 하세요.
9. 사용자의 준비 여부를 묻거나 진행 확인만 하는 질문은 금지입니다.
10. "준비되셨다면 알려주세요", "다음 세션에서 질문하겠습니다", "세션은 마무리되었습니다" 같은 문장으로 응답하지 마세요.
11. 응답은 반드시 평가 가능한 하나의 기술 면접 질문으로 끝나야 합니다.
12. 반드시 한국어로 질문하세요."""

EVALUATOR_SYSTEM = """지원자의 답변을 엄격하게 평가하세요.

질문: {question}
답변: {answer}

점수 기준:
- 7~10점 (Best): 질문의 핵심 문제를 정확히 짚고, 구체적인 설계/구현 방법, 트레이드오프, 운영 관측성 또는 검증 방법을 함께 설명한 답변입니다. 단순히 방향이 맞는 수준만으로는 7점 이상을 주지 마세요.
- 5~6점 (Good): 큰 방향은 맞지만 구체성, 기술적 깊이, 트레이드오프, 운영 방안 중 일부가 빠진 보통 수준의 답변입니다.
- 1~4점 (Bad): 모호하거나 피상적이고, 수동 처리/로그 확인/재시작처럼 문제를 구조적으로 해결하지 못하는 답변입니다. 핵심 설계가 빠졌거나 실무적으로 위험하면 이 범위로 평가하세요.

채점 원칙:
1. 7점 이상은 구체적인 근거와 실행 가능한 설계가 있을 때만 부여하세요.
2. 일반론적이거나 "잘 처리하겠다" 수준이면 6점 이하로 제한하세요.
3. 답변이 운영자의 수동 대응에 의존하거나 구조적 예방책이 없으면 4점 이하로 평가하세요.
4. 피드백에는 왜 해당 점수인지와 개선해야 할 구체적 포인트를 포함하세요.

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{{"score": <1~10 정수>, "feedback": "<구체적인 피드백>"}}"""

REPORT_SYSTEM = """면접 평가 내역을 바탕으로 종합 리포트를 생성하세요.

평가 내역:
{evaluations}

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{{"scores": {{"cs_fundamentals": <0-100 또는 null>, "framework_usage": <0-100 또는 null>, "problem_solving": <0-100 또는 null>, "communication": <0-100 또는 null>}}, "feedback": {{"strengths": "<강점>", "weaknesses": "<약점>", "improvements": ["<개선점1>", "<개선점2>"]}}}}"""

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
    evaluations = state.get("evaluations", [])
    question_number = next_question_number(evaluations)
    system = format_interviewer_system(
        state.get("resume_summary", {}),
        window_interviewer_evaluations(evaluations),
        question_number,
    )
    response = llm.invoke(
        [SystemMessage(content=system)] + window_interviewer_messages(state.get("messages", []))
    )

    question = ensure_technical_interview_question(response.content, question_number)
    user_answer = interrupt(question)  # ⏸️ 프론트엔드 대기

    return {
        "messages": [AIMessage(content=question), HumanMessage(content=user_answer)],
        "question_count": question_number,
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

    question_number = len(state.get("evaluations", []) or []) + 1
    evaluation.update(build_question_metadata(question_number))
    evaluation["question"] = last_question
    evaluation["answer"] = last_answer

    return {"evaluations": state.get("evaluations", []) + [evaluation]}


def count_valid_evaluations(evaluations: List[Dict]) -> int:
    """유효한 평가 항목 카운트 (advisor [High]: JSON 파싱 실패한 stale entry 제외).

    유효 기준: score 필드가 int 타입이고 1~10 범위 내인 항목.
    """
    valid = 0
    for ev in evaluations or []:
        if not isinstance(ev, dict):
            continue
        score = ev.get("score")
        if isinstance(score, int) and not isinstance(score, bool) and 1 <= score <= 10:
            valid += 1
    return valid


def _evaluation_score(evaluation: Dict) -> Optional[int]:
    if not isinstance(evaluation, dict):
        return None
    score = evaluation.get("score")
    if isinstance(score, int) and not isinstance(score, bool) and 1 <= score <= 10:
        return score
    return None


def _evaluation_question_number(evaluation: Dict, fallback: int) -> int:
    if not isinstance(evaluation, dict):
        return fallback
    raw = evaluation.get("questionNumber")
    if isinstance(raw, int) and raw >= 1:
        return raw
    return fallback


def build_session_summaries(evaluations: List[Dict]) -> List[Dict]:
    """Build deterministic per-session report data from valid evaluation scores."""
    grouped_scores = {session["sessionId"]: [] for session in INTERVIEW_SESSIONS}

    for index, evaluation in enumerate(evaluations or [], start=1):
        score = _evaluation_score(evaluation)
        if score is None:
            continue
        meta = build_question_metadata(_evaluation_question_number(evaluation, index))
        grouped_scores[meta["sessionId"]].append(score)

    summaries = []
    for session_index, session in enumerate(INTERVIEW_SESSIONS, start=1):
        session_id = session["sessionId"]
        scores = grouped_scores[session_id]
        answered = len(scores)
        is_completed = answered >= SESSION_TOTAL_QUESTIONS
        average_score = sum(scores) / answered if answered else None
        score_100 = int(round(average_score * 10)) if is_completed and average_score is not None else None
        question_start = ((session_index - 1) * SESSION_TOTAL_QUESTIONS) + 1
        question_end = question_start + SESSION_TOTAL_QUESTIONS - 1

        summaries.append(
            {
                "sessionId": session_id,
                "sessionLabel": session["sessionLabel"],
                "sessionIndex": session_index,
                "questionStart": question_start,
                "questionEnd": question_end,
                "answeredCount": answered,
                "sessionTotalQuestions": SESSION_TOTAL_QUESTIONS,
                "score": score_100,
                "rawAverageScore": round(average_score, 2) if is_completed and average_score is not None else None,
                "status": "completed" if is_completed else "insufficient_evidence",
                "message": (
                    f"{answered}/{SESSION_TOTAL_QUESTIONS}개 답변 평균 기반 점수입니다."
                    if is_completed
                    else f"{answered}/{SESSION_TOTAL_QUESTIONS}개 답변만 있어 평가 부족으로 표시합니다."
                ),
            }
        )

    return summaries


def build_session_scores(evaluations: List[Dict]) -> Dict:
    summaries = build_session_summaries(evaluations)
    return {summary["sessionId"]: summary["score"] for summary in summaries}


def report_node(state: InterviewState) -> dict:
    """리포트 생성기: 누적 평가를 종합하여 최종 리포트 생성.

    부분 리포트 분기 (Should-S8):
    - is_early_terminated=True 또는 len(evaluations) < max_questions 인 경우
      시스템 프롬프트에 부분 면접 컨텍스트를 주입하고
      응답에 is_partial=True, disclaimer 필드를 부착한다.
    - 20턴 완주 시(자연 종료)에는 기존 동작과 동일.
    """
    evaluations = state.get("evaluations", [])
    max_q = DEFAULT_MAX_QUESTIONS
    answered = count_valid_evaluations(evaluations)
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
            "scores": {key: None for key in SCORE_KEYS},
            "feedback": {"strengths": "평가 데이터를 파싱하는 데 문제가 발생했습니다.", "weaknesses": "N/A", "improvements": []}
        }

    feedback = final_report.get("feedback")
    if not isinstance(feedback, dict):
        feedback = {}
    final_report["feedback"] = {
        "strengths": str(feedback.get("strengths", "")),
        "weaknesses": str(feedback.get("weaknesses", "")),
        "improvements": feedback.get("improvements") if isinstance(feedback.get("improvements"), list) else [],
    }

    session_summaries = build_session_summaries(evaluations)
    final_report["scores"] = {summary["sessionId"]: summary["score"] for summary in session_summaries}
    final_report["session_summaries"] = session_summaries
    final_report["answered_count"] = answered
    final_report["max_questions"] = max_q

    # 부분 리포트 메타데이터 부착
    if is_partial:
        final_report["is_partial"] = True
        final_report["disclaimer"] = f"총 {answered}개 답변을 바탕으로 작성된 부분 리포트입니다."

    return {"final_report": final_report}


def should_continue(state: InterviewState) -> str:
    """평가 완료 수 기반 라우팅."""
    if count_valid_evaluations(state.get("evaluations", [])) >= DEFAULT_MAX_QUESTIONS:
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
    "DEFAULT_MAX_QUESTIONS",
    "DEFAULT_OPENAI_MODEL",
    "EVALUATION_MODEL",
    "INTERVIEW_CONTEXT_WINDOW_SIZE",
    "INTERVIEW_MODEL",
    "SESSION_TOTAL_QUESTIONS",
    "INTERVIEW_SESSIONS",
    "SESSION_TRANSITION_QUESTION_NUMBERS",
    "build_question_metadata",
    "build_session_scores",
    "build_session_summaries",
    "ensure_technical_interview_question",
    "fallback_interview_question",
    "format_interviewer_system",
    "has_disallowed_progress_phrase",
    "has_forbidden_handoff",
    "is_session_transition_question",
    "window_interviewer_evaluations",
    "window_interviewer_messages",
    "evaluator_node",
    "report_node",
    "should_continue",
    "count_valid_evaluations",
]
