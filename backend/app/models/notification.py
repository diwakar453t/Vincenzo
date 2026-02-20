"""
Notification models
"""
import enum
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class NotificationType(str, enum.Enum):
    info = "info"
    success = "success"
    warning = "warning"
    error = "error"
    announcement = "announcement"
    reminder = "reminder"
    alert = "alert"


class NotificationChannel(str, enum.Enum):
    in_app = "in_app"
    email = "email"
    sms = "sms"
    push = "push"


class NotificationPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(Enum(NotificationType), default=NotificationType.info, nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.medium, nullable=False)
    channel = Column(Enum(NotificationChannel), default=NotificationChannel.in_app, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)
    link = Column(String(500), nullable=True)          # optional deep link
    metadata_json = Column(JSON, nullable=True)        # extra data (e.g. entity_type, entity_id)
    sender_id = Column(Integer, nullable=True)         # system or another user
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship("User", backref="notifications", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Notification(user={self.user_id}, title={self.title}, read={self.is_read})>"


class NotificationPreference(BaseModel):
    __tablename__ = "notification_preferences"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    email_enabled = Column(Boolean, default=True, nullable=False)
    sms_enabled = Column(Boolean, default=False, nullable=False)
    push_enabled = Column(Boolean, default=True, nullable=False)
    in_app_enabled = Column(Boolean, default=True, nullable=False)
    # granular preferences
    attendance_alerts = Column(Boolean, default=True, nullable=False)
    fee_reminders = Column(Boolean, default=True, nullable=False)
    exam_notifications = Column(Boolean, default=True, nullable=False)
    announcement_notifications = Column(Boolean, default=True, nullable=False)
    leave_notifications = Column(Boolean, default=True, nullable=False)
    report_notifications = Column(Boolean, default=True, nullable=False)

    user = relationship("User", backref="notification_preferences", foreign_keys=[user_id])

    def __repr__(self):
        return f"<NotificationPreference(user={self.user_id})>"
