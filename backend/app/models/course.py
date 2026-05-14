from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any

class FacultyAssignment(BaseModel):
    theory: List[str] = []
    practical: List[str] = []

class CourseBase(BaseModel):
    code: str                   # Subject Code (e.g., CS401)
    name: str                   # Subject Title
    branch: str = "CSE"         # Primary Department (CSE | CE | IT | AI&ML)
    semester: int               # Semester Number (1-8)
    credits: int                # Total Credits
    theory_credit: int          # Weekly Theory Hours
    practical_credit: int       # Weekly Lab Hours
    total_credit: int           # Total Credit Load
    required_room_type: str = "Theory" # "Theory" or "Lab"
    type: str = "BRANCH"        # "BRANCH" or "COMMON"
    branches: List[str] = []    # Shared branches if type is COMMON
    faculty: Dict[str, FacultyAssignment] = {} # Map of branch_name -> FacultyAssignment

    @model_validator(mode='before')
    @classmethod
    def migrate_faculty_format(cls, data: Any) -> Any:
        if isinstance(data, dict):
            faculty = data.get("faculty")
            # If faculty is in old format: {"theory": [...], "practical": [...]}
            if isinstance(faculty, dict) and ("theory" in faculty or "practical" in faculty):
                branch = data.get("branch", "CSE")
                data["faculty"] = {branch: faculty}
            
            # Ensure required_room_type exists
            if not data.get("required_room_type"):
                data["required_room_type"] = "Lab" if data.get("practical_credit", 0) > 0 else "Theory"
        return data

class CourseCreate(CourseBase):
    pass

class CourseInDB(CourseBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True

class CourseResponse(CourseBase):
    id: str
