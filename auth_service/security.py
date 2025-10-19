import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
from passlib.context import CryptContext

JWT_SECRET = os.getenv("AUTH_JWT_SECRET", "change_this_secret")
JWT_ALG = os.getenv("AUTH_JWT_ALG", "HS256")
JWT_EXPIRE_MIN = int(os.getenv("AUTH_JWT_EXPIRE_MIN", "60"))

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=JWT_EXPIRE_MIN)
    expire = datetime.now(tz=timezone.utc) + expires_delta
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
