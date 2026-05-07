> 💡 **참고:** 프로젝트의 전반적인 기획 배경 및 타겟이 궁금하시다면 [👉 기획서(proposal.md)](./proposal.md)를 참고해 주세요.


# 🤖 AI 에이전트 설계 및 기술 스택 (gemini.md)

## 1. 기술 스택 (Tech Stack)
* **Frontend UI:** React (Vite), MUI (Material-UI), Recharts (또는 Chart.js 등 차트 시각화)
* **Backend / Agent Framework:** Python, FastAPI (API 서버), LangGraph (에이전트 워크플로우 상태/라우팅 제어), LangChain
* **LLM:** OpenAI (`gpt-4o-mini`) - 가성비 및 빠른 추론 속도 활용
* **Data Processing:** PyPDF2 (이력서 텍스트 파싱)

## 2. 시스템 아키텍처 (LangGraph Workflow)
Tech-Interviewer AI는 단순한 단일 프롬프트 기반의 챗봇이 아니라, LangGraph를 활용한 **상태 기반 워크플로우(State-based Workflow)**를 가집니다.

### 📌 Agent Nodes & State
* **State (상태):** `이력서 텍스트`, `채팅 기록(History)`, `현재 질문 횟수`, `평가 결과 리스트`
* **Node 1: Resume Parser (이력서 분석가)**
  * 역할: PDF에서 추출된 텍스트를 읽고, 핵심 역량, 프로젝트, 사용 기술 스택을 JSON 형태로 구조화하여 State에 저장.
* **Node 2: Interviewer (면접관)**
  * 역할: State에 저장된 이력서 정보와 이전 대화 기록을 바탕으로 다음 질문(또는 꼬리 질문)을 생성.
* **Node 3: Evaluator (답변 평가자)**
  * 역할: 사용자의 답변이 들어오면, 질문의 의도에 맞게 잘 대답했는지(STAR 기법 준수 여부, 기술적 깊이 등) 평가하고 점수화하여 State에 기록.
* **Node 4: Report Generator (리포트 생성기)**
  * 역할: 지정된 횟수(예: 3~5회)의 질문이 끝나면 라우팅되어 최종 레이더 차트 수치와 교정 피드백을 Markdown/JSON으로 출력.

## 3. 프롬프트 엔지니어링 (Prompt Strategy)
OpenAI의 `gpt-4o-mini` 모델에 부여될 주요 프롬프트 설계입니다.

### 1) 면접관 페르소나 (System Prompt)
```text
당신은 10년 차 시니어 개발자이자 엄격하지만 합리적인 기술 면접관입니다.
지원자의 이력서 내용을 기반으로 실무 역량을 검증해야 합니다.

[원칙]
1. 단순한 개념 질문("React가 무엇인가요?")보다는 경험 기반 질문("React를 사용해 상태 관리를 하셨는데, 왜 Redux 대신 Zustand를 선택하셨나요?")을 하세요.
2. 지원자의 답변이 모호하거나 표면적이면, 구체적인 사례나 트러블슈팅 경험을 요구하는 꼬리 질문을 던지세요.
3. 한 번에 하나의 질문만 하세요.
```

### 2) 답변 평가 및 꼬리 질문 생성 (Evaluator Prompt)
```text
지원자의 이전 답변을 평가하고, 다음 행동을 결정하세요.

[입력 정보]
- 방금 한 질문: {current_question}
- 지원자의 답변: {user_answer}

[지시사항]
1. 지원자의 답변이 논리적이고 기술적으로 정확한가요? (1~10점)
2. 답변이 충분히 깊이가 있다면, 이력서의 다른 항목으로 넘어가 새로운 질문을 생성하세요.
3. 답변이 부족하다면, 부족한 부분을 파고드는 꼬리 질문을 생성하세요.
```

### 3) 결과 리포트 생성 (Report Prompt)
```text
지금까지의 면접 대화 기록을 바탕으로 지원자의 역량을 평가하세요.

[출력 형식 (JSON)]
{
  "scores": {
    "cs_fundamentals": 80,
    "framework_usage": 90,
    "problem_solving": 75,
    "communication": 85
  },
  "feedback": {
    "strengths": "대용량 트래픽 처리 경험에 대한 구체적인 수치 제시가 훌륭합니다.",
    "weaknesses": "기술의 단점이나 한계에 대한 고려가 다소 부족합니다.",
    "improvements": [
       {"question": "트러블슈팅 경험?", "user_answer": "...", "better_answer": "..."}
    ]
  }
}
```

## 4. 에이전트 라우팅(Routing) 로직
* **Continue 조건:** 현재 질문 횟수(question_count) < MAX_QUESTIONS
* **End 조건:** 현재 질문 횟수(question_count) == MAX_QUESTIONS
  * -> `Report Generator` 노드로 이동하여 종합 리포트 생성 후 대화 종료.
```
