from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped

from .db import Base


class Interviewer(Base):
    __tablename__ = "interviewers"
    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    name: Mapped[str] = Column(String(255), nullable=False)
    email: Mapped[str] = Column(String(255), nullable=False, unique=True)

    availabilities = relationship("InterviewerAvailability", back_populates="interviewer", cascade="all, delete-orphan")
    jobs = relationship("JobInterviewer", back_populates="interviewer", cascade="all, delete-orphan")


class InterviewerAvailability(Base):
    __tablename__ = "interviewer_availability"
    id: Mapped[int] = Column(Integer, primary_key=True)
    interviewer_id: Mapped[int] = Column(Integer, ForeignKey("interviewers.id", ondelete="CASCADE"), index=True)
    start_time: Mapped[datetime] = Column(DateTime, nullable=False)
    end_time: Mapped[datetime] = Column(DateTime, nullable=False)

    interviewer = relationship("Interviewer", back_populates="availabilities")


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = Column(Integer, primary_key=True)
    title: Mapped[str] = Column(String(255), nullable=False)
    description: Mapped[str] = Column(Text, nullable=False)
    qualifications: Mapped[str] = Column(Text, nullable=True)
    deadline: Mapped[datetime] = Column(DateTime, nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")
    interviewers = relationship("JobInterviewer", back_populates="job", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="job", cascade="all, delete-orphan")


class JobInterviewer(Base):
    __tablename__ = "job_interviewers"
    id: Mapped[int] = Column(Integer, primary_key=True)
    job_id: Mapped[int] = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    interviewer_id: Mapped[int] = Column(Integer, ForeignKey("interviewers.id", ondelete="CASCADE"), index=True)

    job = relationship("Job", back_populates="interviewers")
    interviewer = relationship("Interviewer", back_populates="jobs")


class Candidate(Base):
    __tablename__ = "candidates"
    id: Mapped[int] = Column(Integer, primary_key=True)
    job_id: Mapped[int] = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = Column(String(255), nullable=False)
    email: Mapped[str] = Column(String(255), nullable=False)
    phone_number: Mapped[Optional[str]] = Column(String(64), nullable=True)
    resume_text: Mapped[Optional[str]] = Column(Text, nullable=True)
    resume_url: Mapped[Optional[str]] = Column(String(1024), nullable=True)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    approved: Mapped[bool] = Column(Boolean, default=False, nullable=False)
    match_score: Mapped[Optional[float]] = Column(Float, nullable=True)
    filtered_out: Mapped[bool] = Column(Boolean, default=False, nullable=False)
    rank: Mapped[Optional[int]] = Column(Integer, nullable=True)
    provisioned: Mapped[bool] = Column(Boolean, default=False, nullable=False)

    job = relationship("Job", back_populates="candidates")
    meetings = relationship("Meeting", back_populates="candidate", cascade="all, delete-orphan")


class Meeting(Base):
    __tablename__ = "meetings"
    id: Mapped[int] = Column(Integer, primary_key=True)
    job_id: Mapped[int] = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    candidate_id: Mapped[int] = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), index=True)
    interviewer_id: Mapped[int] = Column(Integer, ForeignKey("interviewers.id", ondelete="SET NULL"), index=True, nullable=True)

    start_time: Mapped[datetime] = Column(DateTime, nullable=False)
    end_time: Mapped[datetime] = Column(DateTime, nullable=False)
    location: Mapped[str] = Column(String(255), default="Online")
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("Job", back_populates="meetings")
    candidate = relationship("Candidate", back_populates="meetings")


# --- Smart Access Models ---


class Employee(Base):
    __tablename__ = "employees"
    id: Mapped[int] = Column(Integer, primary_key=True)
    name: Mapped[str] = Column(String(255), nullable=False)
    personal_email: Mapped[str] = Column(String(255), nullable=True)
    phone_number: Mapped[Optional[str]] = Column(String(64), nullable=True)
    company_email: Mapped[str] = Column(String(255), nullable=False, unique=True)
    role: Mapped[str] = Column(String(64), default="DEV", nullable=False)
    project: Mapped[str] = Column(String(128), nullable=True)
    status: Mapped[str] = Column(String(32), default="active", nullable=False)  # active, pending, offboarded
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    access_grants = relationship("AccessGrant", back_populates="employee", cascade="all, delete-orphan")
    privileges = relationship("EmployeePrivilege", back_populates="employee", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = Column(Integer, primary_key=True)
    slug: Mapped[str] = Column(String(64), nullable=False, unique=True)
    name: Mapped[str] = Column(String(255), nullable=False)
    purchased: Mapped[bool] = Column(Boolean, default=True, nullable=False)

    access_grants = relationship("AccessGrant", back_populates="product", cascade="all, delete-orphan")


class AccessGrant(Base):
    __tablename__ = "access_grants"
    id: Mapped[int] = Column(Integer, primary_key=True)
    employee_id: Mapped[int] = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int] = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), index=True)
    access_level: Mapped[str] = Column(String(64), default="user", nullable=False)
    active: Mapped[bool] = Column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    employee = relationship("Employee", back_populates="access_grants")
    product = relationship("Product", back_populates="access_grants")
    __table_args__ = (UniqueConstraint("employee_id", "product_id", name="uix_employee_product"),)


class EmployeePrivilege(Base):
    __tablename__ = "employee_privileges"
    id: Mapped[int] = Column(Integer, primary_key=True)
    employee_id: Mapped[int] = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    scope: Mapped[str] = Column(String(255), nullable=False)  # e.g., "DATABASE@", "database 3"
    level: Mapped[str] = Column(String(64), nullable=False)   # e.g., "read", "edit", "super"
    notes: Mapped[Optional[str]] = Column(Text, nullable=True)
    active: Mapped[bool] = Column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    employee = relationship("Employee", back_populates="privileges")


class Group(Base):
    __tablename__ = "groups"
    id: Mapped[int] = Column(Integer, primary_key=True)
    slug: Mapped[str] = Column(String(64), nullable=False, unique=True)
    name: Mapped[str] = Column(String(255), nullable=False)

    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")


class GroupMembership(Base):
    __tablename__ = "group_memberships"
    id: Mapped[int] = Column(Integer, primary_key=True)
    employee_id: Mapped[int] = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    group_id: Mapped[int] = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, nullable=False)

    employee = relationship("Employee")
    group = relationship("Group", back_populates="memberships")
    __table_args__ = (UniqueConstraint("employee_id", "group_id", name="uix_employee_group"),)
