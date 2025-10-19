from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import validates
from .db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="DEV")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @validates("email")
    def validate_email(self, key, value):
        assert "@" in value, "invalid email"
        return value.lower()
