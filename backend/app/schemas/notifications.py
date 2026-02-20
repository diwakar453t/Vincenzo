"""
Notification schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ─── Send / Create ──────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    notification_type: str = "info"
    priority: str = "medium"
    channel: str = "in_app"
    link: Optional[str] = None
    metadata_json: Optional[dict] = None


class NotificationBroadcast(BaseModel):
    title: str
    message: str
    notification_type: str = "announcement"
    priority: str = "medium"
    link: Optional[str] = None


# ─── Response ───────────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: int
    tenant_id: str
    user_id: int
    title: str
    message: str
    notification_type: str
    priority: str
    channel: str
    is_read: bool
    read_at: Optional[datetime] = None
    link: Optional[str] = None
    metadata_json: Optional[dict] = None
    sender_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


# ─── Preferences ────────────────────────────────────────────────────────

class PreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    attendance_alerts: Optional[bool] = None
    fee_reminders: Optional[bool] = None
    exam_notifications: Optional[bool] = None
    announcement_notifications: Optional[bool] = None
    leave_notifications: Optional[bool] = None
    report_notifications: Optional[bool] = None


class PreferenceResponse(BaseModel):
    id: int
    user_id: int
    email_enabled: bool
    sms_enabled: bool
    push_enabled: bool
    in_app_enabled: bool
    attendance_alerts: bool
    fee_reminders: bool
    exam_notifications: bool
    announcement_notifications: bool
    leave_notifications: bool
    report_notifications: bool

    class Config:
        from_attributes = True


class NotificationStats(BaseModel):
    total: int
    unread: int
    read: int
    by_type: List[dict]
    by_priority: List[dict]
