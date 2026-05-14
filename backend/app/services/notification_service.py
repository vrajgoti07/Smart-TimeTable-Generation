from datetime import datetime, timezone
from typing import List, Optional
from app.database import get_database
from app.models.notification import NotificationCreate
from bson import ObjectId

class NotificationService:
    @staticmethod
    async def create_notification(user_id: str, title: str, message: str, type: str = "info", link: Optional[str] = None):
        """
        Creates a new notification for a specific user.
        """
        db = get_database()
        notification = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": type,
            "link": link,
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        result = await db.notifications.insert_one(notification)
        notification["_id"] = str(result.inserted_id)
        return notification

    @staticmethod
    async def get_user_notifications(user_id: str, limit: int = 20) -> List[dict]:
        """
        Fetches latest notifications for a user.
        """
        db = get_database()
        cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        notifications = await cursor.to_list(length=limit)
        for n in notifications:
            n["id"] = str(n.pop("_id"))
        return notifications

    @staticmethod
    async def mark_as_read(notification_id: str, user_id: str):
        """
        Marks a specific notification as read.
        """
        db = get_database()
        await db.notifications.update_one(
            {"_id": ObjectId(notification_id), "user_id": user_id},
            {"$set": {"is_read": True}}
        )

    @staticmethod
    async def mark_all_as_read(user_id: str):
        """
        Marks all notifications for a user as read.
        """
        db = get_database()
        await db.notifications.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True}}
        )

    @staticmethod
    async def get_unread_count(user_id: str) -> int:
        """
        Gets the count of unread notifications for a user.
        """
        db = get_database()
        return await db.notifications.count_documents({"user_id": user_id, "is_read": False})
