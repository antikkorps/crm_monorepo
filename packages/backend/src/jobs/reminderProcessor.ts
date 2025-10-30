import * as cron from "node-cron"
import { ReminderService } from "../services/ReminderService"
import { logger } from "../utils/logger"

/**
 * Job to process reminders automatically every day at 9:00 AM
 */
class ReminderProcessorJob {
  private reminderService: ReminderService
  private task: cron.ScheduledTask | null = null

  constructor() {
    this.reminderService = ReminderService.getInstance()
  }

  /**
   * Start the scheduled job
   */
  public start(): void {
    // Schedule job to run every day at 9:00 AM
    this.task = cron.schedule("0 9 * * *", async () => {
      await this.processReminders()
    }, {
      timezone: process.env.REMINDER_TIMEZONE || "Europe/Paris" // Make configurable
    })

    logger.info("Reminder processor job started - scheduled to run daily at 9:00 AM")
  }

  /**
   * Stop the scheduled job
   */
  public stop(): void {
    if (this.task) {
      this.task.stop()
      this.task = null
      logger.info("Reminder processor job stopped")
    }
  }

  /**
   * Process reminders immediately
   */
  public async processReminders(): Promise<void> {
    try {
      logger.info("Starting automatic reminder processing")
      
      await this.reminderService.processAllReminders()
      
      logger.info("Automatic reminder processing completed successfully")
    } catch (error) {
      logger.error("Error in automatic reminder processing", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    }
  }

  /**
   * Get job status
   */
  public getStatus(): { running: boolean; nextRun?: Date } {
    return {
      running: this.task !== null,
      // Note: node-cron doesn't provide easy access to next run time
      // This would need to be calculated manually if needed
    }
  }
}

// Export singleton instance
export const reminderProcessorJob = new ReminderProcessorJob()

// Export class for testing
export { ReminderProcessorJob }