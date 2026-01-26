import config from "../config/environment"
import { EmailService } from "./EmailService"
import { logger } from "../utils/logger"

interface ErrorAlert {
  error: Error
  status: number
  method: string
  url: string
  requestId: string
  userId?: string
  userAgent?: string
  ip?: string
  timestamp: Date
}

/**
 * AlertService - Sends email alerts for critical errors
 *
 * Throttles alerts to avoid email flooding:
 * - Maximum 1 email per error type per 5 minutes
 * - Maximum 10 emails per hour total
 */
export class AlertService {
  private emailService: EmailService
  private adminEmail: string | undefined
  private enabled: boolean

  // Throttling state
  private recentAlerts: Map<string, Date> = new Map()
  private hourlyAlertCount = 0
  private hourlyResetTime: Date = new Date()

  // Throttling config
  private static readonly THROTTLE_MINUTES = 5
  private static readonly MAX_HOURLY_ALERTS = 10

  constructor() {
    this.emailService = new EmailService()
    this.adminEmail = config.adminUser.email
    this.enabled = process.env.ALERT_EMAILS_ENABLED !== "false" && !!this.adminEmail

    if (this.enabled) {
      logger.info("AlertService initialized", {
        adminEmail: this.adminEmail,
        throttleMinutes: AlertService.THROTTLE_MINUTES,
        maxHourlyAlerts: AlertService.MAX_HOURLY_ALERTS,
      })
    } else {
      logger.info("AlertService disabled (no ADMIN_EMAIL configured or ALERT_EMAILS_ENABLED=false)")
    }
  }

  /**
   * Check if we should send an alert (throttling logic)
   */
  private shouldSendAlert(errorKey: string): boolean {
    if (!this.enabled) return false

    const now = new Date()

    // Reset hourly counter if needed
    const hoursSinceReset = (now.getTime() - this.hourlyResetTime.getTime()) / (1000 * 60 * 60)
    if (hoursSinceReset >= 1) {
      this.hourlyAlertCount = 0
      this.hourlyResetTime = now
    }

    // Check hourly limit
    if (this.hourlyAlertCount >= AlertService.MAX_HOURLY_ALERTS) {
      logger.debug("Alert throttled: hourly limit reached", {
        count: this.hourlyAlertCount,
        limit: AlertService.MAX_HOURLY_ALERTS,
      })
      return false
    }

    // Check per-error-type throttle
    const lastAlert = this.recentAlerts.get(errorKey)
    if (lastAlert) {
      const minutesSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60)
      if (minutesSinceLastAlert < AlertService.THROTTLE_MINUTES) {
        logger.debug("Alert throttled: same error type recently sent", {
          errorKey,
          minutesSinceLastAlert,
          throttleMinutes: AlertService.THROTTLE_MINUTES,
        })
        return false
      }
    }

    return true
  }

  /**
   * Record that an alert was sent
   */
  private recordAlert(errorKey: string): void {
    this.recentAlerts.set(errorKey, new Date())
    this.hourlyAlertCount++

    // Clean up old entries (older than throttle period)
    const cutoff = new Date(Date.now() - AlertService.THROTTLE_MINUTES * 60 * 1000)
    for (const [key, time] of this.recentAlerts) {
      if (time < cutoff) {
        this.recentAlerts.delete(key)
      }
    }
  }

  /**
   * Generate a unique key for error deduplication
   */
  private getErrorKey(alert: ErrorAlert): string {
    // Group by error message and URL pattern (remove IDs from URLs)
    const urlPattern = alert.url.replace(/[0-9a-f-]{36}/gi, ":id")
    return `${alert.error.message}|${alert.method}|${urlPattern}`
  }

  /**
   * Send an alert for a critical error (5xx)
   */
  public async sendCriticalErrorAlert(alert: ErrorAlert): Promise<void> {
    if (!this.enabled || !this.adminEmail) {
      return
    }

    const errorKey = this.getErrorKey(alert)

    if (!this.shouldSendAlert(errorKey)) {
      return
    }

    const subject = `[ALERTE CRM] Erreur ${alert.status} - ${alert.error.message.substring(0, 50)}`

    const html = `
      <h2 style="color: #d32f2f;">Erreur critique sur le CRM</h2>

      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Date</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.timestamp.toISOString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Status</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.status}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Requête</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.method} ${alert.url}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Request ID</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.requestId}</td>
        </tr>
        ${alert.userId ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">User ID</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.userId}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">IP</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.ip || "unknown"}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">User Agent</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${alert.userAgent || "unknown"}</td>
        </tr>
      </table>

      <h3 style="color: #d32f2f; margin-top: 20px;">Message d'erreur</h3>
      <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto;">${alert.error.message}</pre>

      <h3 style="color: #666; margin-top: 20px;">Stack Trace</h3>
      <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; font-size: 12px; overflow-x: auto;">${alert.error.stack || "No stack trace available"}</pre>

      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        Cette alerte est envoyée automatiquement par le système de monitoring du CRM.
        <br>
        Limite: ${AlertService.MAX_HOURLY_ALERTS} alertes/heure, 1 alerte/${AlertService.THROTTLE_MINUTES}min par type d'erreur.
      </p>
    `

    try {
      const result = await this.emailService.sendEmail({
        to: this.adminEmail,
        subject,
        html,
      })

      if (result.success) {
        this.recordAlert(errorKey)
        logger.info("Critical error alert sent", {
          to: this.adminEmail,
          errorKey,
          status: alert.status,
        })
      } else {
        logger.error("Failed to send critical error alert", {
          error: result.error,
          to: this.adminEmail,
        })
      }
    } catch (error) {
      logger.error("Exception while sending critical error alert", {
        error: (error as Error).message,
      })
    }
  }
}

// Singleton instance
let alertServiceInstance: AlertService | null = null

export const getAlertService = (): AlertService => {
  if (!alertServiceInstance) {
    alertServiceInstance = new AlertService()
  }
  return alertServiceInstance
}

export default AlertService
