import { createServer } from "http"
import { createApp } from "./app"
import config from "./config/environment"
import { PluginService } from "./services/PluginService"
import { SocketService } from "./services/SocketService"
import { TaskNotificationService } from "./services/TaskNotificationService"
import { WebhookJobProcessor } from "./services/WebhookJobProcessor"
import { initializeDatabase } from "./utils/database-init"
import { logger } from "./utils/logger"

async function startServer() {
  try {
    console.log("Starting server initialization...")

    // Initialize database connection
    logger.info("Initializing database connection...")
    await initializeDatabase({
      sync: config.env === "development",
      seed: config.env === "development",
    })
    console.log("Database initialized successfully")

    // Create application instance
    console.log("Creating app instance...")
    const app = createApp()
    console.log("App created successfully")

    // Create HTTP server
    console.log("Creating HTTP server...")
    const httpServer = createServer(app.callback())
    console.log("HTTP server created")

    // Initialize plugin system
    console.log("Initializing plugin system...")
    const pluginService = PluginService.getInstance()
    await pluginService.initialize()
    console.log("Plugin system initialized")

    // Initialize Socket.io
    console.log("Initializing Socket.io...")
    const socketService = SocketService.getInstance()
    socketService.initialize(httpServer)
    console.log("Socket.io initialized")

    // Start webhook job processor
    console.log("Starting webhook job processor...")
    const webhookJobProcessor = WebhookJobProcessor.getInstance()
    webhookJobProcessor.start()
    console.log("Webhook job processor started")

    // Start task notification processor
    console.log("Starting task notification processor...")
    const taskNotificationService = TaskNotificationService.getInstance()
    taskNotificationService.start()
    console.log("Task notification processor started")

    // Start server
    console.log("Starting server on port", config.port)
    const server = httpServer.listen(config.port, () => {
      console.log("✅ Server listening on port", config.port)
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
