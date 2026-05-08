백엔드(FastAPI, 포트 8000)와 프론트엔드(Vite, 포트 5173)를 백그라운드로 동시에 시작한다.

```bash
cd /Users/gimjeongtae/Desktop/MyStudyProj/nomadcoder-challenge/mock-interview-agent && bash run-dev.sh
```

시작 후 3초 대기하고 로그를 출력한다. PID는 `backend.pid`, `frontend.pid`에 저장된다.
실행 결과를 확인하고 두 서버가 정상 기동되었는지 로그에서 포트 수신 메시지를 찾아 사용자에게 알린다.
