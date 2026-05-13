from langchain_core.tools import tool
import PyPDF2
import json
from typing import Dict
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage


@tool
def extract_resume_text(file_path: str) -> str:
    """Read a resume PDF from the local filesystem and return its raw extracted text.

    Args:
        file_path: Absolute or relative filesystem path to the PDF file.

    Returns:
        Concatenated text extracted from every page of the PDF (newline-separated).
        Empty string if no text could be extracted.
    """
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    return text


@tool
def generate_sample_answer(thread_id: str, quality_tier: str) -> Dict:
    """Generate a sample answer for the current pending question at a specified quality tier.

    Args:
        thread_id: LangGraph thread ID (from chat session).
        quality_tier: One of "best" (7-10 score), "good" (5-6), or "bad" (1-4).

    Returns:
        Dictionary with "answer" (str) and "expected_score_range" ([low, high]).
    """
    from agent import graph

    # Validate tier
    TIER_RANGES = {
        "best": [7, 10],
        "good": [5, 6],
        "bad": [1, 4],
    }
    if quality_tier not in TIER_RANGES:
        raise ValueError(f"quality_tier must be one of {list(TIER_RANGES.keys())}")

    # Fetch current state
    config = {"configurable": {"thread_id": thread_id}}
    state = graph.get_state(config)
    current_values = state.values

    # Extract context
    resume_summary = current_values.get("resume_summary", {})
    messages = current_values.get("messages", [])

    # Get current pending question from interrupts (sync flow) or messages (stream flow)
    current_question = None

    # Try: Get from interrupts (sync /api/chat flow)
    interrupts = []
    for task in state.tasks:
        interrupts.extend(task.interrupts)

    if interrupts:
        current_question = interrupts[0].value

    # Fallback: Get from last message (stream /api/chat/stream flow)
    if not current_question and messages:
        last_message = messages[-1]
        if hasattr(last_message, 'content'):
            current_question = last_message.content
        elif isinstance(last_message, dict):
            current_question = last_message.get('content')

    if not current_question:
        raise ValueError("No pending question found. Interview may not have started or is finished.")

    # Build prompt based on tier
    tier_instructions = {
        "best": """당신은 면접 답변 생성 전문가입니다.
주어진 질문에 대해 우수한 답변 (7-10점 수준)을 생성하세요.

우수 답변의 특징:
- 구체적인 경험과 기술적 의사결정 근거 포함
- STAR 구조 (Situation, Task, Action, Result)를 자연스럽게 적용
- 정량적 지표나 구체적인 성과 언급
- 기술적 깊이와 성숙성 드러냄
- 명확하고 자신감 있는 톤""",

        "good": """당신은 면접 답변 생성 전문가입니다.
주어진 질문에 대해 보통 수준의 답변 (5-6점 수준)을 생성하세요.

보통 답변의 특징:
- 기본적으로 정확한 내용이지만 깊이 부족
- 경험을 언급하지만 구체성 부족
- 일부 일반론적 표현 포함
- 큰 방향은 맞지만 세부 사항 미흡
- 답변은 맞지만 '왜?'와 트레이드오프에는 명확히 대답하지 못함""",

        "bad": """당신은 면접 답변 생성 전문가입니다.
주어진 질문에 대해 부족한 답변 (1-4점 수준)을 생성하세요.

부족 답변의 특징:
- 표면적이고 모호한 표현
- 근거나 경험이 부족하거나 불명확
- "잘 모르겠지만" 같은 부정적 톤
- 기술적 오류는 없지만 매우 피상적
- 실무 경험 부족이 드러남""",
    }

    # Build message context (이전 Q&A 포함)
    context_parts = []
    if messages:
        context_parts.append("[이전 Q&A 기록]")
        for i, msg in enumerate(messages):
            if isinstance(msg, dict):
                # Handle dict-like message objects
                role = msg.get("type", "").replace("ai", "면접관").replace("human", "지원자")
                content = msg.get("content", "")
            else:
                # Handle LangChain Message objects
                msg_type = type(msg).__name__
                if "AIMessage" in msg_type:
                    role = "면접관"
                elif "HumanMessage" in msg_type:
                    role = "지원자"
                else:
                    role = "정보"
                content = msg.content if hasattr(msg, "content") else str(msg)

            context_parts.append(f"{role}: {content}")

    # Resume context
    resume_str = json.dumps(resume_summary, ensure_ascii=False, indent=2) if resume_summary else "없음"

    user_prompt = f"""[이력서 요약]
{resume_str}

{chr(10).join(context_parts)}

[현재 질문 (답변 필요)]
{current_question}

위 질문에 대해 답변을 생성하세요. 답변만 제시하고, JSON이나 마크다운 형식 없이 순수 텍스트로 답변하세요. 1~3 문단 분량."""

    # Call LLM with tier-specific temperature
    tier_temps = {"best": 0.3, "good": 0.6, "bad": 0.8}
    temp = tier_temps[quality_tier]

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=temp)
    response = llm.invoke([
        SystemMessage(content=tier_instructions[quality_tier]),
        HumanMessage(content=user_prompt)
    ])

    answer = response.content.strip()
    expected_range = TIER_RANGES[quality_tier]

    return {
        "answer": answer,
        "expected_score_range": expected_range
    }
