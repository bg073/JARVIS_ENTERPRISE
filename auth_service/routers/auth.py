from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError

from ..db import get_db, Base, engine
from ..models import User
from ..schemas import SignupRequest, LoginRequest, UserOut, TokenResponse
from ..security import hash_password, verify_password, create_access_token, decode_token

# Create tables
Base.metadata.create_all(bind=engine)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/signup", response_model=UserOut)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    # Check exists
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="email_already_registered")
    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password), role=payload.role or "DEV")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user: Optional[User] = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_not_found")
    return user


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return UserOut.model_validate(current)
