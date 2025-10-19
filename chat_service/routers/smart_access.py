import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from ..rag_client import upsert_employee_with_text_privileges, upsert_daily_metrics as rag_upsert_daily_metrics, get_daily_metrics as rag_get_daily_metrics
from ..models import Candidate, Employee, Product, AccessGrant, Group, GroupMembership, EmployeePrivilege

router = APIRouter()


# ---- Schemas ----
class ProductDTO(BaseModel):
    id: int
    slug: str
    name: str
    purchased: bool

    class Config:
        from_attributes = True


class AccessGrantDTO(BaseModel):
    id: int
    product: ProductDTO
    access_level: str
    active: bool

    class Config:
        from_attributes = True


class PrivilegeDTO(BaseModel):
    id: int
    scope: str
    level: str
    notes: Optional[str] = None
    active: bool

    class Config:
        from_attributes = True


class EmployeeDTO(BaseModel):
    id: int
    name: str
    personal_email: Optional[str] = None
    phone_number: Optional[str] = None
    company_email: str
    role: str
    project: Optional[str] = None
    status: str
    created_at: datetime
    access_grants: List[AccessGrantDTO] = []
    privileges: List[PrivilegeDTO] = []

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    slug: str
    name: str
    purchased: bool = True


class EmployeeUpdate(BaseModel):
    role: Optional[str] = None
    project: Optional[str] = None
    status: Optional[str] = None


class GrantCreate(BaseModel):
    product_id: int
    access_level: str = "user"


class GrantUpdate(BaseModel):
    access_level: Optional[str] = None
    active: Optional[bool] = None


class ProvisionFromCandidateReq(BaseModel):
    candidate_id: int
    role: str = "DEV"
    project: Optional[str] = None


def _generate_company_email(db: Session, name: str, fallback_email: Optional[str]) -> str:
    domain = os.getenv("COMPANY_EMAIL_DOMAIN", "company.local")
    base_local = "".join(ch for ch in name.lower().strip().replace(" ", ".") if ch.isalnum() or ch == ".")
    if not base_local:
        if fallback_email and "@" in fallback_email:
            base_local = fallback_email.split("@")[0]
        else:
            base_local = "employee"
    local = base_local
    n = 1
    while True:
        email = f"{local}@{domain}"
        exists = db.execute(select(Employee).where(Employee.company_email == email)).scalar_one_or_none()
        if not exists:
            return email
        n += 1
        local = f"{base_local}{n}"


def _ensure_default_groups(db: Session) -> list[Group]:
    slugs = os.getenv("DEFAULT_GROUP_SLUGS", "all,announcements").split(",")
    groups: list[Group] = []
    for slug in [s.strip() for s in slugs if s.strip()]:
        name = slug.replace("_", " ").title()
        g = db.execute(select(Group).where(Group.slug == slug)).scalar_one_or_none()
        if not g:
            g = Group(slug=slug, name=name)
            db.add(g)
            db.flush()
        groups.append(g)
    return groups


def _desired_privileges_for_employee(emp: Employee) -> list[tuple[str, str, str]]:
    # For now, return deterministic textual privileges as requested
    desired: list[tuple[str, str, str]] = [
        ("DATABASE@", "read", "RAG EMPLOYEE"),
        ("DATABASE@", "edit", "RAG EMPLOYEE"),
    ]
    # If project mentions 'database 3' give super access to that scope
    proj = (emp.project or "").lower()
    if "database 3" in proj or "db3" in proj or "database3" in proj:
        desired.append(("database 3", "super", "RAG EMPLOYEE"))
    return desired


def _reconcile_privileges_for_employee(db: Session, emp: Employee):
    desired = _desired_privileges_for_employee(emp)
    # If offboarded, deactivate all
    if emp.status == "offboarded":
        for p in list(emp.privileges or []):
            p.active = False
        return
    # Activate or create desired privileges
    existing = {(p.scope, p.level): p for p in (emp.privileges or [])}
    desired_keys = set()
    for scope, level, notes in desired:
        key = (scope, level)
        desired_keys.add(key)
        if key in existing:
            priv = existing[key]
            priv.active = True
            if notes is not None:
                priv.notes = notes
        else:
            db.add(EmployeePrivilege(employee_id=emp.id, scope=scope, level=level, notes=notes, active=True))
    # Deactivate privileges not desired
    for p in list(emp.privileges or []):
        if (p.scope, p.level) not in desired_keys:
            p.active = False


@router.get("/products", response_model=List[ProductDTO])
async def list_products(db: Session = Depends(get_db)):
    items = db.execute(select(Product)).scalars().all()
    return items


@router.post("/products", response_model=ProductDTO)
async def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    existing = db.execute(select(Product).where(Product.slug == payload.slug)).scalar_one_or_none()
    if existing:
        return existing
    p = Product(slug=payload.slug, name=payload.name, purchased=payload.purchased)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/employees", response_model=List[EmployeeDTO])
async def list_employees(db: Session = Depends(get_db)):
    emps = db.execute(select(Employee)).scalars().all()
    # eager load grants and products
    for e in emps:
        _ = [g.product for g in e.access_grants]
        _ = [p for p in e.privileges]
    return emps


@router.patch("/employees/{employee_id}", response_model=EmployeeDTO)
async def update_employee(employee_id: int, payload: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if payload.role is not None:
        emp.role = payload.role
    if payload.project is not None:
        emp.project = payload.project
    if payload.status is not None:
        emp.status = payload.status
    # Auto-reconcile privileges without requiring approval
    _ = [p for p in emp.privileges]
    _reconcile_privileges_for_employee(db, emp)
    db.commit()
    db.refresh(emp)
    _ = [g.product for g in emp.access_grants]
    return emp


class EmployeeUpdateByEmail(BaseModel):
    email: str
    role: Optional[str] = None
    project: Optional[str] = None
    status: Optional[str] = None


@router.patch("/employees/by_email", response_model=EmployeeDTO)
async def update_employee_by_email(payload: EmployeeUpdateByEmail, db: Session = Depends(get_db)):
    email = (payload.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    emp = db.execute(select(Employee).where(Employee.company_email == email)).scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if payload.role is not None:
        emp.role = payload.role
    if payload.project is not None:
        emp.project = payload.project
    if payload.status is not None:
        emp.status = payload.status
    _ = [p for p in emp.privileges]
    _reconcile_privileges_for_employee(db, emp)
    db.commit()
    db.refresh(emp)
    _ = [g.product for g in emp.access_grants]
    return emp


@router.post("/employees/{employee_id}/grants", response_model=AccessGrantDTO)
async def add_grant(employee_id: int, payload: GrantCreate, db: Session = Depends(get_db)):
    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    prod = db.get(Product, payload.product_id)
    if not prod or not prod.purchased:
        raise HTTPException(status_code=400, detail="Product not found or not purchased")
    existing = db.execute(
        select(AccessGrant).where(
            (AccessGrant.employee_id == employee_id) & (AccessGrant.product_id == payload.product_id)
        )
    ).scalar_one_or_none()
    if existing:
        return existing
    g = AccessGrant(employee_id=employee_id, product_id=payload.product_id, access_level=payload.access_level, active=True)
    db.add(g)
    db.commit()
    db.refresh(g)
    _ = g.product
    return g


@router.patch("/employees/{employee_id}/grants/{grant_id}", response_model=AccessGrantDTO)
async def update_grant(employee_id: int, grant_id: int, payload: GrantUpdate, db: Session = Depends(get_db)):
    g = db.get(AccessGrant, grant_id)
    if not g or g.employee_id != employee_id:
        raise HTTPException(status_code=404, detail="Grant not found")
    if payload.access_level is not None:
        g.access_level = payload.access_level
    if payload.active is not None:
        g.active = bool(payload.active)
    db.commit()
    db.refresh(g)
    _ = g.product
    return g


@router.delete("/employees/{employee_id}/grants/{grant_id}")
async def delete_grant(employee_id: int, grant_id: int, db: Session = Depends(get_db)):
    g = db.get(AccessGrant, grant_id)
    if not g or g.employee_id != employee_id:
        raise HTTPException(status_code=404, detail="Grant not found")
    db.delete(g)
    db.commit()
    return {"ok": True}


@router.post("/employees/by_email/ensure_defaults", response_model=EmployeeDTO)
async def ensure_defaults_by_email(email: str, db: Session = Depends(get_db)):
    em = (email or "").strip().lower()
    if not em:
        raise HTTPException(status_code=400, detail="email required")
    emp = db.execute(select(Employee).where(Employee.company_email == em)).scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    # Ensure default group memberships
    groups = _ensure_default_groups(db)
    have = {(m.group_id) for m in db.execute(select(GroupMembership).where(GroupMembership.employee_id == emp.id)).scalars().all()}
    for g in groups:
        if g.id not in have:
            db.add(GroupMembership(employee_id=emp.id, group_id=g.id))
    # Ensure grants for all purchased products
    purchased = db.execute(select(Product).where(Product.purchased == True)).scalars().all()  # noqa: E712
    existing = {(gr.product_id) for gr in db.execute(select(AccessGrant).where(AccessGrant.employee_id == emp.id)).scalars().all()}
    for p in purchased:
        if p.id not in existing:
            db.add(AccessGrant(employee_id=emp.id, product_id=p.id, access_level="user", active=True))
    db.commit()
    db.refresh(emp)
    _ = [g.product for g in emp.access_grants]
    return emp


# ---- Privileges ----


class PrivilegeCreate(BaseModel):
    scope: str
    level: str
    notes: Optional[str] = None


class PrivilegeUpdate(BaseModel):
    scope: Optional[str] = None
    level: Optional[str] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


@router.get("/employees/{employee_id}/privileges", response_model=List[PrivilegeDTO])
async def list_privileges(employee_id: int, db: Session = Depends(get_db)):
    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return db.execute(select(EmployeePrivilege).where(EmployeePrivilege.employee_id == employee_id)).scalars().all()


@router.post("/employees/{employee_id}/privileges", response_model=PrivilegeDTO)
async def add_privilege(employee_id: int, payload: PrivilegeCreate, db: Session = Depends(get_db)):
    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    priv = EmployeePrivilege(employee_id=employee_id, scope=payload.scope, level=payload.level, notes=payload.notes)
    db.add(priv)
    db.commit()
    db.refresh(priv)
    return priv


@router.patch("/employees/{employee_id}/privileges/{privilege_id}", response_model=PrivilegeDTO)
async def update_privilege(employee_id: int, privilege_id: int, payload: PrivilegeUpdate, db: Session = Depends(get_db)):
    priv = db.get(EmployeePrivilege, privilege_id)
    if not priv or priv.employee_id != employee_id:
        raise HTTPException(status_code=404, detail="Privilege not found")
    if payload.scope is not None:
        priv.scope = payload.scope
    if payload.level is not None:
        priv.level = payload.level
    if payload.notes is not None:
        priv.notes = payload.notes
    if payload.active is not None:
        priv.active = bool(payload.active)
    db.commit()
    db.refresh(priv)
    return priv


@router.delete("/employees/{employee_id}/privileges/{privilege_id}")
async def delete_privilege(employee_id: int, privilege_id: int, db: Session = Depends(get_db)):
    priv = db.get(EmployeePrivilege, privilege_id)
    if not priv or priv.employee_id != employee_id:
        raise HTTPException(status_code=404, detail="Privilege not found")
    db.delete(priv)
    db.commit()
    return {"ok": True}


@router.post("/provision_from_candidate", response_model=EmployeeDTO)
async def provision_from_candidate(payload: ProvisionFromCandidateReq, db: Session = Depends(get_db)):
    cand = db.get(Candidate, payload.candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    # Generate email and create employee
    company_email = _generate_company_email(db, cand.name, cand.email)
    emp = Employee(
        name=cand.name,
        personal_email=cand.email,
        phone_number=cand.phone_number,
        company_email=company_email,
        role=payload.role or "DEV",
        project=payload.project,
        status="active",
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)

    # Grant default access to purchased products
    prods = db.execute(select(Product).where(Product.purchased == True)).scalars().all()  # noqa: E712
    for p in prods:
        g = AccessGrant(employee_id=emp.id, product_id=p.id, access_level="user", active=True)
        db.add(g)
    # Add to default communication groups
    groups = _ensure_default_groups(db)
    db.flush()
    for g in groups:
        m = GroupMembership(employee_id=emp.id, group_id=g.id)
        db.add(m)
    # Auto-reconcile privileges for the new employee (no approval)
    _ = [p for p in emp.privileges]
    _reconcile_privileges_for_employee(db, emp)
    # Mirror to RAG Postgres (best-effort) using company email
    try:
        upsert_employee_with_text_privileges(name=cand.name, email=company_email, project_hint=payload.project or "")
    except Exception:
        pass
    # Mark candidate provisioned
    cand.provisioned = True
    db.commit()
    _ = [g.product for g in emp.access_grants]
    return emp


@router.post("/reconcile_all", response_model=dict)
async def reconcile_all(db: Session = Depends(get_db)):
    emps = db.execute(select(Employee)).scalars().all()
    count = 0
    for emp in emps:
        _ = [p for p in emp.privileges]
        _reconcile_privileges_for_employee(db, emp)
        count += 1
    db.commit()
    return {"ok": True, "reconciled": count}


@router.post("/employees/{employee_id}/reconcile", response_model=EmployeeDTO)
async def reconcile_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.get(Employee, employee_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    _ = [p for p in emp.privileges]
    _reconcile_privileges_for_employee(db, emp)
    db.commit()
    db.refresh(emp)
    return emp


# ---- Daily Metrics (RAG Postgres) ----


class DailyMetricsUpsert(BaseModel):
    email: str
    name_hint: Optional[str] = None
    day: str  # YYYY-MM-DD
    commits: Optional[int] = 0
    pull_requests: Optional[int] = 0
    tickets_closed: Optional[int] = 0
    meetings: Optional[int] = 0
    messages: Optional[int] = 0
    hours_worked: Optional[float] = None
    score: Optional[float] = None
    metrics_json: Optional[dict] = None


class DailyMetricItem(BaseModel):
    day: str
    commits: int
    pull_requests: int
    tickets_closed: int
    meetings: int
    messages: int
    hours_worked: Optional[float] = None
    score: Optional[float] = None
    metrics_json: Optional[dict] = None


@router.post("/metrics/daily", response_model=dict)
async def metrics_daily_upsert(payload: DailyMetricsUpsert):
    rag_upsert_daily_metrics(
        email=payload.email,
        name_hint=payload.name_hint,
        day=payload.day,
        commits=payload.commits or 0,
        pull_requests=payload.pull_requests or 0,
        tickets_closed=payload.tickets_closed or 0,
        meetings=payload.meetings or 0,
        messages=payload.messages or 0,
        hours_worked=payload.hours_worked,
        score=payload.score,
        metrics_json=payload.metrics_json,
    )
    return {"ok": True}


@router.get("/metrics/daily", response_model=List[DailyMetricItem])
async def metrics_daily_get(email: str, start: Optional[str] = None, end: Optional[str] = None):
    items = rag_get_daily_metrics(email=email, start=start, end=end) or []
    return items
