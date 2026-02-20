# Plugin Development Guide — PreSkool ERP

This guide shows you how to build, test, and deploy a PreSkool ERP plugin using the microkernel plugin system.

---

## Overview

Plugins extend PreSkool without touching core code. They:
- Register for **lifecycle hooks** (18 available events)
- Can access the **database** via the plugin context
- Can be **activated/deactivated** at runtime from the Admin UI
- Can have **configurable parameters** managed from the admin panel

---

## Plugin File Location

All plugins live in:
```
backend/app/plugins/
```

One Python file = one plugin. The filename becomes the plugin identifier.

---

## Complete Plugin Template

Copy `app/plugins/plugin_template.py` as your starting point:

```python
"""
MyPlugin — description of what this plugin does.
"""
from app.plugins import PluginBase, PluginMetadata, PluginContext, HookType
import logging


class MyPlugin(PluginBase):
    """
    Main plugin class. Must inherit from PluginBase.
    The class name doesn't matter — metadata.name is the identifier.
    """
    
    # ── Metadata (required) ─────────────────────────────────────────────
    metadata = PluginMetadata(
        name="my_plugin",              # Unique identifier, lowercase_snake
        version="1.0.0",              # Semantic versioning
        description="Short description shown in admin panel",
        author="Your Name <email>",
        dependencies=[],              # Other plugin names that must be active
    )
    
    # ── Lifecycle ────────────────────────────────────────────────────────
    
    def setup(self, context: PluginContext) -> None:
        """
        Called when plugin is activated.
        Initialize resources, read config, set up connections.
        """
        self.context = context
        self.logger = context.logger or logging.getLogger(__name__)
        
        # Read configuration (set default if not configured)
        self.alert_threshold = context.get_config("alert_threshold", default=3)
        self.enabled_roles = context.get_config("enabled_roles", default=["admin"])
        
        self.logger.info(f"MyPlugin v{self.metadata.version} activated")
    
    def teardown(self) -> None:
        """
        Called when plugin is deactivated or app shuts down.
        Close connections, release resources.
        """
        self.logger.info("MyPlugin deactivated")
    
    # ── Hook Handler ─────────────────────────────────────────────────────
    
    def execute_hook(self, hook: HookType, **data) -> None:
        """
        Called by the PluginRegistry for every event this plugin
        is subscribed to. Use a series of if/elif blocks to route
        different hooks to different handlers.
        """
        try:
            if hook == HookType.AFTER_STUDENT_CREATE:
                self._on_student_created(data)
            
            elif hook == HookType.AFTER_ATTENDANCE_MARK:
                self._on_attendance_marked(data)
            
            elif hook == HookType.DAILY_DIGEST:
                self._run_daily_tasks()
        
        except Exception as e:
            # Never raise from execute_hook — log and continue
            self.logger.error(f"MyPlugin hook {hook} failed: {e}")
    
    # ── Private Handlers ──────────────────────────────────────────────────
    
    def _on_student_created(self, data: dict) -> None:
        """Handle AFTER_STUDENT_CREATE hook."""
        student = data.get("student")
        if not student:
            return
        
        # Get a database session from context
        db = self.context.get_db()
        try:
            # Do your database operations here
            pass
        finally:
            db.close()  # Always close!
    
    def _on_attendance_marked(self, data: dict) -> None:
        """Handle AFTER_ATTENDANCE_MARK hook."""
        absent_students = data.get("absent_students", [])
        class_id = data.get("class_id")
        date = data.get("date")
        
        if len(absent_students) >= self.alert_threshold:
            self._send_alert(absent_students, class_id, date)
    
    def _run_daily_tasks(self) -> None:
        """Handle DAILY_DIGEST hook — runs every day."""
        self.logger.info("Running daily tasks...")
    
    def _send_alert(self, students, class_id, date):
        """Example notification helper."""
        db = self.context.get_db()
        try:
            from app.models.notification import Notification
            for student in students:
                notif = Notification(
                    user_id=student.parent_id,
                    title="Attendance Alert",
                    message=f"{student.full_name} was absent on {date}",
                    notification_type="warning",
                )
                db.add(notif)
            db.commit()
        finally:
            db.close()
```

---

## Available Hook Types

```python
from app.plugins import HookType

# Student lifecycle
HookType.BEFORE_STUDENT_CREATE    # data: { student_data: dict }
HookType.AFTER_STUDENT_CREATE     # data: { student: Student }

# Attendance
HookType.BEFORE_ATTENDANCE_MARK   # data: { class_id, date, records }
HookType.AFTER_ATTENDANCE_MARK    # data: { class_id, date, absent_students }

# Exams
HookType.BEFORE_EXAM_CREATE       # data: { exam_data: dict }
HookType.AFTER_EXAM_CREATE        # data: { exam: Exam }

# Payments
HookType.BEFORE_FEE_PAYMENT       # data: { amount, fee_invoice_id }
HookType.AFTER_FEE_PAYMENT        # data: { payment: PaymentTransaction }

# Grades
HookType.BEFORE_GRADE_SUBMIT      # data: { grade_data }
HookType.AFTER_GRADE_SUBMIT       # data: { grade: Grade }

# Leave
HookType.BEFORE_LEAVE_REQUEST     # data: { leave_data }
HookType.AFTER_LEAVE_APPROVE      # data: { leave: LeaveRequest }

# Scheduled
HookType.DAILY_DIGEST             # data: { date: str }
HookType.WEEKLY_REPORT            # data: { week_start: str }

# Auth
HookType.USER_LOGIN               # data: { user: User }
HookType.USER_LOGOUT              # data: { user_id: int }

# System
HookType.SYSTEM_STARTUP           # data: {}
HookType.SYSTEM_SHUTDOWN          # data: {}
```

---

## Plugin Configuration

Plugins can define configurable settings. Admins manage them via the Plugins page.

### Reading config:
```python
def setup(self, context):
    self.threshold = context.get_config("threshold", default=5)
    self.template_id = context.get_config("email_template", default="default")
```

### Updating config via API:
```http
PUT /api/v1/plugins/my_plugin/config
{
  "threshold": 10,
  "email_template": "custom_v2"
}
```

---

## Testing Your Plugin

```python
# backend/app/tests/test_my_plugin.py
import pytest
from unittest.mock import MagicMock, patch
from app.plugins import HookType, PluginContext
from app.plugins.my_plugin import MyPlugin


@pytest.fixture
def plugin():
    ctx = MagicMock(spec=PluginContext)
    ctx.get_config.return_value = 3
    ctx.logger = MagicMock()
    p = MyPlugin()
    p.setup(ctx)
    return p


def test_plugin_activates():
    ctx = MagicMock(spec=PluginContext)
    ctx.get_config.return_value = 3
    ctx.logger = MagicMock()
    p = MyPlugin()
    p.setup(ctx)
    assert p.alert_threshold == 3


def test_attendance_hook_fires(plugin):
    mock_students = [MagicMock(parent_id=1, full_name="Alice")]
    with patch.object(plugin, '_send_alert') as mock_alert:
        plugin.execute_hook(
            HookType.AFTER_ATTENDANCE_MARK,
            absent_students=mock_students * 5,
            class_id=1,
            date="2026-02-20"
        )
        mock_alert.assert_called_once()
```

---

## Activate and Test

```bash
# Start the backend
cd backend && uvicorn app.main:app --reload

# Your plugin is auto-discovered and activated on startup!
# Check logs:
# INFO: 🔌 Plugins loaded: ['birthday_notifications', 'attendance_alerts', 'my_plugin']

# Activate/deactivate from Admin UI or via API:
curl -X POST http://localhost:8000/api/v1/plugins/my_plugin/activate \
  -H "Authorization: Bearer <admin_token>"
```
