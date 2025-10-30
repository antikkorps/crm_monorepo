import { createServer } from "http"
import { createApp } from "./app"
import config from "./config/environment"
import { PluginService } from "./services/PluginService"
import { SocketService } from "./services/SocketService"
import { TaskNotificationService } from "./services/TaskNotificationService"
import { WebhookJobProcessor } from "./services/WebhookJobProcessor"
import { SecurityLogCleanupJob } from "./jobs/securityLogCleanup"
import { reminderProcessorJob } from "./jobs/reminderProcessor"
import { initializeDatabase } from "./utils/database-init"
import { logger } from "./utils/logger"

async function startServer() {
  try {
    console.log("Starting server initialization...")

    // Initialize database connection
    const shouldSync = config.env === "development" || config.database.syncOnStart

    logger.info("Initializing database connection...", {
      environment: config.env,
      syncOnStart: config.database.syncOnStart,
      willSync: shouldSync,
    })

    await initializeDatabase({
      sync: shouldSync,
      seed: config.env === "development",
    })
    // Create application instance
    const app = createApp()

    // Create HTTP server
    const httpServer = createServer(app.callback())

    // Initialize plugin system
    const pluginService = PluginService.getInstance()
    await pluginService.initialize()

    // Initialize Socket.io
    const socketService = SocketService.getInstance()
    socketService.initialize(httpServer)

    // Start webhook job processor
    const webhookJobProcessor = WebhookJobProcessor.getInstance()
    webhookJobProcessor.start()

    // Start task notification processor
    const taskNotificationService = TaskNotificationService.getInstance()
    taskNotificationService.start()

    // Start security log cleanup job
    SecurityLogCleanupJob.start()

    // Start reminder processor job
    reminderProcessorJob.start()

    // Start server
    const server = httpServer.listen(config.port, () => {
      logger.info(`🚀 Medical CRM Backend server started`, {
        port: config.port,
        environment: config.env,
        nodeVersion: process.version,
        socketIO: "enabled",
      })
    })

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`)

      // Stop webhook job processor
      webhookJobProcessor.stop()

      // Stop security log cleanup job
      SecurityLogCleanupJob.stop()

      // Stop reminder processor job
      reminderProcessorJob.stop()

      // Shutdown plugin system
      await pluginService.shutdown()

      server.close(() => {
        logger.info("Server closed")
        process.exit(0)
      })

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout")
        process.exit(1)
      }, 10000)
    }

    // Handle shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
    process.on("SIGINT", () => gracefulShutdown("SIGINT"))

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", { error: error.message, stack: error.stack })
      process.exit(1)
    })

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled rejection", { reason, promise })
      process.exit(1)
    })
  } catch (error) {
    logger.error("Failed to start server", { error })
    process.exit(1)
  }
}

// Start the server
startServer()
