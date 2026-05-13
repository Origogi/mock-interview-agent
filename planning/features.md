# ⚙️ 기능 명세 및 백로그 (Feature Specifications & Backlog)

## 📌 작업 잠금 컨벤션 (In-Progress Locking)

**멀티 세션 병렬 작업 시 코드 충돌 방지 규칙:**

- **상태 마킹:** `[ ]` 미시작 / `[~]` 진행 중 / `[x]` 완료
- **진행 중 표기:** `[~] 항목명` **`🔄 (세션: <tag>, since: YYYY-MM-DD HH:MM)`**
  - `<tag>`: 작업 식별자 (예: `FE-P4-redesign`, `BE-M4-sse`, `UI-F28-patch`)
  - `since`: 작업 시작 시각 (한국 시간 기준)
  
**예시:**
```
[~] 작업명 🔄 (세션: FE-example, since: 2026-05-10 10:30)
[x] 완료된 작업명
[ ] 대기 중인 작업명
```

**도메인 에이전트 책임:**
- 작업 **시작 전** 백로그 항목을 `[~]` + 마킹으로 lock (경합 방지)
- 작업 **완료 시** `[x]`로 전환 또는 미완료 시 `[ ]`로 복구
- 다른 세션이 마크한 항목 건드리지 않기

---

## 1. 핵심 노드(Node)별 기능 구체화

### 기능 1: 이력서 분석 및 맞춤형 컨텍스트 추출 (Resume Parsing Node) [완료]
* **입력:** 사용자가 업로드한 이력서 PDF 파일
* **처리 로직:**
  1. `PyPDF2`를 이용해 PDF 파일 내의 모든 텍스트를 추출. (완료)
  2. 추출된 텍스트를 LLM에 전달하여 **3가지 핵심 정보**를 JSON 형태로 구조화. (완료)
     * `tech_stack`: 언어 및 프레임워크 리스트
     * `core_projects`: 주요 프로젝트 경험 요약
     * `weak_points`: 이력서 상에서 검증이 필요해 보이는 '공격 포인트' 도출
* **출력 (State 저장):** 위 3가지 정보가 포함된 Context JSON

### 기능 2: 첫 질문 및 동적 꼬리 질문 생성 (Interviewer Node) [완료]
* **입력:** [기능 1]의 Context JSON, 대화 기록(History), 이전 답변 평가 결과(`evaluations` 누적 데이터)
* **처리 로직:**
  * **1번째 질문:** 이력서 요약본을 기반으로 실무 경험 위주의 첫 질문 생성. (완료)
  * **2~N번째 질문:** 이전 답변의 평가 결과 및 대화 문맥에 따라 동적 생성. (완료)
    * LangGraph의 `interrupt` 기능을 활용하여 사용자 답변 시점까지 에이전트 대기 로직 구현. (완료)
* **출력:** 면접관의 질문 텍스트

### 기능 3: 실시간 답변 평가자 (Evaluator Node) [완료]
* **입력:** 현재 면접관의 질문, 사용자의 텍스트 답변
* **처리 로직:**
  * 사용자의 답변을 기술적 깊이와 논리성을 기준으로 평가. (완료)
  * **점수(Score):** 1~10점 채점 및 구체적인 피드백 생성. (완료)
* **출력 (State 누적):** `[질문, 답변, 점수, 피드백]` 딕셔너리를 `evaluations` 리스트에 누적 저장. (완료)
  * **UI 연동:** React 사이드바에 아코디언 형태의 컴포넌트로 실시간 렌더링. (완료)

### 기능 4: 종합 평가 리포트 생성 (Report Generator Node) [완료]
* **실행 조건:** 전체 질문 횟수가 MAX_QUESTIONS (5회)에 도달하면 대화 종료 후 해당 노드로 이동. (완료)
* **처리 로직:**
  * 누적된 모든 평가 데이터를 분석하여 4대 역량 점수 산출. (완료)
  * UI 렌더링을 위해 데이터를 규격화된 JSON으로 반환. (완료)
    * `scores`: 4가지 역량별 0~100점 수치 (Radar Chart용)
    * `feedback`: 종합 강점, 약점, 개선 방향
* **출력:** 리포트 렌더링용 최종 JSON 데이터.

### 기능 5: 실전 면접 특화 UI/UX (Interview Experience) [완료]
* **코드 블록 및 Tab 지원:** 채팅 입력 폼에서 `Tab` 키를 통한 들여쓰기 및 멀티라인 입력 지원. (완료)
* **반응형 패널 레이아웃:** 브라우저 너비에 따라 유연하게 확장되는 채팅창 및 최소 너비 보장(수평 스크롤). (완료)
* **리포트 시각화:** `Recharts`를 활용한 육각형 레이더 차트 및 문항별 상세 피드백 UI 구현. (완료)
* **면접관 리액션:** 대화창 상단에 면접관의 상태를 나타내는 이모지 아바타 구현. (완료)

---

## 1.5 Phase 5 — UX/UI 고도화 (디자인 검토 반영)

### F-21. Page 3 — 토큰 단위 스트리밍 응답 [완료]
**왜**: 응답을 한 번에 표시하면 "AI가 생각하는 긴장감"(핵심 가치 #2)이 약해짐. Claude처럼 토큰이 흘러나오는 시각적 압박이 면접관 페르소나를 강화.

**스펙**
- [x] 백엔드: OpenAI `stream=True` 기반 HTTP Chunked NDJSON 엔드포인트로 토큰을 chunk 푸시
- [x] 프론트: 각 토큰을 `<span>`으로 받아 `opacity 0 → 1 + blur(2px) → 0` 페이드 인 (0.32s ease-out)
- [x] 토큰 도착 페이스: 서버 스트림을 프론트 로컬 reveal 큐로 받아 일반 55ms, 마침표/물음표 후 220ms 호흡
- [x] 스트리밍 중 메시지 끝에 블록 캐럿 (1초 step blink)

### F-22. Page 3 — 사용자 답변 viewport pin scroll [완료]
**왜**: 긴 답변을 보내고 나면 본인 답변이 시야에서 사라지는데, 면접관 응답을 보는 동안 본인 답변과 비교하기 어려움.

**스펙**
- [x] 사용자가 답변 전송 → 해당 버블의 `getBoundingClientRect().top` 기준으로 스크롤 viewport 상단에 pin (24px 여유)
- [x] AI 응답은 pin 아래로 자연스럽게 흘러나옴 (스크롤 재호출 없음)
- [x] 스레드 하단에 `min-height: 70vh` 스페이서 — 짧은 응답이라도 user bubble이 실제로 상단까지 갈 수 있도록

### F-23. Page 3 — 평가 완료 토스트 [완료]
**왜**: "직관적인 피드백"(핵심 가치 #3)을 면접 중에도 즉시 제공.

**스펙**
- [x] 답변 분석 완료 시 우측 상단에 score 카드 슬라이드 인
- [x] 점수 ≥ 7: accent 컬러 / < 7: 경고 red
- [x] 2.6초 후 자동 사라짐
- [x] 좌측 레일 평가 카드 highlight 페이드아웃으로 갱신 (`is-fresh` 클래스)

### F-24. Page 4 — 차트 진입 애니메이션 [완료]
**왜**: 결과 도달의 카타르시스 강화. 정적 차트 < 형성되는 차트.

**스펙** (Page 4 리디자인과 함께 완료)
- [x] 레이더 폴리곤이 중심에서 0 → 100% 부풀어 오름
- [x] 꼭지점 원이 stagger로 스프링 이징 팝
- [x] 범례 바: 0% → 실제값 width fill
- [x] 종합 점수 카운트업 (Page 4 기존 구현)

### F-25. 페이지 간 트랜지션 [완료]
**왜**: SPA 네비게이션의 단절감 제거. Apple Keynote 스타일 연결감.

**스펙**
- [x] 페이지 전환 시 out 애니메이션(0.28s) → mount → in 애니메이션(0.5s)
- [x] out: scale(0.985), translateY(-4px), blur(4px), opacity 0
- [x] in: scale(1.02 → 1), translateY(8 → 0), blur(6 → 0), opacity 0 → 1
- [x] `prefers-reduced-motion: reduce` 시 비활성화

### F-26. 아코디언 부드러운 펼침 [완료]
**왜**: 즉시 토글로는 정보 위계가 약함.

**스펙**
- [x] `grid-template-rows: 0fr → 1fr` 트랜지션 (0.32~0.4s cubic-bezier(0.22, 0.61, 0.36, 1))
- [x] 내부 컨텐츠는 0.06s 지연 후 fade + translateY(-4 → 0)
- [x] 셰브론 회전 (Page 3 평가 카드)
- [x] Page 4 문항별 상세에 동일 패턴 적용 (`qa-detail-wrap` grid-template-rows)

---

## 1.6 Phase 5 — 수정 기능

### F-09 (수정). Page 3 — 면접관 메시지 스타일 [완료]
**Before**: AI/사용자 모두 버블 형태
**After**: AI 메시지는 버블/배경 제거, 캔버스 위에 텍스트 직접 (18px / 1.65 line-height). 사용자 메시지만 accent 버블 유지. → `bubble-ai .bubble-body { background: transparent; border: none; ... }` 로 구현 완료.

### F-12 (수정). Page 2 — 로딩 → 결과 전환 [완료]
**Before**: 로딩 끝나면 즉시 결과 표시
**After**:
- 로더가 페이드아웃 (`is-leaving` 클래스로 400ms 전환)
- 결과는 fade in (`summary-loaded-fade`)
- `prevLoading` ref로 로딩 → 로드 완료 트리거 정확히 감지

### F-15 (수정). Page 2 — Stat Row 신설 [완료]
**Before**: 텍스트 위주 요약
**After**: 4개 큰 숫자 callout (`경력 / 기술 스택 / 주요 프로젝트 / 공격 포인트`) — 공격 포인트만 accent 강조. 구현 완료.

---

## 2. 🗂 백로그 (Backlog)

`README.md`의 우선순위 기준(Must / Should / Nice / Icebox)에 따라 줄을 세운 통합 백로그입니다. 기획 기능과 개발 부채를 한 곳에서 관리합니다.

**범례**
- 🔴 **Must**: 발표 전 무조건. 빠지면 데모/서비스가 망가짐
- 🟡 **Should**: 발표 전 가능하면. 핵심 가치(개인화/긴장감/피드백) 강화
- 🟢 **Nice**: 발표 후. 안정화·확장·코드 부채
- ⚫ **Icebox**: 언젠가, 지금은 보류

**분류**
- `FE` 프론트엔드 / `BE` 백엔드 / `Feature` 사용자 가치 / `DevTODO` 코드 부채

---

### 🔴 Must — 발표 전 무조건

| # | 항목 | 분류 | 근거 |
|---|------|------|------|
| M1 | [x] **Page 4 전체 리디자인** (MUI → CSS-only, hero 카운트업 + 2-컬럼 + 아코디언) | FE / Feature | `ReportPage.jsx` 분리, `HeroScore`, 커스텀 SVG 레이더, 범례 fill, QA grid 아코디언 적용 완료. |
| M2 | **빈 답변 / 빈 질문 가드** | BE / DevTODO | 발표 중 엔터 오타·빈 응답 시 evaluator가 빈 텍스트로 점수 매김 → 그래프 노이즈. |
| M3 | **에러 응답 표준화 + thread_id 충돌 방지** | BE / DevTODO | 네트워크 에러·중복 호출 시 프론트 토스트 깔끔히 안내. 1~2시간. |
| M4 | [x] **SSE 토큰 스트리밍** | BE / FE | 면접관 응답 체감 속도 = 핵심 가치 #2 "긴장감"의 절반. 기존 클라이언트사이드 모사에서 실제 LLM 토큰 스트림으로 전환. **완료:** (1) HTTP Chunked NDJSON (`application/x-ndjson`), (2) LangGraph Interviewer 노드 내 `llm.stream()` 사용, (3) 폴백: 기존 동기 `/api/chat` 동작, (4) stream 종료 후 입력창 즉시 활성화 확인 (2026-05-10). |
| M6 | [x] **면접 조기 종료 — Must-fallback 미니멈** (F-29 묶음) | BE / FE / Feature | 좌측 레일 종료 alert 스텁이 그대로 노출되면 데모 중 깨짐 위험 → 최소 동작 안전망 확보. **S8(Should 본체)과 동일 PR로 묶어 처리** (TPM 결정). 범위: 종료 버튼 → 확인 모달 → `/api/interview/end` → Page 4 부분 리포트 OR Page 1 복귀 + Toast. **완료:** 2026-05-13 (BE+FE+디자인). |
| M8 | [x] **`max_questions` 의미 재정의 (옵션 A — 5문항=5답변=5평가)** | BE / FE / DevTODO | **완료:** 2026-05-14. 스트리밍 플로우를 `답변 평가 → evaluations 카운트 확인 → 종료 또는 다음 질문 생성` 순서로 재정렬. Q5 답변 후 다음 질문을 만들지 않고 `closing_message`를 3초 노출한 뒤 Page 4로 전환하며, 대기 중 입력/전송/샘플 답변/조기 종료를 잠금. |

### 🟡 Should — 발표 전 가능하면

| # | 항목 | 분류 | 근거 |
|---|------|------|------|
| S1 | [x] **레이더 폴리곤/꼭지점/범례 진입 애니메이션** (F-24) | FE / Feature | Page 4 CSS-only 리디자인과 함께 적용 완료. |
| ~~S3~~ ✅ | ~~`parse_resume_with_llm`을 LangGraph Node 1로 통합~~ — `agent.py`에 `resume_parser_node` + `parser_graph` 추가. `main.py`는 HTTP routing만 담당. | BE / DevTODO | 완료 |
| ~~S4~~ ✅ | ~~OpenAI Files API 미사용 호출 제거~~ — `client.files.create(...)` + 응답 `file_id` 삭제. | BE / DevTODO | 완료 |
| ~~S5~~ ⬆️ | ~~SSE 토큰 스트리밍~~ → **M4로 격상** (Must 표 참조) | BE / FE | 발표 데모 임팩트 결정적이라 판단해 Must 격상 (2026-05-10). |
| S6 | [x] **Page 4 문항별 아코디언 grid-template-rows 패턴** (F-26) | FE | Page 4 CSS-only 리디자인과 함께 적용 완료. |
| M5 | [x] **Page 3 메시지 컨테이너 자동 스크롤** | FE / Feature | AI 스트리밍 응답 중 채팅창이 자동으로 하단 따라감 (ChatGPT/Claude 표준 UX). 사용자 수동 스크롤 시 비활성화. **수용 기준:** (A) Snap-to-top: 제출 직후 사용자 말풍선이 뷰포트 상단으로 스크롤, (B) Stick-to-bottom: AI 스트리밍 청크 도착 시 하단 자동 추종 (threshold 80px), (C) User scroll cancels: 스트리밍 중 사용자가 위로 스크롤하면 자동 스크롤 즉시 OFF, (D) Re-engagement: 사용자가 하단 80px 이내까지 재스크롤하면 자동 추종 재활성화, (E) "맨 아래로" 버튼 미노출 (UI 깔끔함 우선). **라이브러리:** `use-stick-to-bottom` (stackblitz-labs/use-stick-to-bottom) — velocity-based spring 애니메이션. **완료:** 2026-05-11 |

### 🟢 Nice — 발표 후

| # | 항목 | 분류 | 근거 |
|---|------|------|------|
| N1 | 면접 난이도 조절 (Junior/Mid/Hardcore) | FE / BE / Feature | 큰 작업. 핵심 가치 "긴장감" 보강. |
| ~~N2~~ ✅ | ~~모션 토큰 (duration/easing) 상수화~~ — `tokens.css`에 `--ease-soft/in-quick/spring`, `--dur-quick/fast/medium/slow/page` 추가. `index.css`의 cubic-bezier 17곳 + duration 30+곳 시멘틱 토큰으로 치환. | FE / DevTODO | 완료 |
| ~~N3~~ ✅ | ~~MUI Theme 잔존 의존성 정리~~ — `src/` import 0건, `package.json` 의존성 0개 확인. `node_modules`의 빈 `@mui/@emotion` 셸 디렉토리 제거. 빌드 통과. | FE / DevTODO | 완료 |
| N4 | [~] **백엔드 테스트 (pytest + 그래프 mock)** — 1차: evaluator_node 실제 LLM + AI Judge pytest 추가 (2026-05-13). | BE / DevTODO | 남은 범위: LangGraph 플로우/mock 기반 회귀 테스트. |
| N5 | 로깅 개선 (`print` → `logging`, thread_id 추적) | BE / DevTODO | 운영 단계 작업. |
| N6 | 답변 제한 시간 타이머 | FE / Feature | 핵심 가치 "긴장감" 보강. 줄어드는 게이지 + 초과 시 턴 종료. |
| N7 | **조기 종료 횟수 텔레메트리** (F-29 후속) | BE / DevTODO | 현재 한 줄 `print`만 추가됨 (advisor [Low] 지적). 운영 단계에서 `logging` 기반 구조화 + thread_id별 종료 사유/턴수 집계 필요. 데모 후 N5 로깅 개선과 묶어 처리. |
| N8 | **Page 1 복귀 시 안내 배너** (F-29 후속) | FE / Feature | 디자이너가 v1에서 도입 안 함 결정 (Toast로 충분 + 노이즈 회피). 실사용 데이터 보고 "복귀 후 사용자 혼란" 시그널 있으면 재검토. 현재 상태 유지. |
| M7 | **Page 4 Q1 미리보기 BE root cause 재진단** | BE / FE / DevTODO | Page 4 Q1 미리보기가 빈 채로 표시되던 버그. FE fallback `normalizeEvaluations`로 우회되어 사용자 영향 0이나 BE root cause는 BE/FE curl 검증 결과 모순으로 미규명. 데모 후 **N4(pytest) 도입과 묶어 5턴 시나리오로 재진단**. FE fallback은 defense-in-depth로 유지. 관련 파일: `backend/agent.py:162-185` evaluator_node, `frontend/src/App.jsx`의 `normalizeEvaluations`. |

### 🟡 Should — 발표 전 가능하면 (계속)

| # | 항목 | 분류 | 근거 |
|---|------|------|------|
| S7 | **디버그 모드 — 샘플 이력서 빠른 진입** (Phase 7) | FE / DX | 개발 검증·데모 효율화. PDF 업로드/분석 과정 스킵 → mock 데이터로 Page 2 직진. |
| S8 | [x] **면접 조기 종료 — Should 본체** (F-29 사용자 가치) | BE / FE / Feature | 5턴 완주 어려운 사용자(시간/맥락 이슈)에게 부분 결과라도 회수해 학습 가치 보전. **정책:** 옵션 C (≥3 답변 → 부분 리포트 + 배지/disclaimer, <3 → 폐기 + Toast), 확인 모달 필수. **M6(Must-fallback)와 동일 PR 묶음** (TPM 결정). **완료:** 2026-05-13 — 사양서 / BE `/api/interview/end` + state 확장 + lock / FE `EarlyEndModal` + AbortController + Page 4 분기. 자세한 내용 F-29 참조. |
| S9 | **점수 3단계 UI 톤 통일** | FE / Design | canonical 기준을 Best 7~10 / Good 5~6 / Bad 1~4로 확정. Page 4 배지는 이미 `good/mid/low`에 가까움. Page 3 토스트·평가 카드·아바타 반응은 현재 일부 binary/다른 threshold라 후속으로 3단계 copy/color/helper 통일 필요. 샘플 답변 티어 데모 품질에 직접 영향이 있어 Should로 승격. |

---

### ⚫ Icebox

새 아이디어가 들어오면 여기로.
*(예: 음성 답변 입력, 다국어 면접, 결과 PDF 다운로드, 여러 이력서 비교 모드 등)*

---

## 1.7 Phase 7 — 개발 도구 및 DX 개선

### F-27. 디버그 모드 — 샘플 이력서 진입 [구현 완료, 시각 후속 패치 진행 중] 🔄 (세션: FE-F27-patch, since: 2026-05-10)
**왜**: 개발 검증·데모 중 PDF 업로드 + Resume Parser 분석 과정을 스킵하여 시간·비용 절감. Page 2 요약 → Page 3 실전 면접 → Page 4 리포트 전체 흐름을 빠르게 테스트 가능.

**범위**
- TopBar 전역 `DebugMenu` 제거 + `HomePage` 드롭존 좌상단에 28×28 ✨ 버튼으로 통합 (단일 클릭 즉시 주입)
- 라벨/툴팁: "샘플 이력서로 시작" 재사용
- 드롭존 클릭 가드 (stopPropagation), 드래그 이벤트 통과 보장
- 가시성 상태 4종 (빈/드래그 오버/파일 선택/분석 중) 처리

**시각 후속 패치 범위**
- TopBar `DebugMenu` 컴포넌트 제거 (frontend/src/debug/DebugMenu.jsx 삭제)
- App.jsx 와이어링 정리
- HomePage 드롭존 좌상단 28×28 ✨ 버튼 추가 및 기능 통합
- 드롭존 상태별 디자인 적용 확인
- E2E 검증: 빈 상태 클릭→Page 2 진입, 드래그 오버 시 보더 강조, 파일 피커 미간섭

**구현 팀**
- 디자이너: 드롭존 ✨ 버튼 사양 검수
- FE 개발자: 시각 통합 패치

**기술 결정**
- 백엔드 변경 0건 (FE 단독)
- mock summaryData는 기존 Page 2 렌더링 확인 테스트 데이터 재사용

---

### F-28. 디버그 모드 — 샘플 답변 채우기 [구현 완료, 시각 후속 패치 진행 중]
**왜**: Page 3 실전 면접 흐름의 답변 입력을 LLM으로 자동 생성해 빠른 검증·데모. 다양한 점수대(Best 7~10 / Good 5~6 / Bad 1~4) 답변을 즉시 비교해 evaluator·report 분기를 효율적으로 테스트.

**범위**
- InterviewPage(Page 3) composer 상단 좌측 ✨ 버튼 + 위로 솟는 드롭업 (3 등급 항목)
- 항목 클릭 → 동기 LLM 호출 (1~3초) → composer disable + 로딩 UI → textarea에 일괄 채움
- **자동 전송 X**: 사용자가 검토 후 직접 Send

**API**
- `POST /api/debug/sample-answer` body `{ thread_id, quality_tier: 'best'|'good'|'bad' }` → `{ answer, expected_score_range }`
- LangGraph **미사용**. `tools.py`의 `@tool` 함수(`generate_sample_answer`)를 endpoint가 직접 `.invoke()` 호출 (`extract_resume_text` 컨벤션 준용).
- 컨텍스트 추출: `state.values["messages"]` (이전 턴) + `state.tasks[*].interrupts[0].value` (현재 미답변 질문) + `resume_summary` 모두 프롬프트에 투입.

**UI 사양서**
`design/assets/redesign/F28-sample-answer-spec.md` (디자이너 산출).

**구현 결정 (PM 합의)**
- 버튼 위치는 TopBar Debug 메뉴가 아닌 **InterviewPage 인-페이지 컨트롤** (composer 인접)
- 단일 ✨ 버튼 + 드롭업 (3-칩 평면 노출 X — 디버그 노이즈 최소화)
- 점수 tier 기준은 서비스 표시 기준과 일치: **Best 7~10 / Good 5~6 / Bad 1~4**
- finished/isAiTyping 시 **버튼 hidden** (디자이너 권장)
- IME 회귀 방지: `setChatInput()`만 사용, `textareaRef` 직접 조작 X
- 별도 `isFetchingSample` state — `isAiTyping` 재사용 X

**구현 팀**
- 디자이너: 버튼/드롭업/로딩 UI 사양서
- 백엔드: `tools.py` `generate_sample_answer` + `/api/debug/sample-answer` 엔드포인트
- 프론트엔드: `SampleAnswerButton.jsx` + `App.jsx` 핸들러 + `InterviewPage.jsx` 통합

**잔여**
- [~] 디자이너 사양서 ↔ FE v0 구현 시각 갭 패치 (버튼 28×28 정사각형, radius 8px, 로딩 이중 피드백, 드롭업 헤더) 🔄 (세션: UI-F28-patch, since: 2026-05-10 09:00)

---

### F-29. 면접 조기 종료 (Early Termination) [구현 완료, 라이브 검증 대기]
**왜**: 면접 도중 사용자가 시간/맥락 이슈로 5턴 완주가 어려운 상황 발생. 강제 페이지 이탈로 인한 학습 손실 방지 + 부분 결과라도 회수해 학습 가치 보전.

**정책 (TPM 결정 — 옵션 C 절충)**
- 임계 `N=3` 답변 이상: 부분 리포트 생성 → Page 4 (조기 종료 배지 + disclaimer)
- 임계 미만 (0~2 답변): 폐기 후 Page 1 복귀 + Toast 안내
- 실수 클릭 방지: **확인 모달 필수**
- 점수 산출: 참여 문항만 평가 (disclaimer로 신뢰도 명시)

**시퀀스**
```
[× 면접 조기 종료] (좌측 레일 진행도 하단)
  → 확인 모달 (answered_count로 카피 분기)
  → [그래도 종료]
    → composer disable + loading
    → POST /api/interview/end
    → Case A (≥3): Page 4 + "조기 종료 N/5" 배지 + disclaimer
    → Case B (<3): Toast + Page 1 복귀
```

**UI 사양서**
`design/assets/redesign/F29-early-termination-spec.md` (디자이너 산출 완료).

**우선순위 묶음 (TPM 결정)**
- **Should-S8** (사용자 가치 본체) + **Must-fallback** (alert 스텁 깨짐 방지 미니멈) 동일 PR로 묶어 데모 안전망 확보
- Must 표의 `M6` 참조 (단일 PR 범위)

**구현 결정 (PM/TPM 합의)**
- 백엔드: 새 엔드포인트 `POST /api/interview/end` (LangGraph state 재진입 X, 별도 routing) — `report_node` 부분 리포트 분기 + `count_valid_evaluations` + `asyncio.Lock`으로 race condition 방지
- 프론트: 모달 dismiss 라우팅 (Esc / Backdrop / Tab loop / 초기 포커스 Secondary), Toast `severity='warning'` 신설, `AbortController`로 스트리밍 중 종료 시 token fetch abort
- 텔레메트리: 현재 한 줄 `print` 수준 (advisor [Low] 지적 → Nice 백로그 N7로 이관)

**잔여**
- [x] 디자이너 사양서 v1 (확인 모달 + 배지 + Toast + v0 마이그레이션 노트)
- [x] 백엔드: `POST /api/interview/end` + `is_partial`/`answered_count`/`disclaimer` 필드 + `asyncio.Lock` + `count_valid_evaluations` + `report_node` 부분 리포트 분기
- [x] 프론트: 종료 버튼 + `EarlyEndModal` + `App.jsx` onAbort 실배선 + AbortController + Page 4 배지/disclaimer + Toast warning severity
- [ ] 라이브 검증 시나리오 (`todo.md` Phase 7.4 참조)

---

### 백로그 운영 원칙

1. **진실의 원천(SSOT)은 이 표.** `todo.md`의 Phase 5 체크리스트는 진행 추적용이고, 무엇을 할지/뺄지는 여기서 결정.
2. **새 항목 추가 시** Icebox에 먼저 넣고, 검토 후 우선순위 부여.
3. **Must는 3개 이내로 유지.** 늘면 발표 임박 신호 → 범위 조정.
4. **재조정은 마일스톤마다.** 발표 끝나면 전체 한 칸씩 강등 검토 (Should → Nice 등).
