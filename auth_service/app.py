import os
from datetime import timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .routers import auth as auth_router

load_dotenv()

API_TITLE = "Jarvis Auth Service"
API_VERSION = "0.1.0"

app = FastAPI(title=API_TITLE, version=API_VERSION)

# CORS: allow Vite dev and any additional origins via env
origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router.router, prefix="/auth", tags=["auth"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "auth", "version": API_VERSION}
