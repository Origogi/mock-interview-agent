# ✅ 프로젝트 진행 상황 (Todo List)

본 문서는 PM 페르소나가 프로젝트의 전체 진행 상황을 트래킹하고 마일스톤을 관리하기 위한 체크리스트입니다.

## 🏗 Phase 1: 인프라 및 환경 셋업 (완료)
- [x] **프론트엔드:** React + Vite, MUI, 다크모드 기반 스캐폴딩 생성
- [x] **백엔드:** FastAPI 초기화, `uv` 패키지 매니저 도입 및 가상환경 세팅 완료
- [x] **모노레포 문서화:** 기획(`planning`), 프론트엔드(`frontend`), 백엔드(`backend`) 분리 및 폴더별 `README.md` 기술 스펙 문서 작성
- [x] **OpenAI 설정:** `.env`에 API Key 세팅 완료
- [x] **개발 편의성:** `.vscode/settings.json` 파이썬 인터프리터 경로 설정 및 `.gitignore` 적용

## 📄 Phase 2: 이력서 업로드 및 요약 (완료)
- [x] **UI (Page 1):** 메인 홈 화면 프리미엄 디자인(Glassmorphism) 구현
- [x] **UI (Page 1):** 백엔드 서버 상태 인디케이터(신호등) 구현
- [x] **API 연동:** 프론트엔드 ➔ 백엔드 파일 업로드 연동
- [x] **API 연동:** 백엔드 ➔ OpenAI `Files API`로 이력서 업로드 성공 및 `file_id` 획득
- [x] **UI (Page 2):** 업로드 성공 후 요약 화면 렌더링 (현재는 더미 데이터 표시)
- [x] **백엔드 API:** OpenAI Assistant 또는 PyPDF2를 사용해 업로드된 PDF에서 텍스트 추출 (`Node 1: Resume Parser` 구축)
- [x] **백엔드 API:** 추출된 텍스트를 LLM에 넘겨 기술 스택/프로젝트 내용 JSON으로 파싱
- [x] **프론트 연동:** Page 2 요약 화면에 더미 데이터 대신 파싱된 '진짜 데이터' 꽂아넣기

## 💬 Phase 3: 실전 면접 채팅 기능 (완료)
- [x] **UI (Page 3):** 챗봇 대화창 및 사용자 입력 폼 퍼블리싱
- [x] **UI (Page 3):** 면접 진행도 및 실시간 평가 히스토리 아코디언 UI 구현
- [x] **백엔드 API:** LangGraph `InterviewState` 정의 및 그래프 뼈대 구축
- [x] **백엔드 API:** 면접관 노드 (`Node 2: Interviewer`) 프롬프트 및 로직 개발 (꼬리 질문 생성)
- [x] **백엔드 API:** 평가자 노드 (`Node 3: Evaluator`) 프롬프트 및 로직 개발 (점수/피드백 도출)
- [x] **API 연동:** 프론트엔드 채팅창 ➔ 백엔드 대화 API 통신 (Interrupt 제어 적용)

## 📊 Phase 4: 최종 리포트 화면 (완료)
- [x] **백엔드 API:** 지정된 질문 횟수 도달 시 리포트 생성 노드 (`Node 4: Report Generator`) 개발
- [x] **UI (Page 4):** 리포트 데이터 수신 및 육각형 레이더 차트 렌더링 (Recharts)
- [x] **UI (Page 4):** 문항별 (내 답변 vs 모범 답안) 상세 피드백 아코디언 렌더링
- [x] **UI (Page 4):** 면접 다시 시작하기 (초기화) 로직 적용

## 🎨 Phase 5: UX/UI 고도화 (디자인 검토 반영)

### 5.1 Page 3 — 채팅 UX 개선
- [ ] **백엔드:** OpenAI `stream=True` 도입, SSE 엔드포인트로 토큰 전달 (현재는 클라이언트사이드 fade-in으로 시각 효과만 모사)
- [x] **프론트:** 토큰을 `<span>`으로 받아 fade-in (opacity + blur) 적용
- [x] **프론트:** 면접관 메시지에서 버블 배경 제거, 캔버스 텍스트 스타일 적용 (Claude 스타일)
- [x] **프론트:** 스트리밍 중 블록 캐럿(blink) 표시
- [x] **프론트:** 사용자 답변 전송 시 viewport pin scroll 구현 (`useLayoutEffect` + `getBoundingClientRect`)
- [x] **프론트:** 스레드 하단 70vh 스페이서 추가
- [x] **프론트:** 평가 완료 토스트 컴포넌트 (점수별 컬러 분기, 2.6s 자동 dismiss)
- [x] **프론트:** 면접관 아바타 펄스 링 + busy 상태 텍스트
- [x] **프론트:** 한글 IME composition 가드 (자모 분리 이슈 해결)

### 5.2 Page 4 — 차트 애니메이션 + Apple-style 리디자인
- [x] **프론트:** Page 4 전체 리디자인 (MUI → CSS-only, hero 카운트업 + 2-컬럼 그리드 + 문항 아코디언)
- [x] **프론트:** 레이더 폴리곤 0→100% 부풀기 애니메이션 (rAF + cubic ease-out)
- [x] **프론트:** 레이더 꼭지점 스프링 팝 (transition + cubic-bezier(0.34, 1.56, 0.64, 1))
- [x] **프론트:** 레이더 링/축선 stagger 페이드 인
- [x] **프론트:** 범례 바 0% → 실제값 fill (width keyframe + stagger)
- [x] **프론트:** 라벨 stagger 페이드 인
- [x] **프론트:** Page 4 문항별 아코디언 grid-template-rows 패턴 적용

### 5.3 트랜지션 시스템
- [x] **프론트:** 페이지 간 zoom + blur cross-fade 트랜지션 컴포넌트 (`<PageTransition>`)
- [x] **프론트:** 아코디언 `grid-template-rows: 0fr → 1fr` 패턴 적용 (Page 3 평가)
- [x] **프론트:** Page 2 로더 → 결과 전환 애니메이션 (loader fade-out + content fade-in)
- [x] **프론트:** `prefers-reduced-motion: reduce` 미디어 쿼리로 모든 모션 비활성화 옵션 제공

### 5.4 정보 구조 개선
- [x] **프론트:** Page 2 stat row (경력/기술/프로젝트/공격 포인트) 컴포넌트 신설
- [x] **프론트:** Page 2 강점 vs 공격 포인트 2-컬럼 split 레이아웃
- [x] **프론트:** Page 3 좌측 레일 진행 상태 + 실시간 평가 카드 분리

### 5.5 디자인 토큰 정리
- [x] **프론트:** CSS 토큰(`--accent`, `--bg`, `--surface`, `--font-display` 등) 도입 및 페이지별 컴포넌트에서 일관 사용
- [ ] **프론트:** 모션 토큰 (duration, easing) 상수화 — 현재는 인라인 cubic-bezier 산재
- [ ] **프론트:** MUI Theme 잔존 의존성 정리 (Page 4 리디자인과 함께 ThemeProvider 제거 가능 시점)
