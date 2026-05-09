# ⚙️ 기능 명세 및 백로그 (Feature Specifications & Backlog)

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

### F-21. Page 3 — 토큰 단위 스트리밍 응답 [부분 완료]
**왜**: 응답을 한 번에 표시하면 "AI가 생각하는 긴장감"(핵심 가치 #2)이 약해짐. Claude처럼 토큰이 흘러나오는 시각적 압박이 면접관 페르소나를 강화.

**스펙**
- [ ] 백엔드: OpenAI `stream=True` (또는 SSE 엔드포인트) 도입, 토큰을 chunk로 푸시
- [x] 프론트: 각 토큰을 `<span>`으로 받아 `opacity 0 → 1 + blur(2px) → 0` 페이드 인 (0.32s ease-out)
- [x] 토큰 도착 페이스: 일반 55ms, 마침표/물음표 후 220ms 호흡 (현재는 클라이언트사이드 모사)
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

### F-24. Page 4 — 차트 진입 애니메이션 [미진행]
**왜**: 결과 도달의 카타르시스 강화. 정적 차트 < 형성되는 차트.

**스펙** (Page 4 리디자인과 함께 진행 예정)
- [ ] 레이더 폴리곤이 중심에서 0 → 100% 부풀어 오름 (1.1s ease-out cubic)
- [ ] 꼭지점 6개 원이 70ms stagger로 스프링 이징 팝 (cubic-bezier(0.34, 1.56, 0.64, 1))
- [ ] 범례 바: 0% → 실제값 width fill (1.1s, 80ms 간격 stagger)
- [x] 종합 점수 카운트업 (Page 4 기존 구현)

### F-25. 페이지 간 트랜지션 [완료]
**왜**: SPA 네비게이션의 단절감 제거. Apple Keynote 스타일 연결감.

**스펙**
- [x] 페이지 전환 시 out 애니메이션(0.28s) → mount → in 애니메이션(0.5s)
- [x] out: scale(0.985), translateY(-4px), blur(4px), opacity 0
- [x] in: scale(1.02 → 1), translateY(8 → 0), blur(6 → 0), opacity 0 → 1
- [x] `prefers-reduced-motion: reduce` 시 비활성화

### F-26. 아코디언 부드러운 펼침 [부분 완료]
**왜**: 즉시 토글로는 정보 위계가 약함.

**스펙**
- [x] `grid-template-rows: 0fr → 1fr` 트랜지션 (0.32~0.4s cubic-bezier(0.22, 0.61, 0.36, 1))
- [x] 내부 컨텐츠는 0.06s 지연 후 fade + translateY(-4 → 0)
- [x] 셰브론 회전 (Page 3 평가 카드)
- [ ] Page 4 문항별 상세에 동일 패턴 적용 (현재 MUI Accordion 사용 중)

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
| M1 | **Page 4 전체 리디자인** (MUI → CSS-only, hero 카운트업 + 2-컬럼 + 아코디언) | FE / Feature | Page 1~3는 Apple-style 적용 완료. Page 4만 남아 톤 단절. 데모 마무리 화면이라 인상 결정적. |
| M2 | **빈 답변 / 빈 질문 가드** | BE / DevTODO | 발표 중 엔터 오타·빈 응답 시 evaluator가 빈 텍스트로 점수 매김 → 그래프 노이즈. |
| M3 | **에러 응답 표준화 + thread_id 충돌 방지** | BE / DevTODO | 네트워크 에러·중복 호출 시 프론트 토스트 깔끔히 안내. 1~2시간. |
| M4 | **SSE 토큰 스트리밍** (F-21 백엔드 부분, ex-S5) | BE / FE | 면접관 응답 체감 속도 = 핵심 가치 #2 "긴장감"의 절반. 현재 클라이언트사이드 모사만이라 진짜 LLM 토큰 페이스가 아님. 발표 시 데모 임팩트 결정적 → Must 격상. |

### 🟡 Should — 발표 전 가능하면

| # | 항목 | 분류 | 근거 |
|---|------|------|------|
| S1 | **레이더 폴리곤/꼭지점/범례 진입 애니메이션** (F-24) | FE / Feature | Page 4 임팩트의 절반. "Actionable Feedback" 핵심 가치 시각화. M1과 한 묶음. |
| ~~S3~~ ✅ | ~~`parse_resume_with_llm`을 LangGraph Node 1로 통합~~ — `agent.py`에 `resume_parser_node` + `parser_graph` 추가. `main.py`는 HTTP routing만 담당. | BE / DevTODO | 완료 |
| ~~S4~~ ✅ | ~~OpenAI Files API 미사용 호출 제거~~ — `client.files.create(...)` + 응답 `file_id` 삭제. | BE / DevTODO | 완료 |
| ~~S5~~ ⬆️ | ~~SSE 토큰 스트리밍~~ → **M4로 격상** (Must 표 참조) | BE / FE | 발표 데모 임팩트 결정적이라 판단해 Must 격상 (2026-05-10). |
| S6 | **Page 4 문항별 아코디언 grid-template-rows 패턴** (F-26 잔여) | FE | Page 3와 통일. M1 리디자인과 함께 처리. |

### 🟢 Nice — 발표 후

| # | 항목 | 분류 | 근거 |
|---|------|------|------|
| N1 | 면접 난이도 조절 (Junior/Mid/Hardcore) | FE / BE / Feature | 큰 작업. 핵심 가치 "긴장감" 보강. |
| ~~N2~~ ✅ | ~~모션 토큰 (duration/easing) 상수화~~ — `tokens.css`에 `--ease-soft/in-quick/spring`, `--dur-quick/fast/medium/slow/page` 추가. `index.css`의 cubic-bezier 17곳 + duration 30+곳 시멘틱 토큰으로 치환. | FE / DevTODO | 완료 |
| ~~N3~~ ✅ | ~~MUI Theme 잔존 의존성 정리~~ — `src/` import 0건, `package.json` 의존성 0개 확인. `node_modules`의 빈 `@mui/@emotion` 셸 디렉토리 제거. 빌드 통과. | FE / DevTODO | 완료 |
| N4 | 백엔드 테스트 (pytest + 그래프 mock) | BE / DevTODO | 현재 0개. 회귀 방지. |
| N5 | 로깅 개선 (`print` → `logging`, thread_id 추적) | BE / DevTODO | 운영 단계 작업. |
| N6 | 답변 제한 시간 타이머 | FE / Feature | 핵심 가치 "긴장감" 보강. 줄어드는 게이지 + 초과 시 턴 종료. |

### 🟡 Should — 발표 전 가능하면 (계속)

| # | 항목 | 분류 | 근거 |
|---|------|------|------|
| S7 | **디버그 모드 — 샘플 이력서 빠른 진입** (Phase 7) | FE / DX | 개발 검증·데모 효율화. PDF 업로드/분석 과정 스킵 → mock 데이터로 Page 2 직진. |

---

### ⚫ Icebox

새 아이디어가 들어오면 여기로.
*(예: 음성 답변 입력, 다국어 면접, 결과 PDF 다운로드, 여러 이력서 비교 모드 등)*

---

## 1.7 Phase 7 — 개발 도구 및 DX 개선

### F-27. 디버그 모드 — 샘플 이력서 진입 [진행 예정]
**왜**: 개발 검증·데모 중 PDF 업로드 + Resume Parser 분석 과정을 스킵하여 시간·비용 절감. Page 2 요약 → Page 3 실전 면접 → Page 4 리포트 전체 흐름을 빠르게 테스트 가능.

**범위**
- 어느 페이지에서나 보이는 약한 강조의 "🐞 Debug" 버튼 (목표: 프로덕션 미배포, 개발용)
- 모달 표시 → "샘플 이력서로 시작" 메뉴 1개
- 클릭 시 mock `summaryData`를 주입하고 `currentPage='summary'`로 전환

**동작 흐름**
1. Debug 버튼 클릭 → 모달 열기
2. "샘플 이력서로 시작" 선택 → mock summaryData 주입 + state update
3. Page 2 Summary 페이지 정상 표시 (로딩 생략)
4. 사용자가 "면접 시작" 버튼 클릭 → 기존 `startInterview()` 호출
5. `/api/chat` → 진짜 LLM이 첫 질문 생성 → Page 3 면접 진행 → Page 4 리포트 (전체 흐름 동작)

**범위 외 (추후 검토)**
- Page 4 mock 리포트로 직진 (Page 3 LLM 면접 스킵)
- Page 3 중간 턴 시드 (특정 턴부터 시작)

**구현 팀**
- 디자이너: Debug 버튼 디자인·위치 결정
- FE 개발자: 모달 UI + mock summaryData 주입 + 라우팅 로직

**기술 결정**
- `import.meta.env.DEV` 가드 생략 → 프로덕션 서빙 안 함 (약한 강조로 상시 노출 가능)
- 백엔드 변경 0건 (FE 단독)
- mock summaryData는 기존 Page 2 렌더링 확인 테스트 데이터 재사용

---

### 백로그 운영 원칙

1. **진실의 원천(SSOT)은 이 표.** `todo.md`의 Phase 5 체크리스트는 진행 추적용이고, 무엇을 할지/뺄지는 여기서 결정.
2. **새 항목 추가 시** Icebox에 먼저 넣고, 검토 후 우선순위 부여.
3. **Must는 3개 이내로 유지.** 늘면 발표 임박 신호 → 범위 조정.
4. **재조정은 마일스톤마다.** 발표 끝나면 전체 한 칸씩 강등 검토 (Should → Nice 등).
