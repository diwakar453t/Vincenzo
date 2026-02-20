"""
Plugin Loader — discovers and loads plugins from the filesystem and built-in examples.
"""
import os
import importlib
import importlib.util
import logging
from typing import List
from app.plugins import PluginBase
from app.plugins.registry import get_plugin_registry

logger = logging.getLogger(__name__)


class PluginLoader:
    """
    Discovers and loads plugins from:
    1. Built-in examples (app/plugins/examples/)
    2. Custom plugin directory (configurable, default: plugins/)
    """

    def __init__(self, custom_plugin_dir: str = None):
        self.registry = get_plugin_registry()
        self.builtin_dir = os.path.join(os.path.dirname(__file__), "examples")
        self.custom_dir = custom_plugin_dir or os.path.join(os.getcwd(), "plugins")
        self._loaded_modules: dict = {}

    def discover_and_load(self, auto_activate: bool = True) -> List[str]:
        """Discover and load all plugins. Returns list of loaded plugin names."""
        loaded = []

        # 1. Load built-in plugins
        loaded.extend(self._load_from_directory(self.builtin_dir, is_builtin=True))

        # 2. Load custom plugins
        if os.path.exists(self.custom_dir):
            loaded.extend(self._load_from_directory(self.custom_dir, is_builtin=False))
        else:
            logger.debug(f"Custom plugin directory not found: {self.custom_dir}")

        # 3. Auto-activate
        if auto_activate:
            self.registry.activate_all()

        logger.info(f"🔌 Plugin loader: {len(loaded)} plugins loaded")
        return loaded

    def load_single(self, module_path: str, auto_activate: bool = True) -> bool:
        """Load a single plugin by module path."""
        try:
            plugin_class = self._import_plugin_class(module_path)
            if not plugin_class:
                return False

            plugin = plugin_class()
            success = self.registry.register(plugin)
            if success and auto_activate:
                meta = plugin.get_metadata()
                self.registry.activate(meta.name)
            return success
        except Exception as e:
            logger.error(f"Failed to load plugin from {module_path}: {e}")
            return False

    def _load_from_directory(self, directory: str, is_builtin: bool = False) -> List[str]:
        """Load all plugins from a directory."""
        loaded = []
        if not os.path.exists(directory):
            return loaded

        for filename in sorted(os.listdir(directory)):
            if filename.endswith(".py") and not filename.startswith("_"):
                filepath = os.path.join(directory, filename)
                try:
                    plugin_class = self._import_plugin_from_file(filepath, filename)
                    if plugin_class:
                        plugin = plugin_class()
                        meta = plugin.get_metadata()
                        if is_builtin:
                            meta.is_builtin = True
                        if self.registry.register(plugin):
                            loaded.append(meta.name)
                except Exception as e:
                    logger.error(f"Error loading plugin from {filename}: {e}")

        return loaded

    def _import_plugin_from_file(self, filepath: str, filename: str):
        """Import a plugin class from a .py file."""
        module_name = f"plugin_{filename[:-3]}"
        spec = importlib.util.spec_from_file_location(module_name, filepath)
        if not spec or not spec.loader:
            return None

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self._loaded_modules[module_name] = module

        # Look for a class that subclasses PluginBase
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if (isinstance(attr, type) and issubclass(attr, PluginBase) and attr is not PluginBase):
                return attr

        logger.warning(f"No PluginBase subclass found in {filename}")
        return None

    def _import_plugin_class(self, module_path: str):
        """Import plugin class from a dotted module path."""
        try:
            module = importlib.import_module(module_path)
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (isinstance(attr, type) and issubclass(attr, PluginBase) and attr is not PluginBase):
                    return attr
            return None
        except ImportError as e:
            logger.error(f"Import error: {module_path} — {e}")
            return None

    def reload_plugin(self, plugin_name: str) -> bool:
        """Reload a plugin (deactivate, unregister, re-import, register, activate)."""
        plugin = self.registry.get_plugin_instance(plugin_name)
        if not plugin:
            return False

        self.registry.unregister(plugin_name)

        # Re-import from cached module
        for mod_name, mod in self._loaded_modules.items():
            for attr_name in dir(mod):
                attr = getattr(mod, attr_name)
                if isinstance(attr, type) and issubclass(attr, PluginBase) and attr is not PluginBase:
                    meta = attr().get_metadata()
                    if meta.name == plugin_name:
                        importlib.reload(mod)
                        new_class = getattr(mod, attr_name)
                        new_plugin = new_class()
                        self.registry.register(new_plugin)
                        self.registry.activate(plugin_name)
                        logger.info(f"🔄 Plugin reloaded: {plugin_name}")
                        return True
        return False
