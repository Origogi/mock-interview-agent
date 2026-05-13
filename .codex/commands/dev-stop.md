백엔드와 프론트엔드 개발 서버를 종료한다.

현재 프로젝트 루트:
`/Users/gimjeongtae/Desktop/MyProject/nomadcoder-ai-agent-challenge/education-agent`

실행 절차:
1. 프로젝트 루트에서 `bash stop-dev.sh`를 실행한다.
2. `backend.pid`, `frontend.pid`가 있으면 해당 프로세스를 종료하고 PID 파일 삭제 여부를 확인한다.
3. PID 파일이 없으면 스크립트가 `pkill` fallback을 수행한다.
4. 남은 `uvicorn main:app` 또는 `vite` 프로세스가 있는지 필요 시 확인한다.
5. 결과를 사용자에게 한국어로 요약한다.

주의:
- 사용자가 명시하지 않은 다른 프로세스는 종료하지 않는다.
- 종료 실패 시 PID 파일과 실제 프로세스 상태를 함께 확인해 보고한다.
