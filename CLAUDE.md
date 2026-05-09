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
| `product-manager` | 기획, 백로그, 우선순위, 일정 |
| `frontend-developer` | React 컴포넌트, 상태 관리, UI 구현 |
| `backend-developer` | FastAPI 엔드포인트, LangGraph 워크플로우, 프롬프트 |
| `ui-designer` | 디자인 검수, 타이포그래피, 색상, 인터랙션 |

## Plan First 원칙
코딩 또는 시스템 변경 작업은 **반드시 Step-by-Step 구현 플랜을 먼저 제시**하고 사용자 승인 후 실행한다. 절대 즉시 코드를 작성하지 않는다.

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
