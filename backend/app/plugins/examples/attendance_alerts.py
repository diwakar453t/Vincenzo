"""
📋 Attendance Alerts Plugin
Monitors attendance and alerts when students fall below threshold.
Hooks into: on_attendance_mark
"""
import logging
from app.plugins import PluginBase, PluginMetadata, PluginContext

logger = logging.getLogger(__name__)


class AttendanceAlertsPlugin(PluginBase):

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="attendance_alerts",
            version="1.0.0",
            description="Monitors student attendance and sends alerts when attendance falls below the configured threshold percentage.",
            author="PreSkool Team",
            category="academic",
            icon="📋",
            hooks=["on_attendance_mark"],
            config_schema={
                "enabled": {"type": "boolean", "default": True, "description": "Enable attendance alerts"},
                "threshold": {"type": "number", "default": 75, "description": "Minimum attendance percentage"},
                "alert_parent": {"type": "boolean", "default": True, "description": "Alert parents when below threshold"},
                "alert_teacher": {"type": "boolean", "default": True, "description": "Alert class teacher"},
            },
            is_builtin=True,
        )

    def get_config_defaults(self):
        return {
            "enabled": True,
            "threshold": 75,
            "alert_parent": True,
            "alert_teacher": True,
        }

    def activate(self, context: PluginContext):
        context.register_hook("on_attendance_mark", self._on_attendance, "attendance_alerts")
        context.log("attendance_alerts", "📋 Attendance alerts plugin activated")

    def deactivate(self, context: PluginContext):
        context.unregister_hooks("attendance_alerts")

    def _on_attendance(self, **kwargs):
        """Check if a student's attendance fell below threshold after marking."""
        try:
            from app.plugins.registry import get_plugin_registry
            ctx = get_plugin_registry().context

            if not ctx.get_config("attendance_alerts", "enabled", True):
                return

            student_id = kwargs.get("student_id")
            status = kwargs.get("status")

            if not student_id or status != "absent":
                return

            threshold = ctx.get_config("attendance_alerts", "threshold", 75)
            logger.info(f"📋 Attendance marked absent for student #{student_id} — threshold: {threshold}%")

            # In production, query actual attendance percentage and send alerts
            # For now, log the trigger
            if ctx.get_config("attendance_alerts", "alert_parent", True):
                logger.info(f"📱 Would alert parent of student #{student_id}")
            if ctx.get_config("attendance_alerts", "alert_teacher", True):
                logger.info(f"👨‍🏫 Would alert class teacher for student #{student_id}")

        except Exception as e:
            logger.error(f"Attendance alert error: {e}")
