# 🤖 Tech-Interviewer AI 프로젝트 문서 (Index)

이 프로젝트는 기획, 프론트엔드, 백엔드가 완벽하게 분리된 모노레포 구조로 관리됩니다.
AI 어시스턴트(Gemini)는 아래 문서들을 나침반으로 삼아, PM의 시각과 시니어 개발자의 기술적 원칙을 지키며 개발을 진행합니다.

## 📁 1. 기획 및 비전 (Planning)
기획 의도, 타겟 고객, UI/UX 화면 설계, 그리고 PM 페르소나가 정의되어 있습니다.
* **[PM 페르소나 및 가이드라인 👉](./planning/gemini.md)**
* [프로젝트 기획서 (Proposal) 👉](./planning/proposal.md)
* [UI/UX 스토리보드 (Storyboard) 👉](./planning/storyboard.md)
* [기능 명세 및 백로그 (Features) 👉](./planning/features.md)

## 📁 2. 프론트엔드 (Frontend)
React 기반의 사용자 인터페이스 구조와 상태 관리 로직이 정의되어 있습니다.
* **[프론트엔드 아키텍처 설계서 👉](./frontend/gemini.md)**
  * React + Vite 구조 및 다크 모드(Glassmorphism) 디자인 시스템
  * 화면 흐름(Page 1~4) 및 상태(`useState`) 관리 로직

## 📁 3. 백엔드 (Backend)
FastAPI 서버와 LangChain/LangGraph 기반의 AI 에이전트 구조가 정의되어 있습니다.
* **[백엔드 (LangGraph) 아키텍처 설계서 👉](./backend/gemini.md)**
  * FastAPI + `uv` 패키지 매니저 환경 구조
  * LangGraph 상태 머신 다이어그램 (Mermaid) 및 State 정의
  * 각 Node별(Parser, Interviewer, Evaluator) 역할 및 프롬프트 엔지니어링 전략
