import * as path from "path"
import config from "../config/environment"
import { BUILT_IN_HOOKS, PluginManager } from "../types/plugin"
import { logger } from "../utils/logger"
import { DefaultPluginManager } from "./PluginManager"

export class PluginService {
  private static instance: PluginService
  private pluginManager: PluginManager
  private initialized = false

  private constructor() {
    const pluginDirectory =
      config.plugins?.directory || path.join(process.cwd(), "packages", "plugins")
    this.pluginManager = new DefaultPluginManager(pluginDirectory)
  }

  public static getInstance(): PluginService {
    if (!PluginService.instance) {
      PluginService.instance = new PluginService()
    }
    return PluginService.instance
  }

  public getPluginManager(): PluginManager {
    return this.pluginManager
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("Plugin service already initialized")
      return
    }

    try {
      logger.info("Initializing plugin service")


      // Initialize the plugin manager
      await this.pluginManager.initialize()

      // Register built-in event handlers
      this.registerBuiltInHooks()

      this.initialized = true
      logger.info("Plugin service initialized successfully")
    } catch (error) {
      logger.error("Failed to initialize plugin service", {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return
    }

    try {
      logger.info("Shutting down plugin service")
      await this.pluginManager.shutdown()
      this.initialized = false
      logger.info("Plugin service shut down successfully")
    } catch (error) {
      logger.error("Error during plugin service shutdown", {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  public isInitialized(): boolean {
    return this.initialized
  }

  // Event trigger methods for the application to call
  public async triggerUserCreated(user: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.USER_CREATED, user)
  }

  public async triggerUserUpdated(user: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.USER_UPDATED, user)
  }

  public async triggerUserLogin(user: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.USER_LOGIN, user)
  }

  public async triggerUserLogout(user: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.USER_LOGOUT, user)
  }

  public async triggerInstitutionCreated(institution: any): Promise<void> {
    await this.pluginManager.hooks.execute(
      BUILT_IN_HOOKS.INSTITUTION_CREATED,
      institution
    )
  }

  public async triggerInstitutionUpdated(institution: any): Promise<void> {
    await this.pluginManager.hooks.execute(
      BUILT_IN_HOOKS.INSTITUTION_UPDATED,
      institution
    )
  }

  public async triggerTaskCreated(task: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.TASK_CREATED, task)
  }

  public async triggerTaskUpdated(task: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.TASK_UPDATED, task)
  }

  public async triggerTaskAssigned(task: any, assignee: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.TASK_ASSIGNED, task, assignee)
  }

  public async triggerTaskCompleted(task: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.TASK_COMPLETED, task)
  }

  public async triggerQuoteCreated(quote: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.QUOTE_CREATED, quote)
  }

  public async triggerQuoteSent(quote: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.QUOTE_SENT, quote)
  }

  public async triggerQuoteAccepted(quote: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.QUOTE_ACCEPTED, quote)
  }

  public async triggerInvoiceCreated(invoice: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.INVOICE_CREATED, invoice)
  }

  public async triggerInvoiceSent(invoice: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.INVOICE_SENT, invoice)
  }

  public async triggerPaymentReceived(payment: any, invoice: any): Promise<void> {
    await this.pluginManager.hooks.execute(
      BUILT_IN_HOOKS.PAYMENT_RECEIVED,
      payment,
      invoice
    )
  }

  public async triggerInvoicePaid(invoice: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.INVOICE_PAID, invoice)
  }

  public async triggerWebhookTriggered(webhook: any, payload: any): Promise<void> {
    await this.pluginManager.hooks.execute(
      BUILT_IN_HOOKS.WEBHOOK_TRIGGERED,
      webhook,
      payload
    )
  }

  public async triggerNotificationSent(notification: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.NOTIFICATION_SENT, notification)
  }

  public async triggerDataImport(importData: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.DATA_IMPORT, importData)
  }

  public async triggerApiRequest(request: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.API_REQUEST, request)
  }

  public async triggerApiResponse(response: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.API_RESPONSE, response)
  }

  public async triggerApiError(error: any): Promise<void> {
    await this.pluginManager.hooks.execute(BUILT_IN_HOOKS.API_ERROR, error)
  }

  private registerBuiltInHooks(): void {
    // Register logging for all hooks for debugging
    Object.values(BUILT_IN_HOOKS).forEach((hookName) => {
      this.pluginManager.hooks.register(hookName, (...args: any[]) => {
        logger.debug(`Hook triggered: ${hookName}`, {
          argsCount: args.length,
          timestamp: new Date().toISOString(),
        })
      })
    })

    logger.info("Built-in hooks registered", {
      hookCount: Object.keys(BUILT_IN_HOOKS).length,
    })
  }

  // Utility methods for plugin management
  public async installPlugin(pluginPath: string): Promise<void> {
    await this.pluginManager.install(pluginPath)
  }

  public async enablePlugin(pluginName: string): Promise<void> {
    await this.pluginManager.enable(pluginName)
  }

  public async disablePlugin(pluginName: string): Promise<void> {
    await this.pluginManager.disable(pluginName)
  }

  public async configurePlugin(
    pluginName: string,
    config: Record<string, any>
  ): Promise<void> {
    await this.pluginManager.configure(pluginName, config)
  }

  public getPluginStatus(pluginName: string) {
    return this.pluginManager.getStatus(pluginName)
  }

  public getAllPlugins() {
    return this.pluginManager.registry.getAll()
  }

  public getEnabledPlugins() {
    return this.pluginManager.registry.getEnabled()
  }

  public async healthCheck(pluginName?: string) {
    return await this.pluginManager.healthCheck(pluginName)
  }
}
