import {
  Plugin,
  PluginCategory,
  PluginInstance,
  PluginRegistry,
  PluginStatus,
} from "../types/plugin"
import { logger } from "../utils/logger"

export class DefaultPluginRegistry implements PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map()

  async register(plugin: Plugin): Promise<void> {
    const { name } = plugin.manifest

    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered`)
    }

    const instance: PluginInstance = {
      manifest: plugin.manifest,
      status: PluginStatus.INSTALLED,
      config: plugin.manifest.defaultConfig || {},
      loadedAt: new Date(),
    }

    this.plugins.set(name, instance)

    logger.info(`Plugin registered: ${name}`, {
      version: plugin.manifest.version,
      category: plugin.manifest.category,
      status: instance.status,
    })
  }

  async unregister(pluginName: string): Promise<void> {
    const instance = this.plugins.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not registered`)
    }

    if (instance.status === PluginStatus.ENABLED) {
      throw new Error(
        `Cannot unregister enabled plugin '${pluginName}'. Disable it first.`
      )
    }

    this.plugins.delete(pluginName)

    logger.info(`Plugin unregistered: ${pluginName}`)
  }

  get(pluginName: string): PluginInstance | undefined {
    return this.plugins.get(pluginName)
  }

  getAll(): PluginInstance[] {
    return Array.from(this.plugins.values())
  }

  getByCategory(category: PluginCategory): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(
      (instance) => instance.manifest.category === category
    )
  }

  getEnabled(): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(
      (instance) => instance.status === PluginStatus.ENABLED
    )
  }

  // Internal methods for plugin management
  updateStatus(pluginName: string, status: PluginStatus, error?: string): void {
    const instance = this.plugins.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not registered`)
    }

    instance.status = status
    if (error) {
      instance.error = error
      instance.lastError = new Date()
    } else {
      instance.error = undefined
    }

    logger.debug(`Plugin status updated: ${pluginName}`, {
      status,
      error: error || "none",
    })
  }

  updateConfig(pluginName: string, config: Record<string, any>): void {
    const instance = this.plugins.get(pluginName)
    if (!instance) {
      throw new Error(`Plugin '${pluginName}' is not registered`)
    }

    instance.config = { ...instance.config, ...config }

    logger.debug(`Plugin config updated: ${pluginName}`, {
      configKeys: Object.keys(config),
    })
  }

  // Utility methods
  exists(pluginName: string): boolean {
    return this.plugins.has(pluginName)
  }

  isEnabled(pluginName: string): boolean {
    const instance = this.plugins.get(pluginName)
    return instance?.status === PluginStatus.ENABLED
  }

  getPluginNames(): string[] {
    return Array.from(this.plugins.keys())
  }

  getPluginsByStatus(status: PluginStatus): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(
      (instance) => instance.status === status
    )
  }

  getStats(): {
    total: number
    enabled: number
    disabled: number
    error: number
    byCategory: Record<string, number>
  } {
    const instances = Array.from(this.plugins.values())

    const stats = {
      total: instances.length,
      enabled: 0,
      disabled: 0,
      error: 0,
      byCategory: {} as Record<string, number>,
    }

    for (const instance of instances) {
      // Count by status
      switch (instance.status) {
        case PluginStatus.ENABLED:
          stats.enabled++
          break
        case PluginStatus.DISABLED:
          stats.disabled++
          break
        case PluginStatus.ERROR:
          stats.error++
          break
      }

      // Count by category
      const category = instance.manifest.category
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1
    }

    return stats
  }

  clear(): void {
    this.plugins.clear()
    logger.debug("Plugin registry cleared")
  }
}
