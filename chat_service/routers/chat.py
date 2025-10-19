import os
from typing import List, Optional, Any, Tuple
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
import httpx
from time import perf_counter

router = APIRouter()

RAG_API_URL = os.getenv("RAG_API_URL", "http://localhost:8000")
LLM_URL = os.getenv("LLM_URL", "http://127.0.0.1:8085")
LLM_MODEL = os.getenv("LLM_MODEL", "local-llm")
SNIPPET_CHARS = int(os.getenv("SNIPPET_CHARS", "600"))  # per-snippet truncation
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "4000"))  # total concatenated context cap
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "512"))
RAG_TIMEOUT_S = float(os.getenv("RAG_TIMEOUT_S", "20"))
LLM_TIMEOUT_S = float(os.getenv("LLM_TIMEOUT_S", "40"))


class ChatRequest(BaseModel):
    message: str
    tenant_id: str = os.getenv("DEFAULT_TENANT", "default")
    user_roles: List[str] = ["employee"]
    spaces: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    top_k: int = 6


class SourceItem(BaseModel):
    id: Optional[str] = None
    text: str
    score: Optional[float] = None
    origin: Optional[str] = None
    document_id: Optional[str] = None


class RagMeta(BaseModel):
    count: int
    time_ms: float
    error: Optional[str] = None


class LlmMeta(BaseModel):
    time_ms: float
    error: Optional[str] = None
    model: Optional[str] = None


class ChatMeta(BaseModel):
    rag: Optional[RagMeta] = None
    llm: Optional[LlmMeta] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceItem] = []
    meta: Optional[ChatMeta] = None


async def _rag_search(query: str, tenant_id: str, user_roles: List[str], spaces: Optional[List[str]], tags: Optional[List[str]], top_k: int) -> List[dict]:
    url = f"{RAG_API_URL.rstrip('/')}/query"
    payload = {
        "query": query,
        "tenant_id": tenant_id,
        "user_roles": user_roles,
        "spaces": spaces,
        "tags": tags,
    }
    async with httpx.AsyncClient(timeout=RAG_TIMEOUT_S) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        results = data.get("results", [])
        return results[:top_k]


async def _llm_answer(query: str, snippets: List[str]) -> Tuple[str, Optional[str], float]:
    endpoint = f"{LLM_URL.rstrip('/')}/v1/chat/completions"
    system = (
        "You are an enterprise assistant. Answer the user's question using the given context. "
        "If the answer is not in the context, say you are not certain and provide best effort guidance. "
        "Keep answers concise and cite short source markers like [S1], [S2] where appropriate."
    )
    # Enforce overall context cap
    joined: List[str] = []
    total = 0
    for i, s in enumerate(snippets):
        tag = f"[S{i+1}] "
        budget = MAX_CONTEXT_CHARS - total - len(tag)
        if budget <= 0:
            break
        piece = (s[:budget]) if len(s) > budget else s
        seg = f"{tag}{piece}"
        joined.append(seg)
        total += len(seg) + 2  # account for future separators
        if total >= MAX_CONTEXT_CHARS:
            break
    context = "\n\n".join(joined)
    user = f"Question: {query}\n\nContext:\n{context}"
    start = perf_counter()
    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT_S) as client:
            r = await client.post(
                endpoint,
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.2,
                    "max_tokens": LLM_MAX_TOKENS,
                },
            )
            r.raise_for_status()
            data = r.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return (content or "(no response)", None, (perf_counter() - start) * 1000.0)
    except Exception as e:
        # Fallback minimal answer if LLM is unavailable
        preview = "\n\n".join(snippets[:2]) if snippets else "(no context available)"
        ans = (
            "I couldn't reach the local LLM right now. "
            "Here are the top context snippets I found; you can try again in a moment or start the LLM service.\n\n"
            f"{preview}"
        )
        return (ans, str(e), (perf_counter() - start) * 1000.0)


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    # 1) Retrieve context from RAG
    rag_t0 = perf_counter()
    rag_err: Optional[str] = None
    try:
        results = await _rag_search(
            query=payload.message,
            tenant_id=payload.tenant_id,
            user_roles=payload.user_roles,
            spaces=payload.spaces,
            tags=payload.tags,
            top_k=payload.top_k,
        )
    except Exception as e:
        results = []
        rag_err = str(e)
    rag_ms = (perf_counter() - rag_t0) * 1000.0
    snippets = []
    sources: List[SourceItem] = []
    for r in results:
        text = r.get("text", "")[:1800]
        if text:
            snippets.append(text)
            sources.append(
                SourceItem(
                    id=str(r.get("id")) if r.get("id") is not None else None,
                    text=text[:300],
                    score=r.get("score"),
                    origin=r.get("origin"),
                    document_id=r.get("document_id"),
                )
            )
    # 2) Ask local LLM with context
    answer, llm_err, llm_ms = await _llm_answer(payload.message, snippets)
    # Always return 200 with fallback answer to avoid frontend fetch errors
    meta = ChatMeta(
        rag=RagMeta(count=len(snippets), time_ms=rag_ms, error=rag_err),
        llm=LlmMeta(time_ms=llm_ms, error=llm_err, model=LLM_MODEL),
    )
    return ChatResponse(answer=answer, sources=sources, meta=meta)


@router.post("/rag_upload")
async def rag_upload(
    file: UploadFile = File(...),
    tenant_id: str = Form(os.getenv("DEFAULT_TENANT", "default")),
    uploader_id: str = Form("anonymous"),
    space: str = Form("documents"),
    tags: str = Form(""),
    project_id: str | None = Form(None),
    project_subdb: str | None = Form(None),
):
    url = f"{RAG_API_URL.rstrip('/')}/upload_sync"
    try:
        async with httpx.AsyncClient(timeout=RAG_TIMEOUT_S) as client:
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
            files = {
                "file": (file.filename, await file.read(), file.content_type or "application/octet-stream"),
            }
            r = await client.post(url, data=data, files=files)
            r.raise_for_status()
            return r.json()
    except Exception as e:
        return {"error": str(e)}
