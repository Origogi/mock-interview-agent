# 🤖 Backend — LangGraph Agent Architecture

본 폴더는 FastAPI + LangGraph 기반의 AI 에이전트 서버 코드입니다.

## 1. 기술 스택

| 영역 | 사용 기술 |
|------|---------|
| API Server | FastAPI + Uvicorn |
| Agent Framework | LangGraph (상태 머신/라우팅), LangChain |
| LLM | OpenAI `gpt-4.1-mini` 기본, 환경변수로 변경 가능 |
| PDF 파싱 | PyPDF2 |
| Package Manager | `uv` |

## 2. 시스템 아키텍처 (LangGraph Workflow)

Tech-Interviewer AI는 단순 단일 프롬프트 챗봇이 아니라 **상태 기반 워크플로우(State-based Workflow)** 입니다. 사용자(프론트엔드) 입력을 대기하기 위해 그래프 실행을 멈추고(Interrupt), 입력이 들어오면 평가와 다음 질문 생성을 반복합니다.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'fontFamily': 'Inter, system-ui, sans-serif',
    'fontSize': '14px',
    'lineColor': '#9ca3af'
  }
}}%%
flowchart TD
    START([Start]):::startEnd
    Node1(Node 1<br/>Resume Parser):::parser
    Tool1(extract_resume_text<br/><i>file_path: str → str</i>):::tool
    Pause1[/Page 2 요약 대기/]:::pause
    Node2(Node 2<br/>Interviewer):::interviewer
    Pause2[/Page 3 답변 대기/]:::pause
    Node3(Node 3<br/>Evaluator):::evaluator
    Check{질문 횟수<br/>도달?}:::check
    Node4(Node 4<br/>Report Generator):::report
    END([End]):::startEnd

    START --> Node1
    Node1 -.->|invoke| Tool1
    Node1 --> Pause1
    Pause1 -->|면접 시작| Node2
    Node2 --> Pause2
    Pause2 -->|답변 제출| Node3
    Node3 --> Check
    Check -->|아니오| Node2
    Check -->|예| Node4
    Node4 --> END

    classDef startEnd fill:#e0e7ff,stroke:#6366f1,stroke-width:2px,color:#3730a3,font-weight:600;
    classDef parser fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e,font-weight:500;
    classDef interviewer fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e40af,font-weight:500;
    classDef evaluator fill:#fce7f3,stroke:#ec4899,stroke-width:2px,color:#9f1239,font-weight:500;
    classDef report fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46,font-weight:500;
    classDef check fill:#fff7ed,stroke:#fb923c,stroke-width:2px,color:#9a3412,font-weight:500;
    classDef pause fill:#ede9fe,stroke:#a78bfa,stroke-width:1.5px,color:#5b21b6,stroke-dasharray: 5 3;
    classDef tool fill:#f3f4f6,stroke:#6b7280,stroke-width:1.5px,color:#374151,stroke-dasharray: 5 3;
```

## 3. 상태 (InterviewState)

```python
from typing import TypedDict, List, Dict, Annotated
from langgraph.graph.message import add_messages

class InterviewState(TypedDict):
    resume_summary: Dict                      # 파서가 뽑은 이력서 요약 데이터
    messages: Annotated[list, add_messages]   # 오가는 채팅 기록
    question_count: int                       # 현재 진행된 질문 수
    max_questions: int                        # 최대 질문 수 (기본 20)
    evaluations: List[Dict]                   # 턴마다 누적되는 평가 결과 (점수, 피드백)
    final_report: Dict                        # 최종 결과 리포트
    is_partial: bool                          # 조기 종료 리포트 여부
    answered_count: int                       # 유효 답변 수
    disclaimer: str                           # 부분 리포트 안내 문구
```

## 4. 노드 (Nodes)

| 노드 | 역할 | Interrupt | 소속 그래프 |
|-----|------|-----------|----------|
| **Node 1: Resume Parser** | PDF에서 raw text를 추출(아래 `extract_resume_text` tool 위임)한 뒤 LLM으로 기술 스택·프로젝트·핵심 역량을 JSON으로 구조화하여 `resume_summary`에 저장 | (HTTP 응답 경계) | `parser_graph` (단발) |
| **Node 2: Interviewer** | `resume_summary`와 이전 `messages`를 보고 다음 질문(또는 꼬리 질문) 생성, `question_count` +1 | Page 3 답변 대기 | `graph` |
| **Node 3: Evaluator** | 사용자 답변을 평가하여 `evaluations`에 점수 + 피드백 누적 | - | `graph` |
| **Node 4: Report Generator** | 누적된 `evaluations`를 바탕으로 최종 레이더 차트 데이터 + 종합 피드백 생성 | - | `graph` |

> **그래프 분리 이유**: Resume Parser는 단발성(인터럽트 없음)이라 `parser_graph`로 컴파일되어 `/api/upload`에서 호출되고, Interviewer~Report는 인터럽트 기반 멀티턴이라 `graph`로 컴파일되어 `/api/chat`에서 호출됩니다. 두 그래프는 동일한 `InterviewState` 스키마를 공유합니다. "Page 2 대기"는 LangGraph interrupt가 아닌 HTTP 응답 경계로 표현됩니다(프론트가 `/api/upload` 응답을 받고 Page 2를 띄운 채 사용자가 면접 시작 버튼을 누를 때까지).

### Tools (`backend/tools.py`)

LangChain `@tool` 데코레이터로 등록된 재사용 가능한 함수들. 노드 안에서 직접 호출하거나 향후 LLM이 자율적으로 invoke할 수 있도록 schema가 노출됩니다.

| 이름 | Input | Output | 용도 |
|-----|------|--------|------|
| `extract_resume_text` | `file_path: str` (로컬 PDF 경로) | `str` (모든 페이지의 raw text, 줄바꿈 구분) | Resume Parser 노드의 PDF 추출 단계. PyPDF2로 페이지 별 텍스트 추출 |
| `generate_sample_answer` | `thread_id: str`, `quality_tier: str` ("best"\|"good"\|"bad") | `dict` (`{"answer": str, "expected_score_range": [int, int]}`) | 현재 진행 중인 면접 질문에 대해 등급별 샘플 답변 생성. 점수 범위: `best=7~10`, `good=5~6`, `bad=1~4` (디버그/테스트용) |

```python
# backend/tools.py
@tool
def extract_resume_text(file_path: str) -> str:
    """Read a resume PDF from the local filesystem and return its raw extracted text."""
    ...

@tool
def generate_sample_answer(thread_id: str, quality_tier: str) -> dict:
    """Generate a sample answer for the current pending question at a specified quality tier."""
    ...
```

호출 예시:
```python
from tools import extract_resume_text, generate_sample_answer
text = extract_resume_text.invoke({"file_path": "/tmp/resume.pdf"})
result = generate_sample_answer.invoke({"thread_id": "session-id", "quality_tier": "best"})
```

## 5. 프롬프트 엔지니어링

### Interviewer Prompt
```text
당신은 10년 차 시니어 개발자이자 엄격하지만 합리적인 기술 면접관입니다.
지원자의 이력서 내용과 이전 답변을 기반으로 실무 역량을 검증해야 합니다.

[현재 질문 컨텍스트]
- 전체 질문 번호: Qn/20
- 현재 세션: CS Fundamentals | Framework Usage | Problem Solving | Communication
- 세션 내 질문 번호: 1~5/5
- 현재 세션 목표: 세션별 검증 목표

[원칙]
1. 단순한 개념 질문보다는 경험 기반 질문을 하세요.
   ("React를 사용해 상태 관리를 하셨는데, 왜 Redux 대신 Zustand를 선택하셨나요?")
2. 한 번에 하나의 질문만 하세요.
3. 세션 순서는 고정하고, 현재 세션 목표 안에서만 질문하세요.
4. 진행 상태, 세션 종료, 남은 질문 수를 안내하지 말고 바로 기술 질문만 하세요.
5. 사용자의 준비 여부를 묻거나 진행 확인만 하는 질문은 금지입니다.
6. 응답은 반드시 평가 가능한 하나의 기술 면접 질문으로 끝나야 합니다.
```

생성 결과에 준비 확인이나 세션 종료 안내성 문구가 포함되면 서버가 현재 Q 번호와 세션에 맞는 기술 질문으로 교체합니다.

### Evaluator Prompt
```text
지원자의 답변을 엄격하게 평가하세요.

질문: {question}
답변: {answer}

점수 기준:
- 7~10점 (Best): 핵심 문제를 정확히 짚고 구체적인 설계/구현 방법, 트레이드오프, 운영 관측성 또는 검증 방법을 설명한 답변
- 5~6점 (Good): 큰 방향은 맞지만 구체성, 기술적 깊이, 트레이드오프, 운영 방안 중 일부가 빠진 보통 수준의 답변
- 1~4점 (Bad): 모호하거나 피상적이고, 수동 처리/로그 확인/재시작처럼 문제를 구조적으로 해결하지 못하는 답변

채점 원칙:
1. 7점 이상은 구체적인 근거와 실행 가능한 설계가 있을 때만 부여하세요.
2. 일반론적이거나 "잘 처리하겠다" 수준이면 6점 이하로 제한하세요.
3. 답변이 운영자의 수동 대응에 의존하거나 구조적 예방책이 없으면 4점 이하로 평가하세요.
4. 피드백에는 왜 해당 점수인지와 개선해야 할 구체적 포인트를 포함하세요.
```

### Report Prompt
```text
지금까지의 면접 대화 기록과 평가(evaluations)를 바탕으로 지원자의 역량을 종합 평가하세요.

[출력 형식 (JSON)]
{
  "scores": {
    "cs_fundamentals": 80, "framework_usage": 90,
    "problem_solving": 75, "communication": 85
  },
  "session_summaries": [
    {
      "sessionId": "cs_fundamentals",
      "sessionLabel": "CS Fundamentals",
      "sessionIndex": 1,
      "answeredCount": 5,
      "sessionTotalQuestions": 5,
      "score": 80,
      "status": "completed"
    }
  ],
  "answered_count": 20,
  "max_questions": 20,
  "feedback": {
    "strengths": "대용량 트래픽 처리 경험에 대한 구체적인 수치 제시가 훌륭합니다.",
    "weaknesses": "기술의 단점이나 한계에 대한 고려가 다소 부족합니다.",
    "improvements": [...]
  }
}
```

## 6. API 엔드포인트

| 메서드 | 경로 | 용도 |
|--------|-----|------|
| `GET` | `/` | 헬스체크 |
| `POST` | `/api/upload` | PDF 업로드 → `parser_graph` 호출 (Resume Parser 노드) → `parsed_data` 반환 |
| `POST` | `/api/chat` | 사용자 답변 → Evaluator → Interviewer (또는 Report) |
| `POST` | `/api/chat/stream` | `llm.stream()` 기반 Chunked NDJSON 스트리밍 면접 진행. 실패 시 프론트는 `/api/chat`으로 폴백 |
| `POST` | `/api/interview/end` | 조기 종료. 유효 답변 5개 이상이면 부분 리포트, 5개 미만이면 폐기 응답 |
| `POST` | `/api/interview/rewind` | thread history에서 선택 질문 답변 전 checkpoint를 찾아 현재 상태를 파괴적으로 복원 |
| `POST` | `/api/debug/sample-answer` | **[디버그]** 현재 진행 중인 질문에 대해 등급별 샘플 답변 생성. Body: `{"thread_id": "...", "quality_tier": "best"\|"good"\|"bad"}`. Response: `{"answer": "...", "expected_score_range": [low, high]}` |

CORS: `localhost:5173`, `5174`, `3000` 만 허용.

### 면접 종료 정책

- `max_questions`는 "질문 수"가 아니라 "완료된 답변/평가 수" 기준입니다.
- 면접은 총 20문항이며, 4개 세션이 고정 순서로 진행됩니다.
- 세션 순서: `cs_fundamentals` Q1~Q5 → `framework_usage` Q6~Q10 → `problem_solving` Q11~Q15 → `communication` Q16~Q20.
- 20번째 답변 평가 후에는 다음 질문을 만들지 않고 `report_node`로 이동합니다.
- 조기 종료는 LangGraph 재진입이 아니라 별도 라우팅에서 현재 state를 읽어 처리합니다.
- 유효 답변이 5개 이상이면 `report_node`를 부분 리포트 모드로 호출합니다.
- 유효 답변이 5개 미만이면 리포트를 만들지 않고 프론트가 Page 1로 복귀할 수 있는 응답을 반환합니다.
- 세션 점수는 해당 세션의 5개 답변 점수 평균을 100점 척도로 환산합니다.
- 미완료 세션은 점수를 추정하지 않고 `scores.<sessionId> = null`, `session_summaries[].status = "insufficient_evidence"`로 표시합니다.
- 조기 종료 race condition 방지를 위해 thread 단위 lock을 사용합니다.

### 타임머신 되감기 정책

- `/api/interview/rewind`는 thread history에서 대상 질문의 답변 전 checkpoint를 찾습니다.
- Qn으로 되감으면 Q1~Q(n-1)의 평가만 유지하고 Qn 이후 평가와 리포트는 무효화합니다.
- 현재 질문은 Qn으로 복원하고, 프론트는 Page 3 입력 대기 상태로 돌아갑니다.
- MVP는 원본 타임라인 보존 없이 현재 타임라인을 덮어쓰는 파괴적 복원 방식입니다.

## 7. 테스트

### 기본 테스트

```bash
cd backend
uv run pytest
```

기본 실행에서는 실제 LLM 호출 테스트가 skip됩니다. 비용, 속도, 네트워크 의존성이 있으므로 LLM 테스트는 opt-in으로 분리되어 있습니다.

### Evaluator LLM 테스트

`backend/tests/test_evaluator_node_llm.py`는 `evaluator_node`의 실제 LLM 평가 품질을 검증합니다.

- PyTest `@pytest.mark.parametrize`로 `best/good/bad` 티어별 5개씩, 총 15개 답변 케이스를 개별 테스트로 실행합니다.
- 각 테스트는 `evaluator_node()`를 직접 호출해 실제 `eval_llm` 평가 결과를 받습니다.
- 점수는 canonical tier 범위로 검증합니다: `Best 7~10`, `Good 5~6`, `Bad 1~4`.
- 각 케이스마다 별도 Judge LLM을 실행합니다.
- Judge는 `ChatPromptTemplate`에 `question`, `expected_tier`, `answer`, `evaluation` 컨텍스트를 주입하고, `with_structured_output()`으로 구조화된 verdict를 반환합니다.
- Judge verdict는 답변 품질이 기대 tier와 맞는지, 피드백이 실행 가능한지, 점수가 합리적인지 확인합니다.

실행:

```bash
cd backend
env RUN_LLM_TESTS=1 uv run pytest -m llm -s
```

필요 환경 변수:

```env
OPENAI_API_KEY="your-api-key-here"
RUN_LLM_TESTS=1
```

선택 환경 변수:

```env
OPENAI_MODEL="gpt-4.1-mini"
EVAL_JUDGE_MODEL="gpt-4.1-mini"
```

> 현재 LLM 테스트는 15개 테스트 각각에서 evaluator 1회 + Judge 1회를 호출하므로 총 30회 LLM 호출이 발생합니다.

## 8. 실행

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 9. 환경 변수

`backend/.env` 또는 모노레포 루트 `.env` 에 다음을 정의:
```env
OPENAI_API_KEY="your-api-key-here"
```
