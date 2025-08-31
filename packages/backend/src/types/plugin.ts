// Plugin system type definitions

export interface PluginManifest {
  name: string
  version: string
  description: string
  author: string
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]

  // Plugin metadata
  displayName: string
  category: PluginCategory

  // Dependencies
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>

  // Plugin configuration
  configSchema?: Record<string, any>
  defaultConfig?: Record<string, any>

  // Hooks and capabilities
  hooks?: string[]
  permissions?: string[]

  // Lifecycle
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
  loadedAt?: Date
  lastError?: Date
}

export interface PluginContext {
  logger: any
  config: Record<string, any>
  hooks: PluginHookManager
  services: {
    database: any
    notification: any
    webhook: any
    [key: string]: any
  }
}

export interface PluginHook {
  name: string
  description: string
  parameters?: Record<string, any>
  returnType?: string
}

export interface PluginHookManager {
  register(hookName: string, callback: Function): void
  unregister(hookName: string, callback: Function): void
  execute(hookName: string, ...args: any[]): Promise<any[]>
  executeFirst(hookName: string, ...args: any[]): Promise<any>
}

export interface Plugin {
  manifest: PluginManifest

  // Lifecycle methods
  onLoad?(context: PluginContext): Promise<void>
  onUnload?(context: PluginContext): Promise<void>
  onEnable?(context: PluginContext): Promise<void>
  onDisable?(context: PluginContext): Promise<void>

  // Configuration
  onConfigChange?(config: Record<string, any>, context: PluginContext): Promise<void>
  validateConfig?(config: Record<string, any>): Promise<boolean>

  // Health check
  healthCheck?(context: PluginContext): Promise<{ status: string; message?: string }>
}

export interface PluginRegistry {
  register(plugin: Plugin): Promise<void>
  unregister(pluginName: string): Promise<void>
  get(pluginName: string): PluginInstance | undefined
  getAll(): PluginInstance[]
  getByCategory(category: PluginCategory): PluginInstance[]
  getEnabled(): PluginInstance[]
  getStats(): Record<string, any>
}

export interface PluginLoader {
  load(pluginPath: string): Promise<Plugin>
  unload(pluginName: string): Promise<void>
  reload(pluginName: string): Promise<void>
  validateManifest(manifest: any): boolean
}

export interface PluginManager {
  registry: PluginRegistry
  loader: PluginLoader
  hooks: PluginHookManager

  // Plugin lifecycle
  install(pluginPath: string): Promise<PluginInstance>
  uninstall(pluginName: string): Promise<void>
  enable(pluginName: string): Promise<void>
  disable(pluginName: string): Promise<void>

  // Configuration
  configure(pluginName: string, config: Record<string, any>): Promise<void>
  getConfig(pluginName: string): Record<string, any>

  // Status and health
  getStatus(pluginName: string): PluginStatus
  healthCheck(pluginName?: string): Promise<Record<string, any>>

  // Discovery
  discover(pluginDirectory: string): Promise<string[]>
  getPluginDirectory(): string

  // Initialization
  initialize(): Promise<void>
  shutdown(): Promise<void>
}

// Built-in hooks
export const BUILT_IN_HOOKS = {
  // Application lifecycle
  APP_STARTUP: "app:startup",
  APP_SHUTDOWN: "app:shutdown",

  // User events
  USER_CREATED: "user:created",
  USER_UPDATED: "user:updated",
  USER_DELETED: "user:deleted",
  USER_LOGIN: "user:login",
  USER_LOGOUT: "user:logout",

  // Medical institution events
  INSTITUTION_CREATED: "institution:created",
  INSTITUTION_UPDATED: "institution:updated",
  INSTITUTION_DELETED: "institution:deleted",

  // Task events
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_ASSIGNED: "task:assigned",
  TASK_COMPLETED: "task:completed",

  // Billing events
  QUOTE_CREATED: "quote:created",
  QUOTE_SENT: "quote:sent",
  QUOTE_ACCEPTED: "quote:accepted",
  QUOTE_REJECTED: "quote:rejected",
  INVOICE_CREATED: "invoice:created",
  INVOICE_SENT: "invoice:sent",
  PAYMENT_RECEIVED: "payment:received",
  INVOICE_PAID: "invoice:paid",

  // Webhook events
  WEBHOOK_TRIGGERED: "webhook:triggered",
  WEBHOOK_FAILED: "webhook:failed",

  // Notification events
  NOTIFICATION_SENT: "notification:sent",

  // Data processing
  DATA_IMPORT: "data:import",
  DATA_EXPORT: "data:export",

  // API events
  API_REQUEST: "api:request",
  API_RESPONSE: "api:response",
  API_ERROR: "api:error",
} as const

export type BuiltInHook = (typeof BUILT_IN_HOOKS)[keyof typeof BUILT_IN_HOOKS]
