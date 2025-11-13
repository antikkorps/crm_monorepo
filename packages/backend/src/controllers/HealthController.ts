import { Context } from "../types/koa"
import { sequelize } from "../config/database"
import { logger } from "../utils/logger"

/**
 * Health Check Controller
 *
 * Provides health check endpoints for monitoring and load balancers
 */

interface HealthCheckResponse {
  status: "healthy" | "unhealthy" | "degraded"
  timestamp: string
  uptime: number
  environment: string
  version: string
  services: {
    database: {
      status: "healthy" | "unhealthy"
      latency?: number
      message?: string
    }
    memory: {
      status: "healthy" | "degraded" | "unhealthy"
      usage: {
        heapUsedMB: string
        heapTotalMB: string
        rssMB: string
        heapUsagePercent: string
      }
    }
  }
}

export class HealthController {
  /**
   * GET /api/health
   * Basic health check endpoint - returns 200 if service is up
   */
  static async basic(ctx: Context) {
    ctx.status = 200
    ctx.body = {
      status: "ok",
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /api/health/detailed
   * Detailed health check with database and service status
   */
  static async detailed(ctx: Context) {
    try {
      // Check database
      const dbStart = Date.now()
      let databaseStatus: "healthy" | "unhealthy" = "healthy"
      let dbLatency: number | undefined = undefined
      let dbMessage = "Database connection is working"

      try {
        await sequelize.authenticate()
        await sequelize.query("SELECT 1", { type: "SELECT" })
        dbLatency = Date.now() - dbStart
      } catch (error) {
        databaseStatus = "unhealthy"
        dbMessage = "Database connection failed"
        logger.error("Health check database error:", error)
      }

      // Check memory
      const used = process.memoryUsage()
      const heapUsedMB = (used.heapUsed / 1024 / 1024).toFixed(2)
      const heapTotalMB = (used.heapTotal / 1024 / 1024).toFixed(2)
      const rssMB = (used.rss / 1024 / 1024).toFixed(2)
      const heapUsagePercent = ((used.heapUsed / used.heapTotal) * 100).toFixed(2)

      let memoryStatus: "healthy" | "degraded" | "unhealthy" = "healthy"
      if (parseFloat(heapUsagePercent) > 90) {
        memoryStatus = "unhealthy"
      } else if (parseFloat(heapUsagePercent) > 75) {
        memoryStatus = "degraded"
      }

      // Determine overall status
      let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy"
      if (databaseStatus === "unhealthy" || memoryStatus === "unhealthy") {
        overallStatus = "unhealthy"
      } else if (memoryStatus === "degraded") {
        overallStatus = "degraded"
      }

      const response: HealthCheckResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        version: process.env.npm_package_version || "1.0.0",
        services: {
          database: {
            status: databaseStatus,
            latency: dbLatency,
            message: dbMessage,
          },
          memory: {
            status: memoryStatus,
            usage: {
              heapUsedMB,
              heapTotalMB,
              rssMB,
              heapUsagePercent,
            },
          },
        },
      }

      // Set appropriate HTTP status code
      if (overallStatus === "unhealthy") {
        ctx.status = 503 // Service Unavailable
      } else if (overallStatus === "degraded") {
        ctx.status = 200 // Still return 200 for degraded state
      } else {
        ctx.status = 200
      }

      ctx.body = response
    } catch (error) {
      logger.error("Health check error:", error)
      ctx.status = 503
      ctx.body = {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * GET /api/health/ready
   * Readiness probe - checks if service is ready to accept traffic
   */
  static async ready(ctx: Context) {
    try {
      // Check database connectivity
      await sequelize.authenticate()

      ctx.status = 200
      ctx.body = {
        ready: true,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      logger.error("Readiness check failed:", error)
      ctx.status = 503
      ctx.body = {
        ready: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Service not ready",
      }
    }
  }

  /**
   * GET /api/health/live
   * Liveness probe - checks if service is alive (for Kubernetes)
   */
  static async live(ctx: Context) {
    // Simple liveness check - if we can respond, we're alive
    ctx.status = 200
    ctx.body = {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }
}
