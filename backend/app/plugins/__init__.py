"""
Plugin system — base interface, lifecycle, and hooks
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PluginStatus(str, Enum):
    installed = "installed"
    active = "active"
    disabled = "disabled"
    error = "error"
    uninstalled = "uninstalled"


class HookType(str, Enum):
    """Predefined hook points in the application lifecycle."""
    # App lifecycle
    on_startup = "on_startup"
    on_shutdown = "on_shutdown"

    # Auth
    on_login = "on_login"
    on_logout = "on_logout"
    on_register = "on_register"

    # Student
    on_student_create = "on_student_create"
    on_student_update = "on_student_update"
    on_student_delete = "on_student_delete"

    # Teacher
    on_teacher_create = "on_teacher_create"
    on_teacher_update = "on_teacher_update"

    # Fee / Payment
    on_fee_collect = "on_fee_collect"
    on_payment_complete = "on_payment_complete"
    on_payment_refund = "on_payment_refund"

    # Attendance
    on_attendance_mark = "on_attendance_mark"

    # Notification
    on_notification_send = "on_notification_send"

    # Custom (for plugins to define their own)
    custom = "custom"

    # Scheduled (cron-like)
    daily_midnight = "daily_midnight"
    daily_morning = "daily_morning"


@dataclass
class PluginMetadata:
    """Plugin descriptor / manifest."""
    name: str
    version: str
    description: str
    author: str = "PreSkool Team"
    category: str = "general"
    icon: str = "🔌"
    requires: List[str] = field(default_factory=list)     # dependency plugins
    hooks: List[str] = field(default_factory=list)         # hooks this plugin binds to
    config_schema: Dict[str, Any] = field(default_factory=dict)  # configurable keys
    is_builtin: bool = False
    min_version: str = "1.0.0"

    def to_dict(self) -> dict:
        return {
            "name": self.name, "version": self.version, "description": self.description,
            "author": self.author, "category": self.category, "icon": self.icon,
            "requires": self.requires, "hooks": self.hooks,
            "config_schema": self.config_schema, "is_builtin": self.is_builtin,
            "min_version": self.min_version,
        }


class PluginBase(ABC):
    """
    Abstract base class for all plugins.
    Every plugin must subclass this and implement metadata + activate/deactivate.
    """

    @abstractmethod
    def get_metadata(self) -> PluginMetadata:
        """Return plugin metadata/manifest."""
        ...

    @abstractmethod
    def activate(self, context: "PluginContext") -> None:
        """Called when the plugin is activated. Register hooks here."""
        ...

    @abstractmethod
    def deactivate(self, context: "PluginContext") -> None:
        """Called when the plugin is deactivated. Cleanup here."""
        ...

    def get_config_defaults(self) -> Dict[str, Any]:
        """Return default configuration values."""
        return {}

    def on_config_change(self, key: str, value: Any) -> None:
        """Called when a config value changes."""
        pass

    def get_api_routes(self):
        """Return a FastAPI APIRouter if this plugin exposes custom endpoints."""
        return None

    def get_admin_ui(self) -> Optional[dict]:
        """Return admin UI component info (for frontend plugin rendering)."""
        return None


class PluginContext:
    """
    Context object passed to plugins — provides access to app services,
    hook registration, config, and DB session factory.
    """

    def __init__(self, registry: "PluginRegistry"):
        self.registry = registry
        self._config: Dict[str, Dict[str, Any]] = {}      # plugin_name → config
        self._db_factory = None

    def set_db_factory(self, factory):
        """Set the database session factory."""
        self._db_factory = factory

    def get_db(self):
        """Get a new database session."""
        if self._db_factory:
            return self._db_factory()
        return None

    def register_hook(self, hook_type: str, callback: Callable, plugin_name: str = ""):
        """Register a hook callback."""
        self.registry.register_hook(hook_type, callback, plugin_name)

    def unregister_hooks(self, plugin_name: str):
        """Remove all hooks for a plugin."""
        self.registry.unregister_hooks(plugin_name)

    def get_config(self, plugin_name: str, key: str, default: Any = None) -> Any:
        """Get a plugin config value."""
        return self._config.get(plugin_name, {}).get(key, default)

    def set_config(self, plugin_name: str, key: str, value: Any):
        """Set a plugin config value."""
        if plugin_name not in self._config:
            self._config[plugin_name] = {}
        self._config[plugin_name][key] = value

    def get_all_config(self, plugin_name: str) -> dict:
        return self._config.get(plugin_name, {})

    def emit(self, hook_type: str, **kwargs):
        """Emit a hook event (trigger all registered callbacks)."""
        self.registry.emit_hook(hook_type, **kwargs)

    def log(self, plugin_name: str, message: str, level: str = "info"):
        """Structured logging for plugins."""
        getattr(logger, level, logger.info)(f"[Plugin:{plugin_name}] {message}")
