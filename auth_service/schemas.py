from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal

Role = Literal["CEO", "IT", "DEV", "HR", "PM"]

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: Optional[Role] = "DEV"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: Role

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
