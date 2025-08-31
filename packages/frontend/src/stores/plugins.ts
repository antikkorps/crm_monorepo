import { defineStore } from "pinia"
import { computed, ref } from "vue"
import {
  PluginCategory,
  PluginInstance,
  PluginService,
  PluginStats,
  PluginStatus,
} from "../services/api/plugins"

export const usePluginStore = defineStore("plugins", () => {
  // State
  const plugins = ref<PluginInstance[]>([])
  const stats = ref<PluginStats>({
    total: 0,
    enabled: 0,
    disabled: 0,
    error: 0,
    byCategory: {},
  })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedPlugin = ref<PluginInstance | null>(null)
  const discoveredPlugins = ref<string[]>([])

  // Computed
  const enabledPlugins = computed(() =>
    plugins.value.filter((plugin) => plugin.status === PluginStatus.ENABLED)
  )

  const disabledPlugins = computed(() =>
    plugins.value.filter((plugin) => plugin.status === PluginStatus.DISABLED)
  )

  const errorPlugins = computed(() =>
    plugins.value.filter((plugin) => plugin.status === PluginStatus.ERROR)
  )

  const pluginsByCategory = computed(() => {
    const grouped: Record<string, PluginInstance[]> = {}
    plugins.value.forEach((plugin) => {
      const category = plugin.manifest.category
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(plugin)
    })
    return grouped
  })

  const hasPlugins = computed(() => plugins.value.length > 0)

  // Actions
  const fetchPlugins = async () => {
    try {
      loading.value = true
      error.value = null

      const response = await PluginService.getPlugins()
      plugins.value = response.plugins
      stats.value = response.stats
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch plugins"
      console.error("Error fetching plugins:", err)
    } finally {
      loading.value = false
    }
  }

  const fetchPlugin = async (name: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await PluginService.getPlugin(name)
      selectedPlugin.value = response.plugin

      // Update plugin in list if it exists
      const index = plugins.value.findIndex((p) => p.manifest.name === name)
      if (index !== -1) {
        plugins.value[index] = response.plugin
      }

      return response.plugin
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch plugin"
      console.error("Error fetching plugin:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const installPlugin = async (pluginPath: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await PluginService.installPlugin(pluginPath)

      // Add new plugin to list
      plugins.value.push(response.plugin)

      // Update stats
      stats.value.total++
      const category = response.plugin.manifest.category
      stats.value.byCategory[category] = (stats.value.byCategory[category] || 0) + 1

      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to install plugin"
      console.error("Error installing plugin:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const uninstallPlugin = async (name: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await PluginService.uninstallPlugin(name)

      // Remove plugin from list
      const index = plugins.value.findIndex((p) => p.manifest.name === name)
      if (index !== -1) {
        const plugin = plugins.value[index]
        plugins.value.splice(index, 1)

        // Update stats
        stats.value.total--
        const category = plugin.manifest.category
        if (stats.value.byCategory[category] > 0) {
          stats.value.byCategory[category]--
        }

        if (plugin.status === PluginStatus.ENABLED) {
          stats.value.enabled--
        } else if (plugin.status === PluginStatus.DISABLED) {
          stats.value.disabled--
        } else if (plugin.status === PluginStatus.ERROR) {
          stats.value.error--
        }
      }

      // Clear selected plugin if it was uninstalled
      if (selectedPlugin.value?.manifest.name === name) {
        selectedPlugin.value = null
      }

      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to uninstall plugin"
      console.error("Error uninstalling plugin:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const enablePlugin = async (name: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await PluginService.enablePlugin(name)

      // Update plugin status
      const plugin = plugins.value.find((p) => p.manifest.name === name)
      if (plugin) {
        const oldStatus = plugin.status
        plugin.status = response.status

        // Update stats
        if (oldStatus === PluginStatus.DISABLED) {
          stats.value.disabled--
        } else if (oldStatus === PluginStatus.ERROR) {
          stats.value.error--
        }
        stats.value.enabled++
      }

      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to enable plugin"
      console.error("Error enabling plugin:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const disablePlugin = async (name: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await PluginService.disablePlugin(name)

      // Update plugin status
      const plugin = plugins.value.find((p) => p.manifest.name === name)
      if (plugin) {
        const oldStatus = plugin.status
        plugin.status = response.status

        // Update stats
        if (oldStatus === PluginStatus.ENABLED) {
          stats.value.enabled--
        } else if (oldStatus === PluginStatus.ERROR) {
          stats.value.error--
        }
        stats.value.disabled++
      }

      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to disable plugin"
      console.error("Error disabling plugin:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const configurePlugin = async (name: string, config: Record<string, any>) => {
    try {
      loading.value = true
      error.value = null

      const response = await PluginService.configurePlugin(name, config)

      // Update plugin config
      const plugin = plugins.value.find((p) => p.manifest.name === name)
      if (plugin) {
        plugin.config = response.config
      }

      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to configure plugin"
      console.error("Error configuring plugin:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPluginConfig = async (name: string) => {
    try {
      const response = await PluginService.getPluginConfig(name)
      return response.config
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to get plugin configuration"
      console.error("Error getting plugin config:", err)
      throw err
    }
  }

  const healthCheck = async (name?: string) => {
    try {
      const response = await PluginService.healthCheck(name)
      return response.health
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to perform health check"
      console.error("Error performing health check:", err)
      throw err
    }
  }

  const discoverPlugins = async (directory?: string) => {
    try {
      loading.value = true
      error.value = null

      const response = await PluginService.discoverPlugins(directory)
      discoveredPlugins.value = response.plugins

      return response
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to discover plugins"
      console.error("Error discovering plugins:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPluginByName = (name: string) => {
    return plugins.value.find((plugin) => plugin.manifest.name === name)
  }

  const getPluginsByCategory = (category: PluginCategory) => {
    return plugins.value.filter((plugin) => plugin.manifest.category === category)
  }

  const clearError = () => {
    error.value = null
  }

  const clearSelectedPlugin = () => {
    selectedPlugin.value = null
  }

  const refreshPlugin = async (name: string) => {
    await fetchPlugin(name)
  }

  const refreshAll = async () => {
    await fetchPlugins()
  }

  // Initialize
  const initialize = async () => {
    await fetchPlugins()
  }

  return {
    // State
    plugins,
    stats,
    loading,
    error,
    selectedPlugin,
    discoveredPlugins,

    // Computed
    enabledPlugins,
    disabledPlugins,
    errorPlugins,
    pluginsByCategory,
    hasPlugins,

    // Actions
    fetchPlugins,
    fetchPlugin,
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    configurePlugin,
    getPluginConfig,
    healthCheck,
    discoverPlugins,
    getPluginByName,
    getPluginsByCategory,
    clearError,
    clearSelectedPlugin,
    refreshPlugin,
    refreshAll,
    initialize,
  }
})
