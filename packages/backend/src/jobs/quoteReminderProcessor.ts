import * as cron from "node-cron"
import { QuoteReminderService } from "../services/QuoteReminderService"
import { logger } from "../utils/logger"

/**
 * Job to check quotes and send reminders automatically
 * Runs every day at 8:00 AM to check for quotes that need reminders
 */
class QuoteReminderProcessorJob {
  private task: cron.ScheduledTask | null = null

  /**
   * Start the scheduled job
   */
  public start(): void {
    // Schedule job to run every day at 8:00 AM
    this.task = cron.schedule(
      "0 8 * * *",
      async () => {
        await this.processQuoteReminders()
      },
      {
        timezone: process.env.REMINDER_TIMEZONE || "Europe/Paris", // Make configurable
      }
    )

    logger.info("Quote reminder processor job started - scheduled to run daily at 8:00 AM")
  }

  /**
   * Stop the scheduled job
   */
  public stop(): void {
    if (this.task) {
      this.task.stop()
      this.task = null
      logger.info("Quote reminder processor job stopped")
    }
  }

  /**
   * Process quote reminders immediately
   */
  public async processQuoteReminders(): Promise<void> {
    try {
      logger.info("Starting automatic quote reminder processing")

      const results = await QuoteReminderService.checkAndSendReminders()

      const successCount = results.filter((r) => r.success).length
      const failureCount = results.filter((r) => !r.success).length

      logger.info("Automatic quote reminder processing completed", {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      })

      // Log failures for investigation
      if (failureCount > 0) {
        const failures = results.filter((r) => !r.success)
        logger.warn("Some quote reminders failed to send", {
          failures: failures.map((f) => ({
            quoteNumber: f.quoteNumber,
            reminderType: f.reminderType,
            error: f.error,
          })),
        })
      }
    } catch (error) {
      logger.error("Error in automatic quote reminder processing", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  /**
   * Get job status
   */
  public getStatus(): { running: boolean; schedule: string } {
    return {
      running: this.task !== null,
      schedule: "0 8 * * * (daily at 8:00 AM)",
    }
  }
}

// Export singleton instance
export const quoteReminderProcessorJob = new QuoteReminderProcessorJob()

// Export class for testing
export { QuoteReminderProcessorJob }
