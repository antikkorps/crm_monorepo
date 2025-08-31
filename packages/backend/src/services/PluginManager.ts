import * as fs from "fs/promises"
import * as path from "path"
import {
  BUILT_IN_HOOKS,
  Plugin,
  PluginContext,
  PluginHookManager,
  PluginInstance,
  PluginLoader,
  PluginManager,
  PluginRegistry,
  PluginStatus,
} from "../types/plugin"
import { logger } from "../utils/logger"
import { DefaultPluginHookManager } from "./PluginHookManager"
import { DefaultPluginLoader } from "./PluginLoader"
import { DefaultPluginRegistry } from "./PluginRegistry"

export class DefaultPluginManager implements PluginManager {
  public readonly registry: PluginRegistry
  public readonly loader: PluginLoader
  public readonly hooks: PluginHookManager

  private pluginDirectory: string
  private initialized = false
  private loadedPlugins: Map<string, Plugin> = new Map()

  constructor(pluginDirectory: string = path.join(process.cwd(), "packages", "plugins")) {
    this.pluginDirectory = pluginDirectory
    this.registry = new DefaultPluginRegistry()
    this.loader = new DefaultPluginLoader()
    this.hooks = new DefaultPluginHookManager()
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("Plugin manager already initialized")
      return
    }

    try {
      logger.info("Initializing plugin manager", {
        pluginDirectory: this.pluginDirectory,
      })

      // Ensure plugin directory exists
      await this.ensurePluginDirectory()

      // Discover and load plugins
      const pluginPaths = await this.discover(this.pluginDirectory)

      for (const pluginPath of pluginPaths) {
        try {
          await this.install(pluginPath)
        } catch (error) {
          logger.error(`Failed to install plugin during initialization: ${pluginPath}`, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      // Enable plugins that were previously enabled
      const enabledPlugins = this.registry.getPluginsByStatus(PluginStatus.INSTALLED)
      for (const instance of enabledPlugins) {
        if (instance.manifest.enabled !== false) {
          try {
            await this.enable(instance.manifest.name)
          } catch (error) {
            logger.error(
              `Failed to enable plugin during initialization: ${instance.manifest.name}`,
              {
                error: error instanceof Error ? error.message : String(error),
              }
            )
          }
        }
      }

      this.initialized = true

      // Trigger app startup hook
      await this.hooks.execute(BUILT_IN_HOOKS.APP_STARTUP)

      logger.info("Plugin manager initialized successfully", {
        totalPlugins: this.registry.getAll().length,
        enabledPlugins: this.registry.getEnabled().length,
      })
    } catch (error) {
      logger.error("Failed to initialize plugin manager", {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return
    }

    try {
      logger.info("Shutting down plugin manager")

      // Trigger app shutdown hook
      await this.hooks.execute(BUILT_IN_HOOKS.APP_SHUTDOWN)

      // Disable all enabled plugins
      const enabledPlugins = this.registry.getEnabled()
      for (const instance of enabledPlugins) {
        try {
          await this.disable(instance.manifest.name)
        } catch (error) {
          logger.error(
            `Failed to disable plugin during shutdown: ${instance.manifest.name}`,
            {
              error: error instanceof Error ? error.message : String(error),
            }
          )
        }
      }

      // Clear all hooks
      this.hooks.clear()

      this.initialized = false
      logger.info("Plugin manager shut down successfully")
    } catch (error) {
      logger.error("Error during plugin manager shutdown", {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async install(pluginPath: string): Promise<PluginInstance> {
    try {
      // Load the plugin
      const plugin = await this.loader.load(pluginPath)

      // Check if plugin is already installed
      if (this.registry.exists(plugin.manifest.name)) {
        throw new Error(`Plugin '${plugin.manifest.name}' is already installed`)
      }

      // Register the plugin
      await this.registry.register(plugin)

      // Store plugin reference
      this.loadedPlugins.set(plugin.manifest.name, plugin)

      // Call onLoad lifecycle method
      const context = this.createPluginContext(plugin.manifest.name)
      if (plugin.onLoad) {
        await plugin.onLoad(context)
      }

      const instance = this.registry.get(plugin.manifest.name)!

      logger.info(`Plugin installed: ${plugin.manifest.name}`, {
        version: plugin.manifest.version,
        category: plugin.manifest.category,
      })

      return instance
    } catch (error) {
      logger.error(`Failed to install plugin: ${pluginPath}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async uninstall(pluginName: string): Promise<void> {
    const instance = this.registry.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not installed`)
    }

    try {
      // Disable plugin if enabled
      if (instance.status === PluginStatus.ENABLED) {
        await this.disable(pluginName)
      }

      // Call onUnload lifecycle method
      const plugin = this.loadedPlugins.get(pluginName)
      if (plugin?.onUnload) {
        const context = this.createPluginContext(pluginName)
        await plugin.onUnload(context)
      }

      // Unload from loader
      await this.loader.unload(pluginName)

      // Remove from registry
      await this.registry.unregister(pluginName)

      // Remove plugin reference
      this.loadedPlugins.delete(pluginName)

      logger.info(`Plugin uninstalled: ${pluginName}`)
    } catch (error) {
      logger.error(`Failed to uninstall plugin: ${pluginName}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async enable(pluginName: string): Promise<void> {
    const instance = this.registry.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not installed`)
    }

    if (instance.status === PluginStatus.ENABLED) {
      logger.warn(`Plugin '${pluginName}' is already enabled`)
      return
    }

    try {
      this.registry.updateStatus(pluginName, PluginStatus.LOADING)

      const plugin = this.loadedPlugins.get(pluginName)
      if (!plugin) {
        throw new Error(`Plugin '${pluginName}' is not loaded`)
      }

      // Call onEnable lifecycle method
      const context = this.createPluginContext(pluginName)
      if (plugin.onEnable) {
        await plugin.onEnable(context)
      }

      // Register plugin hooks
      if (plugin.manifest.hooks) {
        for (const hookName of plugin.manifest.hooks) {
          // Plugin should register its own hook handlers in onEnable
          logger.debug(`Plugin '${pluginName}' declares hook: ${hookName}`)
        }
      }

      this.registry.updateStatus(pluginName, PluginStatus.ENABLED)

      logger.info(`Plugin enabled: ${pluginName}`)
    } catch (error) {
      this.registry.updateStatus(
        pluginName,
        PluginStatus.ERROR,
        error instanceof Error ? error.message : String(error)
      )
      logger.error(`Failed to enable plugin: ${pluginName}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async disable(pluginName: string): Promise<void> {
    const instance = this.registry.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not installed`)
    }

    if (instance.status === PluginStatus.DISABLED) {
      logger.warn(`Plugin '${pluginName}' is already disabled`)
      return
    }

    try {
      const plugin = this.loadedPlugins.get(pluginName)
      if (!plugin) {
        throw new Error(`Plugin '${pluginName}' is not loaded`)
      }

      // Call onDisable lifecycle method
      const context = this.createPluginContext(pluginName)
      if (plugin.onDisable) {
        await plugin.onDisable(context)
      }

      // Unregister plugin hooks (plugins should handle this in onDisable)

      this.registry.updateStatus(pluginName, PluginStatus.DISABLED)

      logger.info(`Plugin disabled: ${pluginName}`)
    } catch (error) {
      this.registry.updateStatus(
        pluginName,
        PluginStatus.ERROR,
        error instanceof Error ? error.message : String(error)
      )
      logger.error(`Failed to disable plugin: ${pluginName}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async configure(pluginName: string, config: Record<string, any>): Promise<void> {
    const instance = this.registry.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not installed`)
    }

    try {
      const plugin = this.loadedPlugins.get(pluginName)

      // Validate configuration if plugin provides validation
      if (plugin?.validateConfig) {
        const isValid = await plugin.validateConfig(config)
        if (!isValid) {
          throw new Error(`Invalid configuration for plugin '${pluginName}'`)
        }
      }

      // Update configuration
      this.registry.updateConfig(pluginName, config)

      // Call onConfigChange lifecycle method
      if (plugin?.onConfigChange) {
        const context = this.createPluginContext(pluginName)
        await plugin.onConfigChange(config, context)
      }

      logger.info(`Plugin configured: ${pluginName}`, {
        configKeys: Object.keys(config),
      })
    } catch (error) {
      logger.error(`Failed to configure plugin: ${pluginName}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  getConfig(pluginName: string): Record<string, any> {
    const instance = this.registry.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not installed`)
    }
    return instance.config
  }

  getStatus(pluginName: string): PluginStatus {
    const instance = this.registry.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not installed`)
    }
    return instance.status
  }

  async healthCheck(pluginName?: string): Promise<Record<string, any>> {
    if (pluginName) {
      // Health check for specific plugin
      const instance = this.registry.get(pluginName)
      if (!instance) {
        throw new Error(`Plugin '${pluginName}' is not installed`)
      }

      const plugin = this.loadedPlugins.get(pluginName)
      if (plugin?.healthCheck) {
        const context = this.createPluginContext(pluginName)
        return await plugin.healthCheck(context)
      }

      return {
        status: instance.status === PluginStatus.ENABLED ? "healthy" : "unhealthy",
        message: `Plugin is ${instance.status}`,
      }
    } else {
      // Health check for all plugins
      const results: Record<string, any> = {}
      const instances = this.registry.getAll()

      for (const instance of instances) {
        try {
          results[instance.manifest.name] = await this.healthCheck(instance.manifest.name)
        } catch (error) {
          results[instance.manifest.name] = {
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          }
        }
      }

      return results
    }
  }

  async discover(pluginDirectory: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(pluginDirectory, { withFileTypes: true })
      const pluginPaths: string[] = []

      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== "node_modules"
        ) {
          const pluginPath = path.join(pluginDirectory, entry.name)

          // Check if it has a package.json (plugin manifest)
          try {
            await fs.access(path.join(pluginPath, "package.json"))
            pluginPaths.push(pluginPath)
          } catch {
            // Not a plugin directory, skip
            logger.debug(`Skipping directory without package.json: ${pluginPath}`)
          }
        }
      }

      logger.debug(`Discovered ${pluginPaths.length} plugins in ${pluginDirectory}`)
      return pluginPaths
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        logger.warn(`Plugin directory does not exist: ${pluginDirectory}`)
        return []
      }
      throw error
    }
  }

  private createPluginContext(pluginName: string): PluginContext {
    const instance = this.registry.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not installed`)
    }

    return {
      logger: logger.child({ plugin: pluginName }),
      config: instance.config,
      hooks: this.hooks,
      services: {
        database: null, // Will be injected by the application
        notification: null, // Will be injected by the application
        webhook: null, // Will be injected by the application
      },
    }
  }

  private async ensurePluginDirectory(): Promise<void> {
    try {
      await fs.access(this.pluginDirectory)
    } catch {
      logger.info(`Creating plugin directory: ${this.pluginDirectory}`)
      await fs.mkdir(this.pluginDirectory, { recursive: true })
    }
  }

  // Utility methods
  getPluginDirectory(): string {
    return this.pluginDirectory
  }

  isInitialized(): boolean {
    return this.initialized
  }

  getLoadedPlugin(pluginName: string): Plugin | undefined {
    return this.loadedPlugins.get(pluginName)
  }
}
