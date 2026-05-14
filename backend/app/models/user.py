from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List
from bson import ObjectId
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str  # Admin, Faculty, Student
    department: Optional[str] = None
    studentId: Optional[str] = None
    semester: Optional[int] = None
    max_hours: Optional[int] = 15
    availability: Optional[Dict[str, List[str]]] = {}
    expertise: List[str] = []
    current_hours: int = 0
    available_slots: int = 0

class UserCreate(UserBase):
    password: Optional[str] = None # Optional for invite, required for direct creation

class UserInvite(UserBase):
    pass

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class DeleteAccountRequest(BaseModel):
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    avatar: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class UserResponse(UserBase):
    id: str
    avatar: Optional[str] = None
