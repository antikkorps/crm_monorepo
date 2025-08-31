/**
 * Example Logger Plugin
 *
 * This plugin demonstrates the basic plugin architecture by logging
 * various system events. It's useful for understanding how plugins work
 * and for debugging system behavior.
 */

class ExampleLoggerPlugin {
  constructor() {
    this.manifest = require("./package.json")
    this.context = null
    this.eventHandlers = new Map()
  }

  /**
   * Plugin lifecycle: Called when plugin is loaded
   */
  async onLoad(context) {
    this.context = context
    context.logger.info("Example Logger Plugin loaded", {
      plugin: this.manifest.name,
      version: this.manifest.version,
    })
  }

  /**
   * Plugin lifecycle: Called when plugin is unloaded
   */
  async onUnload(context) {
    context.logger.info("Example Logger Plugin unloaded", {
      plugin: this.manifest.name,
    })
    this.context = null
  }

  /**
   * Plugin lifecycle: Called when plugin is enabled
   */
  async onEnable(context) {
    this.context = context
    context.logger.info("Example Logger Plugin enabled", {
      plugin: this.manifest.name,
      enabledEvents: context.config.enabledEvents,
    })

    // Register event handlers for enabled events
    this.registerEventHandlers(context)
  }

  /**
   * Plugin lifecycle: Called when plugin is disabled
   */
  async onDisable(context) {
    context.logger.info("Example Logger Plugin disabled", {
      plugin: this.manifest.name,
    })

    // Unregister all event handlers
    this.unregisterEventHandlers(context)
  }

  /**
   * Plugin lifecycle: Called when configuration changes
   */
  async onConfigChange(config, context) {
    context.logger.info("Example Logger Plugin configuration changed", {
      plugin: this.manifest.name,
      newConfig: Object.keys(config),
    })

    // Re-register handlers with new configuration
    this.unregisterEventHandlers(context)
    this.registerEventHandlers(context)
  }

  /**
   * Validate plugin configuration
   */
  async validateConfig(config) {
    // Validate log level
    const validLevels = ["debug", "info", "warn", "error"]
    if (config.logLevel && !validLevels.includes(config.logLevel)) {
      throw new Error(
        `Invalid log level: ${config.logLevel}. Must be one of: ${validLevels.join(", ")}`
      )
    }

    // Validate enabled events
    if (config.enabledEvents && !Array.isArray(config.enabledEvents)) {
      throw new Error("enabledEvents must be an array")
    }

    return true
  }

  /**
   * Health check for the plugin
   */
  async healthCheck(context) {
    try {
      const registeredEvents = Array.from(this.eventHandlers.keys())

      return {
        status: "healthy",
        message: "Example Logger Plugin is working correctly",
        details: {
          registeredEvents: registeredEvents.length,
          events: registeredEvents,
          config: context.config,
        },
        lastCheck: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: "unhealthy",
        message: `Plugin error: ${error.message}`,
        lastError: new Date().toISOString(),
      }
    }
  }

  /**
   * Register event handlers based on configuration
   */
  registerEventHandlers(context) {
    const enabledEvents = context.config.enabledEvents || []

    enabledEvents.forEach((eventName) => {
      const handler = this.createEventHandler(eventName)
      this.eventHandlers.set(eventName, handler)
      context.hooks.register(eventName, handler)

      context.logger.debug("Registered event handler", {
        plugin: this.manifest.name,
        event: eventName,
      })
    })
  }

  /**
   * Unregister all event handlers
   */
  unregisterEventHandlers(context) {
    this.eventHandlers.forEach((handler, eventName) => {
      context.hooks.unregister(eventName, handler)
      context.logger.debug("Unregistered event handler", {
        plugin: this.manifest.name,
        event: eventName,
      })
    })

    this.eventHandlers.clear()
  }

  /**
   * Create an event handler for a specific event
   */
  createEventHandler(eventName) {
    return (...args) => {
      try {
        this.logEvent(eventName, args)
      } catch (error) {
        this.context.logger.error("Error in event handler", {
          plugin: this.manifest.name,
          event: eventName,
          error: error.message,
        })
      }
    }
  }

  /**
   * Log an event with appropriate detail level
   */
  logEvent(eventName, args) {
    const config = this.context.config
    const logLevel = config.logLevel || "info"

    const logData = {
      plugin: this.manifest.name,
      event: eventName,
      timestamp: new Date().toISOString(),
      argsCount: args.length,
    }

    // Add detailed data if configured
    if (config.includeDetails && args.length > 0) {
      logData.eventData = this.sanitizeEventData(args)
    }

    // Log at configured level
    this.context.logger[logLevel](`Event: ${eventName}`, logData)

    // Special handling for specific events
    this.handleSpecificEvents(eventName, args)
  }

  /**
   * Handle specific events with custom logic
   */
  handleSpecificEvents(eventName, args) {
    switch (eventName) {
      case "user:created":
        if (args[0]) {
          this.context.logger.info("New user registered", {
            plugin: this.manifest.name,
            userEmail: args[0].email,
            userRole: args[0].role,
          })
        }
        break

      case "user:login":
        if (args[0]) {
          this.context.logger.info("User logged in", {
            plugin: this.manifest.name,
            userEmail: args[0].email,
            loginTime: new Date().toISOString(),
          })
        }
        break

      case "institution:created":
        if (args[0]) {
          this.context.logger.info("New medical institution added", {
            plugin: this.manifest.name,
            institutionName: args[0].name,
            institutionType: args[0].type,
          })
        }
        break

      case "task:created":
        if (args[0]) {
          this.context.logger.info("New task created", {
            plugin: this.manifest.name,
            taskTitle: args[0].title,
            taskPriority: args[0].priority,
            assigneeId: args[0].assigneeId,
          })
        }
        break

      case "invoice:created":
        if (args[0]) {
          this.context.logger.info("New invoice generated", {
            plugin: this.manifest.name,
            invoiceNumber: args[0].invoiceNumber,
            total: args[0].total,
            institutionId: args[0].institutionId,
          })
        }
        break

      case "payment:received":
        if (args[0] && args[1]) {
          this.context.logger.info("Payment received", {
            plugin: this.manifest.name,
            paymentAmount: args[0].amount,
            paymentMethod: args[0].paymentMethod,
            invoiceNumber: args[1].invoiceNumber,
          })
        }
        break

      default:
        // Generic event logging
        this.context.logger.debug("Generic event logged", {
          plugin: this.manifest.name,
          event: eventName,
        })
    }
  }

  /**
   * Sanitize event data for logging (remove sensitive information)
   */
  sanitizeEventData(args) {
    return args.map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        const sanitized = { ...arg }

        // Remove sensitive fields
        delete sanitized.password
        delete sanitized.passwordHash
        delete sanitized.token
        delete sanitized.refreshToken
        delete sanitized.apiKey
        delete sanitized.secret

        // Truncate long strings
        Object.keys(sanitized).forEach((key) => {
          if (typeof sanitized[key] === "string" && sanitized[key].length > 100) {
            sanitized[key] = sanitized[key].substring(0, 100) + "..."
          }
        })

        return sanitized
      }
      return arg
    })
  }

  /**
   * Get plugin statistics
   */
  getStats() {
    return {
      plugin: this.manifest.name,
      version: this.manifest.version,
      registeredEvents: Array.from(this.eventHandlers.keys()),
      eventCount: this.eventHandlers.size,
      isEnabled: this.eventHandlers.size > 0,
      lastActivity: new Date().toISOString(),
    }
  }
}

// Export plugin instance
module.exports = new ExampleLoggerPlugin()
