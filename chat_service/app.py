import os
import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .routers import chat as chat_router
from .routers import upload as upload_router
from .routers import interviewer as interviewer_router
from .routers import smart_access as smart_router
from sqlalchemy import select
from .db import engine, SessionLocal
from .models import Base, Employee
from .routers.smart_access import _reconcile_privileges_for_employee

load_dotenv()

app = FastAPI(title="Jarvis Chat Service", version="0.1.0")

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

app.include_router(chat_router.router, tags=["chat"]) 
app.include_router(upload_router.router, tags=["upload"]) 
app.include_router(interviewer_router.router, prefix="/interviewer", tags=["interviewer"]) 
app.include_router(smart_router.router, prefix="/smart", tags=["smart_access"]) 

def _ensure_migrations():
    try:
        with engine.begin() as conn:
            # candidates: phone_number, provisioned
            try:
                cols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info('candidates')").fetchall()}
                if 'phone_number' not in cols:
                    conn.exec_driver_sql("ALTER TABLE candidates ADD COLUMN phone_number VARCHAR(64)")
                if 'provisioned' not in cols:
                    conn.exec_driver_sql("ALTER TABLE candidates ADD COLUMN provisioned BOOLEAN NOT NULL DEFAULT 0")
            except Exception:
                pass
            # employees: phone_number
            try:
                cols = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info('employees')").fetchall()}
                if 'phone_number' not in cols:
                    conn.exec_driver_sql("ALTER TABLE employees ADD COLUMN phone_number VARCHAR(64)")
            except Exception:
                pass
    except Exception:
        pass


@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
        _ensure_migrations()
    except Exception:
        pass
    # Start background reconcile thread (no permission required)
    try:
        interval = int(os.getenv("PRIV_RECONCILE_SECONDS", "300"))
    except Exception:
        interval = 300

    def _reconcile_loop():
        while True:
            try:
                with SessionLocal() as db:
                    emps = db.execute(select(Employee)).scalars().all()
                    for emp in emps:
                        _ = [p for p in (emp.privileges or [])]
                        _reconcile_privileges_for_employee(db, emp)
                    db.commit()
            except Exception:
                # swallow exceptions to keep loop alive
                pass
            time.sleep(max(30, interval))

    try:
        t = threading.Thread(target=_reconcile_loop, name="priv-reconcile", daemon=True)
        t.start()
    except Exception:
        pass

@app.get("/health")
def health():
    return {"status": "ok", "service": "chat"}
