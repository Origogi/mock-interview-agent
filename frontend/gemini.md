# 🎨 Frontend UI/UX Architecture

본 문서는 프론트엔드(React + Vite) 시스템의 핵심 설계와 기술 스펙을 정의합니다.

## 1. 기술 스택 (Tech Stack)
* **Framework:** React (Vite)
* **Styling & UI Library:** MUI (Material-UI) v5
* **Animations:** Framer Motion
* **Icons:** Lucide React
* **Charts:** Recharts (예정 - 결과 리포트용)

## 2. 디자인 시스템 (Design System)
* **테마 (Theme):** 다크 모드 (Sleek Dark Mode)
* **주요 컬러 (Palette):**
  * Primary: `#7c3aed` (Vibrant Purple)
  * Secondary: `#06b6d4` (Cyan)
  * Background: `#0f172a` (Slate 900)
* **타이포그래피:** Google Fonts `Inter`
* **주요 UI 요소:**
  * **Glassmorphism:** 반투명 배경과 블러(`backdrop-filter: blur(16px)`)를 활용한 고급스러운 카드 UI
  * **Mesh Gradients:** 단조로운 배경을 피하기 위한 방사형(Radial) 그라데이션 포인트

## 3. 화면 흐름도 및 상태 관리 (Page Flow)

프론트엔드는 React의 상태(`useState`)를 활용하여 Single Page Application(SPA) 내에서 화면(Page 1~4)을 전환합니다.

### 📌 Page 1: 홈 화면 (Home & Setup)
* **상태:** `currentPage = 'home'`
* **기능:** 드래그 앤 드롭을 통한 이력서 PDF 선택 및 업로드
* **API 호출:** `POST /api/upload` (OpenAI Files API 연동)
* **특징:** 서버 상태(API Connected/Offline)를 실시간으로 확인하는 신호등 인디케이터(Top-Right) 포함. 업로드 실패 시 하단 `Snackbar` 에러 팝업 표시.

### 📌 Page 2: 이력서 요약 화면 (Resume Summary)
* **상태:** `currentPage = 'summary'`
* **기능:** 백엔드에서 반환된 이력서 분석 결과(더미/실제 데이터)를 시각적으로 확인.
* **UI 구성:** 기술 스택, 주목할 만한 프로젝트, 예상되는 집중 질문 포인트를 각각 분리된 카드 형태로 렌더링.

### 📌 Page 3: 실전 면접 채팅 화면 (The Interview) - *개발 예정*
* **상태:** `currentPage = 'interview'`
* **기능:** 실제 면접관(AI)과 대화를 나누는 메인 챗봇 인터페이스.
* **UI 구성:**
  * 좌측 사이드바: 아코디언(Expander) 형태의 면접 평가 히스토리 로깅
  * 중앙 메인: 챗봇 대화창 및 사용자 입력(Input)

### 📌 Page 4: 최종 결과 리포트 화면 (Result Dashboard) - *개발 예정*
* **상태:** `currentPage = 'result'`
* **기능:** 면접 종료 후 종합 평가 시각화.
* **UI 구성:** 6대 역량 육각형 레이더 차트, 강점 및 약점 피드백 아코디언.
