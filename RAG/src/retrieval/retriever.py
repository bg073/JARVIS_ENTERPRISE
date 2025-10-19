import os
from typing import List, Dict, Tuple

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer, CrossEncoder
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels
from opensearchpy import OpenSearch

from src.retrieval.indexers import EmbeddingSingleton, qdrant_collection_for, opensearch_index_for

load_dotenv()


def _env(name: str, default: str | None = None) -> str:
    return os.getenv(name, default) or (default or "")


class RerankerSingleton:
    _model = None

    @classmethod
    def get(cls) -> CrossEncoder:
        if cls._model is None:
            model_name = _env("RERANKER_MODEL", "BAAI/bge-reranker-large")
            cls._model = CrossEncoder(model_name)
        return cls._model


class HybridRetriever:
    def __init__(self) -> None:
        self.qdrant = QdrantClient(url=_env("QDRANT_URL", "http://localhost:6333"), timeout=int(_env("QDRANT_TIMEOUT", "10")))
        # default legacy collection name retained for backward compat
        self.collection = _env("QDRANT_COLLECTION", "rag_chunks")
        self.os = OpenSearch(hosts=[_env("OPENSEARCH_URL", "http://localhost:9200")], http_compress=True)
        # default legacy index retained for backward compat
        self.os_index = _env("OPENSEARCH_INDEX", "rag_docs")
        self.embedder: SentenceTransformer = EmbeddingSingleton.get()
        self.reranker: CrossEncoder = RerankerSingleton.get()

    def _qdrant_search_space(self, space: str, query: str, top_k: int, tenant_id: str, user_roles: List[str], tags: List[str] | None) -> List[Dict]:
        qvec = self.embedder.encode([query], normalize_embeddings=True)[0].tolist()
        musts = [
            qmodels.FieldCondition(key="tenant_id", match=qmodels.MatchValue(value=tenant_id)),
            qmodels.FieldCondition(key="roles", match=qmodels.MatchAny(any=user_roles)),
            qmodels.FieldCondition(key="space", match=qmodels.MatchValue(value=space)),
        ]
        if tags:
            musts.append(qmodels.FieldCondition(key="tags", match=qmodels.MatchAny(any=tags)))
        flt = qmodels.Filter(must=musts)
        res = self.qdrant.search(
            collection_name=qdrant_collection_for(space),
            query_vector=qvec,
            query_filter=flt,
            with_payload=True,
            limit=top_k,
        )
        items = []
        for p in res:
            payload = p.payload or {}
            items.append({
                "id": payload.get("chunk_id"),
                "document_id": payload.get("document_id"),
                "score": float(p.score),
                "text": payload.get("text", ""),
                "source": {
                    "filename": payload.get("filename"),
                    "chunk_index": payload.get("chunk_index"),
                    "mime": payload.get("mime"),
                },
                "origin": f"vector:{space}",
            })
        return items

    def _opensearch_bm25_space(self, space: str, query: str, top_k: int, tenant_id: str, user_roles: List[str], tags: List[str] | None) -> List[Dict]:
        must = [{"match": {"text": query}}]
        filt = [
            {"term": {"tenant_id": tenant_id}},
            {"terms": {"roles": user_roles}},
            {"term": {"space": space}},
        ]
        if tags:
            filt.append({"terms": {"tags": tags}})
        q = {
            "query": {
                "bool": {
                    "must": must,
                    "filter": filt,
                }
            },
            "size": top_k,
            "_source": ["document_id", "text", "filename", "chunk_id", "chunk_index", "mime"],
        }
        res = self.os.search(index=opensearch_index_for(space), body=q)
        hits = res.get("hits", {}).get("hits", [])
        out = []
        for h in hits:
            src = h.get("_source", {})
            out.append({
                "id": src.get("chunk_id") or f"{src.get('document_id')}_full",
                "document_id": src.get("document_id"),
                "score": float(h.get("_score", 0.0)),
                "text": src.get("text", ""),
                "source": {
                    "filename": src.get("filename"),
                    "chunk_index": src.get("chunk_index", -1),
                    "mime": src.get("mime"),
                },
                "origin": f"bm25:{space}",
            })
        return out

    def _rrf(self, a: List[Dict], b: List[Dict], k: int = 60) -> List[Dict]:
        ranks: Dict[str, float] = {}
        def add(scores: List[Dict]):
            for rank, item in enumerate(scores, start=1):
                key = item["id"]
                ranks[key] = ranks.get(key, 0.0) + 1.0 / (k + rank)
        add(a)
        add(b)
        # build unified entries by picking best text/metadata seen
        merged: Dict[str, Dict] = {}
        for lst in (a, b):
            for it in lst:
                key = it["id"]
                if key not in merged:
                    merged[key] = it.copy()
        # turn into list with rrf_score
        result = []
        for key, score in sorted(ranks.items(), key=lambda x: x[1], reverse=True):
            entry = merged.get(key)
            if entry:
                e = entry.copy()
                e["rrf_score"] = score
                result.append(e)
        return result

    def retrieve(self, query: str, tenant_id: str, user_roles: List[str], spaces: List[str] | None = None, tags: List[str] | None = None, top_k: int = 20, per_source_k: int = 50) -> List[Dict]:
        spaces = [s.lower() for s in (spaces or ["documents"])]
        all_vec: List[Dict] = []
        all_bm25: List[Dict] = []
        for sp in spaces:
            try:
                all_vec.extend(self._qdrant_search_space(sp, query, per_source_k, tenant_id, user_roles, tags))
            except Exception as e:
                # continue even if one space not available
                pass
            try:
                all_bm25.extend(self._opensearch_bm25_space(sp, query, per_source_k, tenant_id, user_roles, tags))
            except Exception as e:
                pass
        fused = self._rrf(all_vec, all_bm25)
        # Rerank top candidates using cross-encoder
        pairs = [(query, it["text"]) for it in fused[: max(top_k * 3, 50)]]
        scores = self.reranker.predict(pairs).tolist() if pairs else []
        for it, sc in zip(fused, scores):
            it["rerank_score"] = float(sc)
        fused.sort(key=lambda x: x.get("rerank_score", 0.0), reverse=True)
        return fused[:top_k]
