백엔드와 프론트엔드 개발 서버를 종료한다.

```bash
cd /Users/gimjeongtae/Desktop/MyStudyProj/nomadcoder-challenge/mock-interview-agent && bash stop-dev.sh
```

`backend.pid`, `frontend.pid` 파일이 있으면 해당 프로세스를 종료하고 PID 파일을 삭제한다.
파일이 없으면 `pkill`로 uvicorn과 vite 프로세스를 강제 종료한다.
결과를 사용자에게 보고한다.
