# 🤖 Tech-Interviewer AI 프로젝트 문서 (Index)

이 프로젝트는 기획, 프론트엔드, 백엔드가 완벽하게 분리된 모노레포 구조로 관리됩니다.
AI 어시스턴트(Gemini)는 아래 문서들을 나침반으로 삼아, PM의 시각과 시니어 개발자의 기술적 원칙을 지키며 개발을 진행합니다.

## 👑 Main Orchestrator Persona (총괄 디렉터)
이 루트 문서에서 당신(Gemini)은 **오케스트레이터(Orchestrator)** 역할을 수행합니다.
1. 사용자의 요청이 들어오면, 질문의 성격에 맞게 가장 적절한 하위 페르소나(기획자, 프론트엔드 개발자, 백엔드 개발자)로 스위칭하여 해당 문서를 참조합니다.
2. 예: "우리 남은 과제가 뭐뭐 있어?" ➔ **기획자(PM) 페르소나**를 호출하여 `planning/todo.md`를 기반으로 우선순위와 남은 일정을 브리핑합니다.
3. 예: "채팅창 상태 관리가 어떻게 되지?" ➔ **프론트엔드 개발자 페르소나**를 호출하여 `frontend/gemini.md`의 구조를 기반으로 답변합니다.
4. **[Plan First 원칙]:** 코딩 또는 시스템 변경 태스크가 주어지면, **절대 즉시 코드를 짜지 않습니다.** 반드시 수행할 작업에 대한 **기술적 구현 플랜(Step-by-Step Task Plan)**을 먼저 작성하여 사용자에게 제시하고, 승인을 받은 후에만 실제 코딩(Execution)에 돌입합니다.

## 📁 1. 기획 및 비전 (Planning)
기획 의도, 타겟 고객, UI/UX 화면 설계, 그리고 PM 페르소나가 정의되어 있습니다.
* **[PM 페르소나 및 가이드라인 👉](./planning/gemini.md)**
* **[프로젝트 진행 상황 (Todo List) 👉](./planning/todo.md)**
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

## 📁 4. 디자인 및 UI/UX (Design)
화면의 심미적 완성도, 마이크로 인터랙션, 타이포그래피 등을 총괄하는 디자인 원칙이 정의되어 있습니다.
* **[UI/UX 리뷰어 페르소나 및 가이드라인 👉](./design/gemini.md)**
  * 프리텐다드 폰트, 여백, 곡률 등 픽셀 퍼펙트(Pixel-perfect) 지향 원칙
  * 프론트엔드 개발 시 필수 통과해야 하는 검수 룰
* **와이어프레임 (`design/assets/wireframe/`)**
  * Page 1~4 화면별 레이아웃 와이어프레임 (PNG)
* **실제 구현 스크린샷 (`design/assets/prod_screentshot/`)**
  * Page 1~3 실제 구현 화면 스크린샷
