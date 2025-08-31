import { WebhookEvent } from "../models/Webhook"
import { WebhookService } from "../services/WebhookService"
import { logger } from "./logger"

/**
 * Utility class to trigger webhooks for various events
 * This provides a centralized way to trigger webhooks from any service
 */
export class WebhookTrigger {
  /**
   * Trigger webhook for medical institution events
   */
  static async triggerInstitutionEvent(
    event:
      | WebhookEvent.INSTITUTION_CREATED
      | WebhookEvent.INSTITUTION_UPDATED
      | WebhookEvent.INSTITUTION_DELETED,
    institution: any,
    userId?: string
  ): Promise<void> {
    try {
      const payload = {
        institution: {
          id: institution.id,
          name: institution.name,
          type: institution.type,
          address: institution.address,
          assignedUserId: institution.assignedUserId,
          createdAt: institution.createdAt,
          updatedAt: institution.updatedAt,
        },
        triggeredBy: userId,
      }

      await WebhookService.triggerEvent(event, payload, userId)
    } catch (error) {
      logger.error("Failed to trigger institution webhook", {
        event,
        institutionId: institution.id,
        userId,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Trigger webhook for quote events
   */
  static async triggerQuoteEvent(
    event:
      | WebhookEvent.QUOTE_CREATED
      | WebhookEvent.QUOTE_UPDATED
      | WebhookEvent.QUOTE_ACCEPTED
      | WebhookEvent.QUOTE_REJECTED,
    quote: any,
    userId?: string
  ): Promise<void> {
    try {
      const payload = {
        quote: {
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          institutionId: quote.institutionId,
          assignedUserId: quote.assignedUserId,
          title: quote.title,
          status: quote.status,
          total: quote.total,
          validUntil: quote.validUntil,
          createdAt: quote.createdAt,
          updatedAt: quote.updatedAt,
        },
        triggeredBy: userId,
      }

      await WebhookService.triggerEvent(event, payload, userId)
    } catch (error) {
      logger.error("Failed to trigger quote webhook", {
        event,
        quoteId: quote.id,
        userId,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Trigger webhook for invoice events
   */
  static async triggerInvoiceEvent(
    event:
      | WebhookEvent.INVOICE_CREATED
      | WebhookEvent.INVOICE_UPDATED
      | WebhookEvent.INVOICE_PAID,
    invoice: any,
    userId?: string
  ): Promise<void> {
    try {
      const payload = {
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          institutionId: invoice.institutionId,
          assignedUserId: invoice.assignedUserId,
          quoteId: invoice.quoteId,
          title: invoice.title,
          status: invoice.status,
          total: invoice.total,
          totalPaid: invoice.totalPaid,
          remainingAmount: invoice.remainingAmount,
          dueDate: invoice.dueDate,
          createdAt: invoice.createdAt,
          updatedAt: invoice.updatedAt,
        },
        triggeredBy: userId,
      }

      await WebhookService.triggerEvent(event, payload, userId)
    } catch (error) {
      logger.error("Failed to trigger invoice webhook", {
        event,
        invoiceId: invoice.id,
        userId,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Trigger webhook for payment events
   */
  static async triggerPaymentEvent(
    event: WebhookEvent.PAYMENT_RECEIVED,
    payment: any,
    invoice: any,
    userId?: string
  ): Promise<void> {
    try {
      const payload = {
        payment: {
          id: payment.id,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          reference: payment.reference,
          createdAt: payment.createdAt,
        },
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          institutionId: invoice.institutionId,
          total: invoice.total,
          totalPaid: invoice.totalPaid,
          remainingAmount: invoice.remainingAmount,
          status: invoice.status,
        },
        triggeredBy: userId,
      }

      await WebhookService.triggerEvent(event, payload, userId)
    } catch (error) {
      logger.error("Failed to trigger payment webhook", {
        event,
        paymentId: payment.id,
        invoiceId: invoice.id,
        userId,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Trigger webhook for task events
   */
  static async triggerTaskEvent(
    event:
      | WebhookEvent.TASK_CREATED
      | WebhookEvent.TASK_UPDATED
      | WebhookEvent.TASK_COMPLETED,
    task: any,
    userId?: string
  ): Promise<void> {
    try {
      const payload = {
        task: {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId,
          creatorId: task.creatorId,
          institutionId: task.institutionId,
          dueDate: task.dueDate,
          completedAt: task.completedAt,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        },
        triggeredBy: userId,
      }

      await WebhookService.triggerEvent(event, payload, userId)
    } catch (error) {
      logger.error("Failed to trigger task webhook", {
        event,
        taskId: task.id,
        userId,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Trigger webhook for user events
   */
  static async triggerUserEvent(
    event: WebhookEvent.USER_CREATED | WebhookEvent.USER_UPDATED,
    user: any,
    triggeredByUserId?: string
  ): Promise<void> {
    try {
      const payload = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          teamId: user.teamId,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        triggeredBy: triggeredByUserId,
      }

      await WebhookService.triggerEvent(event, payload, triggeredByUserId)
    } catch (error) {
      logger.error("Failed to trigger user webhook", {
        event,
        userId: user.id,
        triggeredByUserId,
        error: (error as Error).message,
      })
    }
  }
}
