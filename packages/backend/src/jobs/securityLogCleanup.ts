import cron from "node-cron"
import { SecurityLog } from "../models/SecurityLog"

/**
 * Job to clean up old security logs
 * Runs daily at 2:00 AM
 */
export class SecurityLogCleanupJob {
  private static task: import("node-cron").ScheduledTask | null = null
  private static isRunning = false

  /**
   * Start the cleanup job
   */
  static start() {
    // Run daily at 2:00 AM
    this.task = cron.schedule("0 2 * * *", async () => {
      if (this.isRunning) {
        console.log("Security log cleanup already running, skipping...")
        return
      }

      this.isRunning = true
      console.log("Starting security log cleanup...")

      try {
        await this.runCleanup()
      } catch (error) {
        console.error("Security log cleanup failed:", error)
      } finally {
        this.isRunning = false
      }
    })

    console.log("Security log cleanup job scheduled (daily at 2:00 AM)")
  }

  /**
   * Stop the cleanup job
   */
  static stop() {
    if (this.task) {
      this.task.stop()
      this.task = null
      console.log("Security log cleanup job stopped")
    }
  }

  /**
   * Run the cleanup process
   */
  static async runCleanup() {
    const retentionDays = Number.parseInt(process.env.SECURITY_LOG_RETENTION_DAYS || "90")
    const criticalRetentionDays = Number.parseInt(
      process.env.SECURITY_LOG_CRITICAL_RETENTION_DAYS || "365"
    )

    console.log(`Cleaning up logs older than ${retentionDays} days...`)
    const regularDeleted = await SecurityLog.cleanupOldLogs(retentionDays)
    console.log(`Deleted ${regularDeleted} regular security logs`)

    console.log(
      `Cleaning up critical logs older than ${criticalRetentionDays} days...`
    )
    const criticalDeleted = await SecurityLog.cleanupCriticalLogs(
      criticalRetentionDays
    )
    console.log(`Deleted ${criticalDeleted} critical security logs`)

    console.log(
      `Security log cleanup completed. Total deleted: ${
        regularDeleted + criticalDeleted
      }`
    )
  }

  /**
   * Run cleanup manually (for testing)
   */
  static async runManual() {
    if (this.isRunning) {
      throw new Error("Cleanup is already running")
    }

    this.isRunning = true
    try {
      await this.runCleanup()
    } finally {
      this.isRunning = false
    }
  }
}
