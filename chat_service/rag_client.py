import os
from contextlib import contextmanager
from typing import Optional

try:
    import pg8000
except Exception:  # runtime environment might not have pg8000 installed yet
    pg8000 = None  # type: ignore


@contextmanager
def _pg_conn():
    if pg8000 is None:
        raise RuntimeError("pg8000 not installed in chat_service env")
    con = pg8000.connect(
        user=os.getenv("POSTGRES_USER", "rag_user"),
        password=os.getenv("POSTGRES_PASSWORD", "rag_pass"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        database=os.getenv("POSTGRES_DB", "rag_privileges"),
    )
    try:
        yield con
    finally:
        try:
            con.close()
        except Exception:
            pass


def _ensure_employee(cur, email: str, name: str) -> int:
    cur.execute("SELECT id FROM employees WHERE email=%s", (email,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute("INSERT INTO employees(email, name) VALUES (%s,%s) RETURNING id", (email, name))
    return cur.fetchone()[0]


def _ensure_privilege(cur, key: str, scope: str, description: Optional[str] = None) -> int:
    cur.execute("SELECT id FROM privileges WHERE key=%s", (key,))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute(
        "INSERT INTO privileges(key, scope, description) VALUES (%s,%s,%s) RETURNING id",
        (key, scope, description),
    )
    return cur.fetchone()[0]


def _grant_privilege(cur, employee_id: int, privilege_id: int, project_id: Optional[int] = None):
    cur.execute(
        "INSERT INTO employee_privileges(employee_id, privilege_id, project_id) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
        (employee_id, privilege_id, project_id),
    )


def _revoke_all_privileges(cur, employee_id: int):
    cur.execute(
        "UPDATE employee_privileges SET revoked_at=NOW() WHERE employee_id=%s AND revoked_at IS NULL",
        (employee_id,),
    )


def upsert_employee_with_text_privileges(name: str, email: str, project_hint: Optional[str] = None):
    """Ensure employee row in RAG DB and grant textual privileges as per current rules.
    This mirrors Smart Access privileges into the RAG Postgres schema.
    """
    if pg8000 is None:
        return  # silently skip if driver not installed
    try:
        with _pg_conn() as con:
            con.autocommit = True
            with con.cursor() as cur:
                emp_id = _ensure_employee(cur, email=email, name=name)
                # Map textual privileges to privilege keys (create if missing)
                # DATABASE@ read/edit -> db_read / db_write (project-scoped)
                read_id = _ensure_privilege(cur, "db_read", "project", "Read access to project DB")
                write_id = _ensure_privilege(cur, "db_write", "project", "Write access to project DB")
                _grant_privilege(cur, emp_id, read_id, None)  # project_id unknown; store as global if None
                _grant_privilege(cur, emp_id, write_id, None)
                # database 3 super -> map to both db_read and db_write; no separate 'super' key present
                if project_hint and ("database 3" in project_hint.lower() or "db3" in project_hint.lower() or "database3" in project_hint.lower()):
                    _grant_privilege(cur, emp_id, read_id, None)
                    _grant_privilege(cur, emp_id, write_id, None)
    except Exception:
        # Best-effort mirror; do not raise
        return


def offboard_employee(email: str):
    if pg8000 is None:
        return
    try:
        with _pg_conn() as con:
            con.autocommit = True
            with con.cursor() as cur:
                cur.execute("SELECT id FROM employees WHERE email=%s", (email,))
                row = cur.fetchone()
                if not row:
                    return
                emp_id = row[0]
                _revoke_all_privileges(cur, emp_id)
                # Optionally update employees.status
                cur.execute("UPDATE employees SET status='offboarded' WHERE id=%s", (emp_id,))
    except Exception:
        return


# -------------------- Daily Metrics --------------------
def _ensure_metrics_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS employees_metrics_daily (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            day DATE NOT NULL,
            commits INTEGER NOT NULL DEFAULT 0,
            pull_requests INTEGER NOT NULL DEFAULT 0,
            tickets_closed INTEGER NOT NULL DEFAULT 0,
            meetings INTEGER NOT NULL DEFAULT 0,
            messages INTEGER NOT NULL DEFAULT 0,
            hours_worked NUMERIC(5,2) NULL,
            score NUMERIC(5,2) NULL,
            metrics_json JSONB NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (employee_id, day)
        )
        """
    )


def upsert_daily_metrics(
    email: str,
    name_hint: Optional[str],
    day: str,
    commits: int = 0,
    pull_requests: int = 0,
    tickets_closed: int = 0,
    meetings: int = 0,
    messages: int = 0,
    hours_worked: Optional[float] = None,
    score: Optional[float] = None,
    metrics_json: Optional[dict] = None,
):
    if pg8000 is None:
        return
    import json as _json
    try:
        with _pg_conn() as con:
            con.autocommit = True
            with con.cursor() as cur:
                _ensure_metrics_table(cur)
                emp_id = _ensure_employee(cur, email=email, name=name_hint or email)
                cur.execute(
                    """
                    INSERT INTO employees_metrics_daily (
                        employee_id, day, commits, pull_requests, tickets_closed, meetings, messages, hours_worked, score, metrics_json
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (employee_id, day) DO UPDATE SET
                        commits=EXCLUDED.commits,
                        pull_requests=EXCLUDED.pull_requests,
                        tickets_closed=EXCLUDED.tickets_closed,
                        meetings=EXCLUDED.meetings,
                        messages=EXCLUDED.messages,
                        hours_worked=EXCLUDED.hours_worked,
                        score=EXCLUDED.score,
                        metrics_json=EXCLUDED.metrics_json,
                        updated_at=NOW()
                    """,
                    (
                        emp_id,
                        day,
                        int(commits or 0),
                        int(pull_requests or 0),
                        int(tickets_closed or 0),
                        int(meetings or 0),
                        int(messages or 0),
                        hours_worked if hours_worked is not None else None,
                        score if score is not None else None,
                        _json.dumps(metrics_json) if metrics_json is not None else None,
                    ),
                )
    except Exception:
        return


def get_daily_metrics(email: str, start: Optional[str] = None, end: Optional[str] = None) -> list[dict]:
    if pg8000 is None:
        return []
    out: list[dict] = []
    try:
        with _pg_conn() as con:
            with con.cursor() as cur:
                _ensure_metrics_table(cur)
                cur.execute("SELECT id FROM employees WHERE email=%s", (email,))
                r = cur.fetchone()
                if not r:
                    return []
                emp_id = r[0]
                if start and end:
                    cur.execute(
                        """
                        SELECT day, commits, pull_requests, tickets_closed, meetings, messages, hours_worked, score, metrics_json
                        FROM employees_metrics_daily
                        WHERE employee_id=%s AND day BETWEEN %s AND %s
                        ORDER BY day ASC
                        """,
                        (emp_id, start, end),
                    )
                elif start:
                    cur.execute(
                        """
                        SELECT day, commits, pull_requests, tickets_closed, meetings, messages, hours_worked, score, metrics_json
                        FROM employees_metrics_daily
                        WHERE employee_id=%s AND day >= %s
                        ORDER BY day ASC
                        """,
                        (emp_id, start),
                    )
                else:
                    cur.execute(
                        """
                        SELECT day, commits, pull_requests, tickets_closed, meetings, messages, hours_worked, score, metrics_json
                        FROM employees_metrics_daily
                        WHERE employee_id=%s
                        ORDER BY day ASC
                        LIMIT 365
                        """,
                        (emp_id,),
                    )
                rows = cur.fetchall() or []
                for row in rows:
                    out.append(
                        {
                            "day": str(row[0]),
                            "commits": int(row[1] or 0),
                            "pull_requests": int(row[2] or 0),
                            "tickets_closed": int(row[3] or 0),
                            "meetings": int(row[4] or 0),
                            "messages": int(row[5] or 0),
                            "hours_worked": float(row[6]) if row[6] is not None else None,
                            "score": float(row[7]) if row[7] is not None else None,
                            "metrics_json": row[8],
                        }
                    )
    except Exception:
        return []
    return out
