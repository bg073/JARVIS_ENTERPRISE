def suggest_privileges_via_llm(roles: list[str], project_code: str) -> list[str]:
    """Ask local llama.cpp server for privilege keys to grant based on roles and project.
    Expects an OpenAI-compatible /v1/chat/completions endpoint.
    Returns a list of privilege keys like ["db_read", "repo_access"].
    """
    llm_url = os.getenv("LLM_URL", "http://127.0.0.1:8080")
    endpoint = f"{llm_url.rstrip('/')}/v1/chat/completions"
    system = (
        "You assign least-privilege project-scoped grants for a new project assignment. "
        "Return ONLY a compact JSON list of privilege keys from this allowed set: "
        "[\"db_read\", \"db_write\", \"repo_access\", \"vpn_access\"]. "
        "Do not include any prose."
    )
    user = (
        f"roles={roles}; project={project_code}. "
        "Decide the minimal privileges required for this user to start contributing."
    )
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                endpoint,
                json={
                    "model": os.getenv("LLM_MODEL", "local-llm"),
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "[]")
            # Try to parse JSON list
            import json as _json
            return list(_json.loads(content))
    except Exception:
        pass
    # Fallback minimal set
    return ["db_read", "repo_access"]


def suggest_roles_via_llm(roles: list[str], project_code: str) -> list[str]:
    """Ask llama.cpp to return project ROLE labels (not raw privileges).
    Allowed roles: ["project_viewer", "project_editor", "project_admin", "data_reader", "data_writer"].
    Returns a JSON list of roles.
    """
    llm_url = os.getenv("LLM_URL", "http://127.0.0.1:8080")
    endpoint = f"{llm_url.rstrip('/')}/v1/chat/completions"
    system = (
        "You assign least-privilege ROLE SETS for a new project assignment. "
        "Return ONLY a compact JSON list of role labels from this allowed set: "
        "[\"project_viewer\", \"project_editor\", \"project_admin\", \"data_reader\", \"data_writer\"]. "
        "Do not include any prose."
    )
    user = (
        f"user_roles={roles}; project={project_code}. "
        "Select the minimal roles required for this user to start contributing."
    )
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                endpoint,
                json={
                    "model": os.getenv("LLM_MODEL", "local-llm"),
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "[]")
            import json as _json
            return list(_json.loads(content))
    except Exception:
        pass
    # Fallback minimal role
    return ["project_viewer"]


ROLE_TO_PRIVS = {
    # Project roles
    "project_viewer": ["repo_access", "db_read"],
    "project_editor": ["repo_access", "db_read", "db_write"],
    "project_admin": ["repo_access", "db_read", "db_write"],
    # Data roles (extend as needed)
    "data_reader": ["db_read"],
    "data_writer": ["db_read", "db_write"],
}


def map_roles_to_privileges(role_labels: list[str]) -> list[str]:
    privs: set[str] = set()
    for r in role_labels:
        privs.update(ROLE_TO_PRIVS.get(r, []))
    # Global VPN is not tied to project roles; keep as separate default
    return sorted(privs)

import os
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx
import pg8000

from src.ingestion.parser import extract_text_from_file
from src.utils.acl import infer_acl_from_text
from src.retrieval.indexers import IndexCoordinator, DEFAULT_SPACES, qdrant_collection_for, opensearch_index_for
from src.retrieval.retriever import HybridRetriever

load_dotenv()

app = FastAPI(title="Enterprise RAG", version="0.1.0")
indexer = IndexCoordinator()
retriever = HybridRetriever()

# CORS for frontend
origins = (os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080").split(","))
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UploadResponse(BaseModel):
    document_id: str
    status: str


@app.on_event("startup")
def on_startup():
    indexer.ensure_ready()
    # Ensure tables for extended features
    try:
        with pg_conn() as con:
            con.autocommit = True
            with con.cursor() as cur:
                _ensure_project_meta(cur)
                _ensure_team_tables(cur)
                _ensure_memory_tables(cur)
                _ensure_skill_overrides(cur)
    except Exception:
        pass


@app.post("/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tenant_id: str = Form(os.getenv("DEFAULT_TENANT", "default")),
    uploader_id: str = Form("anonymous"),
    space: str = Form("documents"),
    tags: str = Form(""),
    project_id: str | None = Form(None),
    project_subdb: str | None = Form(None),
):
    # Read bytes first; parse in background
    content = await file.read()
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    # Dispatch background job: parse -> ACL inference -> chunk+embed -> index
    background_tasks.add_task(
        indexer.process_and_index,
        file.filename,
        content,
        tenant_id,
        uploader_id,
        space,
        tag_list,
        project_id,
        project_subdb,
    )

    return UploadResponse(document_id=file.filename, status="accepted")


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------- Employee Skills Map ----------------------
def _get_employee_by_email(cur, email: str):
    cur.execute("SELECT id, name, email FROM employees WHERE email=%s", (email,))
    return cur.fetchone()


def _get_active_projects_for_employee(cur, employee_id: int):
    cur.execute(
        """
        SELECT p.code
        FROM project_assignments pa
        JOIN projects p ON p.id=pa.project_id
        WHERE pa.employee_id=%s AND pa.revoked_at IS NULL
        """,
        (employee_id,),
    )
    rows = cur.fetchall() or []
    return [r[0] for r in rows]


def _collect_os_evidence_for_employee(employee_name: str, employee_email: str, project_codes: list[str], per_index_k: int = 15) -> list[dict]:
    """Collect top-k evidence texts per project sub-index using OpenSearch BM25.
    Search by name/email across sub-dbs: documents, main_progress, employees, key_decisions, memory.
    """
    subdbs = ["documents", "main_progress", "employees", "key_decisions", "memory"]
    collected: list[dict] = []
    for code in project_codes:
        for sub in subdbs:
            idx = indexer.opensearch_index_for_project(code, sub)
            try:
                q = {
                    "size": per_index_k,
                    "query": {
                        "bool": {
                            "should": [
                                {"match": {"text": employee_email}},
                                {"match": {"text": employee_name}},
                            ],
                            "minimum_should_match": 1
                        }
                    },
                    "_source": ["text", "filename", "document_id", "chunk_id", "chunk_index"],
                }
                res = indexer.os.search(index=idx, body=q)
                for hit in res.get("hits", {}).get("hits", []):
                    src = hit.get("_source", {})
                    collected.append({
                        "project_code": code,
                        "subdb": sub,
                        "text": src.get("text", "")[:2000],
                        "doc": src,
                    })
            except Exception:
                continue
    return collected


def _score_employee_via_llm(employee_name: str, employee_email: str, roles_hint: list[str], evidence: list[dict]) -> dict:
    """Ask local LLM to produce structured skills profile.
    Returns dict with keys: overall_score:int, roles:list[str], skills:list[{name, proficiency, confidence, evidence_refs}], notes:str
    """
    llm_url = os.getenv("LLM_URL", "http://127.0.0.1:8080")
    endpoint = f"{llm_url.rstrip('/')}/v1/chat/completions"
    snippets = []
    for ev in evidence[: 15 * 5]:  # hard cap prompt size
        snippets.append(f"[{ev['project_code']}/{ev['subdb']}] {ev['text']}")
    context = "\n".join(snippets)
    system = (
        "You are an internal HR skills assessor. From the provided evidence, produce a JSON summary with: "
        "overall_score (0-100), roles (list of role labels), skills (list of objects with name, proficiency 0-5, confidence 0-1, evidence_refs: short strings), and notes. "
        "Return ONLY JSON."
    )
    user = (
        f"employee={{name:{employee_name}, email:{employee_email}, roles_hint:{roles_hint}}}\n"
        f"evidence:\n{context}"
    )
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                endpoint,
                json={
                    "model": os.getenv("LLM_MODEL", "local-llm"),
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            import json as _json
            return dict(_json.loads(content))
    except Exception:
        return {"overall_score": 50, "roles": roles_hint or ["project_viewer"], "skills": [], "notes": "fallback"}


def _ensure_skill(cur, name: str) -> int:
    cur.execute("SELECT id FROM skills WHERE name=%s", (name,))
    r = cur.fetchone()
    if r:
        return r[0]
    cur.execute("INSERT INTO skills(name) VALUES (%s) RETURNING id", (name,))
    return cur.fetchone()[0]


def _persist_skills_snapshot(cur, employee_id: int, snapshot: dict, evidence: list[dict]):
    import json as _json
    # snapshot
    cur.execute(
        "INSERT INTO employee_skill_snapshot(employee_id, overall_score, roles_json, skills_json, notes) VALUES (%s,%s,%s,%s,%s)",
        (
            employee_id,
            int(snapshot.get("overall_score", 0)),
            _json.dumps(snapshot.get("roles", [])),
            _json.dumps(snapshot.get("skills", [])),
            snapshot.get("notes", ""),
        ),
    )
    # upsert skills
    for sk in snapshot.get("skills", []):
        name = str(sk.get("name", "")).strip()
        if not name:
            continue
        prof = int(sk.get("proficiency", 0))
        conf = float(sk.get("confidence", 0.8))
        sid = _ensure_skill(cur, name)
        cur.execute(
            "INSERT INTO employee_skills(employee_id, skill_id, proficiency, confidence) VALUES (%s,%s,%s,%s) "
            "ON CONFLICT (employee_id, skill_id) DO UPDATE SET proficiency=EXCLUDED.proficiency, confidence=EXCLUDED.confidence, last_verified_at=NOW()",
            (employee_id, sid, prof, conf),
        )
    # store limited evidence
    for ev in evidence[:100]:
        cur.execute(
            "INSERT INTO employee_skill_evidence(employee_id, project_code, source_type, source_ref, snippet) VALUES (%s,%s,%s,%s,%s)",
            (
                employee_id,
                ev.get("project_code"),
                "rag_os",
                ev.get("doc", {}).get("document_id") or ev.get("doc", {}).get("chunk_id") or "",
                ev.get("text", "")[:1000],
            ),
        )


class SkillsRecomputeRequest(BaseModel):
    employee_email: str
    requester_email: str
    requester_roles: list[str] = ["manager"]
    per_index_k: int = 15


@app.post("/skills/recompute")
def skills_recompute(payload: SkillsRecomputeRequest):
    # Visibility: allow if self or requester has manager/hr/security
    is_self = payload.employee_email.lower() == payload.requester_email.lower()
    elevated = any(r in {"manager", "hr", "security"} for r in payload.requester_roles)
    if not (is_self or elevated):
        return JSONResponse({"error": "forbidden"}, status_code=403)

    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            emp = _get_employee_by_email(cur, payload.employee_email)
            if not emp:
                return JSONResponse({"error": "employee_not_found"}, status_code=404)
            emp_id, emp_name, emp_email = emp[0], emp[1], emp[2]
            project_codes = _get_active_projects_for_employee(cur, emp_id)

    # Collect evidence (top 15 per index)
    evidence = _collect_os_evidence_for_employee(emp_name, emp_email, project_codes, per_index_k=payload.per_index_k)
    roles_hint = ["employee"]
    snapshot = _score_employee_via_llm(emp_name, emp_email, roles_hint, evidence)

    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            emp = _get_employee_by_email(cur, payload.employee_email)
            emp_id = emp[0]
            _persist_skills_snapshot(cur, emp_id, snapshot, evidence)

    # Mirror summary into RAG employees space
    summary = f"Skills profile for {emp_name} ({emp_email})\nOverall: {snapshot.get('overall_score')}\nRoles: {snapshot.get('roles')}\nTop skills: {[ (s.get('name'), s.get('proficiency')) for s in snapshot.get('skills', [])[:5] ]}"
    indexer.process_and_index(
        filename=f"skills_{emp_email}.txt",
        content=summary.encode("utf-8"),
        tenant_id=os.getenv("DEFAULT_TENANT", "default"),
        uploader_id="skills_map",
        space="employees",
        tags=["skills", "profile"],
    )
    return {"status": "ok", "snapshot": snapshot, "evidence_count": len(evidence)}


@app.get("/skills/employee")
def get_employee_skills(email: str, requester_email: str, requester_roles: str = "manager"):
    roles_list = [r.strip() for r in requester_roles.split(",") if r.strip()]
    is_self = email.lower() == requester_email.lower()
    elevated = any(r in {"manager", "hr", "security"} for r in roles_list)
    if not (is_self or elevated):
        return JSONResponse({"error": "forbidden"}, status_code=403)
    with pg_conn() as con:
        with con.cursor() as cur:
            emp = _get_employee_by_email(cur, email)
            if not emp:
                return JSONResponse({"error": "employee_not_found"}, status_code=404)
            emp_id = emp[0]
            cur.execute(
                "SELECT overall_score, roles_json, skills_json, notes, created_at FROM employee_skill_snapshot WHERE employee_id=%s ORDER BY created_at DESC LIMIT 1",
                (emp_id,),
            )
            snap = cur.fetchone()
            if not snap:
                return {"skills": [], "overall_score": 0, "roles": [], "notes": "no_snapshot"}
            return {
                "overall_score": snap[0],
                "roles": snap[1],
                "skills": snap[2],
                "notes": snap[3],
                "created_at": str(snap[4]),
            }


@app.get("/skills/search")
def search_by_skill(skill: str, min_level: int = 3, requester_roles: str = "manager"):
    roles_list = [r.strip() for r in requester_roles.split(",") if r.strip()]
    elevated = any(r in {"manager", "hr", "security"} for r in roles_list)
    if not elevated:
        return JSONResponse({"error": "forbidden"}, status_code=403)
    with pg_conn() as con:
        with con.cursor() as cur:
            sid = _ensure_skill(cur, skill)
            cur.execute(
                """
                SELECT e.name, e.email, es.proficiency, es.confidence
                FROM employee_skills es
                JOIN employees e ON e.id=es.employee_id
                WHERE es.skill_id=%s AND es.proficiency >= %s
                ORDER BY es.proficiency DESC, es.confidence DESC
                LIMIT 50
                """,
                (sid, min_level),
            )
            out = []
            for r in cur.fetchall() or []:
                out.append({"name": r[0], "email": r[1], "proficiency": r[2], "confidence": float(r[3])})
            return {"results": out}


class QueryRequest(BaseModel):
    query: str
    tenant_id: str = os.getenv("DEFAULT_TENANT", "default")
    user_roles: list[str] = ["employee"]
    spaces: list[str] | None = None
    tags: list[str] | None = None


class QueryItem(BaseModel):
    id: str
    document_id: str | None
    score: float | None = None
    rerank_score: float | None = None
    rrf_score: float | None = None
    text: str
    source: dict
    origin: str


class QueryResponse(BaseModel):
    results: list[QueryItem]


@app.post("/query", response_model=QueryResponse)
def query_rag(payload: QueryRequest):
    items = retriever.retrieve(
        query=payload.query,
        tenant_id=payload.tenant_id,
        user_roles=payload.user_roles,
        spaces=payload.spaces,
        tags=payload.tags,
        top_k=20,
        per_source_k=50,
    )
    # Ensure all required fields are present
    normalized = []
    for it in items:
        normalized.append(
            QueryItem(
                id=str(it.get("id")),
                document_id=it.get("document_id"),
                score=it.get("score"),
                rerank_score=it.get("rerank_score"),
                rrf_score=it.get("rrf_score"),
                text=it.get("text", ""),
                source=it.get("source", {}),
                origin=it.get("origin", "unknown"),
            )
        )
    return QueryResponse(results=normalized)


class UploadSyncResponse(BaseModel):
    document_id: str
    qdrant_points_for_file: int
    opensearch_docs_for_file: int


@app.post("/upload_sync", response_model=UploadSyncResponse)
async def upload_document_sync(
    file: UploadFile = File(...),
    tenant_id: str = Form(os.getenv("DEFAULT_TENANT", "default")),
    uploader_id: str = Form("anonymous"),
    space: str = Form("documents"),
    tags: str = Form(""),
    project_id: str | None = Form(None),
    project_subdb: str | None = Form(None),
):
    content = await file.read()
    # Process immediately (blocking)
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    indexer.process_and_index(file.filename, content, tenant_id, uploader_id, space, tag_list, project_id, project_subdb)

    # Qdrant: count points for this filename
    from qdrant_client.http import models as qmodels

    try:
        # choose collection based on whether project routing is used
        from src.retrieval.indexers import IndexCoordinator as _IC
        use_project = (space == "projects" and project_id and project_subdb)
        target_collection = _IC.qdrant_collection_for_project(project_id, project_subdb) if use_project else qdrant_collection_for(space)
        count_res = indexer.qdrant.count(
            collection_name=target_collection,
            count_filter=qmodels.Filter(
                must=[qmodels.FieldCondition(key="filename", match=qmodels.MatchValue(value=file.filename))]
            ),
            exact=True,
        )
        q_count = int(count_res.count) if hasattr(count_res, "count") else 0
    except Exception:
        q_count = 0

    # OpenSearch: count docs for this filename
    try:
        target_index = _IC.opensearch_index_for_project(project_id, project_subdb) if use_project else opensearch_index_for(space)
        os_res = indexer.os.search(
            index=target_index,
            body={
                "query": {"term": {"filename": file.filename}},
                "size": 0
            },
        )
        os_count = int(os_res.get("hits", {}).get("total", {}).get("value", 0))
    except Exception:
        os_count = 0

    return UploadSyncResponse(
        document_id=file.filename,
        qdrant_points_for_file=q_count,
        opensearch_docs_for_file=os_count,
    )

# ---------------------- Projects & Team Assembler ----------------------

class ProjectCreateRequest(BaseModel):
    code: str
    name: str
    budget: float | None = None
    headcount_target: int | None = None
    roles: list[dict] | None = None  # [{role_label, count, min_skill:{name,level}}]
    constraints: dict | None = None
    docs: list[str] | None = None  # filenames or ids


@app.post("/projects/create")
def projects_create(payload: ProjectCreateRequest):
    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            _ensure_project_meta(cur)
            pid = _ensure_project(cur, payload.code, payload.name)
            cur.execute(
                """
                INSERT INTO project_meta(project_id, budget, headcount_target, roles_json, constraints_json, docs_json)
                VALUES (%s,%s,%s,%s,%s,%s)
                ON CONFLICT (project_id) DO UPDATE SET
                    budget=EXCLUDED.budget,
                    headcount_target=EXCLUDED.headcount_target,
                    roles_json=EXCLUDED.roles_json,
                    constraints_json=EXCLUDED.constraints_json,
                    docs_json=EXCLUDED.docs_json,
                    updated_at=NOW()
                """,
                (
                    pid,
                    payload.budget,
                    payload.headcount_target,
                    payload.roles,
                    payload.constraints,
                    payload.docs,
                ),
            )
    return {"ok": True}


def _active_projects_for(cur, employee_id: int) -> list[int]:
    cur.execute(
        "SELECT project_id FROM project_assignments WHERE employee_id=%s AND revoked_at IS NULL",
        (employee_id,),
    )
    return [r[0] for r in (cur.fetchall() or [])]


def _skills_for_employee(cur, employee_id: int) -> dict:
    cur.execute(
        """
        SELECT s.name, es.proficiency
        FROM employee_skills es
        JOIN skills s ON s.id=es.skill_id
        WHERE es.employee_id=%s
        """,
        (employee_id,),
    )
    out = {}
    for r in cur.fetchall() or []:
        out[str(r[0])] = int(r[1] or 0)
    return out


def _llm_rank_candidates(requirements: list[dict], candidates: list[dict]) -> list[dict]:
    llm_url = os.getenv("LLM_URL", "http://127.0.0.1:8080").rstrip("/")
    endpoint = f"{llm_url}/v1/chat/completions"
    system = (
        "You are a staffing assistant. Rank candidates per role with brief JSON explanations. "
        "Return ONLY JSON: [{employee_email, role_label, score, explanation}]."
    )
    user = {"requirements": requirements, "candidates": candidates}
    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.post(
                endpoint,
                json={
                    "model": os.getenv("LLM_MODEL", "local-llm"),
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": str(user)},
                    ],
                    "temperature": 0.1,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "[]")
            import json as _json
            return list(_json.loads(content))
    except Exception:
        return []


class TeamAssembleRequest(BaseModel):
    project_code: str
    title: str = "Team Plan"
    requirements: list[dict]  # e.g., [{role_label:"FE", count:2, skills:[{name, min_level}]}]
    available_only: bool = True
    constraints: dict | None = None


@app.post("/team/assemble")
def team_assemble(payload: TeamAssembleRequest):
    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            _ensure_team_tables(cur)
            pid = _ensure_project(cur, payload.project_code, payload.project_code)
            # Create team plan
            cur.execute(
                "INSERT INTO team_plans(project_id, title, requirements_json, constraints_json) VALUES (%s,%s,%s,%s) RETURNING id",
                (pid, payload.title, payload.requirements, payload.constraints),
            )
            team_id = cur.fetchone()[0]
            # Gather candidates
            cur.execute("SELECT id, name, email FROM employees")
            emps = cur.fetchall() or []
            cand_list = []
            for (eid, ename, eemail) in emps:
                skills = _skills_for_employee(cur, eid)
                active_projs = _active_projects_for(cur, eid)
                if payload.available_only and active_projs:
                    continue
                # quick heuristic score: count how many required skills are met at min_level
                base_score = 0
                role_label = None
                for req in payload.requirements:
                    needed = 0
                    have = 0
                    for s in (req.get("skills") or []):
                        needed += 1
                        if skills.get(str(s.get("name")), 0) >= int(s.get("min_level", 0)):
                            have += 1
                    score = (have / max(1, needed)) * 100.0
                    if score > base_score:
                        base_score = score
                        role_label = req.get("role_label")
                cand_list.append({
                    "employee_id": eid,
                    "name": ename,
                    "email": eemail,
                    "role_label": role_label or "member",
                    "score": round(base_score, 2),
                    "active_projects": active_projs,
                })
            # Optional LLM ranking overlay
            llm_rank = _llm_rank_candidates(payload.requirements, cand_list)
            llm_map = {str(it.get("employee_email")).lower(): it for it in llm_rank}
            # persist candidates
            out = []
            for c in cand_list:
                conflicts = {}
                if c["active_projects"]:
                    conflicts["over_allocated"] = True
                explanation = llm_map.get(str(c["email"]).lower(), {}).get("explanation")
                score = c["score"]
                if str(c["email"]).lower() in llm_map and isinstance(llm_map[str(c["email"]).lower()].get("score"), (int, float)):
                    score = float(llm_map[str(c["email"]).lower()]["score"])  # use llm score if provided
                cur.execute(
                    """
                    INSERT INTO team_candidates(team_id, employee_id, role_label, skill_match, score, conflicts_json, selected, explanation_json)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                    """,
                    (team_id, c["employee_id"], c["role_label"], c["score"], score, conflicts, False, {"explanation": explanation} if explanation else None),
                )
                cid = cur.fetchone()[0]
                out.append({"id": cid, **c, "score": score, "conflicts": conflicts, "selected": False})
    return {"team_id": team_id, "candidates": out}


class ApproveMember(BaseModel):
    employee_email: str
    role_label: str = "member"
    allocation_percent: int = 100
    start_date: str | None = None
    end_date: str | None = None


class ApproveTeamRequest(BaseModel):
    project_code: str
    members: list[ApproveMember]


@app.post("/team/{team_id}/approve")
def team_approve(team_id: int, payload: ApproveTeamRequest):
    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            pid = _ensure_project(cur, payload.project_code, payload.project_code)
            # mark approved
            cur.execute("UPDATE team_plans SET status='approved', approved_at=NOW() WHERE id=%s", (team_id,))
            # grant assignments and basic privileges
            vpn_id = _ensure_privilege(cur, "vpn_access", "global", "Company VPN access")
            for m in payload.members:
                emp = _get_employee_by_email(cur, m.employee_email)
                if not emp:
                    # ensure employee row minimally
                    emp_id = _ensure_employee(cur, email=m.employee_email, name=m.employee_email.split("@")[0])
                else:
                    emp_id = emp[0]
                _assign_project(cur, emp_id, pid, m.allocation_percent)
                # minimal project privileges
                for key in ["repo_access", "db_read"]:
                    scope = "project"
                    pvid = _ensure_privilege(cur, key, scope, f"{key} for project")
                    _grant_privilege(cur, emp_id, pvid, pid)
                # global vpn
                _grant_privilege(cur, emp_id, vpn_id, None)
    # Bridge to Smart Access: update employee project and ensure default grants/groups
    try:
        chat_api = os.getenv("CHAT_API_BASE", "http://127.0.0.1:8002").rstrip("/")
        with httpx.Client(timeout=10.0) as client:
            for m in payload.members:
                # Set project label and keep status active
                client.patch(f"{chat_api}/smart/employees/by_email", json={"email": m.employee_email, "project": payload.project_code, "status": "active"})
                client.post(f"{chat_api}/smart/employees/by_email/ensure_defaults", params={"email": m.employee_email})
    except Exception:
        pass
    return {"ok": True}


# ---------------------- Skills Overrides & Timeseries ----------------------

class SkillOverrideRequest(BaseModel):
    employee_email: str
    skill_name: str
    proficiency: int
    confidence: float | None = 0.9
    note: str | None = None


@app.post("/skills/override")
def skills_override(payload: SkillOverrideRequest):
    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            emp = _get_employee_by_email(cur, payload.employee_email)
            if not emp:
                return JSONResponse({"error": "employee_not_found"}, status_code=404)
            emp_id = emp[0]
            sid = _ensure_skill(cur, payload.skill_name)
            cur.execute(
                """
                INSERT INTO employee_skill_overrides(employee_id, skill_id, proficiency, confidence, note)
                VALUES (%s,%s,%s,%s,%s)
                ON CONFLICT (employee_id, skill_id) DO UPDATE SET
                    proficiency=EXCLUDED.proficiency,
                    confidence=EXCLUDED.confidence,
                    note=EXCLUDED.note,
                    created_at=NOW()
                """,
                (emp_id, sid, int(payload.proficiency), float(payload.confidence or 0.9), payload.note),
            )
    return {"ok": True}


@app.get("/skills/timeseries")
def skills_timeseries(email: str):
    with pg_conn() as con:
        with con.cursor() as cur:
            emp = _get_employee_by_email(cur, email)
            if not emp:
                return JSONResponse({"error": "employee_not_found"}, status_code=404)
            emp_id = emp[0]
            cur.execute(
                "SELECT overall_score, roles_json, skills_json, notes, created_at FROM employee_skill_snapshot WHERE employee_id=%s ORDER BY created_at ASC",
                (emp_id,),
            )
            rows = cur.fetchall() or []
            out = []
            for r in rows:
                out.append({
                    "overall_score": r[0],
                    "roles": r[1],
                    "skills": r[2],
                    "notes": r[3],
                    "created_at": str(r[4]),
                })
            return {"series": out}


# ---------------------- Memory Mesh ----------------------

class MemoryCreateRequest(BaseModel):
    project_code: str | None = None
    type: str
    title: str | None = None
    text: str
    tags: list[str] | None = None
    created_by: str | None = None
    visibility: str = "org"


@app.post("/memory")
def memory_create(payload: MemoryCreateRequest):
    mem_id = None
    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            _ensure_memory_tables(cur)
            cur.execute(
                """
                INSERT INTO memories(project_code, type, title, text, created_by, visibility, tags)
                VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id
                """,
                (payload.project_code, payload.type, payload.title, payload.text, payload.created_by, payload.visibility, payload.tags),
            )
            mem_id = cur.fetchone()[0]
    # Index into project memory subdb
    try:
        if payload.project_code:
            indexer.process_and_index(
                filename=f"memory_{mem_id or 'new'}.txt",
                content=payload.text.encode("utf-8"),
                tenant_id=os.getenv("DEFAULT_TENANT", "default"),
                uploader_id=payload.created_by or "memory",
                space="projects",
                tags=payload.tags or ["memory"],
                project_id=payload.project_code,
                project_subdb="memory",
            )
    except Exception:
        pass
    return {"ok": True, "id": mem_id}


@app.get("/memory/search")
def memory_search(project_code: str, query: str):
    try:
        idx = indexer.opensearch_index_for_project(project_code, "memory")
        res = indexer.os.search(index=idx, body={"query": {"match": {"text": query}}, "size": 25})
        hits = res.get("hits", {}).get("hits", [])
        out = [{"text": h.get("_source", {}).get("text", ""), "_id": h.get("_id") } for h in hits]
        return {"results": out}
    except Exception:
        return {"results": []}


@app.get("/memory/graph")
def memory_graph(project_code: str):
    nodes = []
    edges = []
    with pg_conn() as con:
        with con.cursor() as cur:
            _ensure_memory_tables(cur)
            cur.execute("SELECT id, type, title FROM memories WHERE project_code=%s ORDER BY id DESC LIMIT 200", (project_code,))
            for r in cur.fetchall() or []:
                nodes.append({"id": int(r[0]), "type": r[1], "title": r[2]})
            cur.execute(
                "SELECT src_id, dst_id, relation FROM memory_links WHERE src_id IN (SELECT id FROM memories WHERE project_code=%s)",
                (project_code,),
            )
            for r in cur.fetchall() or []:
                edges.append({"src": int(r[0]), "dst": int(r[1]), "relation": r[2]})
    return {"nodes": nodes, "edges": edges}

# ---------------------- Postgres (Privileges DB) ----------------------

def _pg_dsn() -> str:
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "rag_privileges")
    user = os.getenv("POSTGRES_USER", "rag_user")
    pw = os.getenv("POSTGRES_PASSWORD", "rag_pass")
    return f"host={host} port={port} dbname={db} user={user} password={pw}"


def pg_conn():
    # Use pg8000 DB-API connection
    return pg8000.connect(
        user=os.getenv("POSTGRES_USER", "rag_user"),
        password=os.getenv("POSTGRES_PASSWORD", "rag_pass"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        database=os.getenv("POSTGRES_DB", "rag_privileges"),
    )


# ---------------------- Ensure Extra Tables ----------------------
def _ensure_project_meta(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS project_meta (
            project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
            budget NUMERIC(12,2) NULL,
            headcount_target INTEGER NULL,
            roles_json JSONB NULL,
            constraints_json JSONB NULL,
            docs_json JSONB NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def _ensure_team_tables(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS team_plans (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            requirements_json JSONB NOT NULL,
            constraints_json JSONB NULL,
            created_by TEXT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            approved_at TIMESTAMPTZ NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS team_candidates (
            id SERIAL PRIMARY KEY,
            team_id INTEGER NOT NULL REFERENCES team_plans(id) ON DELETE CASCADE,
            employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            role_label TEXT NULL,
            skill_match NUMERIC(5,2) NOT NULL DEFAULT 0,
            score NUMERIC(5,2) NOT NULL DEFAULT 0,
            conflicts_json JSONB NULL,
            selected BOOLEAN NOT NULL DEFAULT FALSE,
            explanation_json JSONB NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def _ensure_memory_tables(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS memories (
            id SERIAL PRIMARY KEY,
            project_code TEXT NULL,
            type TEXT NOT NULL,
            title TEXT,
            text TEXT NOT NULL,
            created_by TEXT NULL,
            visibility TEXT NOT NULL DEFAULT 'org',
            tags TEXT[] NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS memory_links (
            id SERIAL PRIMARY KEY,
            src_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
            dst_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
            relation TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS memory_mentions (
            id SERIAL PRIMARY KEY,
            memory_id INTEGER NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
            employee_id INTEGER NULL REFERENCES employees(id) ON DELETE SET NULL,
            project_code TEXT NULL
        )
        """
    )


def _ensure_skill_overrides(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS employee_skill_overrides (
            employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
            proficiency SMALLINT NOT NULL CHECK (proficiency BETWEEN 0 AND 5),
            confidence NUMERIC(3,2) NOT NULL DEFAULT 0.9,
            note TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (employee_id, skill_id)
        )
        """
    )


def _ensure_project(cur, code: str, name: str | None = None) -> int:
    cur.execute("SELECT id FROM projects WHERE code=%s", (code,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO projects(code, name) VALUES (%s,%s) RETURNING id", (code, name or code))
    return cur.fetchone()[0]


def _ensure_employee(cur, email: str, name: str) -> int:
    cur.execute("SELECT id FROM employees WHERE email=%s", (email,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO employees(email, name) VALUES (%s,%s) RETURNING id", (email, name))
    return cur.fetchone()[0]


def _ensure_role(cur, name: str) -> int:
    cur.execute("SELECT id FROM roles WHERE name=%s", (name,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO roles(name) VALUES (%s) RETURNING id", (name,))
    return cur.fetchone()[0]


def _ensure_privilege(cur, key: str, scope: str, description: str | None = None) -> int:
    cur.execute("SELECT id FROM privileges WHERE key=%s", (key,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        "INSERT INTO privileges(key, scope, description) VALUES (%s,%s,%s) RETURNING id",
        (key, scope, description),
    )
    return cur.fetchone()[0]


def _grant_role(cur, employee_id: int, role_id: int) -> None:
    cur.execute(
        "INSERT INTO employee_roles(employee_id, role_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
        (employee_id, role_id),
    )


def _assign_project(cur, employee_id: int, project_id: int, allocation: int = 100) -> None:
    cur.execute(
        "INSERT INTO project_assignments(employee_id, project_id, allocation_percent) VALUES (%s,%s,%s) ON CONFLICT (employee_id, project_id) DO UPDATE SET revoked_at=NULL, allocation_percent=EXCLUDED.allocation_percent",
        (employee_id, project_id, allocation),
    )


def _grant_privilege(cur, employee_id: int, privilege_id: int, project_id: int | None) -> None:
    cur.execute(
        "INSERT INTO employee_privileges(employee_id, privilege_id, project_id) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
        (employee_id, privilege_id, project_id),
    )


def _revoke_project_privileges(cur, employee_id: int, project_id: int) -> None:
    cur.execute(
        "UPDATE employee_privileges SET revoked_at=NOW() WHERE employee_id=%s AND project_id=%s AND revoked_at IS NULL",
        (employee_id, project_id),
    )
    cur.execute(
        "UPDATE project_assignments SET revoked_at=NOW() WHERE employee_id=%s AND project_id=%s AND revoked_at IS NULL",
        (employee_id, project_id),
    )


class OnboardRequest(BaseModel):
    name: str
    email: str | None = None
    email_local_part: str | None = None
    roles: list[str] = ["employee"]
    projects: list[str] = []  # list of project codes


@app.post("/smart/onboard")
def smart_onboard(payload: OnboardRequest):
    email = payload.email or f"{(payload.email_local_part or payload.name.split()[0]).lower()}@company.local"
    # DB operations
    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            emp_id = _ensure_employee(cur, email=email, name=payload.name)
            # roles
            for r in payload.roles:
                rid = _ensure_role(cur, r)
                _grant_role(cur, emp_id, rid)
            # default global privilege
            vpn_id = _ensure_privilege(cur, "vpn_access", "global", "Company VPN access")
            _grant_privilege(cur, emp_id, vpn_id, None)
            project_infos = []
            for code in payload.projects:
                pid = _ensure_project(cur, code, code)
                _assign_project(cur, emp_id, pid, allocation=100)
                # Determine privileges via roles->privileges or direct privileges
                if os.getenv("USE_LLM_ROLE_ASSIGN", "true").lower() in ("1", "true", "yes"):
                    role_labels = suggest_roles_via_llm(payload.roles, code)
                    keys = map_roles_to_privileges(role_labels)
                elif os.getenv("USE_LLM_PRIV_ASSIGN", "true").lower() in ("1", "true", "yes"):
                    keys = suggest_privileges_via_llm(payload.roles, code)
                else:
                    keys = ["db_read", "repo_access"]
                for key in keys:
                    scope = "project" if key != "vpn_access" else "global"
                    pvid = _ensure_privilege(cur, key, scope, f"{key} for project")
                    _grant_privilege(cur, emp_id, pvid, pid if scope == "project" else None)
                project_infos.append({"project_code": code})

    # Also write a brief record into RAG projects/employees subdb for each project
    for code in payload.projects:
        text = f"Onboarded {payload.name} <{email}> to project {code} with roles {payload.roles}"
        indexer.process_and_index(
            filename=f"onboard_{email}_{code}.txt",
            content=text.encode("utf-8"),
            tenant_id=os.getenv("DEFAULT_TENANT", "default"),
            uploader_id="smart_access",
            space="projects",
            tags=["onboard", "employee"],
            project_id=code,
            project_subdb="employees",
        )

    return {"email": email, "roles": payload.roles, "projects": payload.projects}


class AssignProjectRequest(BaseModel):
    employee_email: str
    project_code: str
    allocation_percent: int = 100


@app.post("/smart/assign_project")
def smart_assign_project(payload: AssignProjectRequest):
    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            cur.execute("SELECT id,name FROM employees WHERE email=%s", (payload.employee_email,))
            row = cur.fetchone()
            if not row:
                return JSONResponse({"error": "employee_not_found"}, status_code=404)
            emp_id = row[0]
            emp_name = row[1]
            pid = _ensure_project(cur, payload.project_code, payload.project_code)
            _assign_project(cur, emp_id, pid, payload.allocation_percent)
            if os.getenv("USE_LLM_ROLE_ASSIGN", "true").lower() in ("1", "true", "yes"):
                role_labels = suggest_roles_via_llm(["employee"], payload.project_code)
                keys = map_roles_to_privileges(role_labels)
            elif os.getenv("USE_LLM_PRIV_ASSIGN", "true").lower() in ("1", "true", "yes"):
                keys = suggest_privileges_via_llm(["employee"], payload.project_code)
            else:
                keys = ["db_read", "repo_access"]
            for key in keys:
                scope = "project" if key != "vpn_access" else "global"
                pvid = _ensure_privilege(cur, key, scope, f"{key} for project")
                _grant_privilege(cur, emp_id, pvid, pid if scope == "project" else None)

    # RAG record
    text = f"Assigned {emp_name} <{payload.employee_email}> to project {payload.project_code} ({payload.allocation_percent}%)."
    indexer.process_and_index(
        filename=f"assign_{payload.employee_email}_{payload.project_code}.txt",
        content=text.encode("utf-8"),
        tenant_id=os.getenv("DEFAULT_TENANT", "default"),
        uploader_id="smart_access",
        space="projects",
        tags=["assign", "employee"],
        project_id=payload.project_code,
        project_subdb="employees",
    )
    return {"status": "ok"}


class RevokeProjectRequest(BaseModel):
    employee_email: str
    project_code: str


@app.post("/smart/revoke_project")
def smart_revoke_project(payload: RevokeProjectRequest):
    with pg_conn() as con:
        con.autocommit = True
        with con.cursor() as cur:
            cur.execute("SELECT id,name FROM employees WHERE email=%s", (payload.employee_email,))
            emp = cur.fetchone()
            if not emp:
                return JSONResponse({"error": "employee_not_found"}, status_code=404)
            cur.execute("SELECT id FROM projects WHERE code=%s", (payload.project_code,))
            proj = cur.fetchone()
            if not proj:
                return JSONResponse({"error": "project_not_found"}, status_code=404)
            _revoke_project_privileges(cur, emp[0], proj[0])

    # RAG record (key_decisions)
    text = f"Revoked project {payload.project_code} privileges from {emp[1]} <{payload.employee_email}>."
    indexer.process_and_index(
        filename=f"revoke_{payload.employee_email}_{payload.project_code}.txt",
        content=text.encode("utf-8"),
        tenant_id=os.getenv("DEFAULT_TENANT", "default"),
        uploader_id="smart_access",
        space="projects",
        tags=["revoke", "employee"],
        project_id=payload.project_code,
        project_subdb="key_decisions",
    )
    return {"status": "ok"}


@app.get("/", response_class=RedirectResponse)
def root_redirect():
    return RedirectResponse(url="/ui")


@app.get("/ui", response_class=HTMLResponse)
def simple_ui():
    html = """
    <!doctype html>
    <html>
    <head>
      <meta charset='utf-8'/>
      <title>RAG Debug UI</title>
      <style>
        body{font-family: system-ui, Arial; margin: 24px;}
        h1{margin-top:0}
        .card{border:1px solid #ddd; padding:16px; border-radius:8px; margin-bottom:16px}
        textarea{width:100%; height:100px}
        code{background:#f7f7f7; padding:4px 6px; border-radius:4px}
        pre{background:#f7f7f7; padding:12px; border-radius:8px; overflow:auto}
        input[type=text]{width:100%; padding:8px}
      </style>
    </head>
    <body>
      <h1>Enterprise RAG - Debug UI</h1>

      <div class='card'>
        <h3>Upload (Sync)</h3>
        <form id='uploadForm'>
          <input type='file' name='file' required />
          <input type='hidden' name='tenant_id' value='default'/>
          <input type='hidden' name='uploader_id' value='alice'/>
          <div>
            <label>Space:</label>
            <select name='space'>
              <option value='documents'>documents</option>
              <option value='employees'>employees</option>
              <option value='decisions'>decisions</option>
              <option value='memory'>memory</option>
              <option value='projects'>projects</option>
            </select>
          </div>
          <div>
            <label>Tags (comma-separated):</label>
            <input type='text' name='tags' placeholder='e.g. confidential,2024'/>
          </div>
          <div>
            <label>Project ID (if space=projects):</label>
            <input type='text' name='project_id' placeholder='e.g. proj-alpha'/>
          </div>
          <div>
            <label>Project Sub-DB:</label>
            <select name='project_subdb'>
              <option value=''>-- optional --</option>
              <option value='documents'>documents</option>
              <option value='main_progress'>main_progress</option>
              <option value='employees'>employees</option>
              <option value='key_decisions'>key_decisions</option>
              <option value='memory'>memory</option>
            </select>
          </div>
          <button type='submit'>Upload & Index</button>
        </form>
        <pre id='uploadResult'></pre>
      </div>

      <div class='card'>
        <h3>Query</h3>
        <input id='queryText' type='text' placeholder='Enter query text...'/>
        <div>
          <label>Spaces:</label>
          <label><input type='checkbox' class='spaceChk' value='documents' checked/> documents</label>
          <label><input type='checkbox' class='spaceChk' value='employees'/> employees</label>
          <label><input type='checkbox' class='spaceChk' value='decisions'/> decisions</label>
          <label><input type='checkbox' class='spaceChk' value='memory'/> memory</label>
          <label><input type='checkbox' class='spaceChk' value='projects'/> projects</label>
        </div>
        <div>
          <label>Tags (comma-separated):</label>
          <input id='queryTags' type='text' placeholder='e.g. confidential,2024'/>
        </div>
        <button id='runQuery'>Search</button>
        <pre id='queryResult'></pre>
      </div>

      <div class='card'>
        <h3>Inspect OpenSearch Docs (rag_docs)</h3>
        <button id='listDocs'>List 10 docs</button>
        <pre id='docsResult'></pre>
      </div>

      <div class='card'>
        <h3>Inspect Qdrant Chunks (rag_chunks)</h3>
        <input id='filename' type='text' placeholder='filename e.g. 1.txt' />
        <button id='listChunks'>List 10 chunks</button>
        <pre id='chunksResult'></pre>
      </div>

      <script>
        const uploadForm = document.getElementById('uploadForm');
        uploadForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(uploadForm);
          const res = await fetch('/upload_sync', { method: 'POST', body: fd });
          document.getElementById('uploadResult').textContent = await res.text();
        });

        document.getElementById('runQuery').addEventListener('click', async () => {
          const q = document.getElementById('queryText').value || '';
          const spaces = Array.from(document.querySelectorAll('.spaceChk:checked')).map(el => el.value);
          const tagsTxt = document.getElementById('queryTags').value || '';
          const tags = tagsTxt.split(',').map(s => s.trim()).filter(Boolean);
          const payload = { query: q, tenant_id: 'default', user_roles: ['employee','engineering'], spaces, tags };
          const res = await fetch('/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)});
          document.getElementById('queryResult').textContent = await res.text();
        });

        document.getElementById('listDocs').addEventListener('click', async () => {
          const res = await fetch('/debug/docs');
          document.getElementById('docsResult').textContent = await res.text();
        });

        document.getElementById('listChunks').addEventListener('click', async () => {
          const fn = document.getElementById('filename').value || '';
          const url = fn ? `/debug/chunks?filename=${encodeURIComponent(fn)}` : '/debug/chunks';
          const res = await fetch(url);
          document.getElementById('chunksResult').textContent = await res.text();
        });
      </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html, status_code=200)


@app.get("/debug/docs", response_class=JSONResponse)
def debug_docs():
    try:
        res = indexer.os.search(
            index=indexer.os_index,
            body={
                "size": 10,
                "query": {"match_all": {}},
                "_source": [
                    "document_id","filename","chunk_id","chunk_index","tenant_id","roles","mime","uploader_id","text"
                ]
            },
        )
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/debug/chunks", response_class=JSONResponse)
def debug_chunks(filename: str | None = None):
    from qdrant_client.http import models as qmodels
    try:
        flt = None
        if filename:
            flt = qmodels.Filter(
                must=[qmodels.FieldCondition(key="filename", match=qmodels.MatchValue(value=filename))]
            )
        res = indexer.qdrant.scroll(
            collection_name=indexer.collection,
            scroll_filter=flt,
            limit=10,
            with_payload=True,
        )
        # res: (points, next_page_offset)
        points = []
        for p in res[0]:
            points.append({"id": p.id, "payload": p.payload})
        return JSONResponse({"points": points})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
