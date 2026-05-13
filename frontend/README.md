# 🎨 Frontend — UI/UX 아키텍처

본 폴더는 React + Vite 기반의 사용자 인터페이스 코드입니다.

## 1. 기술 스택

| 영역 | 사용 기술 |
|------|---------|
| Framework | React (Vite) |
| Routing | 단일 컴포넌트(`App.jsx`) 내부 `useState` 기반 SPA 전환 (외부 라우터 미사용) |
| Animation | CSS keyframes/transitions + `<PageTransition>` |
| Charts | 커스텀 SVG 레이더 차트 (`ReportPage.jsx`) |
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

> Page 4 리디자인은 `ReportPage.jsx` + `HeroScore.jsx` + CSS-only 레이더/아코디언 구조로 적용 완료되었습니다.

## 3. 화면 흐름 (Page Flow)

`App.jsx`가 `currentPage` 상태(`'home' | 'summary' | 'interview' | 'report'`)로 SPA 전환을 제어하고, 각 페이지는 별도 컴포넌트로 분리되어 있습니다. `<PageTransition>` 으로 zoom + blur cross-fade.

| Page | currentPage | 컴포넌트 | 기능 |
|------|------------|---------|------|
| Page 1 | `home` | `pages/HomePage.jsx` | 이력서 PDF 드래그&드롭 업로드, 서버 상태 인디케이터 |
| Page 2 | `summary` | `pages/SummaryPage.jsx` | 분석 로더 → 결과(stat row + 경력 + 스택 + 프로젝트 + 강점/약점) 렌더링 |
| Page 3 | `interview` | `pages/InterviewPage.jsx` | 좌 레일(진행률 + 평가 카드) + 중앙 채팅 (Claude-style 토큰 fade) |
| Page 4 | `report` | `pages/ReportPage.jsx` | HeroScore + 4대 역량 커스텀 SVG 레이더 차트 + 문항별 CSS 아코디언 |

## 4. API 연동

| 메서드 | 경로 | 용도 |
|--------|-----|------|
| `POST` | `/api/upload` | 이력서 PDF 업로드 → Resume Parser |
| `POST` | `/api/chat` | 면접 답변 제출 → 평가 + 다음 질문 (또는 최종 리포트) |
| `GET` | `/` | 백엔드 헬스체크 (5s 폴링) |

백엔드 CORS allowlist는 `localhost:5173`, `5174`, `3000`. Vite가 다른 포트로 fall back하면 `lsof -i :5173` 으로 점검 후 정리.

## 5. 실행

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
