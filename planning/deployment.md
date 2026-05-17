# Railway Deployment

이 프로젝트는 `frontend/`와 `backend/`가 독립적으로 동작하는 isolated monorepo이므로 Railway 서비스 2개로 배포한다.

## 서비스 구성

| Service | Root Directory | Config File Path | Runtime |
|---------|----------------|------------------|---------|
| Backend | `/backend` | `/backend/railway.toml` | Railpack + FastAPI/Uvicorn |
| Frontend | `/frontend` | `/frontend/railway.toml` | Dockerfile + Caddy static server |

Railway의 monorepo 설정에서 Config File Path는 Root Directory를 따라가지 않으므로 반드시 절대 경로 형태로 지정한다.

## Backend Variables

`tech-interviewer-backend` 서비스 Variables에 설정한다.

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
BACKEND_CORS_ORIGINS=https://<frontend-domain>
```

선택 변수:

```env
INTERVIEW_MODEL=gpt-4.1-mini
EVALUATION_MODEL=gpt-4.1-mini
SAMPLE_ANSWER_MODEL=gpt-4.1-mini
```

`BACKEND_CORS_ORIGINS`는 쉼표로 여러 origin을 넣을 수 있다.

```env
BACKEND_CORS_ORIGINS=https://<frontend-domain>,http://localhost:5173
```

## Frontend Variables

`tech-interviewer-frontend` 서비스 Variables에 설정한다.

```env
VITE_API_BASE_URL=https://<backend-domain>
```

Vite의 `VITE_` 변수는 빌드 시점에 번들에 포함된다. 값을 바꾸면 프론트엔드를 다시 배포해야 한다.

## 배포 순서

1. Railway에서 GitHub repo를 연결한다.
2. Backend 서비스를 만들고 Root Directory를 `/backend`, Config File Path를 `/backend/railway.toml`로 지정한다.
3. Backend Variables에 `OPENAI_API_KEY`, `OPENAI_MODEL`, 임시 CORS origin을 넣고 배포한다.
4. Backend Settings > Networking에서 public domain을 생성한다.
5. Frontend 서비스를 만들고 Root Directory를 `/frontend`, Config File Path를 `/frontend/railway.toml`로 지정한다.
6. Frontend Variables에 `VITE_API_BASE_URL=https://<backend-domain>`을 넣고 배포한다.
7. Frontend Settings > Networking에서 public domain을 생성한다.
8. Backend `BACKEND_CORS_ORIGINS`를 실제 frontend domain으로 갱신하고 backend를 재배포한다.

## 검증

- Backend: `GET https://<backend-domain>/` 응답이 `{"status":"Backend is running!"}`인지 확인한다.
- Frontend: `https://<frontend-domain>/` 접속 후 상단 서버 상태가 connected인지 확인한다.
- 실제 플로우: PDF 업로드 -> 요약 -> Q1 생성 -> 답변 제출 -> 리포트 이동까지 확인한다.

## 운영 메모

- `.env` 파일은 커밋하지 않고 Railway Variables에만 등록한다.
- 현재 LangGraph checkpointer는 `MemorySaver`라 Railway 재시작/재배포 시 진행 중인 면접 세션이 사라진다. 데모 배포에는 충분하지만, 운영 배포에서는 Postgres/Redis 기반 영속 checkpointer로 교체해야 한다.
- 프론트엔드는 Caddy로 `dist/`를 서빙하고 `try_files {path} /index.html`로 SPA fallback을 처리한다.
