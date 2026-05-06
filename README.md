# 👔 Tech-Interviewer AI (AI 맞춤형 압박 면접관)

![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=Streamlit&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

> **Nomad Coder AI Agent Challenge - Final Round 제출작**  
> 내 이력서를 기반으로 실제 기술 면접처럼 날카로운 꼬리 질문을 던지고, 종료 후 종합 리포트를 제공하는 AI 면접 트레이닝 서비스입니다.

---

## 📌 기획 의도 및 배경
기존의 면접 대비 챗봇들은 "객체지향이란 무엇인가요?"와 같은 정형화된 질문만 반복합니다. 실제 면접의 긴장감이나, 내 이력서를 파고드는 **'꼬리 질문'**을 반영하지 못하는 한계를 극복하고자 기획되었습니다. 사용자의 실제 이력서(PDF)를 파싱하여 **개인화된 문맥(Context)**을 부여하고, 답변 수준에 따라 다이나믹하게 다음 질문을 결정하는 능동형 에이전트를 목표로 합니다.

## ✨ 핵심 기능 (Key Features)

1. **📄 이력서 기반 맞춤형 질문 (RAG)**
   * 업로드된 이력서(PDF)에서 핵심 프로젝트와 기술 스택을 추출하여 맞춤형 첫 질문 생성
2. **🎯 동적 꼬리 질문 (Dynamic Routing)**
   * 사용자의 답변을 실시간으로 분석하여, 논리가 부족하거나 검증이 더 필요한 경우 집요하게 파고드는 꼬리 질문 생성
3. **📊 종합 평가 리포트 (Visualized Feedback)**
   * 면접 종료 시 6대 역량(CS지식, 프레임워크, 문제해결력 등)을 육각형 레이더 차트로 시각화
   * 내 답변과 'AI가 제안하는 모범 답안(Best Practice)' 교차 비교 피드백 제공

## 🛠 기술 스택 (Tech Stack)

* **Frontend:** Streamlit, Plotly (차트 시각화)
* **Backend & Agent:** Python, LangGraph, LangChain
* **LLM:** OpenAI (`gpt-4o-mini`)
* **Data Processing:** PyPDF2 (이력서 텍스트 파싱)

## 🏗 시스템 아키텍처 (LangGraph Workflow)

본 서비스는 단순 1회성 챗봇이 아닌 **상태 기반 워크플로우(State-based Workflow)**를 가지는 에이전트 시스템입니다.

* **State:** `[이력서 텍스트, 채팅 기록, 현재 질문 횟수, 평가 결과 리스트]`
* **Nodes & Routing:**
  1. `Resume Parser`: PDF에서 텍스트를 추출하고 핵심 역량 구조화
  2. `Interviewer`: 이력서 정보 및 이전 대화 기록을 바탕으로 질문/꼬리 질문 생성
  3. `Evaluator`: 사용자 답변의 정확성, 논리성(STAR 기법) 평가 및 점수화
  4. `Report Generator`: 지정된 횟수(예: 3~5회) 질의응답 종료 후 종합 레이더 차트 및 피드백 출력

## 🚀 실행 방법 (Getting Started)

### 1. 필수 패키지 설치
```bash
pip install streamlit PyPDF2 plotly langchain langgraph openai
```

### 2. 환경 변수 설정
루트 디렉토리에 `.env` 파일을 생성하고 OpenAI API 키를 입력합니다.
```env
OPENAI_API_KEY="your-api-key-here"
```

### 3. 애플리케이션 실행
```bash
streamlit run app.py
```

## 📂 기획 및 설계 문서
상세한 기획 및 에이전트 프롬프트 전략은 아래 문서를 참고해주세요.
* [proposal.md](./proposal.md) - 상세 기획서 및 UI/UX 전략
* [gemini.md](./gemini.md) - 에이전트 설계 및 프롬프트 전략
