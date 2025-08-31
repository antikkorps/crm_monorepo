import * as fs from "fs/promises"
import * as path from "path"
import { Plugin, PluginCategory, PluginLoader, PluginManifest } from "../types/plugin"
import { logger } from "../utils/logger"

export class DefaultPluginLoader implements PluginLoader {
  private loadedPlugins: Map<string, any> = new Map()

  async load(pluginPath: string): Promise<Plugin> {
    try {
      // Resolve absolute path
      const absolutePath = path.resolve(pluginPath)

      // Check if plugin directory exists
      const stats = await fs.stat(absolutePath)
      if (!stats.isDirectory()) {
        throw new Error(`Plugin path is not a directory: ${absolutePath}`)
      }

      // Load and validate manifest
      const manifest = await this.loadManifest(absolutePath)

      // Load the main plugin module
      const mainPath = path.join(absolutePath, manifest.main)
      const pluginModule = await this.loadModule(mainPath)

      // Create plugin instance
      const plugin: Plugin = {
        manifest,
        ...pluginModule,
      }

      // Validate plugin structure
      this.validatePlugin(plugin)

      // Store reference for potential unloading
      this.loadedPlugins.set(manifest.name, {
        path: absolutePath,
        module: pluginModule,
      })

      logger.info(`Plugin loaded: ${manifest.name}`, {
        version: manifest.version,
        path: absolutePath,
        main: manifest.main,
      })

      return plugin
    } catch (error) {
      logger.error(`Failed to load plugin from: ${pluginPath}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async unload(pluginName: string): Promise<void> {
    const loadedPlugin = this.loadedPlugins.get(pluginName)
    if (!loadedPlugin) {
      logger.warn(`Plugin not found in loaded plugins: ${pluginName}`)
      return
    }

    try {
      // Clear module from Node.js cache if possible
      const mainPath = path.join(loadedPlugin.path, "index.js")
      if (require.cache[mainPath]) {
        delete require.cache[mainPath]
      }

      this.loadedPlugins.delete(pluginName)

      logger.info(`Plugin unloaded: ${pluginName}`)
    } catch (error) {
      logger.error(`Failed to unload plugin: ${pluginName}`, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async reload(pluginName: string): Promise<void> {
    const loadedPlugin = this.loadedPlugins.get(pluginName)
    if (!loadedPlugin) {
      throw new Error(`Plugin not found in loaded plugins: ${pluginName}`)
    }

    await this.unload(pluginName)
    await this.load(loadedPlugin.path)
  }

  validateManifest(manifest: any): boolean {
    const required = [
      "name",
      "version",
      "description",
      "author",
      "main",
      "displayName",
      "category",
    ]

    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required manifest field: ${field}`)
      }
    }

    // Validate category
    if (!Object.values(PluginCategory).includes(manifest.category)) {
      throw new Error(`Invalid plugin category: ${manifest.category}`)
    }

    // Validate version format (basic semver check)
    const versionRegex = /^\d+\.\d+\.\d+/
    if (!versionRegex.test(manifest.version)) {
      throw new Error(`Invalid version format: ${manifest.version}`)
    }

    // Validate name format (no spaces, special chars)
    const nameRegex = /^[a-z0-9-_]+$/
    if (!nameRegex.test(manifest.name)) {
      throw new Error(
        `Invalid plugin name format: ${manifest.name}. Use lowercase letters, numbers, hyphens, and underscores only.`
      )
    }

    return true
  }

  private async loadManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, "package.json")

    try {
      const manifestContent = await fs.readFile(manifestPath, "utf-8")
      const manifest = JSON.parse(manifestContent)

      // Validate manifest structure
      this.validateManifest(manifest)

      return manifest as PluginManifest
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        throw new Error(`Plugin manifest not found: ${manifestPath}`)
      }
      throw error
    }
  }

  private async loadModule(modulePath: string): Promise<any> {
    try {
      // Check if file exists
      await fs.access(modulePath)

      // Dynamic import for ES modules or require for CommonJS
      let pluginModule

      if (modulePath.endsWith(".mjs") || modulePath.endsWith(".js")) {
        // Try ES module import first
        try {
          pluginModule = await import(modulePath)
          // Handle default export
          if (pluginModule.default) {
            pluginModule = pluginModule.default
          }
        } catch (importError) {
          // Fallback to require for CommonJS
          delete require.cache[require.resolve(modulePath)]
          pluginModule = require(modulePath)
        }
      } else if (modulePath.endsWith(".ts")) {
        // For TypeScript files, we need to compile them first
        // This is a simplified approach - in production, you might want to use ts-node or pre-compile
        throw new Error(
          "TypeScript plugins not supported yet. Please compile to JavaScript first."
        )
      } else {
        // Default to require
        delete require.cache[require.resolve(modulePath)]
        pluginModule = require(modulePath)
      }

      return pluginModule
    } catch (error) {
      throw new Error(
        `Failed to load plugin module: ${modulePath}. ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  private validatePlugin(plugin: Plugin): void {
    if (!plugin.manifest) {
      throw new Error("Plugin must have a manifest")
    }

    // Check for required lifecycle methods (optional but recommended)
    const lifecycleMethods = ["onLoad", "onUnload", "onEnable", "onDisable"]
    const hasLifecycleMethods = lifecycleMethods.some(
      (method) => typeof plugin[method as keyof Plugin] === "function"
    )

    if (!hasLifecycleMethods) {
      logger.warn(`Plugin '${plugin.manifest.name}' has no lifecycle methods`, {
        availableMethods: lifecycleMethods,
      })
    }

    // Validate hook names if specified
    if (plugin.manifest.hooks) {
      for (const hook of plugin.manifest.hooks) {
        if (typeof hook !== "string" || hook.trim().length === 0) {
          throw new Error(
            `Invalid hook name in plugin '${plugin.manifest.name}': ${hook}`
          )
        }
      }
    }
  }

  // Utility methods
  getLoadedPlugins(): string[] {
    return Array.from(this.loadedPlugins.keys())
  }

  isLoaded(pluginName: string): boolean {
    return this.loadedPlugins.has(pluginName)
  }

  getLoadedPluginPath(pluginName: string): string | undefined {
    return this.loadedPlugins.get(pluginName)?.path
  }
}
