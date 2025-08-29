import { createServer } from "http"
import { createApp } from "./app"
import config from "./config/environment"
import { SocketService } from "./services/SocketService"
import { initializeDatabase } from "./utils/database-init"
import { logger } from "./utils/logger"

async function startServer() {
  try {
    // Initialize database connection
    logger.info("Initializing database connection...")
    await initializeDatabase({
      sync: config.env === "development",
      seed: config.env === "development",
    })

    // Create application instance
    const app = createApp()

    // Create HTTP server
    const httpServer = createServer(app.callback())

    // Initialize Socket.io
    const socketService = SocketService.getInstance()
    socketService.initialize(httpServer)

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
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`)

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
