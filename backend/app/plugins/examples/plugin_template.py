"""
📌 Plugin Template
Copy this file to create a new plugin. Rename the class and update metadata.
"""
import logging
from app.plugins import PluginBase, PluginMetadata, PluginContext

logger = logging.getLogger(__name__)


class MyCustomPlugin(PluginBase):
    """
    A template plugin that you can copy and customize.

    Steps to create your own plugin:
    1. Copy this file to app/plugins/examples/ or a custom plugins/ directory
    2. Rename the class (e.g., MyAwesomePlugin)
    3. Update get_metadata() with your plugin info
    4. Add config defaults in get_config_defaults()
    5. Register hooks in activate()
    6. Implement your hook callbacks
    7. The plugin loader will auto-discover and load it
    """

    def get_metadata(self) -> PluginMetadata:
        return PluginMetadata(
            name="my_custom_plugin",
            version="1.0.0",
            description="A template plugin — customize this for your needs.",
            author="Your Name",
            category="general",
            icon="📌",
            hooks=["on_startup"],
            config_schema={
                "enabled": {"type": "boolean", "default": True, "description": "Enable this plugin"},
                "greeting": {"type": "string", "default": "Hello from plugin!", "description": "Custom greeting message"},
            },
            is_builtin=True,
        )

    def get_config_defaults(self):
        return {
            "enabled": True,
            "greeting": "Hello from plugin!",
        }

    def activate(self, context: PluginContext):
        """Called when the plugin is activated. Register your hooks here."""
        context.register_hook("on_startup", self._on_startup, "my_custom_plugin")
        context.log("my_custom_plugin", "📌 Custom plugin activated!")

    def deactivate(self, context: PluginContext):
        """Called when the plugin is deactivated. Cleanup here."""
        context.unregister_hooks("my_custom_plugin")
        context.log("my_custom_plugin", "Custom plugin deactivated")

    def _on_startup(self, **kwargs):
        """Example hook callback — runs on app startup."""
        from app.plugins.registry import get_plugin_registry
        ctx = get_plugin_registry().context
        greeting = ctx.get_config("my_custom_plugin", "greeting", "Hello!")
        logger.info(f"📌 {greeting}")

    def on_config_change(self, key: str, value):
        """Called when a config value changes via the admin UI."""
        logger.info(f"📌 Config changed: {key} = {value}")
