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
    INTERVIEWER_SYSTEM,
    evaluator_node,
    report_node,
    count_valid_evaluations,
)
from langgraph.types import Command
from tools import generate_sample_answer
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage

load_dotenv() # Load variables from .env

app = FastAPI(title="Tech-Interviewer API")

# CORS middleware to allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthCheck(BaseModel):
    status: str


# ─────────────────────────────────────────
# Thread-level Lock Manager (advisor [High] race guard)
# ─────────────────────────────────────────
# 조기 종료(`/api/interview/end`)와 자연 종료(`chat_stream_generator`의 5턴 분기)가
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

@app.get("/", response_model=HealthCheck)
def read_root():
    return {"status": "Backend is running!"}

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
            "max_questions": 5,
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
        return {
            "question": interrupts[0].value,
            "question_count": current_values.get("question_count", 0) + 1,
            "evaluations": current_values.get("evaluations", []),
            "is_finished": False,
            "final_report": None,
        }
    else:
        # 면접 종료: 최종 리포트 반환
        return {
            "question": None,
            "question_count": current_values.get("question_count", 0),
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
    - Flow: Stream question tokens → complete question → Evaluator/Report run → emit done event

    Implementation:
    1. If user_answer is None (first request): Initialize graph state, stream first question
    2. If user_answer provided: Evaluate previous answer, stream next question, run report if needed
    3. After streaming: emit "done" event with final response payload
    """
    config = {"configurable": {"thread_id": request.thread_id}}

    # advisor [High]: thread_id 단위 lock 으로 `/api/interview/end`와의 race 방지
    # (5턴째 report_node 호출과 동시에 /end가 들어오는 케이스, stream 도중 stale snapshot 케이스)
    thread_lock = await _get_thread_lock(request.thread_id)

    try:
        async with thread_lock:
            # advisor [High] 가드: 이미 final_report 존재 (자연 종료 or 조기 종료 완료) 시
            # 중복 처리 방지. 이 경우 빈 done 이벤트로 응답 종결.
            existing_state = graph.get_state(config)
            if existing_state.values and existing_state.values.get("final_report") is not None:
                response_data = {
                    "question": None,
                    "question_count": existing_state.values.get("question_count", 0),
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
                    "max_questions": 5,
                    "evaluations": [],
                    "final_report": None,
                }

                # Stream first question (Interviewer logic in route handler)
                resume_str = json.dumps(initial_state["resume_summary"], ensure_ascii=False, indent=2)
                system = INTERVIEWER_SYSTEM.format(resume_summary=resume_str, evaluations="없음 (첫 번째 질문)")

                question_text = ""
                for chunk in llm.stream([SystemMessage(content=system)]):
                    token = chunk.content if hasattr(chunk, 'content') else ""
                    if token:
                        question_text += token
                        yield json.dumps({"type": "token", "value": token}, ensure_ascii=False) + "\n"

                # Update state with first question
                initial_state["messages"] = [AIMessage(content=question_text)]
                initial_state["question_count"] = 1
                graph.update_state(config, initial_state)
                print(f"[Stream] First question state updated, question_count=1", flush=True)
            else:
                # ──────────────────────────────────────────────────────────
                # Answer submission: evaluate previous answer, stream next question
                # ──────────────────────────────────────────────────────────

                # (1) Get current state
                state = graph.get_state(config)
                current_values = state.values

                # (2) Stream next question (Interviewer logic)
                resume_str = json.dumps(current_values["resume_summary"], ensure_ascii=False, indent=2)
                evals_str = (
                    json.dumps(current_values.get("evaluations", []), ensure_ascii=False, indent=2)
                    if current_values.get("evaluations")
                    else "없음 (첫 번째 질문)"
                )
                system = INTERVIEWER_SYSTEM.format(resume_summary=resume_str, evaluations=evals_str)

                existing_messages = current_values.get("messages", [])
                messages_for_llm = [SystemMessage(content=system)] + existing_messages + [HumanMessage(content=request.user_answer)]

                question_text = ""
                for chunk in llm.stream(messages_for_llm):
                    token = chunk.content if hasattr(chunk, 'content') else ""
                    if token:
                        question_text += token
                        yield json.dumps({"type": "token", "value": token}, ensure_ascii=False) + "\n"

                # (3) Update state: add answer + next question
                updated_messages = existing_messages + [
                    HumanMessage(content=request.user_answer),
                    AIMessage(content=question_text)
                ]

                updated_state = {
                    "resume_summary": current_values["resume_summary"],
                    "messages": updated_messages,
                    "question_count": current_values.get("question_count", 0) + 1,
                    "max_questions": current_values.get("max_questions", 5),
                    "evaluations": current_values.get("evaluations", []),
                    "final_report": current_values.get("final_report"),
                }

                # (4) Evaluate the answer (against previous question, not the question we just generated)
                eval_result = evaluator_node(updated_state)
                updated_state.update(eval_result)

                # (5) Generate report if max_questions reached
                if updated_state["question_count"] >= updated_state["max_questions"]:
                    report_result = report_node(updated_state)
                    updated_state.update(report_result)

                # Save updated state
                graph.update_state(config, updated_state)
                print(f"[Stream] Answer evaluated and next question state updated, question_count={updated_state['question_count']}", flush=True)

            # ─────────────────────────────────────────────────────────
            # Build response payload
            # ─────────────────────────────────────────────────────────
            state = graph.get_state(config)
            current_values = state.values

            # Check if interview is finished (no more questions OR max reached)
            question_count = current_values.get("question_count", 0)
            max_questions = current_values.get("max_questions", 5)
            is_finished = (question_count >= max_questions) or current_values.get("final_report") is not None

            response_data = {
                "question": None if is_finished else current_values.get("messages", [])[-1].content if current_values.get("messages") else None,
                "question_count": question_count,
                "evaluations": current_values.get("evaluations", []),
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
EARLY_TERMINATION_THRESHOLD = 3  # TPM 결정 (PM 추천 2 → TPM 3)


class InterviewEndRequest(BaseModel):
    thread_id: str


@app.post("/api/interview/end")
async def end_interview(request: InterviewEndRequest):
    """
    면접 조기 종료 엔드포인트 (Should-S8).

    동작 분기:
    - thread_id 없음 (체크포인트 미존재) → 404
    - 이미 자연 종료 (final_report is not None) → 409
    - 유효 답변 수 < 3 → Case B: discarded=true, final_report=null
    - 유효 답변 수 >= 3 → Case A: 부분 리포트 생성 (is_partial=true, disclaimer 포함)

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
        max_questions = current_values.get("max_questions", 5)

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
    uvicorn.run(app, host="0.0.0.0", port=8000)
