# ✅ 프로젝트 진행 상황 (Progress Tracker)

본 문서는 **진행 추적**용 체크리스트입니다. **무엇을 할지 / 우선순위**는 [`features.md`](./features.md)의 백로그가 SSOT입니다.

- 📋 [백로그 보러가기](./features.md#2--백로그-backlog) — 🔴Must / 🟡Should / 🟢Nice / ⚫Icebox
- 🎯 다음 작업 = features.md의 Must 최상단부터
- 📌 **[작업 잠금 규칙](./features.md#-작업-잠금-컨벤션-in-progress-locking)** — 멀티 세션 병렬 작업 시 진행 중 항목을 `[~] 항목명 🔄 (세션: <tag>, since: HH:MM)` 형식으로 마킹

---

## 🎯 데모데이 정보

| 항목 | 일시 |
|------|------|
| **데모데이** | 2026-05-19 (화) 20:00 (D-9) |
| **내부 데드라인** | 2026-05-18 (월) |
| **준비 기간** | 2026-05-10 ~ 2026-05-18 (9일, 평일 6일 + 주말 2일 포함) |

---

## 완료된 마일스톤

### 🏗 Phase 1: 인프라 및 환경 셋업
React+Vite+MUI 스캐폴딩 / FastAPI+`uv` 세팅 / 모노레포 문서화 / OpenAI API Key / VSCode·gitignore

### 📄 Phase 2: 이력서 업로드 및 요약
Page 1 Glassmorphism / 백엔드 상태 인디케이터 / PDF 업로드 API / OpenAI Files API / Page 2 요약 화면 / Resume Parser 노드 / LLM JSON 파싱 / 진짜 데이터 연동

### 💬 Phase 3: 실전 면접 채팅
Page 3 챗봇 UI / 진행도·평가 아코디언 / LangGraph `InterviewState` / Interviewer 노드 / Evaluator 노드 / Interrupt 기반 통신

### 📊 Phase 4: 최종 리포트 화면
Report Generator 노드 / Page 4 레이더 차트 / 문항별 피드백 아코디언 / 면접 다시 시작

---

## 🎨 Phase 5: UX/UI 고도화 (진행 중)

### 5.1 Page 3 — 채팅 UX 개선
- [ ] **백엔드:** SSE 토큰 스트리밍 → **[features.md M4]** (Must 격상)
- [x] 토큰 fade-in (opacity + blur)
- [x] 면접관 메시지 캔버스 텍스트 스타일 (Claude 스타일)
- [x] 블록 캐럿 blink
- [x] 사용자 답변 viewport pin scroll
- [x] 스레드 하단 70vh 스페이서
- [x] 평가 완료 토스트 (점수별 컬러 분기)
- [x] 면접관 아바타 펄스 링 + busy 텍스트
- [x] 한글 IME composition 가드

### 5.2 Page 4 — 차트 애니메이션 + Apple-style 리디자인
> **진행 중** (다른 FE 세션이 `ReportPage.jsx` 작성 중) — **[features.md M1, S1, S6]**
- [x] Page 4 전체 리디자인 (MUI → CSS-only)
- [x] 레이더 폴리곤 0→100% 부풀기
- [x] 레이더 꼭지점 스프링 팝
- [x] 레이더 링/축선 stagger 페이드 인
- [x] 범례 바 width fill 애니메이션
- [x] 라벨 stagger 페이드 인
- [x] 문항별 아코디언 grid-template-rows 패턴

### 5.3 트랜지션 시스템
- [x] `<PageTransition>` zoom + blur cross-fade
- [x] 아코디언 grid-template-rows 패턴 (Page 3)
- [x] Page 2 로더 → 결과 전환 애니메이션
- [x] `prefers-reduced-motion` 대응

### 5.4 정보 구조 개선
- [x] Page 2 stat row (경력/기술/프로젝트/공격 포인트)
- [x] Page 2 강점 vs 공격 포인트 2-컬럼
- [x] Page 3 좌측 레일 진행 상태 + 평가 카드 분리

### 5.5 디자인 토큰 정리
- [x] CSS 토큰 도입 (`--accent`, `--bg`, `--surface` 등)
- [x] 모션 토큰 상수화 → **[features.md N2]**
- [x] MUI Theme 잔존 의존성 정리 → **[features.md N3]**

---

## 🛠 Phase 6: 백엔드 부채 정리 (진행 중)

### 6.1 LangGraph 정합성

**Must 항목 일정표 (5-18까지 완료 필수)**

| 날짜 | 요일 | 항목 | 예상 일량 | 담당 |
|------|------|------|---------|------|
| **5-10~5-11** | 토~일 | **M1 Page 4 리디자인** (진행 중) | 1.5일 | FE |
| **5-12~5-13** | 월~화 | **M2 빈 답변/질문 가드** | 1일 | BE |
| **5-14~5-15** | 수~목 | **M3 에러 표준화 + thread_id 충돌** | 1.5일 | BE |
| **5-10** | 토 | **[x] M4 SSE 토큰 스트리밍** | 완료 | BE + FE |
| **5-11~5-12** | 일~월 | **[x] M5 Page 3 메시지 자동 스크롤** | 1일 | FE |
| **5-18** | 월 | 버퍼/회귀 테스트 | 0.5일 | All |

**상태**
- [x] OpenAI Files API 미사용 호출 제거 → **[features.md S4]**
- [x] `parse_resume_with_llm` → `parser_graph`의 `resume_parser_node`로 통합 → **[features.md S3]**
- [x] **M4: SSE 토큰 스트리밍** → **[features.md M4]** / **완료: 2026-05-10**
- [x] **M5: Page 3 메시지 자동 스크롤** → **[features.md M5]** / **완료: 2026-05-11**
- [ ] **M2: 빈 답변 / 빈 질문 가드** → **[features.md M2]** / **예정: 5-12~5-13**
- [ ] **M3: 에러 응답 표준화 + thread_id 충돌 방지** → **[features.md M3]** / **예정: 5-14~5-15**

## 🛠️ Phase 7: 개발 도구 및 DX 개선

### 7.1 디버그 모드 — 샘플 이력서 빠른 진입
- [ ] 모든 페이지에 보이는 약한 강조의 "🐞 Debug" 버튼 (우측 하단 또는 헤더)
- [ ] 클릭 시 모달 표시 → "샘플 이력서로 시작" 메뉴 1개
- [ ] 메뉴 클릭 → mock `summaryData` 주입 + `currentPage='summary'` → Page 2 정상 표시
- [ ] 사용자가 "면접 시작" 클릭 → 기존 흐름과 동일 (Page 3 실전 LLM 면접 → Page 4 리포트)
- [ ] BE 변경 없음 (FE 단독 작업)

### 7.2 디버그 모드 — 샘플 답변 채우기 → **[features.md F-28]**
- [x] 디자이너: UI 사양서 (`design/assets/redesign/F28-sample-answer-spec.md`)
- [x] 백엔드: `tools.py` `generate_sample_answer` `@tool` 함수 + `POST /api/debug/sample-answer` 엔드포인트
- [x] 프론트: `SampleAnswerButton.jsx` 신설 + `App.jsx` `handleFillSampleAnswer` 핸들러 + `InterviewPage.jsx` 통합 (v0)
- [ ] **F-28 시각 후속 패치** — 디자이너 사양서 반영 (버튼 28×28 정사각형, radius 8px, 로딩 이중 피드백, 드롭업 헤더) / *단, 데모 시간 부족 시 defer 가능*
- [ ] 라이브 검증 (한글 IME 회귀 X, 등급별 답변 톤 차이, finished/isAiTyping 시 버튼 hidden)

### 7.3 F-27 시각 후속 패치 — TopBar DebugMenu 제거 + HomePage 드롭존 통합
- [~] **F-27 시각 후속 패치** 🔄 (세션: FE-F27-patch, since: 2026-05-10)
  - [ ] TopBar `DebugMenu` 제거 (frontend/src/debug/DebugMenu.jsx 삭제, App.jsx 와이어링 정리)
  - [ ] `HomePage` 드롭존 좌상단 28×28 ✨ 버튼 추가, 단일 클릭 즉시 주입
  - [ ] 드롭존 클릭 전파 가드 (stopPropagation), 드래그 이벤트 통과 보장
  - [ ] 가시성 상태 4종 (빈/드래그 오버/파일 선택/분석 중) 디자이너 사양에 맞춰 처리
  - [ ] 라이브 검증: 빈 상태 클릭→Page 2 진입, 드래그 오버 시 보더 강조 유지, 파일 피커 미간섭

---

## 🚀 Phase 8: 배포 (Deployment) — 데모 발표용

### D0. 배포 인프라 선정

**선정 결과**
- **FE (React):** Vercel / **BE (FastAPI):** Railway (상세: 각 에이전트 문서)
- **차선책:** Railway 정책 변경 시 → Fly.io 검토
- **필수 원칙:** `OPENAI_API_KEY`는 BE 서버 환경변수만 (FE 비노출)

**상태**
- [ ] **D0-선정:** 배포 인프라 계정 생성 + 접근권 확보

---

### D1. 다단계 배포 계획 (1차/2차/핫픽스)

**배포 철학**
- **1차 = 파이프라인 검증:** 빌드·환경변수·CORS·SSE·OpenAI 호출 검증 (기능 완성도 낮아도 OK, 인프라 이슈 조기 발견)
- **2차 = 본 배포:** M4 SSE 포함 최종 완성 후 (데모 당일용)

**배포 일정표**

| 단계 | 날짜 | 범위 | 검증 항목 |
|------|------|------|----------|
| **1차** | **5-12 (월)** | FE/BE 현재 상태 | 빌드 통과 / 환경변수 인식 / CORS 통과 / SSE 연결 / 에러 무노출 |
| **2차** | **5-16~5-17** | M4 포함 최종 빌드 | 전 기능 E2E / 네트워크 불안정 테스트 |
| **핫픽스** | **5-18 오전** | 긴급 패치 | 데모 당일 기본 흐름 |

**상태**
- [ ] **D1-1차:** 5-12 배포 (FE/BE 현재 상태)
- [ ] **D1-검증:** 1차 배포 후 파이프라인 검증 체크리스트
- [ ] **D1-2차:** 5-16~5-17 배포 (M4 포함 최종 버전)
- [ ] **D1-QA:** 2차 배포 후 E2E 테스트

---

## 🔮 데모 후 (선택) — 5-19 이후

**발표 이후 검토 대상 — 데모 전 완료 불필요**

### 기능 개선 (Nice-to-have)
- 면접 난이도 조절 (Junior / Mid / Hardcore) → `features.md N1`
- 답변 제한 시간 타이머 (줄어드는 게이지) → `features.md N6`
- 음성 답변 입력 → Icebox

### 코드 부채 (DevTODO)
- 백엔드 테스트 (pytest + 그래프 mock) → `features.md N4`
- 로깅 개선 (`print` → `logging`, thread_id 추적) → `features.md N5`

### 기타
- 모든 Platform-specific 개발 도구 삭제 (phase 7 debug 버튼/드롭업 등)
- 실제 production 모니터링 구성

---

## 새 작업 등록 방법

1. 아이디어 → `features.md`의 **⚫ Icebox**에 먼저 추가
2. 우선순위 검토 후 Must/Should/Nice로 승격
3. 작업 시작 시 이 파일의 적절한 Phase에 체크박스 추가 (또는 새 Phase 생성)
4. 완료 시 `[x]` 체크
