"""
Notifications API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.notifications import (
    NotificationCreate, NotificationBroadcast, NotificationResponse,
    NotificationListResponse, PreferenceUpdate, PreferenceResponse,
    NotificationStats,
)
from app.services.notification_service import NotificationService

router = APIRouter()


def _get_user(current_user: dict, db: Session) -> User:
    user = db.query(User).filter(User.id == int(current_user.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ═══════════════════════════════════════════════════════════════════════
# Send / Broadcast
# ═══════════════════════════════════════════════════════════════════════

@router.post("/send", response_model=NotificationResponse)
def send_notification(data: NotificationCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    result = NotificationService(db).send_notification(data.model_dump(), user.tenant_id, sender_id=user.id)
    return NotificationResponse(**result)


@router.post("/broadcast")
def broadcast_notification(data: NotificationBroadcast, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    if user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    count = NotificationService(db).broadcast(data.model_dump(), user.tenant_id, sender_id=user.id)
    return {"message": f"Notification sent to {count} users", "count": count}


# ═══════════════════════════════════════════════════════════════════════
# List / Get
# ═══════════════════════════════════════════════════════════════════════

@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    is_read: Optional[bool] = None,
    notification_type: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user), db: Session = Depends(get_db),
):
    user = _get_user(current_user, db)
    notifications, total, unread = NotificationService(db).get_notifications(
        user.id, user.tenant_id, is_read=is_read,
        notification_type=notification_type, limit=limit, offset=offset,
    )
    return NotificationListResponse(
        notifications=[NotificationResponse(**n) for n in notifications],
        total=total, unread_count=unread,
    )


@router.get("/unread-count")
def unread_count(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    _, _, unread = NotificationService(db).get_notifications(user.id, user.tenant_id, is_read=False, limit=0)
    return {"unread_count": unread}


@router.get("/stats", response_model=NotificationStats)
def notification_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    return NotificationStats(**NotificationService(db).get_stats(user.id, user.tenant_id))


# ═══════════════════════════════════════════════════════════════════════
# Mark Read / Delete
# ═══════════════════════════════════════════════════════════════════════

@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(notification_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    try:
        result = NotificationService(db).mark_as_read(notification_id, user.id, user.tenant_id)
        return NotificationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/read-all")
def mark_all_read(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    count = NotificationService(db).mark_all_read(user.id, user.tenant_id)
    return {"message": f"{count} notifications marked as read", "count": count}


@router.delete("/{notification_id}")
def delete_notification(notification_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    try:
        NotificationService(db).delete_notification(notification_id, user.id, user.tenant_id)
        return {"message": "Notification deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/clear-all")
def clear_all(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    count = NotificationService(db).clear_all(user.id, user.tenant_id)
    return {"message": f"{count} notifications cleared", "count": count}


# ═══════════════════════════════════════════════════════════════════════
# Preferences
# ═══════════════════════════════════════════════════════════════════════

@router.get("/preferences", response_model=PreferenceResponse)
def get_preferences(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    pref = NotificationService(db).get_preferences(user.id, user.tenant_id)
    return PreferenceResponse(**pref)


@router.put("/preferences", response_model=PreferenceResponse)
def update_preferences(data: PreferenceUpdate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_user(current_user, db)
    pref = NotificationService(db).update_preferences(user.id, user.tenant_id, data.model_dump(exclude_unset=True))
    return PreferenceResponse(**pref)
