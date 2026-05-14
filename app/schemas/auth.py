from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: str  # Admin, Faculty, Student

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
