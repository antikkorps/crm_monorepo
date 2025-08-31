import axios, { AxiosResponse } from "axios"
import crypto from "crypto"
import { createError } from "../middleware/errorHandler"
import { User } from "../models/User"
import { Webhook, WebhookEvent, WebhookStatus } from "../models/Webhook"
import { WebhookLog, WebhookLogStatus } from "../models/WebhookLog"
import { logger } from "../utils/logger"

export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, any>
  webhook_id: string
}

export interface WebhookDeliveryResult {
  success: boolean
  httpStatus?: number
  responseBody?: string
  errorMessage?: string
  duration: number
}

export class WebhookService {
  /**
   * Trigger webhooks for a specific event
   */
  static async triggerEvent(
    event: WebhookEvent,
    data: Record<string, any>,
    userId?: string
  ): Promise<void> {
    try {
      // Find all active webhooks that should be triggered for this event
      const webhooks = await Webhook.findAll({
        where: {
          isActive: true,
          status: WebhookStatus.ACTIVE,
        },
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "email", "firstName", "lastName"],
          },
        ],
      })

      const triggeredWebhooks = webhooks.filter((webhook) => webhook.shouldTrigger(event))

      if (triggeredWebhooks.length === 0) {
        logger.debug("No webhooks to trigger for event", {
          event,
          dataKeys: Object.keys(data),
        })
        return
      }

      logger.info("Triggering webhooks for event", {
        event,
        webhookCount: triggeredWebhooks.length,
        userId,
      })

      // Create webhook logs and trigger deliveries
      const deliveryPromises = triggeredWebhooks.map(async (webhook) => {
        try {
          // Create webhook log entry
          const webhookLog = await WebhookLog.create({
            webhookId: webhook.id,
            event,
            payload: data,
            status: WebhookLogStatus.PENDING,
            attemptCount: 0,
            maxAttempts: webhook.maxRetries + 1, // Include initial attempt
          })

          // Update webhook trigger timestamp
          await webhook.recordTrigger()

          // Attempt delivery (don't await to allow parallel processing)
          this.deliverWebhook(webhook, webhookLog).catch((error) => {
            logger.error("Webhook delivery failed", {
              webhookId: webhook.id,
              logId: webhookLog.id,
              error: error.message,
            })
          })
        } catch (error) {
          logger.error("Failed to create webhook log", {
            webhookId: webhook.id,
            event,
            error: (error as Error).message,
          })
        }
      })

      // Wait for all webhook logs to be created
      await Promise.allSettled(deliveryPromises)
    } catch (error) {
      logger.error("Failed to trigger webhooks for event", {
        event,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Deliver a webhook to its endpoint
   */
  static async deliverWebhook(
    webhook: Webhook,
    webhookLog: WebhookLog
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now()

    try {
      // Prepare payload
      const payload: WebhookPayload = {
        event: webhookLog.event,
        timestamp: new Date().toISOString(),
        data: webhookLog.payload,
        webhook_id: webhook.id,
      }

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Medical-CRM-Webhook/1.0",
        "X-Webhook-Event": webhookLog.event,
        "X-Webhook-ID": webhook.id,
        "X-Webhook-Delivery": webhookLog.id,
        ...webhook.headers,
      }

      // Add signature if secret is configured
      if (webhook.secret) {
        const signature = this.generateSignature(JSON.stringify(payload), webhook.secret)
        headers["X-Webhook-Signature"] = signature
      }

      // Make HTTP request
      const response: AxiosResponse = await axios.post(webhook.url, payload, {
        headers,
        timeout: webhook.timeout,
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors
      })

      const duration = Date.now() - startTime
      const isSuccess = response.status >= 200 && response.status < 300

      if (isSuccess) {
        // Mark as successful
        await webhookLog.markSuccess(response.status, JSON.stringify(response.data))
        await webhook.recordSuccess()

        logger.info("Webhook delivered successfully", {
          webhookId: webhook.id,
          logId: webhookLog.id,
          httpStatus: response.status,
          duration,
        })

        return {
          success: true,
          httpStatus: response.status,
          responseBody: JSON.stringify(response.data),
          duration,
        }
      } else {
        // Mark as failed
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`
        await webhookLog.markFailed(
          errorMessage,
          response.status,
          JSON.stringify(response.data)
        )
        await webhook.recordFailure()

        logger.warn("Webhook delivery failed with HTTP error", {
          webhookId: webhook.id,
          logId: webhookLog.id,
          httpStatus: response.status,
          duration,
        })

        return {
          success: false,
          httpStatus: response.status,
          responseBody: JSON.stringify(response.data),
          errorMessage,
          duration,
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = (error as Error).message

      // Mark as failed
      await webhookLog.markFailed(errorMessage)
      await webhook.recordFailure()

      logger.error("Webhook delivery failed with exception", {
        webhookId: webhook.id,
        logId: webhookLog.id,
        error: errorMessage,
        duration,
      })

      return {
        success: false,
        errorMessage,
        duration,
      }
    }
  }

  /**
   * Process webhook retries
   */
  static async processRetries(): Promise<void> {
    try {
      const retryableLogs = await WebhookLog.getRetryableLogs()

      if (retryableLogs.length === 0) {
        return
      }

      logger.info("Processing webhook retries", { count: retryableLogs.length })

      const retryPromises = retryableLogs.map(async (webhookLog) => {
        if (!webhookLog.webhook) {
          logger.warn("Webhook log has no associated webhook", { logId: webhookLog.id })
          return
        }

        try {
          await webhookLog.markRetrying()
          await this.deliverWebhook(webhookLog.webhook, webhookLog)
        } catch (error) {
          logger.error("Failed to retry webhook delivery", {
            webhookId: webhookLog.webhookId,
            logId: webhookLog.id,
            error: (error as Error).message,
          })
        }
      })

      await Promise.allSettled(retryPromises)
    } catch (error) {
      logger.error("Failed to process webhook retries", {
        error: (error as Error).message,
      })
    }
  }

  /**
   * Test webhook delivery
   */
  static async testWebhook(
    webhookId: string,
    userId: string
  ): Promise<WebhookDeliveryResult> {
    const webhook = await Webhook.findByPk(webhookId)
    if (!webhook) {
      throw createError("Webhook not found", 404, "WEBHOOK_NOT_FOUND")
    }

    // Create test payload
    const testPayload = {
      test: true,
      message: "This is a test webhook delivery",
      timestamp: new Date().toISOString(),
      user_id: userId,
    }

    // Create temporary webhook log for testing
    const webhookLog = await WebhookLog.create({
      webhookId: webhook.id,
      event: WebhookEvent.USER_UPDATED, // Use a generic event for testing
      payload: testPayload,
      status: WebhookLogStatus.PENDING,
      attemptCount: 0,
      maxAttempts: 1, // Only one attempt for testing
    })

    try {
      const result = await this.deliverWebhook(webhook, webhookLog)

      logger.info("Webhook test completed", {
        webhookId,
        userId,
        success: result.success,
        httpStatus: result.httpStatus,
      })

      return result
    } catch (error) {
      logger.error("Webhook test failed", {
        webhookId,
        userId,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private static generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac("sha256", secret)
    hmac.update(payload)
    return `sha256=${hmac.digest("hex")}`
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret)
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  }

  /**
   * Get webhook statistics
   */
  static async getWebhookStats(webhookId: string): Promise<{
    totalDeliveries: number
    successfulDeliveries: number
    failedDeliveries: number
    successRate: number
    lastDelivery?: Date
    lastSuccess?: Date
    lastFailure?: Date
  }> {
    const webhook = await Webhook.findByPk(webhookId)
    if (!webhook) {
      throw createError("Webhook not found", 404, "WEBHOOK_NOT_FOUND")
    }

    const [totalDeliveries, successfulDeliveries, failedDeliveries] = await Promise.all([
      WebhookLog.count({ where: { webhookId } }),
      WebhookLog.count({ where: { webhookId, status: WebhookLogStatus.SUCCESS } }),
      WebhookLog.count({ where: { webhookId, status: WebhookLogStatus.FAILED } }),
    ])

    const successRate =
      totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      successRate: Math.round(successRate * 100) / 100,
      lastDelivery: webhook.lastTriggeredAt || undefined,
      lastSuccess: webhook.lastSuccessAt || undefined,
      lastFailure: webhook.lastFailureAt || undefined,
    }
  }

  /**
   * Clean up old webhook logs
   */
  static async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const deletedCount = await WebhookLog.destroy({
      where: {
        createdAt: {
          [require("sequelize").Op.lt]: cutoffDate,
        },
      },
    })

    logger.info("Cleaned up old webhook logs", {
      deletedCount,
      cutoffDate: cutoffDate.toISOString(),
    })

    return deletedCount
  }
}
