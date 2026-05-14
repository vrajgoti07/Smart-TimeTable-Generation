from pydantic import BaseModel, Field
from typing import Optional

class TimetableEntry(BaseModel):
    course_id: str
    faculty_id: str
    room_id: str
    department_id: str
    semester: int
    section: Optional[str] = None
    day_of_week: str
    start_time: str
    end_time: str
    course_name: str
    room_name: str
    faculty_name: Optional[str] = None
    type: str = "Theory" # Theory or Practical

    class Config:
        populate_by_name = True

class TimetableCreate(TimetableEntry):
    pass

class TimetableResponse(TimetableEntry):
    id: str

class GenerationConstraints(BaseModel):
    maxConsecutiveHours: int = 4
    facultyWorkload: int = 18
    roomUtilization: str = "Balanced" # Balanced or Compact

class TimetableGenerateRequest(BaseModel):
    department_id: Optional[str] = None
    branch: Optional[str] = None
    semester: Optional[int] = None
    section: Optional[str] = None
    constraints: Optional[GenerationConstraints] = None
