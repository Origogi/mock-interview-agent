# ✅ 프로젝트 진행 상황 (Todo List)

본 문서는 PM 페르소나가 프로젝트의 전체 진행 상황을 트래킹하고 마일스톤을 관리하기 위한 체크리스트입니다.

## 🏗 Phase 1: 인프라 및 환경 셋업 (완료)
- [x] **프론트엔드:** React + Vite, MUI, 다크모드 기반 스캐폴딩 생성
- [x] **백엔드:** FastAPI 초기화, `uv` 패키지 매니저 도입 및 가상환경 세팅 완료
- [x] **모노레포 문서화:** 기획(`planning`), 프론트엔드(`frontend`), 백엔드(`backend`) 분리 및 `gemini.md` 기술 스펙 문서 작성
- [x] **OpenAI 설정:** `.env`에 API Key 세팅 완료
- [x] **개발 편의성:** `.vscode/settings.json` 파이썬 인터프리터 경로 설정 및 `.gitignore` 적용

## 📄 Phase 2: 이력서 업로드 및 요약 (진행중)
- [x] **UI (Page 1):** 메인 홈 화면 프리미엄 디자인(Glassmorphism) 구현
- [x] **UI (Page 1):** 백엔드 서버 상태 인디케이터(신호등) 구현
- [x] **API 연동:** 프론트엔드 ➔ 백엔드 파일 업로드 연동
- [x] **API 연동:** 백엔드 ➔ OpenAI `Files API`로 이력서 업로드 성공 및 `file_id` 획득
- [x] **UI (Page 2):** 업로드 성공 후 요약 화면 렌더링 (현재는 더미 데이터 표시)
- [ ] **백엔드 API:** OpenAI Assistant 또는 PyPDF2를 사용해 업로드된 PDF에서 텍스트 추출 (`Node 1: Resume Parser` 구축)
- [ ] **백엔드 API:** 추출된 텍스트를 LLM에 넘겨 기술 스택/프로젝트 내용 JSON으로 파싱
- [ ] **프론트 연동:** Page 2 요약 화면에 더미 데이터 대신 파싱된 '진짜 데이터' 꽂아넣기

## 💬 Phase 3: 실전 면접 채팅 기능 (대기)
- [ ] **UI (Page 3):** 챗봇 대화창 및 사용자 입력 폼 퍼블리싱
- [ ] **UI (Page 3):** 면접 진행도 및 실시간 평가 히스토리 아코디언 UI 구현
- [ ] **백엔드 API:** LangGraph `InterviewState` 정의 및 그래프 뼈대 구축
- [ ] **백엔드 API:** 면접관 노드 (`Node 2: Interviewer`) 프롬프트 및 로직 개발 (꼬리 질문 생성)
- [ ] **백엔드 API:** 평가자 노드 (`Node 3: Evaluator`) 프롬프트 및 로직 개발 (점수/피드백 도출)
- [ ] **API 연동:** 프론트엔드 채팅창 ➔ 백엔드 대화 API 통신 (Interrupt 제어 적용)

## 📊 Phase 4: 최종 리포트 화면 (대기)
- [ ] **백엔드 API:** 지정된 질문 횟수 도달 시 리포트 생성 노드 (`Node 4: Report Generator`) 개발
- [ ] **UI (Page 4):** 리포트 데이터 수신 및 육각형 레이더 차트 렌더링 (Recharts)
- [ ] **UI (Page 4):** 문항별 (내 답변 vs 모범 답안) 상세 피드백 아코디언 렌더링
- [ ] **UI (Page 4):** 면접 다시 시작하기 (초기화) 로직 적용
