# ✅ 프로젝트 진행 상황 (Progress Tracker)

본 문서는 **진행 추적**용 체크리스트입니다. **무엇을 할지 / 우선순위**는 [`features.md`](./features.md)의 백로그가 SSOT입니다.

- 📋 [백로그 보러가기](./features.md#2--백로그-backlog) — 🔴Must / 🟡Should / 🟢Nice / ⚫Icebox
- 🎯 다음 작업 = features.md의 Must 최상단부터

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
- [ ] **백엔드:** SSE 토큰 스트리밍 → **[features.md S5]**
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
- [ ] 모션 토큰 상수화 → **[features.md N2]**
- [ ] MUI Theme 잔존 의존성 정리 → **[features.md N3]**

---

## 🛠 Phase 6: 백엔드 부채 정리 (진행 중)

### 6.1 LangGraph 정합성
- [x] OpenAI Files API 미사용 호출 제거 → **[features.md S4]**
- [x] `parse_resume_with_llm` → `parser_graph`의 `resume_parser_node`로 통합 → **[features.md S3]**
- [ ] 빈 답변 / 빈 질문 가드 → **[features.md M2]**
- [ ] 에러 응답 표준화 + thread_id 충돌 방지 → **[features.md M3]**

---

## 새 작업 등록 방법

1. 아이디어 → `features.md`의 **⚫ Icebox**에 먼저 추가
2. 우선순위 검토 후 Must/Should/Nice로 승격
3. 작업 시작 시 이 파일의 적절한 Phase에 체크박스 추가 (또는 새 Phase 생성)
4. 완료 시 `[x]` 체크
