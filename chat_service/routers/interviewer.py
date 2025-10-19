import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select
import httpx

from ..db import get_db
from ..rag_client import upsert_employee_with_text_privileges, offboard_employee
from ..models import (
    Base,
    Job,
    Candidate,
    Interviewer,
    InterviewerAvailability,
    JobInterviewer,
    Meeting,
    Employee,
    Product,
    AccessGrant,
    Group,
    GroupMembership,
    EmployeePrivilege,
)

router = APIRouter()

LLM_URL = os.getenv("LLM_URL", "http://127.0.0.1:8085")
LLM_MODEL = os.getenv("LLM_MODEL", "local-llm")
MEETING_MINUTES = int(os.getenv("MEETING_MINUTES", "30"))
DEFAULT_SCORE_THRESHOLD = float(os.getenv("AUTO_FILTER_MIN_SCORE", "0.5"))


class CreateJobReq(BaseModel):
    title: str
    description: str
    qualifications: Optional[str] = None
    deadline: datetime
    interviewer_emails: List[str] = Field(default_factory=list)


class JobDTO(BaseModel):
    id: int
    title: str
    description: str
    qualifications: Optional[str] = None
    deadline: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class CandidateReq(BaseModel):
    name: str
    email: str
    phone_number: Optional[str] = None
    resume_text: Optional[str] = None
    resume_url: Optional[str] = None


class CandidateDTO(BaseModel):
    id: int
    name: str
    email: str
    phone_number: Optional[str] = None
    approved: bool
    filtered_out: bool
    match_score: Optional[float]
    rank: Optional[int]
    resume_text: Optional[str] = None
    resume_url: Optional[str] = None

    class Config:
        from_attributes = True


class CreateInterviewerReq(BaseModel):
    name: str
    email: str


class AvailabilityReq(BaseModel):
    start_time: datetime
    end_time: datetime


class CandidateUpdateReq(BaseModel):
    approved: Optional[bool] = None


async def _llm_score_candidate(job: Job, candidate: Candidate) -> Optional[float]:
    # Build prompt
    system = (
        "You are an expert technical recruiter. Given a job description and candidate resume, "
        "return ONLY a floating point match score between 0 and 1 representing how well the candidate fits."
    )
    user = (
        f"Job Title: {job.title}\n"
        f"Job Description: {job.description}\n"
        f"Qualifications: {job.qualifications or ''}\n\n"
        f"Candidate: {candidate.name} <{candidate.email}>\n"
        f"Resume: {candidate.resume_text or '(no resume text provided)'}\n\n"
        "Return only the score as a number between 0 and 1."
    )
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{LLM_URL.rstrip('/')}/v1/chat/completions",
                json={
                    "model": LLM_MODEL,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.0,
                    "max_tokens": 20,
                },
            )
            r.raise_for_status()
            data = r.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            # Try to parse a float from response
            try:
                score = float(content)
                if 0.0 <= score <= 1.0:
                    return score
            except Exception:
                return None
    except Exception:
        return None


@router.post("/jobs", response_model=JobDTO)
async def create_job(payload: CreateJobReq, db: Session = Depends(get_db)):
    job = Job(
        title=payload.title,
        description=payload.description,
        qualifications=payload.qualifications,
        deadline=payload.deadline,
    )
    db.add(job)
    db.flush()

    # Attach interviewers by email (create if missing)
    for email in payload.interviewer_emails:
        email_norm = email.strip().lower()
        if not email_norm:
            continue
        interviewer = db.execute(select(Interviewer).where(Interviewer.email == email_norm)).scalar_one_or_none()
        if interviewer is None:
            interviewer = Interviewer(name=email_norm.split('@')[0], email=email_norm)
            db.add(interviewer)
            db.flush()
        ji = JobInterviewer(job_id=job.id, interviewer_id=interviewer.id)
        db.add(ji)
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs", response_model=List[JobDTO])
async def list_jobs(db: Session = Depends(get_db)):
    rows = db.execute(select(Job).order_by(Job.created_at.desc())).scalars().all()
    return rows


@router.get("/jobs/{job_id}")
async def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    cands = db.execute(select(Candidate).where(Candidate.job_id == job_id).order_by(Candidate.created_at.desc())).scalars().all()
    return {
        "job": JobDTO.model_validate(job),
        "candidates": [CandidateDTO.model_validate(c) for c in cands],
    }


@router.post("/jobs/{job_id}/apply", response_model=CandidateDTO)
async def apply_to_job(job_id: int, payload: CandidateReq, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    cand = Candidate(
        job_id=job.id,
        name=payload.name,
        email=payload.email.lower(),
        phone_number=payload.phone_number,
        resume_text=payload.resume_text,
        resume_url=payload.resume_url,
    )
    db.add(cand)
    db.commit()
    db.refresh(cand)
    return cand


@router.patch("/jobs/{job_id}/candidates/{candidate_id}", response_model=CandidateDTO)
async def update_candidate(job_id: int, candidate_id: int, payload: CandidateUpdateReq, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    cand = db.get(Candidate, candidate_id)
    if not cand or cand.job_id != job_id:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if payload.approved is not None:
        cand.approved = bool(payload.approved)
        # Auto-provision on approval if not yet provisioned
        if cand.approved and not cand.provisioned:
            # Create employee with generated company email
            email = _gen_company_email(db, cand.name, cand.email)
            emp = Employee(
                name=cand.name,
                personal_email=cand.email,
                phone_number=cand.phone_number,
                company_email=email,
                role="DEV",
                project=job.title,
                status="active",
            )
            db.add(emp)
            db.flush()
            # Grant default access to purchased products
            prods = db.execute(select(Product).where(Product.purchased == True)).scalars().all()  # noqa: E712
            for p in prods:
                g = AccessGrant(employee_id=emp.id, product_id=p.id, access_level="user", active=True)
                db.add(g)
            # Add to default communication groups
            groups = _ensure_groups(db)
            db.flush()
            for g in groups:
                m = GroupMembership(employee_id=emp.id, group_id=g.id)
                db.add(m)
            # Create sample textual privileges
            sample_privs = [
                ("DATABASE@", "read", "RAG EMPLOYEE"),
                ("DATABASE@", "edit", "RAG EMPLOYEE"),
                ("database 3", "super", "RAG EMPLOYEE"),
            ]
            for scope, level, notes in sample_privs:
                db.add(EmployeePrivilege(employee_id=emp.id, scope=scope, level=level, notes=notes))
            # Mirror to RAG Postgres (best-effort)
            try:
                upsert_employee_with_text_privileges(name=cand.name, email=email, project_hint=job.title)
            except Exception:
                pass
            cand.provisioned = True
        # If declined and previously provisioned, offboard employee
        if (not cand.approved) and cand.provisioned:
            emp = db.execute(select(Employee).where(Employee.personal_email == cand.email)).scalar_one_or_none()
            if emp:
                emp.status = "offboarded"
                # deactivate all access grants
                grants = db.execute(select(AccessGrant).where(AccessGrant.employee_id == emp.id)).scalars().all()
                for g in grants:
                    g.active = False
                # deactivate all privileges
                privs = db.execute(select(EmployeePrivilege).where(EmployeePrivilege.employee_id == emp.id)).scalars().all()
                for p in privs:
                    p.active = False
                # remove group memberships
                memberships = db.execute(select(GroupMembership).where(GroupMembership.employee_id == emp.id)).scalars().all()
                for m in memberships:
                    db.delete(m)
                # Mirror offboarding to RAG DB (best-effort)
                try:
                    rag_email = emp.company_email or cand.email
                    offboard_employee(email=rag_email)
                except Exception:
                    pass
    db.commit()
    db.refresh(cand)
    return cand


@router.post("/interviewers", response_model=dict)
async def create_interviewer(payload: CreateInterviewerReq, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    existing = db.execute(select(Interviewer).where(Interviewer.email == email)).scalar_one_or_none()
    if existing:
        return {"id": existing.id, "email": existing.email, "name": existing.name}
    intr = Interviewer(name=payload.name, email=email)
    db.add(intr)
    db.commit()
    db.refresh(intr)
    return {"id": intr.id, "email": intr.email, "name": intr.name}


@router.post("/interviewers/{interviewer_id}/availability", response_model=dict)
async def add_availability(interviewer_id: int, payload: AvailabilityReq, db: Session = Depends(get_db)):
    intr = db.get(Interviewer, interviewer_id)
    if not intr:
        raise HTTPException(status_code=404, detail="Interviewer not found")
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="Invalid time range")
    av = InterviewerAvailability(
        interviewer_id=interviewer_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    db.add(av)
    db.commit()
    return {"ok": True}


@router.post("/jobs/{job_id}/autofilter", response_model=dict)
async def auto_filter(job_id: int, min_score: Optional[float] = None, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if datetime.utcnow() < job.deadline:
        raise HTTPException(status_code=400, detail="Deadline not reached yet")

    cands = db.execute(select(Candidate).where(Candidate.job_id == job_id)).scalars().all()
    threshold = min_score if min_score is not None else DEFAULT_SCORE_THRESHOLD

    scored: List[Candidate] = []
    for c in cands:
        score = await _llm_score_candidate(job, c)
        c.match_score = score if score is not None else 0.0
        c.filtered_out = (c.match_score or 0.0) < threshold
        scored.append(c)
    # Rank by descending score
    scored.sort(key=lambda x: (x.match_score or 0.0), reverse=True)
    for idx, c in enumerate(scored, start=1):
        c.rank = idx
    db.commit()
    return {
        "ok": True,
        "ranked": [
            {"id": c.id, "name": c.name, "score": c.match_score, "filtered_out": c.filtered_out, "rank": c.rank}
            for c in scored
        ],
    }


def _gen_company_email(db: Session, name: str, fallback_email: Optional[str]) -> str:
    domain = os.getenv("COMPANY_EMAIL_DOMAIN", "company.local")
    base_local = "".join(ch for ch in name.lower().strip().replace(" ", ".") if ch.isalnum() or ch == ".") or "employee"
    if not base_local and fallback_email and "@" in fallback_email:
        base_local = fallback_email.split("@")[0]
    local = base_local
    n = 1
    while True:
        email = f"{local}@{domain}"
        exists = db.execute(select(Employee).where(Employee.company_email == email)).scalar_one_or_none()
        if not exists:
            return email
        n += 1
        local = f"{base_local}{n}"


def _ensure_groups(db: Session) -> list[Group]:
    slugs = os.getenv("DEFAULT_GROUP_SLUGS", "all,announcements").split(",")
    out: list[Group] = []
    for slug in [s.strip() for s in slugs if s.strip()]:
        name = slug.replace("_", " ").title()
        g = db.execute(select(Group).where(Group.slug == slug)).scalar_one_or_none()
        if not g:
            g = Group(slug=slug, name=name)
            db.add(g)
            db.flush()
        out.append(g)
    return out


def _find_slots(avails: List[InterviewerAvailability], duration: timedelta) -> List[tuple[datetime, datetime]]:
    slots: List[tuple[datetime, datetime]] = []
    for a in avails:
        start = a.start_time
        while start + duration <= a.end_time:
            end = start + duration
            slots.append((start, end))
            start = end
    return slots


@router.post("/jobs/{job_id}/autoschedule", response_model=dict)
async def auto_schedule(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if datetime.utcnow() < job.deadline:
        raise HTTPException(status_code=400, detail="Deadline not reached yet")

    # Get approved, not filtered candidates
    candidates = db.execute(
        select(Candidate).where(Candidate.job_id == job_id, Candidate.filtered_out == False, Candidate.approved == True).order_by((Candidate.rank.is_(None)).desc(), Candidate.rank.asc())
    ).scalars().all()

    if not candidates:
        return {"ok": True, "scheduled": []}

    # Collect interviewers assigned to job and their availability
    jis = db.execute(select(JobInterviewer).where(JobInterviewer.job_id == job_id)).scalars().all()
    interviewer_ids = [ji.interviewer_id for ji in jis]
    intrs = db.execute(select(Interviewer).where(Interviewer.id.in_(interviewer_ids))).scalars().all()

    if not intrs:
        raise HTTPException(status_code=400, detail="No interviewers assigned to job")

    duration = timedelta(minutes=MEETING_MINUTES)

    scheduled = []
    used_slots: set[tuple[int, datetime]] = set()

    for cand in candidates:
        scheduled_for_candidate = False
        for intr in intrs:
            avails = db.execute(select(InterviewerAvailability).where(InterviewerAvailability.interviewer_id == intr.id).order_by(InterviewerAvailability.start_time.asc())).scalars().all()
            slots = _find_slots(avails, duration)
            for (start, end) in slots:
                key = (intr.id, start)
                if key in used_slots:
                    continue
                # Check no overlapping existing meetings for interviewer or candidate
                overlap = db.execute(
                    select(Meeting).where(
                        Meeting.start_time < end,
                        Meeting.end_time > start,
                        Meeting.interviewer_id == intr.id,
                    )
                ).scalar_one_or_none()
                overlap2 = db.execute(
                    select(Meeting).where(
                        Meeting.start_time < end,
                        Meeting.end_time > start,
                        Meeting.candidate_id == cand.id,
                    )
                ).scalar_one_or_none()
                if overlap or overlap2:
                    continue
                m = Meeting(
                    job_id=job.id,
                    candidate_id=cand.id,
                    interviewer_id=intr.id,
                    start_time=start,
                    end_time=end,
                    location="Online",
                )
                db.add(m)
                used_slots.add(key)
                scheduled.append({
                    "candidate": {"id": cand.id, "name": cand.name, "email": cand.email},
                    "interviewer": {"id": intr.id, "name": intr.name, "email": intr.email},
                    "start_time": start.isoformat(),
                    "end_time": end.isoformat(),
                })
                scheduled_for_candidate = True
                break
            if scheduled_for_candidate:
                break
    db.commit()

    # Try to send simple emails (best-effort)
    _send_emails_best_effort(scheduled, job)

    return {"ok": True, "scheduled": scheduled}


def _send_emails_best_effort(scheduled: List[dict], job: Job):
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")
    from_email = os.getenv("FROM_EMAIL", user or "no-reply@example.com")

    if not host or not user or not password:
        # No SMTP configured; skip
        return
    import smtplib
    from email.mime.text import MIMEText

    server = None
    try:
        server = smtplib.SMTP(host, port)
        server.starttls()
        server.login(user, password)
        for item in scheduled:
            cand = item["candidate"]
            intr = item["interviewer"]
            start = item["start_time"]
            end = item["end_time"]
            subject = f"Interview Scheduled: {job.title}"
            body_c = (
                f"Hello {cand['name']},\n\n"
                f"Your interview for '{job.title}' is scheduled with {intr['name']}\n"
                f"Time: {start} - {end} (UTC)\nLocation: Online\n\nBest regards,\nHR Team"
            )
            msg_c = MIMEText(body_c)
            msg_c["Subject"] = subject
            msg_c["From"] = from_email
            msg_c["To"] = cand["email"]
            try:
                server.sendmail(from_email, [cand["email"]], msg_c.as_string())
            except Exception:
                pass

            body_i = (
                f"Hello {intr['name']},\n\n"
                f"An interview for '{job.title}' has been scheduled with candidate {cand['name']}\n"
                f"Time: {start} - {end} (UTC)\nLocation: Online\n\nBest regards,\nATS System"
            )
            msg_i = MIMEText(body_i)
            msg_i["Subject"] = subject
            msg_i["From"] = from_email
            msg_i["To"] = intr["email"]
            try:
                server.sendmail(from_email, [intr["email"]], msg_i.as_string())
            except Exception:
                pass
    except Exception:
        pass
    finally:
        try:
            if server:
                server.quit()
        except Exception:
            pass
