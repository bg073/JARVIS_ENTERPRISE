# Jarvis Auth Service

A standalone FastAPI authentication service with SQLite and JWT for the Jarvis website.

## Endpoints
- POST `/auth/signup` { email, password, role }
- POST `/auth/login` { email, password }
- GET `/auth/me` with `Authorization: Bearer <token>`
- GET `/health`

## Environment
Create a `.env` file in `auth_service/` (optional):

```
AUTH_DATABASE_URL=sqlite:///./auth.db
AUTH_JWT_SECRET=please_change_me
AUTH_JWT_ALG=HS256
AUTH_JWT_EXPIRE_MIN=120
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

## Install & Run

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn auth_service.app:app --host 0.0.0.0 --port 8001 --reload
```

## Notes
- Uses SQLite for zero-config local development. Swap `AUTH_DATABASE_URL` to Postgres/MySQL if needed.
- Ensure the frontend uses env `VITE_AUTH_API_URL` pointing to this service (e.g. `http://localhost:8001`).
