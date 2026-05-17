# 🎨 Frontend — UI/UX 아키텍처

본 폴더는 React + Vite 기반의 사용자 인터페이스 코드입니다.

## 1. 기술 스택

| 영역 | 사용 기술 |
|------|---------|
| Framework | React (Vite) |
| Routing | 단일 컴포넌트(`App.jsx`) 내부 `useState` 기반 SPA 전환 (외부 라우터 미사용) |
| Animation | CSS keyframes/transitions + `<PageTransition>` |
| Charts | 세션별 요약 카드 + 커스텀 SVG 레이더 차트 (`ReportPage.jsx`) |
| Styling | CSS-only (Glassmorphism 디자인 시스템) |
| Icons | Lucide React (Page 1, 4) |

## 2. 디자인 시스템

Phase 5에서 Apple-style 미니멀리즘으로 전환. Page 1/2/3/4 적용 완료.

| 항목 | 값 |
|------|---|
| 테마 | 다크 모드 (`--bg: #000`) |
| Accent | `#6e74ff` (정의: `--accent` CSS variable) |
| 폰트 (디스플레이) | Inter Display 계열 (`--font-display`) |
| 폰트 (한글) | Pretendard |
| Border Radius | 12px / 18px (input/bubble) / pill (`--radius-pill`) |
| 모션 | `cubic-bezier(0.22, 0.61, 0.36, 1)` 일관 적용, `prefers-reduced-motion` 가드 |

CSS 토큰은 `src/index.css` 상단 + `src/tokens.css` 에 정의되어 있고, 페이지별 컴포넌트(`HomePage.jsx`, `SummaryPage.jsx`, `InterviewPage.jsx`, `ReportPage.jsx`)에서 일관 사용합니다.

> Page 4 리디자인은 `ReportPage.jsx` + `HeroScore.jsx` + 세션별 카드/상세 피드백 + CSS-only 레이더 구조로 적용 완료되었습니다.

## 3. 화면 흐름 (Page Flow)

`App.jsx`가 `currentPage` 상태(`'home' | 'summary' | 'interview' | 'report'`)로 SPA 전환을 제어하고, 각 페이지는 별도 컴포넌트로 분리되어 있습니다. `<PageTransition>` 으로 zoom + blur cross-fade.

| Page | currentPage | 컴포넌트 | 기능 |
|------|------------|---------|------|
| Page 1 | `home` | `pages/HomePage.jsx` | 이력서 PDF 드래그&드롭 업로드, 서버 상태 인디케이터, 샘플 이력서 빠른 진입 |
| Page 2 | `summary` | `pages/SummaryPage.jsx` | 분석 로더 → 결과(stat row + 경력 + 스택 + 프로젝트 + 강점/약점) 렌더링 |
| Page 3 | `interview` | `pages/InterviewPage.jsx` | 좌 레일(20문항/4세션 진행률 + 문항 상태 + 평가 카드) + 중앙 채팅 + 샘플 답변 + 조기 종료 + 타임머신 진입 |
| Page 4 | `report` | `pages/ReportPage.jsx` | HeroScore + 세션별 요약 카드 + 4세션 커스텀 SVG 레이더 차트 + 세션별 문항 피드백 + 다시 답변하기 |

## 4. 면접 UI 정책

- 전체 면접은 총 20문항입니다.
- 세션은 고정 순서로 진행됩니다: `cs_fundamentals` Q1~Q5, `framework_usage` Q6~Q10, `problem_solving` Q11~Q15, `communication` Q16~Q20.
- 질문 내용은 백엔드에서 동적으로 생성되지만, 세션 순서와 문항 범위는 프론트엔드에서도 `src/utils/interviewPolicy.js` 기준으로 보강합니다.
- 현재 질문 번호는 백엔드 메타가 유효하면 우선 사용하고, 없거나 과거 값이면 `evaluations.length + 1`로 계산합니다.
- 조기 종료 부분 리포트는 최소 5개 답변부터 허용합니다.
- 세션 점수는 세션 내 5개 문항 점수의 단순 평균입니다. 5문항이 채워지지 않은 세션은 `평가 부족`으로 표시합니다.
- 타임머신은 선택한 Qn부터 Q20까지 전체 답변·평가·리포트를 무효화합니다. 세션 경계는 무효화 범위를 끊지 않습니다.

## 5. 주요 UI 구현

- `App.jsx`가 전체 세션 상태와 페이지 전환을 관리합니다.
- `PageTransition`은 페이지 간 zoom + blur cross-fade를 담당합니다.
- `InterviewPage.jsx`는 면접 메시지, 4세션 진행 레일, 문항 상태, 평가 카드, 입력창, 조기 종료 진입점, 샘플 답변 진입점을 렌더링합니다.
- `ReportPage.jsx`는 최종 리포트, 부분 리포트 배지, 세션별 요약 카드, 세션별 문항 상세 피드백, 타임머신 진입점을 렌더링합니다.
- `SampleAnswerButton.jsx`는 Best/Good/Bad 샘플 답변 드롭업을 담당합니다.
- `EarlyEndModal.jsx`는 조기 종료 확인과 5답변 기준 부분 리포트 안내 문구를 담당합니다.

### 면접 스트리밍 처리

- 기본 면접 진행은 `/api/chat/stream`을 먼저 사용합니다.
- 스트림 응답은 토큰 reveal queue로 받아 화면에 순차 표시합니다.
- 스트리밍 실패 시 동기 `/api/chat` 호출로 폴백합니다.
- 스트리밍 중에는 입력, 샘플 답변, 조기 종료 일부 상태를 잠가 중복 액션을 방지합니다.
- 조기 종료가 스트리밍 중 실행되면 `AbortController`로 진행 중인 요청을 중단합니다.

### 스크롤/입력 UX

- 답변 제출 직후 사용자 답변 버블을 viewport 상단에 pin합니다.
- AI 응답 스트리밍 중에는 하단을 자동 추종합니다.
- 사용자가 직접 위로 스크롤하면 자동 추종을 끕니다.
- 한글 IME 입력 중 Enter 오동작을 막습니다.
- textarea에는 멀티라인과 Tab 들여쓰기를 지원합니다.

### 타임머신 UI

- Page 3 완료 평가 카드에서 `답변 전으로 되감기` 액션을 제공합니다.
- Page 4 문항 상세에서 `이 질문 다시 답변하기` 액션을 제공합니다.
- 실행 전 확인 모달을 띄우고, 이후 전역 full-cover 오버레이로 라우팅과 상태 변경을 가립니다.
- 오버레이 완료 상태는 짧게 유지하고 fade out 중심으로 종료합니다.
- `prefers-reduced-motion`에서는 짧은 fade 전환으로 대체합니다.

## 6. API 연동

| 메서드 | 경로 | 용도 |
|--------|-----|------|
| `GET` | `/` | 백엔드 헬스체크 (5s 폴링) |
| `POST` | `/api/upload` | 이력서 PDF 업로드 |
| `POST` | `/api/chat` | 동기 면접 진행 폴백 |
| `POST` | `/api/chat/stream` | 스트리밍 면접 진행 |
| `POST` | `/api/interview/end` | 면접 조기 종료 |
| `POST` | `/api/interview/rewind` | 특정 질문 답변 전 상태로 되감기 |
| `POST` | `/api/debug/sample-answer` | 디버그용 샘플 답변 생성 |

API base URL은 `VITE_API_BASE_URL`로 지정합니다. 로컬 기본값은 `http://localhost:8000`입니다.

```env
VITE_API_BASE_URL=https://<backend-domain>
```

백엔드 CORS allowlist는 배포 환경에서 `BACKEND_CORS_ORIGINS`로 프론트엔드 domain을 허용해야 합니다. Vite가 로컬에서 다른 포트로 fall back하면 `lsof -i :5173` 으로 점검 후 정리합니다.

Railway 배포는 `frontend/railway.toml`, `Dockerfile`, `Caddyfile`을 사용합니다. 서비스 설정은 Root Directory `/frontend`, Config File Path `/frontend/railway.toml`입니다.

## 7. 실행

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npx vite build       # 프로덕션 빌드 (dist/)
```

또는 모노레포 루트에서:
```bash
bash run-dev.sh      # 백엔드 + 프론트 동시 시작
bash stop-dev.sh     # 종료
```
