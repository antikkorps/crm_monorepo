import { apiClient } from "./index"

export interface PluginManifest {
  name: string
  version: string
  description: string
  author: string
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  displayName: string
  category: PluginCategory
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  configSchema?: Record<string, any>
  defaultConfig?: Record<string, any>
  hooks?: string[]
  permissions?: string[]
  main: string
  enabled: boolean
}

export enum PluginCategory {
  INTEGRATION = "integration",
  BILLING = "billing",
  NOTIFICATION = "notification",
  ANALYTICS = "analytics",
  WORKFLOW = "workflow",
  UTILITY = "utility",
}

export enum PluginStatus {
  INSTALLED = "installed",
  ENABLED = "enabled",
  DISABLED = "disabled",
  ERROR = "error",
  LOADING = "loading",
  UNINSTALLED = "uninstalled",
}

export interface PluginInstance {
  manifest: PluginManifest
  status: PluginStatus
  config: Record<string, any>
  error?: string
  loadedAt?: string
  lastError?: string
}

export interface PluginStats {
  total: number
  enabled: number
  disabled: number
  error: number
  byCategory: Record<string, number>
}

export interface PluginListResponse {
  plugins: PluginInstance[]
  stats: PluginStats
  timestamp: string
}

export interface PluginHealthResponse {
  pluginName: string
  health: {
    status: string
    message?: string
    details?: any
    lastCheck?: string
  }
  timestamp: string
}

export interface PluginDiscoveryResponse {
  directory: string
  plugins: string[]
  count: number
  timestamp: string
}

export class PluginService {
  // Get all plugins
  static async getPlugins(): Promise<PluginListResponse> {
    const response = await apiClient.get<PluginListResponse>("/plugins")
    return response
  }

  // Get specific plugin
  static async getPlugin(
    name: string
  ): Promise<{ plugin: PluginInstance; timestamp: string }> {
    const response = await apiClient.get<{ plugin: PluginInstance; timestamp: string }>(`/plugins/${name}`)
    return response
  }

  // Install plugin
  static async installPlugin(
    pluginPath: string
  ): Promise<{ message: string; plugin: PluginInstance; timestamp: string }> {
    const response = await apiClient.post<{ message: string; plugin: PluginInstance; timestamp: string }>("/plugins/install", { pluginPath })
    return response
  }

  // Uninstall plugin
  static async uninstallPlugin(
    name: string
  ): Promise<{ message: string; pluginName: string; timestamp: string }> {
    const response = await apiClient.delete<{ message: string; pluginName: string; timestamp: string }>(`/plugins/${name}`)
    return response
  }

  // Enable plugin
  static async enablePlugin(
    name: string
  ): Promise<{
    message: string
    pluginName: string
    status: PluginStatus
    timestamp: string
  }> {
    const response = await apiClient.put<{ message: string; pluginName: string; status: PluginStatus; timestamp: string }>(`/plugins/${name}/enable`)
    return response
  }

  // Disable plugin
  static async disablePlugin(
    name: string
  ): Promise<{
    message: string
    pluginName: string
    status: PluginStatus
    timestamp: string
  }> {
    const response = await apiClient.put<{ message: string; pluginName: string; status: PluginStatus; timestamp: string }>(`/plugins/${name}/disable`)
    return response
  }

  // Configure plugin
  static async configurePlugin(
    name: string,
    config: Record<string, any>
  ): Promise<{
    message: string
    pluginName: string
    config: Record<string, any>
    timestamp: string
  }> {
    const response = await apiClient.put<{ message: string; pluginName: string; config: Record<string, any>; timestamp: string }>(`/plugins/${name}/configure`, { config })
    return response
  }

  // Get plugin configuration
  static async getPluginConfig(
    name: string
  ): Promise<{ pluginName: string; config: Record<string, any>; timestamp: string }> {
    const response = await apiClient.get<{ pluginName: string; config: Record<string, any>; timestamp: string }>(`/plugins/${name}/config`)
    return response
  }

  // Health check
  static async healthCheck(name?: string): Promise<PluginHealthResponse> {
    const url = name ? `/plugins/health/${name}` : "/plugins/health"
    const response = await apiClient.get<PluginHealthResponse>(url)
    return response
  }

  // Discover plugins
  static async discoverPlugins(directory?: string): Promise<PluginDiscoveryResponse> {
    const url = directory
      ? `/plugins/discover/${encodeURIComponent(directory)}`
      : "/plugins/discover"
    const response = await apiClient.get<PluginDiscoveryResponse>(url)
    return response
  }

  // Utility methods
  static getCategoryDisplayName(category: PluginCategory): string {
    const categoryNames = {
      [PluginCategory.INTEGRATION]: "Integration",
      [PluginCategory.BILLING]: "Billing",
      [PluginCategory.NOTIFICATION]: "Notification",
      [PluginCategory.ANALYTICS]: "Analytics",
      [PluginCategory.WORKFLOW]: "Workflow",
      [PluginCategory.UTILITY]: "Utility",
    }
    return categoryNames[category] || category
  }

  static getStatusDisplayName(status: PluginStatus): string {
    const statusNames = {
      [PluginStatus.INSTALLED]: "Installed",
      [PluginStatus.ENABLED]: "Enabled",
      [PluginStatus.DISABLED]: "Disabled",
      [PluginStatus.ERROR]: "Error",
      [PluginStatus.LOADING]: "Loading",
      [PluginStatus.UNINSTALLED]: "Uninstalled",
    }
    return statusNames[status] || status
  }

  static getStatusSeverity(
    status: PluginStatus
  ): "success" | "info" | "warning" | "danger" {
    switch (status) {
      case PluginStatus.ENABLED:
        return "success"
      case PluginStatus.INSTALLED:
      case PluginStatus.DISABLED:
        return "info"
      case PluginStatus.LOADING:
        return "warning"
      case PluginStatus.ERROR:
        return "danger"
      default:
        return "info"
    }
  }

  static getCategoryIcon(category: PluginCategory): string {
    const categoryIcons = {
      [PluginCategory.INTEGRATION]: "pi pi-link",
      [PluginCategory.BILLING]: "pi pi-money-bill",
      [PluginCategory.NOTIFICATION]: "pi pi-bell",
      [PluginCategory.ANALYTICS]: "pi pi-chart-bar",
      [PluginCategory.WORKFLOW]: "pi pi-sitemap",
      [PluginCategory.UTILITY]: "pi pi-cog",
    }
    return categoryIcons[category] || "pi pi-box"
  }
}
