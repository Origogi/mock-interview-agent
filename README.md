# 👔 Tech-Interviewer AI (AI 맞춤형 압박 면접관)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
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

* **Frontend:** React (Vite), CSS-only (Glassmorphism), Framer Motion, Recharts (차트 시각화)
* **Backend & Agent:** Python, FastAPI, LangGraph, LangChain
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

### 1. 백엔드 (Backend) 설정
```bash
cd backend
uv sync
```
루트 디렉토리 또는 `backend` 폴더에 `.env` 파일을 생성하고 OpenAI API 키를 입력합니다.
```env
OPENAI_API_KEY="your-api-key-here"
```

### 2. 프론트엔드 (Frontend) 설정
```bash
cd frontend
npm install
```

### 3. 애플리케이션 실행 (Monorepo)
터미널을 두 개 열어서 각각 실행합니다.

**Terminal 1 (Backend)**
```bash
cd backend
uv run uvicorn main:app --reload
```

**Terminal 2 (Frontend)**
```bash
cd frontend
npm run dev
```

## 📂 기획 및 설계 문서 (Index)
이 프로젝트는 기획, 프론트엔드, 백엔드가 완벽하게 분리된 모노레포 구조로 관리됩니다. 상세 아키텍처 및 기획 문서는 각 폴더의 README를 참고해 주세요.

### 1. 기획 및 비전 (Planning)
* **[기획 폴더 README](./planning/README.md)** — 핵심 가치 및 문서 인덱스
* [프로젝트 진행 상황 (Todo List)](./planning/todo.md)
* [프로젝트 기획서 (Proposal)](./planning/proposal.md)
* [UI/UX 스토리보드 (Storyboard)](./planning/storyboard.md)
* [기능 명세 및 백로그 (Features)](./planning/features.md)

### 2. 기술 스펙 (Tech Specs)
* [프론트엔드 아키텍처 (React + Vite)](./frontend/README.md)
* [백엔드 아키텍처 (FastAPI + LangGraph)](./backend/README.md)

### 3. 디자인 (Design)
* **[디자인 폴더 README](./design/README.md)** — 디자인 원칙, 검수 체크리스트, 에셋 인덱스
* v2 프로토타입: `design/assets/redesign/v1-redesign.html`
* 와이어프레임 (`design/assets/wireframe/`)
  * [Page 1 — 홈](./design/assets/wireframe/wireframe_page1.png)
  * [Page 2 — 이력서 요약](./design/assets/wireframe/wireframe_page2.png)
  * [Page 3 — 면접 채팅 (Collapsed)](./design/assets/wireframe/wireframe_page3_collapsed.png)
  * [Page 3 — 면접 채팅 (Expanded)](./design/assets/wireframe/wireframe_page3_expanded.png)
  * [Page 4 — 결과 리포트](./design/assets/wireframe/wireframe_page4.png)
