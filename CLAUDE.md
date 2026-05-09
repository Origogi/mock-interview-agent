# Tech-Interviewer AI — 프로젝트 가이드

## 프로젝트 개요
이력서(PDF) 기반 AI 기술 면접 트레이닝 서비스. 꼬리 질문과 종합 리포트를 제공한다.

**모노레포 구조:**
- `frontend/` — React + Vite + MUI (포트 5173)
- `backend/` — FastAPI + LangGraph + OpenAI (포트 8000)
- `planning/` — 기획 문서
- `design/` — 디자인 가이드라인

**핵심 문서 인덱스:** `README.md` (모노레포 메인) + 각 폴더의 `README.md`

## 기술 스택
| 영역 | 기술 |
|------|------|
| Frontend | React (Vite), MUI v5, Framer Motion, Recharts |
| Backend | Python, FastAPI, LangGraph, LangChain |
| LLM | OpenAI `gpt-4o-mini` |
| Package | `uv` (backend), `npm` (frontend) |

## 환경 변수
- `backend/.env` 또는 루트 `.env` 에 `OPENAI_API_KEY` 필요

## 개발 서버 실행/종료
```bash
# 시작 (백그라운드)
bash run-dev.sh

# 종료
bash stop-dev.sh
```

## 에이전트 구조
요청 성격에 따라 아래 전문 에이전트를 호출한다:

| 에이전트 | 호출 조건 |
|---------|---------|
| `product-manager` | 기획, 백로그, 우선순위, 일정, 디스패치 플래닝, 회의 진행 |
| `frontend-developer` | React 컴포넌트, 상태 관리, UI 구현, `frontend/` 코드 |
| `backend-developer` | FastAPI 엔드포인트, LangGraph 워크플로우, 프롬프트, `backend/` 코드 |
| `ui-designer` | 디자인 검수, 타이포그래피, 색상, 인터랙션, 사양서 작성 |

## 오케스트레이션 원칙 (필수)

**메인 컨텍스트는 순수 오케스트레이터다. 도메인 작업을 직접 수행하지 않고 반드시 전문 에이전트로 위임한다.** 사용자가 "기획자", "PM", "FE", "BE", "디자이너"를 호명하면 — 한 줄 패치·작은 결정이라도 — 메인이 흡수하지 말고 해당 에이전트를 호출한다.

### 메인이 직접 수행 금지 (반드시 위임)
- 기획·백로그·우선순위·회의 어젠다·디스패치 플래닝·인터페이스 합의안 도출 → `product-manager`
- React/상태/UI/`frontend/` 코드 변경 → `frontend-developer`
- FastAPI/LangGraph/프롬프트/`backend/` 코드 변경 → `backend-developer`
- 디자인 사양·시각 검수·인터랙션·사양서 작성 → `ui-designer`

### 메인이 직접 처리하는 것 (오케스트레이션 메타 작업만)
- 사용자 의도 파악 + 라우팅 결정
- 에이전트 호출 (병렬·순차 결정 포함) + 결과 수집·통합·사용자 보고
- 자명한 메타 질의 답변 ("이 에이전트의 역할은?", 프로젝트 구조 안내 등)
- git 작업 (commit/push), 환경 셋업/서버 기동 같은 메타 명령
- advisor 호출, 사용자 결정 요청 (AskUserQuestion)

### 안티 패턴 (반복 금지)
- "라운드트립 줄이려고 메인이 PM 역할을 겸함" → 금지. 라운드트립 한 번 더 발생해도 PM 에이전트로 위임.
- "사양서와의 시각 갭이 작아서 메인이 직접 패치" → 금지. `frontend-developer`에 후속 패치 위임.
- "사용자 답변이 명확하니 메인이 결정 적용" → 금지. 결정 자체는 사용자가 내렸어도 적용은 도메인 에이전트가 한다.

## Plan First 원칙
코딩 또는 시스템 변경 작업은 **반드시 Step-by-Step 구현 플랜을 먼저 제시**하고 사용자 승인 후 실행한다. 절대 즉시 코드를 작성하지 않는다. 플랜 작성 자체도 도메인이 명확하면 해당 에이전트가 한다 (메인이 흡수 X).

## 디자인 시스템
- **테마:** 다크 모드 (Glassmorphism)
- **Primary:** `#7c3aed` (Purple) / **Secondary:** `#06b6d4` (Cyan)
- **Background:** `#0f172a`
- **폰트:** Pretendard (한글), Inter (영문)
- **Border Radius:** 12px 전후 권장

## 디자인 에셋 구조
```
design/
├── README.md                    # 디자인 원칙, 검수 체크리스트, 에셋 인덱스
└── assets/
    ├── wireframe/               # 화면별 와이어프레임
    │   ├── wireframe_page1.png
    │   ├── wireframe_page2.png
    │   ├── wireframe_page3_collapsed.png
    │   ├── wireframe_page3_expanded.png
    │   └── wireframe_page4.png
    └── prod_screentshot/        # 실제 구현 화면 스크린샷
        ├── page_1.png
        ├── page_1_attached.png
        ├── page_1_loading.png
        ├── page_2.png
        └── Page_3.png
```
