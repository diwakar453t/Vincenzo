"""
Notification Service
Handles sending, listing, marking read, broadcasting, preferences, and email/push stubs.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.notification import (
    Notification, NotificationPreference,
    NotificationType, NotificationChannel, NotificationPriority,
)
from app.models.user import User
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    # ─── Send ────────────────────────────────────────────────────────────

    def send_notification(self, data: dict, tenant_id: str, sender_id: int = None) -> dict:
        notif = Notification(
            user_id=data["user_id"],
            title=data["title"],
            message=data["message"],
            notification_type=data.get("notification_type", "info"),
            priority=data.get("priority", "medium"),
            channel=data.get("channel", "in_app"),
            link=data.get("link"),
            metadata_json=data.get("metadata_json"),
            sender_id=sender_id,
            tenant_id=tenant_id,
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(notif)

        # Dispatch to external channels
        channel = data.get("channel", "in_app")
        if channel == "email" or channel == "in_app":
            self._dispatch_email(notif)
        if channel == "push":
            self._dispatch_push(notif)
        if channel == "sms":
            self._dispatch_sms(notif)

        return self._notif_dict(notif)

    def broadcast(self, data: dict, tenant_id: str, sender_id: int) -> int:
        """Send notification to all active users in tenant."""
        users = self.db.query(User).filter(
            User.tenant_id == tenant_id, User.is_active == True
        ).all()
        count = 0
        for user in users:
            notif = Notification(
                user_id=user.id,
                title=data["title"],
                message=data["message"],
                notification_type=data.get("notification_type", "announcement"),
                priority=data.get("priority", "medium"),
                channel="in_app",
                link=data.get("link"),
                sender_id=sender_id,
                tenant_id=tenant_id,
            )
            self.db.add(notif)
            count += 1
        self.db.commit()
        return count

    # ─── List / Read ─────────────────────────────────────────────────────

    def get_notifications(self, user_id: int, tenant_id: str,
                          is_read: bool = None, notification_type: str = None,
                          limit: int = 50, offset: int = 0):
        q = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_active == True,
        )
        if is_read is not None:
            q = q.filter(Notification.is_read == is_read)
        if notification_type:
            q = q.filter(Notification.notification_type == notification_type)

        total = q.count()
        unread = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_active == True,
            Notification.is_read == False,
        ).count()
        notifications = q.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()
        return [self._notif_dict(n) for n in notifications], total, unread

    def mark_as_read(self, notification_id: int, user_id: int, tenant_id: str) -> dict:
        notif = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
        ).first()
        if not notif:
            raise ValueError("Notification not found")
        notif.is_read = True
        notif.read_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(notif)
        return self._notif_dict(notif)

    def mark_all_read(self, user_id: int, tenant_id: str) -> int:
        result = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_read == False,
            Notification.is_active == True,
        ).update({
            Notification.is_read: True,
            Notification.read_at: datetime.utcnow(),
        })
        self.db.commit()
        return result

    def delete_notification(self, notification_id: int, user_id: int, tenant_id: str):
        notif = self.db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
        ).first()
        if not notif:
            raise ValueError("Notification not found")
        notif.is_active = False
        self.db.commit()

    def clear_all(self, user_id: int, tenant_id: str) -> int:
        result = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_active == True,
        ).update({Notification.is_active: False})
        self.db.commit()
        return result

    # ─── Stats ───────────────────────────────────────────────────────────

    def get_stats(self, user_id: int, tenant_id: str) -> dict:
        base = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_active == True,
        )
        total = base.count()
        unread = base.filter(Notification.is_read == False).count()

        type_breakdown = self.db.query(
            Notification.notification_type, func.count(Notification.id)
        ).filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_active == True,
        ).group_by(Notification.notification_type).all()

        priority_breakdown = self.db.query(
            Notification.priority, func.count(Notification.id)
        ).filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_active == True,
        ).group_by(Notification.priority).all()

        return {
            "total": total, "unread": unread, "read": total - unread,
            "by_type": [{"type": str(t.value if hasattr(t, 'value') else t), "count": c} for t, c in type_breakdown],
            "by_priority": [{"priority": str(p.value if hasattr(p, 'value') else p), "count": c} for p, c in priority_breakdown],
        }

    # ─── Preferences ─────────────────────────────────────────────────────

    def get_preferences(self, user_id: int, tenant_id: str) -> dict:
        pref = self.db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id,
        ).first()
        if not pref:
            pref = NotificationPreference(user_id=user_id, tenant_id=tenant_id)
            self.db.add(pref)
            self.db.commit()
            self.db.refresh(pref)
        return self._pref_dict(pref)

    def update_preferences(self, user_id: int, tenant_id: str, data: dict) -> dict:
        pref = self.db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id,
        ).first()
        if not pref:
            pref = NotificationPreference(user_id=user_id, tenant_id=tenant_id)
            self.db.add(pref)
            self.db.commit()
            self.db.refresh(pref)

        for key, val in data.items():
            if val is not None and hasattr(pref, key):
                setattr(pref, key, val)
        self.db.commit()
        self.db.refresh(pref)
        return self._pref_dict(pref)

    # ─── External dispatch stubs ─────────────────────────────────────────

    def _dispatch_email(self, notif: Notification):
        """Stub for email dispatch — integrate SMTP/SendGrid/SES here."""
        logger.info(f"📧 Email notification queued: [{notif.title}] → user {notif.user_id}")

    def _dispatch_push(self, notif: Notification):
        """Stub for push notification — integrate FCM/APNS here."""
        logger.info(f"🔔 Push notification queued: [{notif.title}] → user {notif.user_id}")

    def _dispatch_sms(self, notif: Notification):
        """Stub for SMS — integrate Twilio/MSG91 here."""
        logger.info(f"📱 SMS notification queued: [{notif.title}] → user {notif.user_id}")

    # ─── Serializers ─────────────────────────────────────────────────────

    def _notif_dict(self, n: Notification) -> dict:
        return {
            "id": n.id, "tenant_id": n.tenant_id, "user_id": n.user_id,
            "title": n.title, "message": n.message,
            "notification_type": n.notification_type.value if hasattr(n.notification_type, 'value') else str(n.notification_type),
            "priority": n.priority.value if hasattr(n.priority, 'value') else str(n.priority),
            "channel": n.channel.value if hasattr(n.channel, 'value') else str(n.channel),
            "is_read": n.is_read, "read_at": n.read_at,
            "link": n.link, "metadata_json": n.metadata_json,
            "sender_id": n.sender_id, "is_active": n.is_active,
            "created_at": n.created_at, "updated_at": n.updated_at,
        }

    def _pref_dict(self, p: NotificationPreference) -> dict:
        return {
            "id": p.id, "user_id": p.user_id,
            "email_enabled": p.email_enabled, "sms_enabled": p.sms_enabled,
            "push_enabled": p.push_enabled, "in_app_enabled": p.in_app_enabled,
            "attendance_alerts": p.attendance_alerts, "fee_reminders": p.fee_reminders,
            "exam_notifications": p.exam_notifications,
            "announcement_notifications": p.announcement_notifications,
            "leave_notifications": p.leave_notifications,
            "report_notifications": p.report_notifications,
        }
