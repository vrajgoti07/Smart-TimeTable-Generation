from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

class NotificationBase(BaseModel):
    user_id: str
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    link: Optional[str] = None
    is_read: bool = False

class NotificationCreate(NotificationBase):
    pass

class NotificationInDB(NotificationBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat() + ('Z' if not dt.tzinfo else '')
        }

class NotificationResponse(NotificationBase):
    id: str
    created_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat() + ('Z' if not dt.tzinfo else '')
        }
