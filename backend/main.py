from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import tempfile
from openai import OpenAI
from dotenv import load_dotenv
import PyPDF2
import json

load_dotenv() # Load variables from .env

app = FastAPI(title="Tech-Interviewer API")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# CORS middleware to allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], # React default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthCheck(BaseModel):
    status: str

@app.get("/", response_model=HealthCheck)
def read_root():
    return {"status": "Backend is running!"}

# TODO: Add API endpoints for LangGraph agent (e.g., /api/chat)

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    return text

def parse_resume_with_llm(text: str) -> dict:
    prompt = """
    You are an expert technical recruiter and software engineer.
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
    }
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Resume Text:\n{text[:10000]}"} # Limit text size just in case
            ],
            response_format={"type": "json_object"},
            temperature=0.2
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"LLM Parsing error: {e}")
        return {"bio": "", "work_experience": [], "tech_stack": [], "projects": [], "strengths": [], "weaknesses": []}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    try:
        # 1. Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name
            
        # 2. Upload to OpenAI Files API for Assistants/Vector Store
        with open(tmp_path, "rb") as f:
            openai_file = client.files.create(
                file=f,
                purpose="assistants"
            )
            
        # 2.5 Extract text from PDF
        extracted_text = extract_text_from_pdf(tmp_path)
            
        # 2.6 Parse text with LLM
        parsed_resume = parse_resume_with_llm(extracted_text)
            
        # 3. Clean up temp file
        os.remove(tmp_path)
        
        return {
            "status": "success",
            "message": "File successfully uploaded and parsed",
            "file_id": openai_file.id,
            "filename": file.filename,
            "parsed_data": parsed_resume
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI File Upload failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
