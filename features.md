# ⚙️ 기능 명세 및 백로그 (Feature Specifications & Backlog)

## 1. 핵심 노드(Node)별 기능 구체화

### 기능 1: 이력서 분석 및 맞춤형 컨텍스트 추출 (Resume Parsing Node)
* **입력:** 사용자가 업로드한 이력서 PDF 파일
* **처리 로직:**
  1. `PyPDF2`를 이용해 PDF 파일 내의 모든 텍스트를 추출.
  2. 추출된 텍스트를 LLM에 전달하여 **3가지 핵심 정보**를 JSON 형태로 구조화.
     * `tech_stack`: 언어 및 프레임워크 리스트
     * `core_projects`: 주요 프로젝트 경험 요약
     * `weak_points`: 이력서 상에서 검증이 필요해 보이는 '공격 포인트' 도출
* **출력 (State 저장):** 위 3가지 정보가 포함된 Context JSON

### 기능 2: 첫 질문 및 동적 꼬리 질문 생성 (Interviewer Node)
* **입력:** [기능 1]의 Context JSON, 대화 기록(History), 이전 답변 평가 결과(`Needs_Followup` 여부)
* **처리 로직:**
  * **1번째 질문:** 무조건 `core_projects`를 기반으로 경험 위주의 첫 질문 생성.
  * **2~N번째 질문:** 이전 답변의 평가 결과(`Needs_Followup`)에 따라 분기(Routing) 처리.
    * `Needs_Followup == True`: 이전 답변의 부족한 점을 파고드는 날카로운 꼬리 질문 생성.
    * `Needs_Followup == False`: 다음 주제(CS 지식이나 기술 스택 장단점)로 넘어가는 새로운 질문 생성.
* **출력:** 면접관의 질문 텍스트

### 기능 3: 실시간 답변 평가자 (Evaluator Node)
* **입력:** 현재 면접관의 질문, 사용자의 텍스트 답변
* **처리 로직:**
  * 사용자의 답변을 **STAR 기법(상황-과제-행동-결과)** 및 **기술적 깊이**를 기준으로 평가.
  * 2가지 값을 판별:
    1. **점수(Score):** 해당 답변의 퀄리티를 1~10점으로 채점.
    2. **꼬리 질문 여부(`Needs_Followup`):** 답변이 너무 짧거나 표면적이라면 `True`, 충분하다면 `False`.
* **출력 (State 누적):** `[질문, 답변, 점수, 피드백 코멘트]` 딕셔너리를 State 리스트에 추가.
  * **UI 연동:** 누적된 데이터는 Streamlit 사이드바에 아코디언(`st.expander`) 형태의 블록으로 차곡차곡 쌓임.

### 기능 4: 종합 평가 리포트 생성 (Report Generator Node)
* **실행 조건:** 전체 질문 횟수가 MAX_QUESTIONS (예: 3회)에 도달하면 대화 종료 후 해당 노드로 이동.
* **처리 로직:**
  * 누적된 State(전체 대화 기록 및 채점 내역)를 LLM에게 통째로 넘겨 종합 평가 진행.
  * UI 렌더링을 위해 데이터를 규격화된 JSON으로 반환.
    * `radar_scores`: 6가지 역량별 0~100점 수치
    * `total_feedback`: 종합 강점 및 보완점
    * `qna_review`: [내 답변] vs [AI 모범 답안] 교차 비교
* **출력:** 리포트 렌더링용 최종 JSON 데이터.

---

## 2. 🗂 백로그 (Backlog - 추후 반영 예정)

1. **면접 난이도 조절 기능 (Difficulty Level)**
   * **개요:** 면접 시작 전 'Junior(쉬움)', 'Mid-level(보통)', 'Hardcore(압박)' 중 난이도를 선택하는 기능.
   * **로직:** Streamlit 사이드바에 `st.select_slider`를 추가하고, 선택된 난이도 변수를 System Prompt에 주입. Hardcore일 경우 꼬리 질문의 빈도(`Needs_Followup` 허들)를 높이고 더 집요하게 파고드는 페르소나 적용.
2. **음성 기반 인터페이스 (Voice UI 추가)**
   * **개요:** 타이핑 대신 마이크로 답변하고, 면접관의 피드백을 TTS로 듣는 기능.
   * **로직:** OpenAI Whisper API(STT) 및 TTS API 연동.
3. **답변 시간 측정 및 평가 반영 (Timer & Quick Response)**
   * **개요:** 질문을 받은 시점부터 답변을 제출할 때까지의 '시간(순발력)'을 측정하여 평가에 반영. 실제 면접의 압박감을 구현.
   * **로직:** UI 상에 실시간 타이머(`st.empty()` 등 활용)를 시각적으로 보여주고, 답변에 걸린 시간(초) 데이터를 `Evaluator Node`에 전달하여 점수 산정 시 가중치로 활용.
