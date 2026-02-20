"""
Plugin Service — manages plugins via API with DB persistence
"""
import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.plugin import PluginRecord
from app.plugins.registry import get_plugin_registry

logger = logging.getLogger(__name__)


class PluginService:
    def __init__(self, db: Session):
        self.db = db
        self.registry = get_plugin_registry()

    def list_plugins(self, tenant_id: str) -> list:
        """List all plugins (merge in-memory registry + DB records)."""
        registry_plugins = self.registry.list_plugins()

        # Sync registry → DB
        for rp in registry_plugins:
            record = self.db.query(PluginRecord).filter(PluginRecord.name == rp["name"]).first()
            if not record:
                record = PluginRecord(
                    tenant_id=tenant_id, name=rp["name"], version=rp["version"],
                    description=rp["description"], author=rp["author"],
                    category=rp["category"], icon=rp["icon"],
                    status=rp["status"], config=rp.get("config"),
                    is_builtin=rp.get("is_builtin", False),
                    error_message=rp.get("error"),
                )
                self.db.add(record)
            else:
                record.status = rp["status"]
                record.error_message = rp.get("error")
                record.config = rp.get("config")
            self.db.commit()

        return registry_plugins

    def get_plugin(self, name: str) -> dict:
        info = self.registry.get_plugin(name)
        if not info:
            raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")
        return info

    def activate_plugin(self, name: str, tenant_id: str) -> dict:
        if not self.registry.activate(name):
            raise HTTPException(status_code=400, detail=f"Failed to activate '{name}'")
        self._sync_status(name, tenant_id)
        return self.get_plugin(name)

    def deactivate_plugin(self, name: str, tenant_id: str) -> dict:
        if not self.registry.deactivate(name):
            raise HTTPException(status_code=400, detail=f"Failed to deactivate '{name}'")
        self._sync_status(name, tenant_id)
        return self.get_plugin(name)

    def uninstall_plugin(self, name: str, tenant_id: str):
        info = self.registry.get_plugin(name)
        if info and info.get("is_builtin"):
            raise HTTPException(status_code=400, detail="Cannot uninstall built-in plugins")
        self.registry.unregister(name)
        record = self.db.query(PluginRecord).filter(PluginRecord.name == name).first()
        if record:
            record.status = "uninstalled"
            record.is_active = False
            self.db.commit()

    def update_config(self, name: str, tenant_id: str, config: dict) -> dict:
        plugin = self.registry.get_plugin_instance(name)
        if not plugin:
            raise HTTPException(status_code=404, detail=f"Plugin '{name}' not found")

        for k, v in config.items():
            self.registry.context.set_config(name, k, v)
            plugin.on_config_change(k, v)

        record = self.db.query(PluginRecord).filter(PluginRecord.name == name).first()
        if record:
            record.config = self.registry.context.get_all_config(name)
            self.db.commit()

        return self.get_plugin(name)

    def get_stats(self) -> dict:
        return self.registry.get_stats()

    def get_available_hooks(self) -> list:
        from app.plugins import HookType
        return [{"name": h.value, "key": h.name} for h in HookType]

    def emit_hook(self, hook_type: str, **kwargs):
        self.registry.emit_hook(hook_type, **kwargs)

    def _sync_status(self, name: str, tenant_id: str):
        info = self.registry.get_plugin(name)
        if not info:
            return
        record = self.db.query(PluginRecord).filter(PluginRecord.name == name).first()
        if record:
            record.status = info["status"]
            record.error_message = info.get("error")
            self.db.commit()
