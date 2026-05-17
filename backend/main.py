from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, AsyncGenerator, Dict
import os
import tempfile
import json
import asyncio
from dotenv import load_dotenv
from agent import (
    graph,
    parser_graph,
    llm,
    DEFAULT_MAX_QUESTIONS,
    build_question_metadata,
    ensure_technical_interview_question,
    evaluator_node,
    format_interviewer_system,
    report_node,
    count_valid_evaluations,
    window_interviewer_evaluations,
    window_interviewer_messages,
)
from langgraph.types import Command
from tools import generate_sample_answer
from langgraph.graph.message import REMOVE_ALL_MESSAGES
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage, RemoveMessage

load_dotenv() # Load variables from .env

app = FastAPI(title="Tech-Interviewer API")

INTERVIEW_CLOSING_MESSAGE = (
    "좋습니다. 여기까지 20개 질문에 대한 답변을 모두 확인했습니다. "
    "이제 전체 답변을 바탕으로 최종 리포트를 정리하겠습니다."
)


def _get_cors_origins() -> List[str]:
    raw_origins = os.getenv("BACKEND_CORS_ORIGINS") or os.getenv("CORS_ORIGINS")
    if raw_origins:
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]


# CORS middleware to allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthCheck(BaseModel):
    status: str


# ─────────────────────────────────────────
# Thread-level Lock Manager (advisor [High] race guard)
# ─────────────────────────────────────────
# 조기 종료(`/api/interview/end`)와 자연 종료(`chat_stream_generator`의 20턴 분기)가
# 동시에 `report_node`를 두 번 호출하지 않도록 thread_id 단위 직렬화.
# 또한 토큰 스트림 도중 `/end` 진입 시 evaluator_node 완료 전 stale snapshot 방지.
_thread_locks: Dict[str, asyncio.Lock] = {}
_thread_locks_guard = asyncio.Lock()


async def _get_thread_lock(thread_id: str) -> asyncio.Lock:
    """thread_id 단위 Lock 가져오기 (없으면 생성)."""
    async with _thread_locks_guard:
        lock = _thread_locks.get(thread_id)
        if lock is None:
            lock = asyncio.Lock()
            _thread_locks[thread_id] = lock
        return lock


def _message_role(message: object) -> str:
    """LangChain message/dict를 FE가 쓰는 role 값으로 정규화."""
    if isinstance(message, AIMessage):
        return "ai"
    if isinstance(message, HumanMessage):
        return "user"
    if isinstance(message, dict):
        raw_role = message.get("role") or message.get("type") or ""
    else:
        raw_role = type(message).__name__

    role = str(raw_role).lower()
    if role in {"ai", "assistant", "aimessage"}:
        return "ai"
    if role in {"human", "user", "humanmessage"}:
        return "user"
    if role == "system" or role == "systemmessage":
        return "system"
    return role


def _message_content(message: object) -> str:
    if isinstance(message, dict):
        content = message.get("content", "")
    else:
        content = getattr(message, "content", "")

    if isinstance(content, list):
        return "".join(
            part if isinstance(part, str) else str(part.get("text", ""))
            for part in content
        )
    return str(content or "")


def _normalize_messages(messages: list) -> List[Dict[str, str]]:
    normalized = []
    for message in messages or []:
        role = _message_role(message)
        if role not in {"ai", "user"}:
            continue
        normalized.append({"role": role, "content": _message_content(message)})
    return normalized


def _replace_messages_update(messages: list) -> list:
    """MessagesState(add_messages)에서 전체 messages를 안전하게 교체한다."""
    return [RemoveMessage(id=REMOVE_ALL_MESSAGES, content=""), *(messages or [])]


def _is_discarded_report(final_report: object) -> bool:
    return isinstance(final_report, dict) and final_report.get("discarded") is True


def _public_question_metadata(question_number: int) -> Dict:
    meta = build_question_metadata(question_number)
    return {
        "questionNumber": meta["questionNumber"],
        "sessionId": meta["sessionId"],
        "sessionLabel": meta["sessionLabel"],
        "sessionIndex": meta["sessionIndex"],
        "sessionQuestionIndex": meta["sessionQuestionIndex"],
        "sessionTotalQuestions": meta["sessionTotalQuestions"],
    }


def _pending_question_number(values: dict) -> int:
    return min(count_valid_evaluations(values.get("evaluations", [])) + 1, DEFAULT_MAX_QUESTIONS)


def _snapshot_interrupt_question(snapshot: object) -> Optional[str]:
    """Interrupted graph snapshot에만 남아 있는 질문 텍스트를 추출한다."""
    for task in getattr(snapshot, "tasks", []) or []:
        for interrupt in getattr(task, "interrupts", []) or []:
            value = getattr(interrupt, "value", None)
            if value:
                return str(value)
    return None


def _find_rewind_snapshot(history: list, target_question_index: int):
    """Qn 답변 전 snapshot: Qn 질문이 마지막 AI 메시지이고 평가는 Q1~Q(n-1)만 존재."""
    for snapshot in history:
        values = snapshot.values or {}
        messages = values.get("messages", []) or []
        evaluations = values.get("evaluations", []) or []

        if len(evaluations) != target_question_index - 1:
            continue
        if values.get("final_report") is not None:
            continue

        if values.get("question_count") == target_question_index:
            if messages and _message_role(messages[-1]) == "ai":
                return snapshot

        # Sync `/api/chat` interrupt snapshots may hold the pending question
        # only as an interrupt value. Accept that shape for any Qn when the
        # evaluation count proves this is the Qn answer-before checkpoint.
        if _snapshot_interrupt_question(snapshot):
            return snapshot
    return None

@app.get("/", response_model=HealthCheck)
def read_root():
    return {"status": "Backend is running!"}


@app.head("/")
def read_root_head():
    return None


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    tmp_path: Optional[str] = None
    try:
        # 1. Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # 2. Run Resume Parser node (단발 그래프 invoke)
        result = parser_graph.invoke({"resume_file_path": tmp_path})
        parsed_resume = result.get("resume_summary", {})

        return {
            "status": "success",
            "message": "File successfully uploaded and parsed",
            "filename": file.filename,
            "parsed_data": parsed_resume,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

# ─────────────────────────────────────────
# Chat API (LangGraph)
# ─────────────────────────────────────────
class ChatRequest(BaseModel):
    thread_id: str
    resume_summary: Optional[dict] = None  # 첫 요청 시만 필요
    user_answer: Optional[str] = None      # 답변 제출 시


@app.post("/api/chat")
async def chat(request: ChatRequest):
    config = {"configurable": {"thread_id": request.thread_id}}

    if request.user_answer is None:
        # 첫 요청: 그래프 초기화 및 시작
        initial_state = {
            "resume_summary": request.resume_summary or {},
            "messages": [],
            "question_count": 0,
            "max_questions": DEFAULT_MAX_QUESTIONS,
            "evaluations": [],
            "final_report": None,
        }
        graph.invoke(initial_state, config)
    else:
        # 답변 제출: 그래프 재개
        graph.invoke(Command(resume=request.user_answer), config)

    # 현재 상태 조회
    state = graph.get_state(config)
    current_values = state.values

    # 인터럽트 확인 (면접 진행 중)
    interrupts = []
    for task in state.tasks:
        interrupts.extend(task.interrupts)

    if interrupts:
        # 면접 진행 중: 다음 질문 반환
        question = interrupts[0].value
        question_number = _pending_question_number(current_values)

        # `/api/chat` 첫 질문은 LangGraph interrupt 값으로만 노출되고
        # node return이 아직 커밋되지 않아 messages에 남지 않는다.
        # 타임머신은 "Qn 답변 전" checkpoint가 필요하므로, 첫 질문도
        # 스트리밍 플로우와 동일하게 명시적으로 checkpoint에 저장한다.
        if request.user_answer is None and not current_values.get("messages"):
            graph.update_state(
                config,
                {
                    "messages": [AIMessage(content=question)],
                    "question_count": question_number,
                    "max_questions": DEFAULT_MAX_QUESTIONS,
                },
            )
            state = graph.get_state(config)
            current_values = state.values

        return {
            "question": question,
            "question_count": question_number,
            "max_questions": DEFAULT_MAX_QUESTIONS,
            **_public_question_metadata(question_number),
            "evaluations": current_values.get("evaluations", []),
            "is_finished": False,
            "final_report": None,
        }
    else:
        # 면접 종료: 최종 리포트 반환
        return {
            "question": None,
            "closing_message": INTERVIEW_CLOSING_MESSAGE,
            "question_count": current_values.get("question_count", 0),
            "max_questions": DEFAULT_MAX_QUESTIONS,
            "evaluations": current_values.get("evaluations", []),
            "is_finished": True,
            "final_report": current_values.get("final_report"),
        }


# ─────────────────────────────────────────
# Chat Stream API (NDJSON)
# ─────────────────────────────────────────
async def chat_stream_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    NDJSON generator for /api/chat/stream.

    Design Decision (advisor feedback):
    - Route handler directly calls llm.stream() instead of using Interviewer node
    - This separates stream chunk emission (yield) from state mutations
    - Interviewer logic runs in route handler, then Evaluator/Report nodes via direct invocation
    - Flow: Evaluate answer → finish or stream next question → emit done event

    Implementation:
    1. If user_answer is None (first request): Initialize graph state, stream first question
    2. If user_answer provided: Evaluate previous answer first, then finish or stream next question
    3. After streaming: emit "done" event with final response payload
    """
    config = {"configurable": {"thread_id": request.thread_id}}

    # advisor [High]: thread_id 단위 lock 으로 `/api/interview/end`와의 race 방지
    # (20턴째 report_node 호출과 동시에 /end가 들어오는 케이스, stream 도중 stale snapshot 케이스)
    thread_lock = await _get_thread_lock(request.thread_id)

    try:
        async with thread_lock:
            # advisor [High] 가드: 이미 final_report 존재 (자연 종료 or 조기 종료 완료) 시
            # 중복 처리 방지. 이 경우 빈 done 이벤트로 응답 종결.
            existing_state = graph.get_state(config)
            if existing_state.values and existing_state.values.get("final_report") is not None:
                response_data = {
                    "question": None,
                    "closing_message": INTERVIEW_CLOSING_MESSAGE,
                    "question_count": existing_state.values.get("question_count", 0),
                    "max_questions": DEFAULT_MAX_QUESTIONS,
                    "evaluations": existing_state.values.get("evaluations", []),
                    "is_finished": True,
                    "final_report": existing_state.values.get("final_report"),
                }
                yield json.dumps({"type": "done", "data": response_data}, ensure_ascii=False) + "\n"
                return

            if request.user_answer is None:
                # ──────────────────────────────────────────────────────────
                # First request: initialize graph, stream first question
                # ──────────────────────────────────────────────────────────
                initial_state = {
                    "resume_summary": request.resume_summary or {},
                    "messages": [],
                    "question_count": 0,
                    "max_questions": DEFAULT_MAX_QUESTIONS,
                    "evaluations": [],
                    "final_report": None,
                }

                # Stream first question (Interviewer logic in route handler)
                system = format_interviewer_system(initial_state["resume_summary"], [], 1)

                question_text = ""
                for chunk in llm.stream([SystemMessage(content=system)]):
                    token = chunk.content if hasattr(chunk, 'content') else ""
                    if token:
                        question_text += token
                question_text = ensure_technical_interview_question(question_text, 1)
                yield json.dumps({"type": "token", "value": question_text}, ensure_ascii=False) + "\n"

                # Update state with first question
                initial_state["messages"] = [AIMessage(content=question_text)]
                initial_state["question_count"] = 1
                graph.update_state(config, initial_state)
                print(f"[Stream] First question state updated, question_count=1", flush=True)
            else:
                # ──────────────────────────────────────────────────────────
                # Answer submission: evaluate previous answer, then decide finish/continue.
                # ──────────────────────────────────────────────────────────

                # (1) Get current state
                state = graph.get_state(config)
                current_values = state.values
                existing_messages = current_values.get("messages", [])
                answer_message = HumanMessage(content=request.user_answer)

                # (2) Evaluate answer against the currently pending question.
                state_for_eval = dict(current_values)
                state_for_eval["messages"] = existing_messages + [answer_message]
                eval_result = evaluator_node(state_for_eval)

                current_evaluations = current_values.get("evaluations", [])
                next_evaluations = eval_result.get("evaluations", current_evaluations)
                is_finished = count_valid_evaluations(next_evaluations) >= DEFAULT_MAX_QUESTIONS

                if is_finished:
                    # Last answer: do not generate another question. Persist answer/eval/report only.
                    state_for_report = dict(current_values)
                    state_for_report["messages"] = existing_messages + [answer_message]
                    state_for_report["evaluations"] = next_evaluations
                    state_for_report["max_questions"] = DEFAULT_MAX_QUESTIONS
                    report_result = report_node(state_for_report)

                    graph.update_state(
                        config,
                        {
                            "messages": [answer_message],
                            "evaluations": next_evaluations,
                            "answered_count": count_valid_evaluations(next_evaluations),
                            "max_questions": DEFAULT_MAX_QUESTIONS,
                            "final_report": report_result["final_report"],
                        },
                    )
                    print(
                        f"[Stream] Final answer evaluated, report generated, evaluations={len(next_evaluations)}",
                        flush=True,
                    )
                else:
                    # Continue: use the fresh evaluation context to generate the next question.
                    question_number = count_valid_evaluations(next_evaluations) + 1
                    system = format_interviewer_system(
                        current_values["resume_summary"],
                        window_interviewer_evaluations(next_evaluations),
                        question_number,
                    )
                    messages_for_llm = [SystemMessage(content=system)] + window_interviewer_messages(
                        existing_messages + [answer_message]
                    )

                    question_text = ""
                    for chunk in llm.stream(messages_for_llm):
                        token = chunk.content if hasattr(chunk, 'content') else ""
                        if token:
                            question_text += token
                    question_text = ensure_technical_interview_question(question_text, question_number)
                    yield json.dumps({"type": "token", "value": question_text}, ensure_ascii=False) + "\n"

                    graph.update_state(
                        config,
                        {
                            "messages": [answer_message, AIMessage(content=question_text)],
                            "evaluations": next_evaluations,
                            "question_count": question_number,
                            "max_questions": DEFAULT_MAX_QUESTIONS,
                        },
                    )
                    print(
                        f"[Stream] Answer evaluated and next question streamed, question_count={question_number}",
                        flush=True,
                    )

            # ─────────────────────────────────────────────────────────
            # Build response payload
            # ─────────────────────────────────────────────────────────
            state = graph.get_state(config)
            current_values = state.values

            # A question_count of max_questions means Q20 has been asked, not answered.
            # Natural finish only starts after the max-th evaluation/report exists.
            question_count = current_values.get("question_count", 0)
            evaluations = current_values.get("evaluations", [])
            is_finished = (
                current_values.get("final_report") is not None
                or count_valid_evaluations(evaluations) >= DEFAULT_MAX_QUESTIONS
            )
            response_question_number = question_count if is_finished else _pending_question_number(current_values)

            response_data = {
                "question": None if is_finished else current_values.get("messages", [])[-1].content if current_values.get("messages") else None,
                "closing_message": INTERVIEW_CLOSING_MESSAGE if is_finished else None,
                "question_count": question_count if is_finished else response_question_number,
                "max_questions": DEFAULT_MAX_QUESTIONS,
                **_public_question_metadata(response_question_number),
                "evaluations": evaluations,
                "is_finished": is_finished,
                "final_report": current_values.get("final_report"),
            }

            # Emit "done" event with complete response
            yield json.dumps({"type": "done", "data": response_data}, ensure_ascii=False) + "\n"

    except Exception as e:
        print(f"[Stream Error] {str(e)}", flush=True)
        yield json.dumps({
            "type": "error",
            "code": "stream_error",
            "message": str(e)
        }, ensure_ascii=False) + "\n"


# ─────────────────────────────────────────
# Interview Early Termination API
# ─────────────────────────────────────────
EARLY_TERMINATION_THRESHOLD = 5


class InterviewEndRequest(BaseModel):
    thread_id: str


@app.post("/api/interview/end")
async def end_interview(request: InterviewEndRequest):
    """
    면접 조기 종료 엔드포인트 (Should-S8).

    동작 분기:
    - thread_id 없음 (체크포인트 미존재) → 404
    - 이미 자연 종료 (final_report is not None) → 409
    - 유효 답변 수 < 5 → Case B: discarded=true, final_report=null
    - 유효 답변 수 >= 5 → Case A: 부분 리포트 생성 (is_partial=true, disclaimer 포함)

    race 가드 (advisor [High]):
    - thread_id 단위 asyncio.Lock 으로 chat_stream_generator와 직렬화
    - lock 진입 후 final_report 재확인 (lock 대기 중 자연 종료가 완료될 수 있음)
    """
    thread_id = request.thread_id
    config = {"configurable": {"thread_id": thread_id}}

    # 1) 체크포인트 존재 확인 (lock 밖에서 빠른 체크, 없으면 즉시 404)
    state = graph.get_state(config)
    if not state.values:
        raise HTTPException(status_code=404, detail="해당 thread_id의 면접 세션을 찾을 수 없습니다.")

    # 2) thread 단위 lock 획득 → race condition 방지
    thread_lock = await _get_thread_lock(thread_id)
    async with thread_lock:
        # lock 대기 중 stream이 evaluator/report를 완료했을 수 있으므로 재조회
        state = graph.get_state(config)
        current_values = state.values

        if not current_values:
            raise HTTPException(status_code=404, detail="해당 thread_id의 면접 세션을 찾을 수 없습니다.")

        # 3) 이미 자연 종료 가드 (advisor [Med]: 409 판단 기준 = final_report is not None)
        if current_values.get("final_report") is not None:
            raise HTTPException(status_code=409, detail="이미 면접이 종료되어 리포트가 생성되었습니다.")

        evaluations = current_values.get("evaluations", [])
        max_questions = DEFAULT_MAX_QUESTIONS

        # 4) advisor [High]: 유효 평가 카운트로 임계 재검증
        # JSON 파싱 실패 등으로 evaluations에 stale entry가 들어있을 수 있음
        valid_count = count_valid_evaluations(evaluations)
        answered_count = valid_count  # 응답에 노출되는 카운트는 유효 평가 기준

        print(
            f"[end] thread_id={thread_id} answered_count={answered_count} "
            f"raw_evaluations={len(evaluations)} threshold={EARLY_TERMINATION_THRESHOLD}",
            flush=True,
        )

        # 5) Case B: 유효 답변 < 임계 → 폐기
        if valid_count < EARLY_TERMINATION_THRESHOLD:
            # advisor [High] MemorySaver 누수 가드: final_report에 sentinel 마킹은 안 하지만
            # is_early_terminated=True 로 상태에 기록하여 동일 thread_id 재진입을 막는다.
            # (final_report=None 유지하면 chat_stream에서 다시 진행될 수 있으므로
            #  추가 가드를 위해 sentinel placeholder를 final_report에 기록)
            discarded_report_sentinel = {
                "discarded": True,
                "is_partial": True,
                "answered_count": answered_count,
                "max_questions": max_questions,
                "disclaimer": "답변이 부족하여 리포트가 생성되지 않았습니다.",
            }
            graph.update_state(
                config,
                {
                    "is_early_terminated": True,
                    "answered_count": answered_count,
                    "final_report": discarded_report_sentinel,
                },
            )
            print(
                f"[end] thread_id={thread_id} case=B (discarded) is_partial=true",
                flush=True,
            )
            return {
                "is_early_terminated": True,
                "answered_count": answered_count,
                "max_questions": max_questions,
                "final_report": None,
                "discarded": True,
                "message": "답변이 부족하여 리포트를 생성하지 않았습니다.",
            }

        # 6) Case A: 유효 답변 >= 임계 → 부분 리포트 생성
        # report_node가 is_early_terminated/len(evals)<max_q 를 보고 분기함
        partial_state = dict(current_values)
        partial_state["is_early_terminated"] = True
        partial_state["answered_count"] = answered_count
        partial_state["max_questions"] = max_questions

        report_result = report_node(partial_state)
        final_report = report_result["final_report"]

        # state에 final_report + 플래그 영구 반영 (재진입 시 409 가드)
        graph.update_state(
            config,
            {
                "is_early_terminated": True,
                "answered_count": answered_count,
                "final_report": final_report,
            },
        )

        print(
            f"[end] thread_id={thread_id} case=A answered_count={answered_count} is_partial=true",
            flush=True,
        )

        return {
            "is_early_terminated": True,
            "answered_count": answered_count,
            "max_questions": max_questions,
            "final_report": final_report,
            "evaluations": evaluations,
        }


class InterviewRewindRequest(BaseModel):
    thread_id: str
    target_question_index: int
    source: str


@app.post("/api/interview/rewind")
async def rewind_interview(request: InterviewRewindRequest):
    """
    질문 답변 전 checkpoint로 파괴적 되감기한다 (F-30 B-Lite).

    FE는 checkpoint_id를 몰라도 된다. BE가 thread history에서
    `question_count == target_question_index`,
    `len(evaluations) == target_question_index - 1`,
    마지막 메시지가 AI 질문인 snapshot을 찾아 현재 상태를 그 값으로 복원한다.
    """
    thread_id = request.thread_id
    target = request.target_question_index

    if request.source not in {"page3", "page4"}:
        raise HTTPException(status_code=400, detail="source는 page3 또는 page4여야 합니다.")
    if target < 1:
        raise HTTPException(status_code=400, detail="target_question_index는 1 이상이어야 합니다.")
    if target > DEFAULT_MAX_QUESTIONS:
        raise HTTPException(status_code=400, detail=f"target_question_index는 {DEFAULT_MAX_QUESTIONS} 이하여야 합니다.")

    config = {"configurable": {"thread_id": thread_id}}
    state = graph.get_state(config)
    if not state.values:
        raise HTTPException(status_code=404, detail="해당 thread_id의 면접 세션을 찾을 수 없습니다.")

    thread_lock = await _get_thread_lock(thread_id)
    if thread_lock.locked():
        raise HTTPException(status_code=409, detail="해당 면접 세션이 처리 중입니다. 잠시 후 다시 시도하세요.")

    async with thread_lock:
        state = graph.get_state(config)
        current_values = state.values

        if not current_values:
            raise HTTPException(status_code=404, detail="해당 thread_id의 면접 세션을 찾을 수 없습니다.")

        if _is_discarded_report(current_values.get("final_report")):
            raise HTTPException(status_code=409, detail="폐기된 조기 종료 세션은 되감을 수 없습니다.")

        current_evaluations = current_values.get("evaluations", []) or []
        answered_count = len(current_evaluations)
        if target > answered_count:
            raise HTTPException(status_code=400, detail="이미 답변한 질문만 되감을 수 있습니다.")

        history = list(graph.get_state_history(config))
        snapshot = _find_rewind_snapshot(history, target)
        if snapshot is None:
            raise HTTPException(status_code=409, detail="해당 질문의 답변 전 checkpoint를 찾을 수 없습니다.")

        snapshot_values = dict(snapshot.values or {})
        restored_messages = snapshot_values.get("messages", []) or []
        interrupt_question = _snapshot_interrupt_question(snapshot)
        if interrupt_question:
            last_message = restored_messages[-1] if restored_messages else None
            last_is_same_question = (
                last_message is not None
                and _message_role(last_message) == "ai"
                and _message_content(last_message) == interrupt_question
            )
            if not last_is_same_question:
                restored_messages = [*restored_messages, AIMessage(content=interrupt_question)]

        if restored_messages and _message_role(restored_messages[-1]) == "ai":
            restored_question = _message_content(restored_messages[-1])
            guarded_question = ensure_technical_interview_question(restored_question, target)
            if guarded_question != restored_question:
                restored_messages = [*restored_messages[:-1], AIMessage(content=guarded_question)]

        restored_evaluations = snapshot_values.get("evaluations", []) or []

        restore_update = dict(snapshot_values)
        restore_update["messages"] = _replace_messages_update(restored_messages)
        restore_update["evaluations"] = restored_evaluations
        restore_update["question_count"] = target
        restore_update["max_questions"] = DEFAULT_MAX_QUESTIONS
        restore_update["final_report"] = None
        restore_update["is_early_terminated"] = False
        restore_update["answered_count"] = len(restored_evaluations)

        graph.update_state(config, restore_update)

        restored_state = graph.get_state(config)
        restored_values = restored_state.values
        response_messages = restored_values.get("messages", []) or []
        question = _message_content(response_messages[-1]) if response_messages else None

        print(
            f"[rewind] thread_id={thread_id} target={target} "
            f"kept_evaluations={len(restored_evaluations)} source={request.source}",
            flush=True,
        )

        return {
            "thread_id": thread_id,
            "question": question,
            "question_count": restored_values.get("question_count", target),
            "max_questions": DEFAULT_MAX_QUESTIONS,
            **_public_question_metadata(target),
            "messages": _normalize_messages(response_messages),
            "evaluations": restored_values.get("evaluations", []),
            "final_report": None,
            "is_finished": False,
            "invalidated_from": target,
        }


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint (NDJSON).

    Request: same ChatRequest as /api/chat
    Response: application/x-ndjson with lines:
    - {"type": "token", "value": "<text>"}     (repeated for each token)
    - {"type": "done", "data": {...}}          (final response payload, same structure as /api/chat)
    - {"type": "error", "code": "...", "message": "..."}  (on error)
    """
    return StreamingResponse(
        chat_stream_generator(request),
        media_type="application/x-ndjson"
    )


# ─────────────────────────────────────────
# Debug API
# ─────────────────────────────────────────
class SampleAnswerRequest(BaseModel):
    thread_id: str
    quality_tier: str  # "best", "good", or "bad"


@app.post("/api/debug/sample-answer")
async def sample_answer(request: SampleAnswerRequest):
    """Generate a sample answer for the current pending question at a specified quality tier.

    Used for debugging and testing the interview flow.
    """
    # Validate quality_tier
    valid_tiers = {"best", "good", "bad"}
    if request.quality_tier not in valid_tiers:
        raise HTTPException(
            status_code=400,
            detail=f"quality_tier must be one of {sorted(valid_tiers)}"
        )

    # Check if interview session has started (has pending question)
    # Support both sync flow (interrupts) and stream flow (messages)
    config = {"configurable": {"thread_id": request.thread_id}}
    state = graph.get_state(config)
    current_values = state.values

    has_pending_question = False

    # Check 1: Interrupt exists (sync /api/chat flow)
    interrupts = []
    for task in state.tasks:
        interrupts.extend(task.interrupts)

    if interrupts:
        has_pending_question = True

    # Check 2: Last message is AI message (stream /api/chat/stream flow)
    if not has_pending_question:
        messages = current_values.get("messages", [])
        if messages:
            last_message = messages[-1]
            if hasattr(last_message, '__class__'):
                msg_type = type(last_message).__name__
                if "AIMessage" in msg_type:
                    has_pending_question = True
            elif isinstance(last_message, dict) and last_message.get("type") == "ai":
                has_pending_question = True

    if not has_pending_question:
        raise HTTPException(
            status_code=400,
            detail="면접이 시작되지 않았습니다. 먼저 /api/chat로 면접을 시작하세요."
        )

    try:
        result = generate_sample_answer.invoke({
            "thread_id": request.thread_id,
            "quality_tier": request.quality_tier
        })
        return {
            "answer": result["answer"],
            "expected_score_range": result["expected_score_range"]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate sample answer: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
