import {
    BillingSearchFilters,
    QuoteCreateRequest,
    QuoteLineCreateRequest,
    QuoteLineUpdateRequest,
    QuoteStatus,
    QuoteUpdateRequest,
} from "@medical-crm/shared"
import { QuoteLine } from "../models/QuoteLine"
import { User, UserRole } from "../models/User"
import { NotificationService } from "../services/NotificationService"
import { QuoteService } from "../services/QuoteService"
import { EmailOptionsBody } from "../types"
import { Context } from "../types/koa"
import { BadRequestError, NotFoundError } from "../utils/AppError"
import { logger } from "../utils/logger"

export class QuoteController {
  // GET /api/quotes - Get all quotes with optional filtering
  static async getQuotes(ctx: Context) {
    const user = ctx.state.user as User
    const {
      institutionId,
      assignedUserId,
      status,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      search,
      page = 1,
      limit = 20,
    } = ctx.query

    // Build filters
    const filters: BillingSearchFilters = {}

    if (institutionId) filters.institutionId = institutionId as string
    if (assignedUserId) filters.assignedUserId = assignedUserId as string
    if (status) filters.status = status as QuoteStatus
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string)
    if (dateTo) filters.dateTo = new Date(dateTo as string)
    if (amountMin) filters.amountMin = parseFloat(amountMin as string)
    if (amountMax) filters.amountMax = parseFloat(amountMax as string)
    if (search) filters.search = search as string

    // Determine user filter based on role
    const userId = user.role === UserRole.SUPER_ADMIN ? undefined : user.id

    const result = await QuoteService.getQuotes(
      filters,
      userId,
      Number(page),
      Number(limit)
    )

    ctx.body = {
      success: true,
      data: result.quotes,
      meta: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
    }
  }

  // GET /api/quotes/:id - Get a specific quote
  static async getQuote(ctx: Context) {
    const { id } = ctx.params

    const quote = await QuoteService.getQuoteById(id)

    if (!quote) {
      throw new NotFoundError("Quote not found", "QUOTE_NOT_FOUND")
    }

    ctx.body = {
      success: true,
      data: quote,
    }
  }

  // POST /api/quotes - Create a new quote
  static async createQuote(ctx: Context) {
    const user = ctx.state.user as User
    const quoteData = ctx.request.body as QuoteCreateRequest

    // Validate required fields
    if (!quoteData.institutionId || !quoteData.title || !quoteData.validUntil) {
      throw new BadRequestError("Institution ID, title, and valid until date are required", "VALIDATION_ERROR")
    }

    // Validate quote data
    QuoteService.validateQuoteData(quoteData)

    const quote = await QuoteService.createQuote(quoteData, user.id)

    ctx.status = 201
    ctx.body = {
      success: true,
      data: quote,
    }
  }

  // PUT /api/quotes/:id - Update a quote
  static async updateQuote(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const updateData = ctx.request.body as QuoteUpdateRequest

    // Validate update data
    QuoteService.validateQuoteData(updateData)

    const quote = await QuoteService.updateQuote(id, updateData, user.id)

    ctx.body = {
      success: true,
      data: quote,
    }
  }

  // DELETE /api/quotes/:id - Delete a quote
  static async deleteQuote(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    await QuoteService.deleteQuote(id, user.id)

    ctx.body = {
      success: true,
      message: "Quote deleted successfully",
    }
  }

  // PUT /api/quotes/:id/send - Send quote to client
  static async sendQuote(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    const quote = await QuoteService.sendQuote(id, user.id)

    // Send notification about quote being sent
    const notificationSvc = NotificationService.getInstance()
    await notificationSvc.notifyQuoteSent(quote, user)

    ctx.body = {
      success: true,
      data: quote,
      message: "Quote sent successfully",
    }
  }

  // PUT /api/quotes/:id/accept - Accept quote (client action)
  static async acceptQuote(ctx: Context) {
    const { id } = ctx.params
    const { clientComments } = ctx.request.body as { clientComments?: string }

    const quote = await QuoteService.acceptQuote(id, clientComments)

    // Send notification about quote acceptance
    const notificationSvc = NotificationService.getInstance()
    await notificationSvc.notifyQuoteAccepted(quote)

    ctx.body = {
      success: true,
      data: quote,
      message: "Quote accepted successfully",
    }
  }

  // PUT /api/quotes/:id/reject - Reject quote (client action)
  static async rejectQuote(ctx: Context) {
    const { id } = ctx.params
    const { clientComments } = ctx.request.body as { clientComments?: string }

    const quote = await QuoteService.rejectQuote(id, clientComments)

    // Send notification about quote rejection
    const notificationSvc = NotificationService.getInstance()
    await notificationSvc.notifyQuoteRejected(quote)

    ctx.body = {
      success: true,
      data: quote,
      message: "Quote rejected",
    }
  }

  // PUT /api/quotes/:id/cancel - Cancel quote
  static async cancelQuote(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    const quote = await QuoteService.cancelQuote(id, user.id)

    ctx.body = {
      success: true,
      data: quote,
      message: "Quote cancelled successfully",
    }
  }

  // PUT /api/quotes/:id/order - Confirm order
  static async confirmOrder(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    const quote = await QuoteService.confirmOrder(id, user.id)
    ctx.body = {
      success: true,
      data: quote,
    }
  }

  // POST /api/quotes/:id/convert-to-invoice - Convert quote to invoice
  static async convertToInvoice(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    // Import InvoiceService dynamically to avoid circular dependency
    const { InvoiceService } = await import("../services/InvoiceService")

    const invoice = await InvoiceService.createInvoiceFromQuote(id, user.id)

    // Send notification about invoice creation
    const notificationSvc = NotificationService.getInstance()
    await notificationSvc.notifyInvoiceCreated(invoice, user, invoice.institution)

    ctx.status = 201
    ctx.body = {
      success: true,
      data: invoice,
      message: "Quote converted to invoice successfully",
    }
  }

  // GET /api/quotes/:id/lines - Get quote lines
  static async getQuoteLines(ctx: Context) {
    const { id } = ctx.params

    const lines = await QuoteLine.findByQuote(id)

    ctx.body = {
      success: true,
      data: lines,
    }
  }

  // POST /api/quotes/:id/lines - Add line to quote
  static async addQuoteLine(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const lineData = ctx.request.body as QuoteLineCreateRequest

    // Validate required fields
    if (
      !lineData.description ||
      !lineData.quantity ||
      lineData.unitPrice === undefined
    ) {
      throw new BadRequestError("Description, quantity, and unit price are required", "VALIDATION_ERROR")
    }

    // Validate line data
    QuoteService.validateQuoteLineData(lineData)

    const line = await QuoteService.addQuoteLine(id, lineData, user.id)

    ctx.status = 201
    ctx.body = {
      success: true,
      data: line,
    }
  }

  // PUT /api/quotes/:id/lines/:lineId - Update quote line
  static async updateQuoteLine(ctx: Context) {
    const user = ctx.state.user as User
    const { lineId } = ctx.params
    const lineData = ctx.request.body as QuoteLineUpdateRequest

    // Validate line data
    QuoteService.validateQuoteLineData(lineData)

    const line = await QuoteService.updateQuoteLine(lineId, lineData, user.id)

    ctx.body = {
      success: true,
      data: line,
    }
  }

  // DELETE /api/quotes/:id/lines/:lineId - Delete quote line
  static async deleteQuoteLine(ctx: Context) {
    const user = ctx.state.user as User
    const { lineId } = ctx.params

    await QuoteService.deleteQuoteLine(lineId, user.id)

    ctx.body = {
      success: true,
      message: "Quote line deleted successfully",
    }
  }

  // PUT /api/quotes/:id/lines/reorder - Reorder quote lines
  static async reorderQuoteLines(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const { lineIds } = ctx.request.body as { lineIds: string[] }

    if (!lineIds || !Array.isArray(lineIds)) {
      throw new BadRequestError("lineIds array is required", "VALIDATION_ERROR")
    }

    const lines = await QuoteService.reorderQuoteLines(id, lineIds, user.id)

    ctx.body = {
      success: true,
      data: lines,
      message: "Quote lines reordered successfully",
    }
  }

  // GET /api/quotes/statistics - Get quote statistics
  static async getQuoteStatistics(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { userId } = ctx.query

      // Only allow users to see their own stats unless they have permission
      let targetUserId: string | undefined
      if (userId && user.role !== UserRole.USER) {
        targetUserId = userId as string
      } else if (user.role === UserRole.USER) {
        targetUserId = user.id
      }

      const statistics = await QuoteService.getQuoteStatistics(targetUserId)

      ctx.body = {
        success: true,
        data: statistics,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "STATISTICS_ERROR",
          message: "Failed to fetch quote statistics",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/quotes/institution/:institutionId - Get quotes by institution
  static async getQuotesByInstitution(ctx: Context) {
    try {
      const { institutionId } = ctx.params

      const quotes = await QuoteService.getQuotesByInstitution(institutionId)

      ctx.body = {
        success: true,
        data: quotes,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "QUOTES_FETCH_ERROR",
          message: "Failed to fetch quotes by institution",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/quotes/user/:userId - Get quotes by user
  static async getQuotesByUser(ctx: Context) {
    try {
      const { userId } = ctx.params

      const quotes = await QuoteService.getQuotesByUser(userId)

      ctx.body = {
        success: true,
        data: quotes,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "QUOTES_FETCH_ERROR",
          message: "Failed to fetch quotes by user",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/quotes/status/:status - Get quotes by status
  static async getQuotesByStatus(ctx: Context) {
    try {
      const { status } = ctx.params

      if (!Object.values(QuoteStatus).includes(status as QuoteStatus)) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "Invalid quote status",
          },
        }
        return
      }

      const quotes = await QuoteService.getQuotesByStatus(status as QuoteStatus)

      ctx.body = {
        success: true,
        data: quotes,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "QUOTES_FETCH_ERROR",
          message: "Failed to fetch quotes by status",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/quotes/:id/pdf - Generate and download quote PDF
  static async generateQuotePdf(ctx: Context) {
    try {
      const { id } = ctx.params
      const { templateId, email } = ctx.query
      const user = ctx.state.user as User

      const { PdfService } = await import("../services/PdfService")
      const pdfService = new PdfService()

      const emailOptions =
        email === "true"
          ? {
              recipients: Array.isArray((ctx.request.body as any)?.recipients)
                ? (ctx.request.body as any).recipients
                : undefined,
              customMessage: (ctx.request.body as EmailOptionsBody).customMessage,
            }
          : undefined

      const result = await pdfService.generateQuotePdf(
        id,
        user.id,
        templateId as string,
        {
          saveToFile: !!emailOptions,
          emailOptions,
        }
      )

      if (emailOptions && result.emailResult) {
        ctx.body = {
          success: true,
          data: {
            version: result.version,
            emailSent: result.emailResult.success,
            emailError: result.emailResult.error,
          },
          message: result.emailResult.success
            ? "Quote PDF generated and emailed successfully"
            : "Quote PDF generated but email failed",
        }
      } else {
        // Return PDF as download
        ctx.status = 200
        ctx.type = "application/pdf"
        // Try to use quote number in filename if available
        let fileName = `Quote-${id}.pdf`
        try {
          const { Quote } = await import("../models/Quote")
          const q = await Quote.findByPk(id)
          if (q?.quoteNumber) fileName = `Quote-${q.quoteNumber}.pdf`
        } catch {}
        ctx.set("Content-Disposition", `attachment; filename="${fileName}"`)
        ctx.length = result.buffer.length
        ctx.body = result.buffer

        // Clean up: delete the PDF file from storage after serving it
        if (result.filePath) {
          try {
            const fs = await import("fs/promises")
            await fs.unlink(result.filePath)
            console.log("PDF file deleted from storage:", result.filePath)
          } catch (error) {
            console.warn("Could not delete PDF file:", error)
          }
        }
      }

      await pdfService.cleanup()
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "PDF_GENERATION_ERROR",
          message: "Failed to generate quote PDF",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/quotes/:id/order-pdf - Generate and download order PDF
  static async generateOrderPdf(ctx: Context) {
    try {
      const { id } = ctx.params
      const { templateId } = ctx.query
      const user = ctx.state.user as User

      const { PdfService } = await import("../services/PdfService")
      const pdfService = new PdfService()

      const result = await pdfService.generateOrderPdf(
        id,
        user.id,
        templateId as string,
        { saveToFile: false }
      )

      ctx.status = 200
      ctx.type = "application/pdf"
      let fileName = `Order-${id}.pdf`
      try {
        const { Quote } = await import("../models/Quote")
        const q = await Quote.findByPk(id)
        if (q?.orderNumber || q?.quoteNumber) fileName = `Order-${q.orderNumber || q.quoteNumber}.pdf`
      } catch {}
      ctx.set("Content-Disposition", `attachment; filename="${fileName}"`)
      ctx.length = result.buffer.length
      ctx.body = result.buffer

      // Clean up: delete the PDF file from storage after serving it
      if (result.filePath) {
        try {
          const fs = await import("fs/promises")
          await fs.unlink(result.filePath)
          console.log("PDF file deleted from storage:", result.filePath)
        } catch (error) {
          console.warn("Could not delete PDF file:", error)
        }
      }

      await pdfService.cleanup()
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "ORDER_PDF_GENERATION_ERROR",
          message: "Failed to generate order PDF",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/quotes/:id/versions - Get document versions for quote
  static async getQuoteVersions(ctx: Context) {
    try {
      const { id } = ctx.params

      const { PdfService } = await import("../services/PdfService")
      const { DocumentVersionType } = await import("../models/DocumentVersion")
      const pdfService = new PdfService()

      const versions = await pdfService.getDocumentVersions(
        id,
        DocumentVersionType.QUOTE_PDF
      )

      ctx.body = {
        success: true,
        data: versions,
      }

      await pdfService.cleanup()
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "VERSIONS_FETCH_ERROR",
          message: "Failed to fetch quote versions",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/quotes/:id/send-email - Send quote by email with PDF attachment
  static async sendQuoteEmail(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const { recipients, customMessage, templateId } = ctx.request.body as {
        recipients: string[]
        customMessage?: string
        templateId?: string
      }

      if (!recipients || recipients.length === 0) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "At least one recipient email is required",
          },
        }
        return
      }

      const { PdfService } = await import("../services/PdfService")
      const pdfService = new PdfService()

      const result = await pdfService.generateQuotePdf(id, user.id, templateId, {
        emailOptions: {
          recipients,
          customMessage,
        },
      })

      if (result.emailResult && !(result.emailResult as any).success) {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "EMAIL_SEND_ERROR",
            message: "Failed to send email",
            details: (result.emailResult as any).error,
          },
        }
        return
      }

      ctx.body = {
        success: true,
        data: {
          message: "Quote sent successfully",
          recipients: (result.emailResult as any)?.recipients || recipients,
          messageId: (result.emailResult as any)?.messageId,
        },
      }
    } catch (error) {
      logger.error("Send quote email failed", { error, quoteId: ctx.params.id })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "SEND_EMAIL_ERROR",
          message: "Failed to send quote by email",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // Quote reminder endpoints
  /**
   * GET /api/quotes/reminders/needing-attention
   * Get quotes that need attention (expiring soon or expired)
   */
  static async getQuotesNeedingAttention(ctx: Context) {
    try {
      const { QuoteReminderService } = await import("../services/QuoteReminderService")

      const quotes = await QuoteReminderService.getQuotesNeedingAttention()

      ctx.body = {
        success: true,
        data: quotes,
        count: quotes.length,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "QUOTES_FETCH_ERROR",
          message: "Failed to fetch quotes needing attention",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  /**
   * GET /api/quotes/:id/reminders
   * Get all reminders sent for a specific quote
   */
  static async getQuoteReminders(ctx: Context) {
    try {
      const { id } = ctx.params
      const { QuoteReminderService } = await import("../services/QuoteReminderService")

      const reminders = await QuoteReminderService.getRemindersForQuote(id)

      ctx.body = {
        success: true,
        data: reminders,
        count: reminders.length,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "REMINDERS_FETCH_ERROR",
          message: "Failed to fetch quote reminders",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  /**
   * POST /api/quotes/:id/reminders
   * Send a manual reminder for a quote
   * Body: { reminderType: ReminderType, message?: string }
   */
  static async sendQuoteReminder(ctx: Context) {
    try {
      const { id } = ctx.params
      const user = ctx.state.user as User
      const { reminderType, message } = ctx.request.body as {
        reminderType: string
        message?: string
      }

      if (!reminderType) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "reminderType is required",
          },
        }
        return
      }

      const { QuoteReminderService } = await import("../services/QuoteReminderService")
      const { ReminderType } = await import("../models/QuoteReminder")

      // Validate reminderType
      if (!Object.values(ReminderType).includes(reminderType as any)) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "INVALID_REMINDER_TYPE",
            message: `Invalid reminder type. Must be one of: ${Object.values(ReminderType).join(", ")}`,
          },
        }
        return
      }

      const result = await QuoteReminderService.sendManualReminder(
        id,
        reminderType as any,
        user.id,
        message
      )

      if (!result.success) {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "REMINDER_SEND_ERROR",
            message: "Failed to send reminder",
            details: result.error,
          },
        }
        return
      }

      ctx.body = {
        success: true,
        data: result,
        message: "Reminder sent successfully",
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "REMINDER_SEND_ERROR",
          message: "Failed to send quote reminder",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  /**
   * GET /api/quotes/reminders/statistics
   * Get reminder statistics
   * Query params: startDate, endDate
   */
  static async getReminderStatistics(ctx: Context) {
    try {
      const { startDate, endDate } = ctx.query as {
        startDate?: string
        endDate?: string
      }

      const { QuoteReminderService } = await import("../services/QuoteReminderService")

      const statistics = await QuoteReminderService.getReminderStatistics(
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      )

      ctx.body = {
        success: true,
        data: statistics,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "STATISTICS_FETCH_ERROR",
          message: "Failed to fetch reminder statistics",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }
}
