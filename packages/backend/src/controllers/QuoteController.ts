import {
  BillingSearchFilters,
  QuoteCreateRequest,
  QuoteLineCreateRequest,
  QuoteLineUpdateRequest,
  QuoteStatus,
  QuoteUpdateRequest,
} from "@medical-crm/shared"
import { Context } from "../types/koa"
import { QuoteLine } from "../models/QuoteLine"
import { User, UserRole } from "../models/User"
import { NotificationService } from "../services/NotificationService"
import { QuoteService } from "../services/QuoteService"
import { EmailOptionsBody } from "../types"

export class QuoteController {
  // GET /api/quotes - Get all quotes with optional filtering
  static async getQuotes(ctx: Context) {
    try {
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
        {
          ...filters,
          page: Number(page),
          limit: Number(limit)
        },
        userId
      )

      ctx.body = {
        success: true,
        data: result.quotes,
        meta: {
          total: result.pagination.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: result.pagination.totalPages,
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "QUOTE_FETCH_ERROR",
          message: "Failed to fetch quotes",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/quotes/:id - Get a specific quote
  static async getQuote(ctx: Context) {
    try {
      const { id } = ctx.params

      const quote = await QuoteService.getQuoteById(id)

      ctx.body = {
        success: true,
        data: quote,
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_FETCH_ERROR",
            message: "Failed to fetch quote",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // POST /api/quotes - Create a new quote
  static async createQuote(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const quoteData = ctx.request.body as QuoteCreateRequest

      // Validate required fields
      if (!quoteData.institutionId || !quoteData.title || !quoteData.validUntil) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Institution ID, title, and valid until date are required",
          },
        }
        return
      }

      // Validate quote data
      QuoteService.validateQuoteData(quoteData)

      const quote = await QuoteService.createQuote(quoteData, user.id)

      ctx.status = 201
      ctx.body = {
        success: true,
        data: quote,
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_CREATE_ERROR",
            message: "Failed to create quote",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/quotes/:id - Update a quote
  static async updateQuote(ctx: Context) {
    try {
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
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_UPDATE_ERROR",
            message: "Failed to update quote",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // DELETE /api/quotes/:id - Delete a quote
  static async deleteQuote(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      await QuoteService.deleteQuote(id, user.id)

      ctx.body = {
        success: true,
        message: "Quote deleted successfully",
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_DELETE_ERROR",
            message: "Failed to delete quote",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/quotes/:id/send - Send quote to client
  static async sendQuote(ctx: Context) {
    try {
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
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_SEND_ERROR",
            message: "Failed to send quote",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/quotes/:id/accept - Accept quote (client action)
  static async acceptQuote(ctx: Context) {
    try {
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
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_ACCEPT_ERROR",
            message: "Failed to accept quote",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/quotes/:id/reject - Reject quote (client action)
  static async rejectQuote(ctx: Context) {
    try {
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
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_REJECT_ERROR",
            message: "Failed to reject quote",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/quotes/:id/cancel - Cancel quote
  static async cancelQuote(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const quote = await QuoteService.cancelQuote(id, user.id)

      ctx.body = {
        success: true,
        data: quote,
        message: "Quote cancelled successfully",
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_CANCEL_ERROR",
            message: "Failed to cancel quote",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // POST /api/quotes/:id/convert-to-invoice - Convert quote to invoice
  static async convertToInvoice(ctx: Context) {
    try {
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
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "CONVERSION_ERROR",
            message: "Failed to convert quote to invoice",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // GET /api/quotes/:id/lines - Get quote lines
  static async getQuoteLines(ctx: Context) {
    try {
      const { id } = ctx.params

      const lines = await QuoteLine.findByQuote(id)

      ctx.body = {
        success: true,
        data: lines,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "QUOTE_LINES_FETCH_ERROR",
          message: "Failed to fetch quote lines",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/quotes/:id/lines - Add line to quote
  static async addQuoteLine(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const lineData = ctx.request.body as QuoteLineCreateRequest

      // Validate required fields
      if (
        !lineData.description ||
        !lineData.quantity ||
        lineData.unitPrice === undefined
      ) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Description, quantity, and unit price are required",
          },
        }
        return
      }

      // Validate line data
      QuoteService.validateQuoteLineData(lineData)

      const line = await QuoteService.addQuoteLine(id, lineData, user.id)

      ctx.status = 201
      ctx.body = {
        success: true,
        data: line,
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_LINE_CREATE_ERROR",
            message: "Failed to add quote line",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/quotes/:id/lines/:lineId - Update quote line
  static async updateQuoteLine(ctx: Context) {
    try {
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
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_LINE_UPDATE_ERROR",
            message: "Failed to update quote line",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // DELETE /api/quotes/:id/lines/:lineId - Delete quote line
  static async deleteQuoteLine(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { lineId } = ctx.params

      await QuoteService.deleteQuoteLine(lineId, user.id)

      ctx.body = {
        success: true,
        message: "Quote line deleted successfully",
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_LINE_DELETE_ERROR",
            message: "Failed to delete quote line",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/quotes/:id/lines/reorder - Reorder quote lines
  static async reorderQuoteLines(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const { lineIds } = ctx.request.body as { lineIds: string[] }

      if (!lineIds || !Array.isArray(lineIds)) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "lineIds array is required",
          },
        }
        return
      }

      const lines = await QuoteService.reorderQuoteLines(id, lineIds, user.id)

      ctx.body = {
        success: true,
        data: lines,
        message: "Quote lines reordered successfully",
      }
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        ctx.status = (error as any).status || 500
        ctx.body = {
          success: false,
          error: {
            code: (error as any).code,
            message: (error as any).message,
          },
        }
      } else {
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "QUOTE_LINES_REORDER_ERROR",
            message: "Failed to reorder quote lines",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
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
              recipients: [email as string],
              customMessage: (ctx.request.body as EmailOptionsBody).customMessage,
            }
          : undefined

      const result = await pdfService.generateQuotePdf(
        id,
        user.id,
        templateId as string,
        {
          saveToFile: true,
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
        ctx.set("Content-Type", "application/pdf")
        ctx.set("Content-Disposition", `attachment; filename="Quote-${id}.pdf"`)
        ctx.body = result.buffer
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

  // TODO: Implement email functionality later
  // static async sendQuoteEmail(ctx: Context) { ... }
}
