import { logger } from "../utils/logger"
import { WebhookService } from "./WebhookService"

/**
 * Background job processor for webhook retries and cleanup
 */
export class WebhookJobProcessor {
  private static instance: WebhookJobProcessor
  private retryInterval: NodeJS.Timeout | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  private isRunning = false

  private constructor() {}

  public static getInstance(): WebhookJobProcessor {
    if (!WebhookJobProcessor.instance) {
      WebhookJobProcessor.instance = new WebhookJobProcessor()
    }
    return WebhookJobProcessor.instance
  }

  /**
   * Start the webhook job processor
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn("Webhook job processor is already running")
      return
    }

    this.isRunning = true
    logger.info("Starting webhook job processor")

    // Process retries every 30 seconds
    this.retryInterval = setInterval(async () => {
      try {
        await WebhookService.processRetries()
      } catch (error) {
        logger.error("Error processing webhook retries", {
          error: (error as Error).message,
        })
      }
    }, 30000) // 30 seconds

    // Clean up old logs every hour
    this.cleanupInterval = setInterval(async () => {
      try {
        const deletedCount = await WebhookService.cleanupOldLogs(30) // Keep logs for 30 days
        if (deletedCount > 0) {
          logger.info("Cleaned up old webhook logs", { deletedCount })
        }
      } catch (error) {
        logger.error("Error cleaning up webhook logs", {
          error: (error as Error).message,
        })
      }
    }, 3600000) // 1 hour

    logger.info("Webhook job processor started successfully")
  }

  /**
   * Stop the webhook job processor
   */
  public stop(): void {
    if (!this.isRunning) {
      logger.warn("Webhook job processor is not running")
      return
    }

    logger.info("Stopping webhook job processor")

    if (this.retryInterval) {
      clearInterval(this.retryInterval)
      this.retryInterval = null
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    this.isRunning = false
    logger.info("Webhook job processor stopped")
  }

  /**
   * Get processor status
   */
  public getStatus(): {
    isRunning: boolean
    retryIntervalActive: boolean
    cleanupIntervalActive: boolean
  } {
    return {
      isRunning: this.isRunning,
      retryIntervalActive: this.retryInterval !== null,
      cleanupIntervalActive: this.cleanupInterval !== null,
    }
  }

  /**
   * Manually trigger retry processing
   */
  public async processRetries(): Promise<void> {
    try {
      await WebhookService.processRetries()
      logger.info("Manual webhook retry processing completed")
    } catch (error) {
      logger.error("Manual webhook retry processing failed", {
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Manually trigger log cleanup
   */
  public async cleanupLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const deletedCount = await WebhookService.cleanupOldLogs(daysToKeep)
      logger.info("Manual webhook log cleanup completed", { deletedCount, daysToKeep })
      return deletedCount
    } catch (error) {
      logger.error("Manual webhook log cleanup failed", {
        error: (error as Error).message,
        daysToKeep,
      })
      throw error
    }
  }
}
