import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form
import httpx

router = APIRouter()

RAG_API_URL = os.getenv("RAG_API_URL", "http://localhost:8000")

@router.post("/rag_upload")
async def rag_upload(
    file: UploadFile = File(...),
    tenant_id: str = Form(os.getenv("DEFAULT_TENANT", "default")),
    uploader_id: str = Form("dashboard"),
    space: str = Form("documents"),
    tags: str = Form(""),
    project_id: Optional[str] = Form(None),
    project_subdb: Optional[str] = Form(None),
):
    # Forward to RAG /upload_sync
    url = f"{RAG_API_URL.rstrip('/')}/upload_sync"
    content = await file.read()
    files = {
        "file": (file.filename, content, file.content_type or "application/octet-stream"),
    }
    data = {
        "tenant_id": tenant_id,
        "uploader_id": uploader_id,
        "space": space,
        "tags": tags,
    }
    if project_id:
        data["project_id"] = project_id
    if project_subdb:
        data["project_subdb"] = project_subdb

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(url, data=data, files=files)
        r.raise_for_status()
        return r.json()
