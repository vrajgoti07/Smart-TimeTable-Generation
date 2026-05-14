from datetime import datetime, timezone
from typing import List, Optional
from app.database import get_database

class ActivityService:
    @staticmethod
    async def log_activity(action: str, user: str = "System", type: str = "info"):
        """
        Logs a new system activity.
        """
        db = get_database()
        activity = {
            "action": action,
            "user": user,
            "type": type,  # success, info, warning, error
            "created_at": datetime.now(timezone.utc)
        }
        await db.activities.insert_one(activity)

    @staticmethod
    async def get_recent_activities(limit: int = 10) -> List[dict]:
        """
        Fetches the latest global activities.
        """
        db = get_database()
        cursor = db.activities.find().sort("created_at", -1).limit(limit)
        activities = await cursor.to_list(length=limit)
        
        # Format for frontend
        formatted = []
        now = datetime.now(timezone.utc)
        for a in activities:
            time_diff = now - a["created_at"].replace(tzinfo=timezone.utc)
            
            # Simple time formatting
            if time_diff.total_seconds() < 60:
                time_str = "Just now"
            elif time_diff.total_seconds() < 3600:
                time_str = f"{int(time_diff.total_seconds() // 60)}m ago"
            elif time_diff.total_seconds() < 86400:
                time_str = f"{int(time_diff.total_seconds() // 3600)}h ago"
            else:
                time_str = a["created_at"].strftime("%b %d")
                
            formatted.append({
                "action": a["action"],
                "user": a["user"],
                "time": time_str,
                "type": a.get("type", "info")
            })
            
        return formatted
