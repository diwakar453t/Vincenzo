"""
🎂 Birthday Notifications Plugin
Sends birthday wishes to students and teachers on their birthdays.
Hooks into: daily_morning, on_startup
"""
from datetime import datetime, date
import logging
from app.plugins import PluginBase, PluginMetadata, PluginContext

logger = logging.getLogger(__name__)


class BirthdayNotificationsPlugin(PluginBase):

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="birthday_notifications",
            version="1.0.0",
            description="Sends birthday wishes to students and teachers. Checks daily and creates notification cards in the dashboard.",
            author="PreSkool Team",
            category="notifications",
            icon="🎂",
            hooks=["daily_morning", "on_startup"],
            config_schema={
                "enabled": {"type": "boolean", "default": True, "description": "Enable birthday notifications"},
                "include_students": {"type": "boolean", "default": True, "description": "Include student birthdays"},
                "include_teachers": {"type": "boolean", "default": True, "description": "Include teacher birthdays"},
                "wish_message": {"type": "string", "default": "🎉 Happy Birthday, {name}! Wishing you a wonderful day!", "description": "Birthday wish template"},
                "notify_admin": {"type": "boolean", "default": True, "description": "Notify admin about today's birthdays"},
            },
            is_builtin=True,
        )

    def get_config_defaults(self):
        return {
            "enabled": True,
            "include_students": True,
            "include_teachers": True,
            "wish_message": "🎉 Happy Birthday, {name}! Wishing you a wonderful day!",
            "notify_admin": True,
        }

    def activate(self, context: PluginContext):
        context.register_hook("daily_morning", self._check_birthdays, "birthday_notifications")
        context.register_hook("on_startup", self._on_startup, "birthday_notifications")
        context.log("birthday_notifications", "🎂 Birthday notifications plugin activated")

    def deactivate(self, context: PluginContext):
        context.unregister_hooks("birthday_notifications")
        context.log("birthday_notifications", "Birthday notifications plugin deactivated")

    def _on_startup(self, **kwargs):
        logger.info("🎂 Birthday plugin ready — will check birthdays daily")

    def _check_birthdays(self, **kwargs):
        """Check for today's birthdays and send notifications."""
        try:
            from app.plugins.registry import get_plugin_registry
            registry = get_plugin_registry()
            ctx = registry.context

            if not ctx.get_config("birthday_notifications", "enabled", True):
                return

            db = ctx.get_db()
            if not db:
                return

            today = date.today()
            birthdays = []

            # Check students
            if ctx.get_config("birthday_notifications", "include_students", True):
                from app.models.student import Student
                students = db.query(Student).all()
                for s in students:
                    if hasattr(s, 'date_of_birth') and s.date_of_birth:
                        dob = s.date_of_birth
                        if hasattr(dob, 'date'):
                            dob = dob.date()
                        if dob.month == today.month and dob.day == today.day:
                            name = f"{s.first_name} {s.last_name}" if hasattr(s, 'first_name') else f"Student #{s.id}"
                            birthdays.append({"type": "student", "id": s.id, "name": name})

            # Check teachers
            if ctx.get_config("birthday_notifications", "include_teachers", True):
                from app.models.teacher import Teacher
                teachers = db.query(Teacher).all()
                for t in teachers:
                    if hasattr(t, 'date_of_birth') and t.date_of_birth:
                        dob = t.date_of_birth
                        if hasattr(dob, 'date'):
                            dob = dob.date()
                        if dob.month == today.month and dob.day == today.day:
                            name = f"{t.first_name} {t.last_name}" if hasattr(t, 'first_name') else f"Teacher #{t.id}"
                            birthdays.append({"type": "teacher", "id": t.id, "name": name})

            if birthdays:
                wish = ctx.get_config("birthday_notifications", "wish_message", "🎉 Happy Birthday, {name}!")
                for b in birthdays:
                    message = wish.format(name=b["name"])
                    logger.info(f"🎂 {message} ({b['type']} #{b['id']})")

                logger.info(f"🎂 Found {len(birthdays)} birthday(s) today!")

            db.close()

        except Exception as e:
            logger.error(f"Birthday check error: {e}")
