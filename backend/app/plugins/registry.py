"""
Plugin Registry & Hook System
Central registry for all plugins, hook management, and event dispatch.
"""
import logging
from typing import Dict, List, Callable, Any, Optional
from collections import defaultdict
from app.plugins import PluginBase, PluginMetadata, PluginStatus, PluginContext

logger = logging.getLogger(__name__)


class PluginRegistry:
    """
    Central registry for plugin management.
    Handles registration, lifecycle, hook dispatch, and plugin state.
    """

    def __init__(self):
        self._plugins: Dict[str, PluginBase] = {}
        self._metadata: Dict[str, PluginMetadata] = {}
        self._status: Dict[str, PluginStatus] = {}
        self._hooks: Dict[str, List[dict]] = defaultdict(list)   # hook_type → [{callback, plugin_name}]
        self._errors: Dict[str, str] = {}
        self.context = PluginContext(self)
        logger.info("🔌 Plugin registry initialized")

    # ─── Plugin Registration ──────────────────────────────────────────

    def register(self, plugin: PluginBase) -> bool:
        """Register a plugin (does not activate it)."""
        try:
            meta = plugin.get_metadata()
            if meta.name in self._plugins:
                logger.warning(f"Plugin '{meta.name}' already registered")
                return False

            # Check dependencies
            for dep in meta.requires:
                if dep not in self._plugins or self._status.get(dep) != PluginStatus.active:
                    logger.error(f"Plugin '{meta.name}' requires '{dep}' which is not active")
                    self._errors[meta.name] = f"Missing dependency: {dep}"
                    return False

            self._plugins[meta.name] = plugin
            self._metadata[meta.name] = meta
            self._status[meta.name] = PluginStatus.installed

            # Load default config
            defaults = plugin.get_config_defaults()
            for k, v in defaults.items():
                self.context.set_config(meta.name, k, v)

            logger.info(f"🔌 Plugin registered: {meta.icon} {meta.name} v{meta.version}")
            return True
        except Exception as e:
            logger.error(f"Failed to register plugin: {e}")
            return False

    def unregister(self, plugin_name: str) -> bool:
        """Unregister and cleanup a plugin."""
        if plugin_name not in self._plugins:
            return False

        if self._status.get(plugin_name) == PluginStatus.active:
            self.deactivate(plugin_name)

        del self._plugins[plugin_name]
        del self._metadata[plugin_name]
        self._status[plugin_name] = PluginStatus.uninstalled
        self._errors.pop(plugin_name, None)
        logger.info(f"🗑️ Plugin unregistered: {plugin_name}")
        return True

    # ─── Lifecycle Management ─────────────────────────────────────────

    def activate(self, plugin_name: str) -> bool:
        """Activate a registered plugin."""
        if plugin_name not in self._plugins:
            return False

        plugin = self._plugins[plugin_name]
        try:
            plugin.activate(self.context)
            self._status[plugin_name] = PluginStatus.active

            # Register plugin's custom API routes
            routes = plugin.get_api_routes()
            if routes:
                self._register_plugin_routes(plugin_name, routes)

            logger.info(f"✅ Plugin activated: {plugin_name}")
            return True
        except Exception as e:
            self._status[plugin_name] = PluginStatus.error
            self._errors[plugin_name] = str(e)
            logger.error(f"❌ Plugin activation failed: {plugin_name} — {e}")
            return False

    def deactivate(self, plugin_name: str) -> bool:
        """Deactivate an active plugin."""
        if plugin_name not in self._plugins:
            return False

        plugin = self._plugins[plugin_name]
        try:
            plugin.deactivate(self.context)
            self.unregister_hooks(plugin_name)
            self._status[plugin_name] = PluginStatus.disabled
            logger.info(f"⏸️ Plugin deactivated: {plugin_name}")
            return True
        except Exception as e:
            self._errors[plugin_name] = str(e)
            logger.error(f"Plugin deactivation error: {plugin_name} — {e}")
            return False

    def activate_all(self):
        """Activate all registered plugins."""
        for name in list(self._plugins.keys()):
            if self._status.get(name) != PluginStatus.active:
                self.activate(name)

    def deactivate_all(self):
        """Deactivate all active plugins."""
        for name in list(self._plugins.keys()):
            if self._status.get(name) == PluginStatus.active:
                self.deactivate(name)

    # ─── Hook System ──────────────────────────────────────────────────

    def register_hook(self, hook_type: str, callback: Callable, plugin_name: str = ""):
        """Register a callback for a hook type."""
        self._hooks[hook_type].append({"callback": callback, "plugin_name": plugin_name})
        logger.debug(f"Hook registered: {hook_type} ← {plugin_name}")

    def unregister_hooks(self, plugin_name: str):
        """Remove all hooks for a specific plugin."""
        for hook_type in list(self._hooks.keys()):
            self._hooks[hook_type] = [
                h for h in self._hooks[hook_type] if h["plugin_name"] != plugin_name
            ]

    def emit_hook(self, hook_type: str, **kwargs):
        """Emit a hook event — calls all registered callbacks in order."""
        callbacks = self._hooks.get(hook_type, [])
        for hook in callbacks:
            try:
                hook["callback"](**kwargs)
            except Exception as e:
                logger.error(f"Hook error [{hook_type}] from '{hook['plugin_name']}': {e}")

    def get_hooks(self, hook_type: str) -> List[dict]:
        """Get all registered hooks for a type."""
        return self._hooks.get(hook_type, [])

    # ─── Query ────────────────────────────────────────────────────────

    def list_plugins(self) -> List[dict]:
        """List all plugins with their status."""
        result = []
        for name, meta in self._metadata.items():
            result.append({
                **meta.to_dict(),
                "status": self._status.get(name, PluginStatus.installed).value,
                "error": self._errors.get(name),
                "config": self.context.get_all_config(name),
            })
        return result

    def get_plugin(self, name: str) -> Optional[dict]:
        """Get plugin info by name."""
        if name not in self._metadata:
            return None
        meta = self._metadata[name]
        return {
            **meta.to_dict(),
            "status": self._status.get(name, PluginStatus.installed).value,
            "error": self._errors.get(name),
            "config": self.context.get_all_config(name),
        }

    def get_plugin_instance(self, name: str) -> Optional[PluginBase]:
        return self._plugins.get(name)

    def is_active(self, name: str) -> bool:
        return self._status.get(name) == PluginStatus.active

    def get_stats(self) -> dict:
        return {
            "total": len(self._plugins),
            "active": sum(1 for s in self._status.values() if s == PluginStatus.active),
            "disabled": sum(1 for s in self._status.values() if s == PluginStatus.disabled),
            "errors": sum(1 for s in self._status.values() if s == PluginStatus.error),
            "hooks_registered": sum(len(v) for v in self._hooks.values()),
        }

    # ─── Internal ─────────────────────────────────────────────────────

    def _register_plugin_routes(self, plugin_name: str, router):
        """Store plugin routes for later mounting."""
        # This is handled by the PluginService which mounts routes on the FastAPI app
        pass


# ─── Global Registry Singleton ────────────────────────────────────────────

_registry: Optional[PluginRegistry] = None


def get_plugin_registry() -> PluginRegistry:
    """Get the global plugin registry (singleton)."""
    global _registry
    if _registry is None:
        _registry = PluginRegistry()
    return _registry
