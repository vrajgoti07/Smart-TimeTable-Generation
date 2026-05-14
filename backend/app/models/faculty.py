from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List
from datetime import datetime

class FacultyBase(BaseModel):
    name: str
    email: EmailStr
    department: str
    max_hours: int = 15
    availability: Dict[str, List[str]] = {}
    expertise: List[str] = []
    current_hours: int = 0
    available_slots: int = 0  # Number of slots available per week
    avatar: Optional[str] = None
class FacultyCreate(FacultyBase):
    pass

class FacultyResponse(FacultyBase):
    id: str

class FacultyInDB(FacultyBase):
    id: str = Field(alias="_id")
    hashed_password: Optional[str] = None
    is_verified: bool = False
    invite_token: Optional[str] = None
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
