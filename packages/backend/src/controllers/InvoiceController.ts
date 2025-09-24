import {
  BillingSearchFilters,
  DiscountType,
  InvoiceCreateRequest,
  InvoiceLineCreateRequest,
  InvoiceStatus,
  PaymentCreateRequest,
} from "@medical-crm/shared"
import { InvoiceLine } from "../models/InvoiceLine"
import { Payment } from "../models/Payment"
import { User, UserRole } from "../models/User"
import { InvoiceService } from "../services/InvoiceService"
import { NotificationService } from "../services/NotificationService"
import { EmailOptionsBody } from "../types"
import { Context } from "../types/koa"

// Define InvoiceLineUpdateRequest locally since it's not exported from shared
interface InvoiceLineUpdateRequest {
  description?: string
  quantity?: number
  unitPrice?: number
  discountType?: DiscountType
  discountValue?: number
  taxRate?: number
  orderIndex?: number
}

export class InvoiceController {
  // GET /api/invoices - Get all invoices with optional filtering
  static async getInvoices(ctx: Context) {
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
      if (status) filters.status = status as InvoiceStatus
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string)
      if (dateTo) filters.dateTo = new Date(dateTo as string)
      if (amountMin) filters.amountMin = parseFloat(amountMin as string)
      if (amountMax) filters.amountMax = parseFloat(amountMax as string)
      if (search) filters.search = search as string

      const result = await InvoiceService.searchInvoices(
        filters,
        user.id,
        user.role,
        Number(page),
        Number(limit)
      )

      ctx.body = {
        success: true,
        data: result.invoices,
        meta: {
          total: result.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: result.pages,
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "INVOICE_FETCH_ERROR",
          message: "Failed to fetch invoices",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/invoices/:id - Get a specific invoice
  static async getInvoice(ctx: Context) {
    try {
      const { id } = ctx.params

      const invoice = await InvoiceService.getInvoiceById(id)

      ctx.body = {
        success: true,
        data: invoice,
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
            code: "INVOICE_FETCH_ERROR",
            message: "Failed to fetch invoice",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // POST /api/invoices - Create a new invoice
  static async createInvoice(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const invoiceData = ctx.request.body as InvoiceCreateRequest

      // Validate required fields
      if (!invoiceData.institutionId || !invoiceData.title || !invoiceData.dueDate) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Institution ID, title, and due date are required",
          },
        }
        return
      }

      // Validate invoice data
      InvoiceService.validateInvoiceData(invoiceData)

      const invoice = await InvoiceService.createInvoice(invoiceData, user.id)

      ctx.status = 201
      ctx.body = {
        success: true,
        data: invoice,
      }
    } catch (error) {
      console.error("=== INVOICE CREATION ERROR ===")
      console.error("Error details:", error)
      console.error("Stack trace:", (error as any)?.stack)
      console.error("Request body:", JSON.stringify(ctx.request.body, null, 2))

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
            code: "INVOICE_CREATE_ERROR",
            message: "Failed to create invoice",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // POST /api/invoices/from-quote/:quoteId - Create invoice from quote
  static async createInvoiceFromQuote(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { quoteId } = ctx.params

      const invoice = await InvoiceService.createInvoiceFromQuote(quoteId, user.id)

      ctx.status = 201
      ctx.body = {
        success: true,
        data: invoice,
        message: "Invoice created from quote successfully",
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
            code: "INVOICE_CREATE_ERROR",
            message: "Failed to create invoice from quote",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/invoices/:id - Update an invoice
  static async updateInvoice(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const updateData = ctx.request.body as Partial<InvoiceCreateRequest>

      // Validate update data
      InvoiceService.validateInvoiceData(updateData)

      const invoice = await InvoiceService.updateInvoice(id, updateData, user.id)

      ctx.body = {
        success: true,
        data: invoice,
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
            code: "INVOICE_UPDATE_ERROR",
            message: "Failed to update invoice",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // DELETE /api/invoices/:id - Delete an invoice
  static async deleteInvoice(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      await InvoiceService.deleteInvoice(id, user.id)

      ctx.body = {
        success: true,
        message: "Invoice deleted successfully",
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
            code: "INVOICE_DELETE_ERROR",
            message: "Failed to delete invoice",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/invoices/:id/send - Send invoice to client
  static async sendInvoice(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const invoice = await InvoiceService.sendInvoice(id, user.id)

      // Send notification about invoice being sent
      const notificationSvc = NotificationService.getInstance()
      await notificationSvc.notifyInvoiceSent(invoice, user)

      ctx.body = {
        success: true,
        data: invoice,
        message: "Invoice sent successfully",
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
            code: "INVOICE_SEND_ERROR",
            message: "Failed to send invoice",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/invoices/:id/cancel - Cancel invoice
  static async cancelInvoice(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const invoice = await InvoiceService.cancelInvoice(id, user.id)

      ctx.body = {
        success: true,
        data: invoice,
        message: "Invoice cancelled successfully",
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
            code: "INVOICE_CANCEL_ERROR",
            message: "Failed to cancel invoice",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // GET /api/invoices/:id/lines - Get invoice lines
  static async getInvoiceLines(ctx: Context) {
    try {
      const { id } = ctx.params

      const lines = await InvoiceLine.findByInvoice(id)

      ctx.body = {
        success: true,
        data: lines,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "INVOICE_LINES_FETCH_ERROR",
          message: "Failed to fetch invoice lines",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/invoices/:id/lines - Add line to invoice
  static async addInvoiceLine(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const lineData = ctx.request.body as InvoiceLineCreateRequest

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
      InvoiceService.validateInvoiceLineData(lineData)

      const line = await InvoiceService.addInvoiceLine(id, lineData, user.id)

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
            code: "INVOICE_LINE_CREATE_ERROR",
            message: "Failed to add invoice line",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/invoices/:id/lines/:lineId - Update invoice line
  static async updateInvoiceLine(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { lineId } = ctx.params
      const lineData = ctx.request.body as InvoiceLineUpdateRequest

      // Validate line data
      InvoiceService.validateInvoiceLineData(lineData)

      const line = await InvoiceService.updateInvoiceLine(lineId, lineData, user.id)

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
            code: "INVOICE_LINE_UPDATE_ERROR",
            message: "Failed to update invoice line",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // DELETE /api/invoices/:id/lines/:lineId - Delete invoice line
  static async deleteInvoiceLine(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { lineId } = ctx.params

      await InvoiceService.deleteInvoiceLine(lineId, user.id)

      ctx.body = {
        success: true,
        message: "Invoice line deleted successfully",
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
            code: "INVOICE_LINE_DELETE_ERROR",
            message: "Failed to delete invoice line",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/invoices/:id/lines/reorder - Reorder invoice lines
  static async reorderInvoiceLines(ctx: Context) {
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

      const lines = await InvoiceService.reorderInvoiceLines(id, lineIds, user.id)

      ctx.body = {
        success: true,
        data: lines,
        message: "Invoice lines reordered successfully",
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
            code: "INVOICE_LINES_REORDER_ERROR",
            message: "Failed to reorder invoice lines",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // GET /api/invoices/:id/payments - Get invoice payments
  static async getInvoicePayments(ctx: Context) {
    try {
      const { id } = ctx.params

      const payments = await Payment.findByInvoice(id)

      ctx.body = {
        success: true,
        data: payments,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "PAYMENTS_FETCH_ERROR",
          message: "Failed to fetch invoice payments",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/invoices/:id/payments - Record payment for invoice
  static async recordPayment(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const paymentData = ctx.request.body as Omit<PaymentCreateRequest, "invoiceId">

      // Validate required fields
      if (!paymentData.amount || !paymentData.paymentDate || !paymentData.paymentMethod) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Amount, payment date, and payment method are required",
          },
        }
        return
      }

      const payment = await InvoiceService.recordPayment(
        {
          ...paymentData,
          invoiceId: id,
        },
        user.id
      )

      // Send notification about payment recorded
      const notificationSvc = NotificationService.getInstance()
      await notificationSvc.notifyPaymentRecorded(payment, user)

      ctx.status = 201
      ctx.body = {
        success: true,
        data: payment,
        message: "Payment recorded successfully",
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
            code: "PAYMENT_RECORD_ERROR",
            message: "Failed to record payment",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/invoices/payments/:paymentId/confirm - Confirm payment
  static async confirmPayment(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { paymentId } = ctx.params

      const payment = await InvoiceService.confirmPayment(paymentId, user.id)

      // Send notification about payment confirmation
      const notificationSvc = NotificationService.getInstance()
      await notificationSvc.notifyPaymentConfirmed(payment, user)

      ctx.body = {
        success: true,
        data: payment,
        message: "Payment confirmed successfully",
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
            code: "PAYMENT_CONFIRM_ERROR",
            message: "Failed to confirm payment",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // PUT /api/invoices/payments/:paymentId/cancel - Cancel payment
  static async cancelPayment(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { paymentId } = ctx.params
      const { reason } = ctx.request.body as { reason?: string }

      const payment = await InvoiceService.cancelPayment(paymentId, user.id, reason)

      ctx.body = {
        success: true,
        data: payment,
        message: "Payment cancelled successfully",
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
            code: "PAYMENT_CANCEL_ERROR",
            message: "Failed to cancel payment",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // GET /api/invoices/statistics - Get invoice statistics
  static async getInvoiceStatistics(ctx: Context) {
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

      const statistics = await InvoiceService.getInvoiceStatistics(targetUserId)

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
          message: "Failed to fetch invoice statistics",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/invoices/institution/:institutionId - Get invoices by institution
  static async getInvoicesByInstitution(ctx: Context) {
    try {
      const { institutionId } = ctx.params

      const invoices = await InvoiceService.getInvoicesByInstitution(institutionId)

      ctx.body = {
        success: true,
        data: invoices,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "INVOICES_FETCH_ERROR",
          message: "Failed to fetch invoices by institution",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/invoices/user/:userId - Get invoices by user
  static async getInvoicesByUser(ctx: Context) {
    try {
      const { userId } = ctx.params

      const invoices = await InvoiceService.getInvoicesByUser(userId)

      ctx.body = {
        success: true,
        data: invoices,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "INVOICES_FETCH_ERROR",
          message: "Failed to fetch invoices by user",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/invoices/status/:status - Get invoices by status
  static async getInvoicesByStatus(ctx: Context) {
    try {
      const { status } = ctx.params

      if (!Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: "Invalid invoice status",
          },
        }
        return
      }

      const invoices = await InvoiceService.getInvoicesByStatus(status as InvoiceStatus)

      ctx.body = {
        success: true,
        data: invoices,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "INVOICES_FETCH_ERROR",
          message: "Failed to fetch invoices by status",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // PUT /api/invoices/:id/reconcile - Reconcile payments for invoice
  static async reconcilePayments(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const result = await InvoiceService.reconcileInvoicePayments(id, user.id)

      ctx.body = {
        success: true,
        data: result,
        message: "Invoice payments reconciled successfully",
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
            code: "PAYMENT_RECONCILE_ERROR",
            message: "Failed to reconcile invoice payments",
            details: error instanceof Error ? error.message : "Unknown error",
          },
        }
      }
    }
  }

  // GET /api/invoices/payments/history - Get payment history with filtering
  static async getPaymentHistory(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const {
        userId,
        invoiceId,
        status,
        paymentMethod,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = ctx.query

      const filters: any = {}
      if (userId) filters.userId = userId as string
      if (invoiceId) filters.invoiceId = invoiceId as string
      if (status) filters.status = status as string
      if (paymentMethod) filters.paymentMethod = paymentMethod as string
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string)
      if (dateTo) filters.dateTo = new Date(dateTo as string)

      const result = await InvoiceService.getPaymentHistory(
        filters,
        user.id,
        user.role,
        Number(page),
        Number(limit)
      )

      ctx.body = {
        success: true,
        data: result.payments,
        meta: {
          total: result.total,
          page: Number(page),
          limit: Number(limit),
          totalPages: result.pages,
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "PAYMENT_HISTORY_ERROR",
          message: "Failed to fetch payment history",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/invoices/payments/summary - Get payment summary and analytics
  static async getPaymentSummary(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { userId, dateFrom, dateTo } = ctx.query

      // Only allow users to see their own summary unless they have permission
      let targetUserId: string | undefined
      if (userId && user.role !== UserRole.USER) {
        targetUserId = userId as string
      } else if (user.role === UserRole.USER) {
        targetUserId = user.id
      }

      const filters: any = {}
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string)
      if (dateTo) filters.dateTo = new Date(dateTo as string)

      const summary = await InvoiceService.getPaymentSummary(targetUserId, filters)

      ctx.body = {
        success: true,
        data: summary,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "PAYMENT_SUMMARY_ERROR",
          message: "Failed to fetch payment summary",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/invoices/:id/pdf - Generate and download invoice PDF
  static async generateInvoicePdf(ctx: Context) {
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

      const result = await pdfService.generateInvoicePdf(
        id,
        user.id,
        templateId as string,
        {
          saveToFile: !!emailOptions,
          emailOptions,
        }
      )

      if (emailOptions && result.emailResult) {
        console.log("Returning email result instead of PDF download")
        ctx.body = {
          success: true,
          data: {
            version: result.version,
            emailSent: result.emailResult.success,
            emailError: result.emailResult.error,
          },
          message: result.emailResult.success
            ? "Invoice PDF generated and emailed successfully"
            : "Invoice PDF generated but email failed",
        }
      } else {
        // Return PDF as download
        console.log("Returning PDF for download, buffer size:", result.buffer?.length)
        ctx.set("Content-Type", "application/pdf")
        ctx.set("Content-Disposition", `attachment; filename="Invoice-${id}.pdf"`)
        ctx.body = result.buffer

        // Clean up: delete the PDF file from storage after serving it
        if (result.filePath) {
          try {
            const fs = await import("fs/promises")
            await fs.unlink(result.filePath)
            console.log("PDF file deleted from storage:", result.filePath)
          } catch (error) {
            console.warn("Could not delete PDF file:", error)
            // Don't throw error - the download was successful
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
          message: "Failed to generate invoice PDF",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/invoices/:id/versions - Get document versions for invoice
  static async getInvoiceVersions(ctx: Context) {
    try {
      const { id } = ctx.params

      const { PdfService } = await import("../services/PdfService")
      const { DocumentVersionType } = await import("../models/DocumentVersion")
      const pdfService = new PdfService()

      const versions = await pdfService.getDocumentVersions(
        id,
        DocumentVersionType.INVOICE_PDF
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
          message: "Failed to fetch invoice versions",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/invoices/:id/send-reminder - Send payment reminder email
  static async sendPaymentReminder(ctx: Context) {
    try {
      const { id } = ctx.params
      const { customMessage } = ctx.request.body as EmailOptionsBody

      const { PdfService } = await import("../services/PdfService")
      const pdfService = new PdfService()

      const result = await pdfService.sendPaymentReminder(id, customMessage)

      ctx.body = {
        success: true,
        data: result,
        message: result.success
          ? "Payment reminder sent successfully"
          : "Failed to send payment reminder",
      }

      await pdfService.cleanup()
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "REMINDER_SEND_ERROR",
          message: "Failed to send payment reminder",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }
}
