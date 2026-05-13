백엔드(FastAPI, 포트 8000)와 프론트엔드(Vite, 포트 5173)를 백그라운드로 동시에 시작한다.

현재 프로젝트 루트:
`/Users/gimjeongtae/Desktop/MyProject/nomadcoder-ai-agent-challenge/education-agent`

실행 절차:
1. 프로젝트 루트에서 `bash run-dev.sh`를 실행한다.
2. 스크립트가 자체적으로 3초 대기 후 기동 로그를 출력한다.
3. `backend.pid`, `frontend.pid`가 생성되었는지 확인한다.
4. `backend/backend.log`에서 `Uvicorn running on`, `frontend/frontend.log`에서 `Local:` 메시지를 확인한다.
5. 결과를 사용자에게 한국어로 요약한다.

주의:
- 이미 포트가 사용 중이면 로그의 에러 메시지를 확인하고 사용자에게 충돌 포트를 알려준다.
- 서버를 직접 foreground로 띄우지 말고 기존 `run-dev.sh`를 사용한다.
