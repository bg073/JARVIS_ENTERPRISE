import os
import uuid
import time
from typing import List, Dict, Any

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from opensearchpy import OpenSearch

from src.ingestion.parser import extract_text_from_file
from src.utils.acl import infer_acl_from_text, build_acl_metadata

load_dotenv()


def _env(name: str, default: str | None = None) -> str:
    return os.getenv(name, default) or (default or "")


class EmbeddingSingleton:
    _model = None

    @classmethod
    def get(cls) -> SentenceTransformer:
        if cls._model is None:
            model_name = _env("EMBEDDING_MODEL", "BAAI/bge-m3")
            print(f"[Embedding] Loading model from: {model_name}")
            cls._model = SentenceTransformer(model_name)
        return cls._model


DEFAULT_SPACES = ["documents", "employees", "decisions", "memory", "projects"]


def qdrant_collection_for(space: str) -> str:
    return f"rag_chunks_{space}"


def opensearch_index_for(space: str) -> str:
    return f"rag_docs_{space}"


class IndexCoordinator:
    def __init__(self) -> None:
        self.qdrant = QdrantClient(url=_env("QDRANT_URL", "http://localhost:6333"), timeout=int(_env("QDRANT_TIMEOUT", "10")))
        # legacy single-collection name (kept for backward compat if used)
        self.collection = _env("QDRANT_COLLECTION", "rag_chunks")
        self.os = OpenSearch(hosts=[_env("OPENSEARCH_URL", "http://localhost:9200")], http_compress=True)
        self.os_index = _env("OPENSEARCH_INDEX", "rag_docs")

    def ensure_ready(self) -> None:
        # Wait for Qdrant to be ready and ensure collection exists
        q_attempts = 15
        for i in range(q_attempts):
            try:
                # lightweight call to check readiness
                _ = self.qdrant.get_collections()
                break
            except Exception:
                if i == q_attempts - 1:
                    raise
                time.sleep(2)

        # Lazily ensure default spaces, but don't fail startup if any one fails
        for sp in DEFAULT_SPACES:
            try:
                self.ensure_space_ready(sp)
            except Exception as e:
                print(f"[Startup][WARN] ensure_space_ready failed for space={sp}: {e}")

        # Wait for OpenSearch and ensure index exists
        os_attempts = 30
        for i in range(os_attempts):
            try:
                if self.os.ping():
                    break
            except Exception:
                pass
            time.sleep(1)

        # Ensure legacy index exists for backward compat (optional)
        if not self.os.indices.exists(index=self.os_index):
            self._create_os_index(self.os_index)

    def _create_os_index(self, index_name: str) -> None:
        self.os.indices.create(
            index=index_name,
            body={
                "settings": {"number_of_shards": 1, "number_of_replicas": 0},
                "mappings": {
                    "properties": {
                        "document_id": {"type": "keyword"},
                        "tenant_id": {"type": "keyword"},
                        "uploader_id": {"type": "keyword"},
                        "roles": {"type": "keyword"},
                        "text": {"type": "text"},
                        "mime": {"type": "keyword"},
                        "chunk_id": {"type": "keyword"},
                        "chunk_index": {"type": "integer"},
                        "filename": {"type": "keyword"},
                        "space": {"type": "keyword"},
                        "tags": {"type": "keyword"},
                        "project_id": {"type": "keyword"},
                        "subdb": {"type": "keyword"}
                    }
                },
            },
        )

    def ensure_space_ready(self, space: str) -> None:
        # Qdrant collection for space
        col = qdrant_collection_for(space)
        try:
            self.qdrant.get_collection(col)
        except Exception:
            r_attempts = 10
            last_err = None
            for _ in range(r_attempts):
                try:
                    self.qdrant.recreate_collection(
                        collection_name=col,
                        vectors_config=qmodels.VectorParams(size=1024, distance=qmodels.Distance.COSINE),
                    )
                    last_err = None
                    break
                except Exception as e:
                    last_err = e
                    time.sleep(2)
            if last_err:
                raise last_err

        # OpenSearch index for space
        idx = opensearch_index_for(space)
        if not self.os.indices.exists(index=idx):
            self._create_os_index(idx)

    # ---------------- Projects (hierarchical) helpers ----------------
    @staticmethod
    def _valid_project_subdb(subdb: str) -> bool:
        return subdb in {"documents", "main_progress", "employees", "key_decisions", "memory"}

    @staticmethod
    def qdrant_collection_for_project(project_id: str, subdb: str) -> str:
        return f"rag_chunks_projects_{project_id}_{subdb}"

    @staticmethod
    def opensearch_index_for_project(project_id: str, subdb: str) -> str:
        return f"rag_docs_projects_{project_id}_{subdb}"

    def ensure_project_ready(self, project_id: str, subdb: str) -> None:
        if not project_id or not self._valid_project_subdb(subdb):
            raise ValueError("Invalid project_id or subdb")
        # Qdrant
        pcol = self.qdrant_collection_for_project(project_id, subdb)
        try:
            self.qdrant.get_collection(pcol)
        except Exception:
            r_attempts = 10
            last_err = None
            for _ in range(r_attempts):
                try:
                    self.qdrant.recreate_collection(
                        collection_name=pcol,
                        vectors_config=qmodels.VectorParams(size=1024, distance=qmodels.Distance.COSINE),
                    )
                    last_err = None
                    break
                except Exception as e:
                    last_err = e
                    time.sleep(2)
            if last_err:
                raise last_err
        # OpenSearch
        pidx = self.opensearch_index_for_project(project_id, subdb)
        if not self.os.indices.exists(index=pidx):
            self._create_os_index(pidx)

    def _chunk(self, text: str, max_tokens: int = 1000, overlap: int = 150) -> List[str]:
        # Simple character-based chunking as placeholder.
        # Replace with token-aware chunking later.
        window = max_tokens
        step = max(1, window - overlap)
        return [text[i : i + window] for i in range(0, len(text), step)]

    def process_and_index(self, filename: str, content: bytes, tenant_id: str, uploader_id: str, space: str = "documents", tags: list[str] | None = None, project_id: str | None = None, project_subdb: str | None = None) -> None:
        try:
            space = (space or "documents").lower()
            tags = tags or []
            print(f"[Ingest] Start: filename={filename}, tenant={tenant_id}, uploader={uploader_id}, space={space}, tags={tags}, project_id={project_id}, subdb={project_subdb}")
            # Ensure target infra exists
            use_project_route = space == "projects" and project_id and project_subdb and self._valid_project_subdb(project_subdb)
            if use_project_route:
                self.ensure_project_ready(project_id, project_subdb)
            else:
                self.ensure_space_ready(space)
            # 1) Extract
            text, mime = extract_text_from_file(filename, content)
            if not text.strip():
                print(f"[Ingest] No extractable text for {filename}; skipping indexing.")
                return
            # 2) Infer ACL (background, silent)
            roles = infer_acl_from_text(text)
            acl_meta = build_acl_metadata(tenant_id, uploader_id, roles)
            # 3) Chunk
            max_t = int(_env("CHUNK_SIZE_TOKENS", "1000"))
            ovlp = int(_env("CHUNK_OVERLAP_TOKENS", "150"))
            chunks = self._chunk(text, max_tokens=max_t, overlap=ovlp)
            print(f"[Ingest] Chunked into {len(chunks)} chunks")
            # 4) Embed
            embedder = EmbeddingSingleton.get()
            vectors = embedder.encode(chunks, normalize_embeddings=True).tolist()
            # 5) Upsert to Qdrant
            points = []
            base_doc_id = str(uuid.uuid4())
            for i, (chunk, vec) in enumerate(zip(chunks, vectors)):
                # Use a real UUID for Qdrant point ID (required: int or UUID)
                point_id = str(uuid.uuid4())
                pid = f"{base_doc_id}_{i}"  # logical chunk id for our payload/search
                payload = {
                    **acl_meta,
                    "document_id": base_doc_id,
                    "chunk_id": pid,
                    "chunk_index": i,
                    "text": chunk,
                    "mime": mime,
                    "filename": filename,
                    "space": space,
                    "tags": tags,
                    "project_id": project_id,
                    "subdb": project_subdb,
                }
                points.append(qmodels.PointStruct(id=point_id, vector=vec, payload=payload))
            if points:
                if use_project_route:
                    self.qdrant.upsert(collection_name=self.qdrant_collection_for_project(project_id, project_subdb), points=points)
                else:
                    self.qdrant.upsert(collection_name=qdrant_collection_for(space), points=points)
                print(f"[Ingest] Upserted {len(points)} chunks to Qdrant")
            # 6) Index chunks (and a full-doc record) into BM25 (OpenSearch)
            # 6a) Full document record (helps recall for long queries)
            target_index = self.opensearch_index_for_project(project_id, project_subdb) if use_project_route else opensearch_index_for(space)
            self.os.index(
                index=target_index,
                body={
                    "document_id": base_doc_id,
                    "tenant_id": tenant_id,
                    "uploader_id": uploader_id,
                    "roles": acl_meta["roles"],
                    "text": text,
                    "mime": mime,
                    "filename": filename,
                    "chunk_id": None,
                    "chunk_index": -1,
                    "space": space,
                    "tags": tags,
                    "project_id": project_id,
                    "subdb": project_subdb,
                },
            )
            # 6b) Per-chunk records
            for i, chunk in enumerate(chunks):
                pid = f"{base_doc_id}_{i}"
                self.os.index(
                    index=target_index,
                    body={
                        "document_id": base_doc_id,
                        "tenant_id": tenant_id,
                        "uploader_id": uploader_id,
                        "roles": acl_meta["roles"],
                        "text": chunk,
                        "mime": mime,
                        "filename": filename,
                        "chunk_id": pid,
                        "chunk_index": i,
                        "space": space,
                        "tags": tags,
                        "project_id": project_id,
                        "subdb": project_subdb,
                    },
                )
            print(f"[Ingest] Indexed chunks into OpenSearch for {filename}")
            try:
                self.os.indices.refresh(index=target_index)
            except Exception as e:
                print(f"[Ingest][WARN] OpenSearch refresh failed: {e}")
        except Exception as e:
            # Surface errors in server logs for debugging
            print(f"[Ingest][ERROR] {filename}: {e}")
