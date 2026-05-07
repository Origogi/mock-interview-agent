from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import tempfile
from openai import OpenAI
from dotenv import load_dotenv

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
            
        # 3. Clean up temp file
        os.remove(tmp_path)
        
        return {
            "status": "success",
            "message": "File successfully uploaded to OpenAI",
            "file_id": openai_file.id,
            "filename": file.filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI File Upload failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
