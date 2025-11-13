import axios from "axios"
import { sequelize } from "../config/database"
import { logger } from "../utils/logger"

/**
 * Health Check Script
 *
 * Performs comprehensive health checks on the application:
 * - Database connectivity
 * - API endpoint availability
 * - External service dependencies
 */

interface HealthCheckResult {
  service: string
  status: "healthy" | "unhealthy" | "degraded"
  latency?: number
  message?: string
  details?: any
}

async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    await sequelize.authenticate()
    const latency = Date.now() - start

    // Also check if we can query
    await sequelize.query("SELECT 1", { type: "SELECT" })

    return {
      service: "database",
      status: "healthy",
      latency,
      message: "Database connection is working",
    }
  } catch (error) {
    return {
      service: "database",
      status: "unhealthy",
      latency: Date.now() - start,
      message: "Database connection failed",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

async function checkAPI(): Promise<HealthCheckResult> {
  const apiUrl = process.env.HEALTH_CHECK_URL || process.env.API_URL || "http://localhost:3000/api/health"
  const start = Date.now()

  try {
    const response = await axios.get(apiUrl, {
      timeout: 5000,
      validateStatus: (status) => status === 200,
    })

    const latency = Date.now() - start

    return {
      service: "api",
      status: "healthy",
      latency,
      message: "API is responding",
      details: response.data,
    }
  } catch (error) {
    return {
      service: "api",
      status: "unhealthy",
      latency: Date.now() - start,
      message: "API is not responding",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

async function checkDiskSpace(): Promise<HealthCheckResult> {
  try {
    // This is a basic check - in production you'd want to check actual disk usage
    const { promisify } = require("util")
    const exec = promisify(require("child_process").exec)

    try {
      const { stdout } = await exec("df -h / | tail -1 | awk '{print $5}' | sed 's/%//'")
      const usage = parseInt(stdout.trim())

      let status: "healthy" | "degraded" | "unhealthy" = "healthy"
      let message = `Disk usage: ${usage}%`

      if (usage > 90) {
        status = "unhealthy"
        message += " - Critical: disk space is running out!"
      } else if (usage > 75) {
        status = "degraded"
        message += " - Warning: disk space is getting low"
      }

      return {
        service: "disk",
        status,
        message,
        details: { usagePercent: usage },
      }
    } catch (error) {
      return {
        service: "disk",
        status: "healthy",
        message: "Disk check not available (Windows or restricted environment)",
      }
    }
  } catch (error) {
    return {
      service: "disk",
      status: "degraded",
      message: "Could not check disk space",
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

async function checkMemory(): Promise<HealthCheckResult> {
  const used = process.memoryUsage()
  const heapUsedMB = (used.heapUsed / 1024 / 1024).toFixed(2)
  const heapTotalMB = (used.heapTotal / 1024 / 1024).toFixed(2)
  const rssMB = (used.rss / 1024 / 1024).toFixed(2)

  const heapUsagePercent = (used.heapUsed / used.heapTotal) * 100

  let status: "healthy" | "degraded" | "unhealthy" = "healthy"
  let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent.toFixed(1)}%)`

  if (heapUsagePercent > 90) {
    status = "unhealthy"
    message += " - Critical memory usage!"
  } else if (heapUsagePercent > 75) {
    status = "degraded"
    message += " - High memory usage"
  }

  return {
    service: "memory",
    status,
    message,
    details: {
      heapUsedMB,
      heapTotalMB,
      rssMB,
      heapUsagePercent: heapUsagePercent.toFixed(2),
    },
  }
}

async function runHealthChecks(skipAPI = false): Promise<{
  overall: "healthy" | "unhealthy" | "degraded"
  checks: HealthCheckResult[]
  timestamp: string
}> {
  logger.info("🏥 Running health checks...")

  const checks = await Promise.all([
    checkDatabase(),
    checkMemory(),
    checkDiskSpace(),
    ...(skipAPI ? [] : [checkAPI()]),
  ])

  // Determine overall health
  let overall: "healthy" | "unhealthy" | "degraded" = "healthy"

  if (checks.some((check) => check.status === "unhealthy")) {
    overall = "unhealthy"
  } else if (checks.some((check) => check.status === "degraded")) {
    overall = "degraded"
  }

  return {
    overall,
    checks,
    timestamp: new Date().toISOString(),
  }
}

function printHealthReport(result: Awaited<ReturnType<typeof runHealthChecks>>) {
  logger.info("\n" + "=".repeat(80))
  logger.info("HEALTH CHECK REPORT")
  logger.info("=".repeat(80))

  const statusEmoji = {
    healthy: "✅",
    degraded: "⚠️ ",
    unhealthy: "❌",
  }

  logger.info(`\nOverall Status: ${statusEmoji[result.overall]} ${result.overall.toUpperCase()}`)
  logger.info(`Timestamp: ${result.timestamp}\n`)

  logger.info("Service Health:")
  logger.info("-".repeat(80))

  result.checks.forEach((check) => {
    const emoji = statusEmoji[check.status]
    logger.info(`${emoji} ${check.service.toUpperCase()}: ${check.status}`)
    logger.info(`   ${check.message}`)
    if (check.latency !== undefined) {
      logger.info(`   Latency: ${check.latency}ms`)
    }
    if (check.details) {
      logger.info(`   Details: ${JSON.stringify(check.details, null, 2)}`)
    }
    logger.info("")
  })

  logger.info("=".repeat(80))
}

// Run health check when script is executed directly
if (require.main === module) {
  const skipAPI = process.argv.includes("--skip-api")

  runHealthChecks(skipAPI)
    .then((result) => {
      printHealthReport(result)

      // Close database connection
      return sequelize.close().then(() => {
        // Exit with error code if unhealthy
        if (result.overall === "unhealthy") {
          process.exit(1)
        } else {
          process.exit(0)
        }
      })
    })
    .catch((error) => {
      logger.error("Health check failed:", error)
      process.exit(1)
    })
}

export { runHealthChecks, HealthCheckResult }
