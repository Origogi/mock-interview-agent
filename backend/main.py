from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import tempfile
from dotenv import load_dotenv
from agent import graph, parser_graph
from langgraph.types import Command
from tools import generate_sample_answer

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
    config = {"configurable": {"thread_id": request.thread_id}}
    state = graph.get_state(config)
    current_values = state.values

    interrupts = []
    for task in state.tasks:
        interrupts.extend(task.interrupts)

    if not interrupts:
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
