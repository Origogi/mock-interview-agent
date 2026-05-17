# Railway Deployment

이 프로젝트는 `frontend/`와 `backend/`가 독립적으로 동작하는 isolated monorepo이므로 Railway 서비스 2개로 배포한다.

## 현재 데모 URL

| 영역 | Public URL | 확인 방법 |
|------|------------|-----------|
| Frontend | `https://mock-interview-agent-production-7c51.up.railway.app` | 브라우저에서 접속 후 `API Online` 확인 |
| Backend | `https://mock-interview-agent-production.up.railway.app` | `/` 응답이 `{"status":"Backend is running!"}`인지 확인 |

## 서비스 구성

| Service | Root Directory | Config File Path | Runtime | Port |
|---------|----------------|------------------|---------|------|
| Backend | `/backend` | `/backend/railway.toml` | Railpack + FastAPI/Uvicorn | Railway `$PORT` |
| Frontend | `/frontend` | `/frontend/railway.toml` | Dockerfile + Caddy static server | Railway `$PORT`, local fallback `8080` |

Railway의 monorepo 설정에서 Config File Path는 Root Directory를 따라가지 않으므로 반드시 절대 경로 형태로 지정한다.

## Backend Variables

`tech-interviewer-backend` 서비스 Variables에 설정한다.

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
BACKEND_CORS_ORIGINS=https://mock-interview-agent-production-7c51.up.railway.app
```

선택 변수:

```env
INTERVIEW_MODEL=gpt-4.1-mini
EVALUATION_MODEL=gpt-4.1-mini
SAMPLE_ANSWER_MODEL=gpt-4.1-mini
```

`BACKEND_CORS_ORIGINS`는 쉼표로 여러 origin을 넣을 수 있다. Origin은 scheme과 host까지만 적고 path나 trailing slash를 붙이지 않는다.

```env
BACKEND_CORS_ORIGINS=https://<frontend-domain>,http://localhost:5173
```

`OPENAI_API_KEY`는 비밀값이므로 문서나 저장소에 남기지 않는다. 값 끝에 공백이나 줄바꿈이 들어가면 OpenAI SDK가 `Illegal header value ... Bearer <key>\n` 형태로 실패할 수 있으므로 Railway 입력 후 재배포 전에 한 번 더 확인한다.

## Frontend Variables

`tech-interviewer-frontend` 서비스 Variables에 설정한다.

```env
VITE_API_BASE_URL=https://mock-interview-agent-production.up.railway.app
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
9. Frontend에서 PDF 업로드, Q1 생성, 답변 제출까지 end-to-end로 확인한다.

## 검증

- Backend: `GET https://<backend-domain>/` 응답이 `{"status":"Backend is running!"}`인지 확인한다.
- Frontend: `https://<frontend-domain>/` 접속 후 상단 서버 상태가 connected인지 확인한다.
- 실제 플로우: PDF 업로드 -> 요약 -> Q1 생성 -> 답변 제출 -> 리포트 이동까지 확인한다.

배포 URL 기준 smoke test:

```bash
curl -i https://mock-interview-agent-production.up.railway.app/
curl -i \
  -H "Origin: https://mock-interview-agent-production-7c51.up.railway.app" \
  https://mock-interview-agent-production.up.railway.app/
curl -i \
  -H "Origin: https://mock-interview-agent-production-7c51.up.railway.app" \
  -F "file=@planning/assets/resume.pdf;type=application/pdf" \
  https://mock-interview-agent-production.up.railway.app/api/upload
```

두 번째 요청에는 `access-control-allow-origin`이 frontend URL로 내려와야 한다. 세 번째 요청은 OpenAI 호출까지 포함하므로 정상 환경에서는 `status: "success"`와 `parsed_data`를 반환한다.

## 장애 대응 메모

| 증상 | 가능 원인 | 확인/조치 |
|------|-----------|-----------|
| Frontend `API Offline` | `VITE_API_BASE_URL` 오입력, Frontend 재배포 누락, Backend 미기동 | Frontend Variables 확인 후 재배포, Backend `/` 직접 호출 |
| 브라우저 CORS 오류 | Backend `BACKEND_CORS_ORIGINS` 누락/오타/trailing slash | Backend Variables에서 정확한 frontend origin 입력 후 재배포 |
| `Resume parsing failed: Connection error.` | OpenAI API 키 값 문제, 네트워크/쿼타 문제 | Railway Backend Logs에서 OpenAI 원문 예외 확인 |
| `Illegal header value ... Bearer <key>\n` | `OPENAI_API_KEY` 끝에 줄바꿈 포함 | 키를 새로 붙여넣고 끝 공백/줄바꿈 제거 후 Backend 재배포 |

## 운영 메모

- `.env` 파일은 커밋하지 않고 Railway Variables에만 등록한다.
- 현재 LangGraph checkpointer는 `MemorySaver`라 Railway 재시작/재배포 시 진행 중인 면접 세션이 사라진다. 데모 배포에는 충분하지만, 운영 배포에서는 Postgres/Redis 기반 영속 checkpointer로 교체해야 한다.
- 프론트엔드는 Caddy로 `dist/`를 서빙하고 `try_files {path} /index.html`로 SPA fallback을 처리한다.
