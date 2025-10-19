# Enterprise RAG (Local, Hybrid)

This repository scaffolds a local-first, enterprise-ready RAG stack with:

- Qdrant for vector search (dense)
- OpenSearch for BM25 (sparse)
- SentenceTransformers (BGE-M3) for embeddings
- Background ACL inference at upload (silent), stored as metadata
- FastAPI service with `/upload` and `/health`

Audio/ASR is intentionally excluded per requirements.

## Quick start

1. Copy environment file

```
cp .env.example .env
```

2. Start services

```
docker compose up -d
```

3. Install Python deps (ideally in a venv)

```
pip install -r requirements.txt
```

4. Run API

```
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Upload a file

```
curl -F "file=@/path/to/file.pdf" -F "tenant_id=default" -F "uploader_id=alice" http://localhost:8000/upload
```

This schedules a background job that:

- Extracts text from the document
- Infers ACL roles silently (heuristic placeholder for AI call)
- Chunks and embeds text (BGE-M3)
- Upserts chunks to Qdrant with ACL payload
- Indexes full text to OpenSearch for BM25

6. Query with role-based filtering

```
curl -X POST http://localhost:8000/query \
  -H 'Content-Type: application/json' \
  -d '{
        "query": "How to restore the production database?",
        "tenant_id": "default",
        "user_roles": ["engineering", "employee"]
      }'
```

The response contains ranked chunks with citations and includes both BM25 and vector fusion with a local reranker. Only chunks whose `roles` intersect with your `user_roles` and `tenant_id` are eligible.

## Notes

- Replace heuristic ACL with a local LLM later; the API is isolated in `src/utils/acl.py`.
- Tune chunking and add a reranker + retrieval API next (`/query`).
- Configure role-based filtering by adding filters at retrieval time using the stored `roles` and `tenant_id`.
- ACL inference is performed silently in the background upon upload; the inferred roles are stored in both Qdrant payload and OpenSearch documents and used for filtering during retrieval.
