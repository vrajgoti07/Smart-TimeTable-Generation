from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.security import get_current_user
from app.services.notification_service import NotificationService

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_notifications(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all notifications for the current user.
    """
    return await NotificationService.get_user_notifications(current_user.get("user_id"))

@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """
    Get unread notification count.
    """
    count = await NotificationService.get_unread_count(current_user.get("user_id"))
    return {"count": count}

@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a specific notification as read.
    """
    await NotificationService.mark_as_read(notification_id, current_user.get("user_id"))
    return {"status": "success"}

@router.post("/read-all")
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user)
):
    """
    Mark all notifications for the current user as read.
    """
    await NotificationService.mark_all_as_read(current_user.get("user_id"))
    return {"status": "success"}
