import {
  BillingSearchFilters,
  InvoiceCreateRequest,
  InvoiceLineCreateRequest,
  InvoiceLineUpdateRequest,
  InvoiceStatus,
  PaymentCreateRequest
} from "@medical-crm/shared"
import { InvoiceLine } from "../models/InvoiceLine"
import { Payment } from "../models/Payment"
import { User, UserRole } from "../models/User"
import { InvoiceService } from "../services/InvoiceService"
import { NotificationService } from "../services/NotificationService"
import { EmailOptionsBody } from "../types"
import { Context } from "../types/koa"
import { BadRequestError, NotFoundError } from "../utils/AppError"

export class InvoiceController {
  // GET /api/invoices - Get all invoices with optional filtering
  static async getInvoices(ctx: Context) {
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
  }

  // GET /api/invoices/:id - Get a specific invoice
  static async getInvoice(ctx: Context) {
    const { id } = ctx.params

    const invoice = await InvoiceService.getInvoiceById(id)
    
    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${id} not found`)
    }

    ctx.body = {
      success: true,
      data: invoice,
    }
  }

  // POST /api/invoices - Create a new invoice
  static async createInvoice(ctx: Context) {
    const user = ctx.state.user as User
    const invoiceData = ctx.request.body as InvoiceCreateRequest

    // Validate required fields
    if (!invoiceData.institutionId || !invoiceData.title || !invoiceData.dueDate) {
      throw new BadRequestError("Institution ID, title, and due date are required")
    }

    // Validate invoice data
    InvoiceService.validateInvoiceData(invoiceData)

    const invoice = await InvoiceService.createInvoice(invoiceData, user.id)

    ctx.status = 201
    ctx.body = {
      success: true,
      data: invoice,
    }
  }

  // POST /api/invoices/from-quote/:quoteId - Create invoice from quote
  static async createInvoiceFromQuote(ctx: Context) {
    const user = ctx.state.user as User
    const { quoteId } = ctx.params

    const invoice = await InvoiceService.createInvoiceFromQuote(quoteId, user.id)

    ctx.status = 201
    ctx.body = {
      success: true,
      data: invoice,
      message: "Invoice created from quote successfully",
    }
  }

  // PUT /api/invoices/:id - Update an invoice
  static async updateInvoice(ctx: Context) {
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
  }

  // DELETE /api/invoices/:id - Delete an invoice
  static async deleteInvoice(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    await InvoiceService.deleteInvoice(id, user.id)

    ctx.body = {
      success: true,
      message: "Invoice deleted successfully",
    }
  }

  // PUT /api/invoices/:id/send - Send invoice to client
  static async sendInvoice(ctx: Context) {
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
  }

  // PUT /api/invoices/:id/cancel - Cancel invoice
  static async cancelInvoice(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    const invoice = await InvoiceService.cancelInvoice(id, user.id)

    ctx.body = {
      success: true,
      data: invoice,
      message: "Invoice cancelled successfully",
    }
  }

  // PUT /api/invoices/:id/status - Update invoice status
  static async updateInvoiceStatus(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const { status, reason } = ctx.request.body as { status: string; reason?: string }

    if (!status) {
      throw new BadRequestError("Status is required")
    }

    const invoice = await InvoiceService.updateInvoiceStatus(id, status, user.id, reason)
    ctx.body = {
      success: true,
      data: invoice,
      message: `Invoice status updated to ${status}`,
    }
  }

  // PUT /api/invoices/:id/archive - Archive invoice
  static async archiveInvoice(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const invoice = await InvoiceService.archiveInvoice(id, user.id)
    ctx.body = { success: true, data: invoice, message: "Invoice archived" }
  }

  // PUT /api/invoices/:id/unarchive - Unarchive invoice
  static async unarchiveInvoice(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const invoice = await InvoiceService.unarchiveInvoice(id, user.id)
    ctx.body = { success: true, data: invoice, message: "Invoice unarchived" }
  }

  // GET /api/invoices/:id/lines - Get invoice lines
  static async getInvoiceLines(ctx: Context) {
    const { id } = ctx.params

    const lines = await InvoiceLine.findByInvoice(id)

    ctx.body = {
      success: true,
      data: lines,
    }
  }

  // POST /api/invoices/:id/lines - Add line to invoice
  static async addInvoiceLine(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const lineData = ctx.request.body as InvoiceLineCreateRequest

    // Validate required fields
    if (
      !lineData.description ||
      !lineData.quantity ||
      lineData.unitPrice === undefined
    ) {
      throw new BadRequestError("Description, quantity, and unit price are required")
    }

    // Validate line data
    InvoiceService.validateInvoiceLineData(lineData)

    const line = await InvoiceService.addInvoiceLine(id, lineData, user.id)

    ctx.status = 201
    ctx.body = {
      success: true,
      data: line,
    }
  }

  // PUT /api/invoices/:id/lines/:lineId - Update invoice line
  static async updateInvoiceLine(ctx: Context) {
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
  }

  // DELETE /api/invoices/:id/lines/:lineId - Delete invoice line
  static async deleteInvoiceLine(ctx: Context) {
    const user = ctx.state.user as User
    const { lineId } = ctx.params

    await InvoiceService.deleteInvoiceLine(lineId, user.id)

    ctx.body = {
      success: true,
      message: "Invoice line deleted successfully",
    }
  }

  // PUT /api/invoices/:id/lines/reorder - Reorder invoice lines
  static async reorderInvoiceLines(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const { lineIds } = ctx.request.body as { lineIds: string[] }

    if (!lineIds || !Array.isArray(lineIds)) {
      throw new BadRequestError("lineIds array is required")
    }

    const lines = await InvoiceService.reorderInvoiceLines(id, lineIds, user.id)

    ctx.body = {
      success: true,
      data: lines,
      message: "Invoice lines reordered successfully",
    }
  }

  // GET /api/invoices/:id/payments - Get invoice payments
  static async getInvoicePayments(ctx: Context) {
    const { id } = ctx.params

    const payments = await Payment.findByInvoice(id)

    ctx.body = {
      success: true,
      data: payments,
    }
  }

  // POST /api/invoices/:id/payments - Record payment for invoice
  static async recordPayment(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const paymentData = ctx.request.body as Omit<PaymentCreateRequest, "invoiceId">

    // Validate required fields
    if (!paymentData.amount || !paymentData.paymentDate || !paymentData.paymentMethod) {
      throw new BadRequestError("Amount, payment date, and payment method are required")
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
  }

  // PUT /api/invoices/payments/:paymentId/confirm - Confirm payment
  static async confirmPayment(ctx: Context) {
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
  }

  // PUT /api/invoices/payments/:paymentId/cancel - Cancel payment
  static async cancelPayment(ctx: Context) {
    const user = ctx.state.user as User
    const { paymentId } = ctx.params
    const { reason } = ctx.request.body as { reason?: string }

    const payment = await InvoiceService.cancelPayment(paymentId, user.id, reason)

    ctx.body = {
      success: true,
      data: payment,
      message: "Payment cancelled successfully",
    }
  }

  // GET /api/invoices/statistics - Get invoice statistics
  static async getInvoiceStatistics(ctx: Context) {
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
  }

  // GET /api/invoices/institution/:institutionId - Get invoices by institution
  static async getInvoicesByInstitution(ctx: Context) {
    const { institutionId } = ctx.params

    const invoices = await InvoiceService.getInvoicesByInstitution(institutionId)

    ctx.body = {
      success: true,
      data: invoices,
    }
  }

  // GET /api/invoices/user/:userId - Get invoices by user
  static async getInvoicesByUser(ctx: Context) {
    const { userId } = ctx.params

    const invoices = await InvoiceService.getInvoicesByUser(userId)

    ctx.body = {
      success: true,
      data: invoices,
    }
  }

  // GET /api/invoices/status/:status - Get invoices by status
  static async getInvoicesByStatus(ctx: Context) {
    const { status } = ctx.params

    if (!Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
      throw new BadRequestError("Invalid invoice status")
    }

    const invoices = await InvoiceService.getInvoicesByStatus(status as InvoiceStatus)

    ctx.body = {
      success: true,
      data: invoices,
    }
  }

  // PUT /api/invoices/:id/reconcile - Reconcile payments for invoice
  static async reconcilePayments(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    const result = await InvoiceService.reconcileInvoicePayments(id, user.id)

    ctx.body = {
      success: true,
      data: result,
      message: "Invoice payments reconciled successfully",
    }
  }

  // GET /api/invoices/payments/history - Get payment history with filtering
  static async getPaymentHistory(ctx: Context) {
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
  }

  // GET /api/invoices/payments/summary - Get payment summary and analytics
  static async getPaymentSummary(ctx: Context) {
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
  }

  // GET /api/invoices/:id/pdf - Generate and download invoice PDF
  static async generateInvoicePdf(ctx: Context) {
    const { id } = ctx.params
    const { templateId, email } = ctx.query
    const user = ctx.state.user as User

    const { PdfService } = await import("../services/PdfService")
    const pdfService = new PdfService()

    try {
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
          // Do not persist PDFs when emailing; persist for download only
          saveToFile: !emailOptions,
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
        let filename = `Invoice-${id}.pdf`
        try {
          const { Invoice } = await import("../models/Invoice")
          const inv = await Invoice.findByPk(id)
          if (inv?.invoiceNumber) {
            filename = `Invoice-${inv.invoiceNumber}.pdf`
          }
        } catch (_) {}
        ctx.set("Content-Type", "application/pdf")
        ctx.set("Content-Disposition", `attachment; filename="${filename}"`)
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
      await pdfService.cleanup()
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Check for specific "no template configured" error
      if (errorMessage.startsWith("NO_TEMPLATE_CONFIGURED:")) {
        const userMessage = errorMessage.replace("NO_TEMPLATE_CONFIGURED:", "")
        ctx.status = 422
        ctx.body = {
          success: false,
          error: {
            code: "NO_TEMPLATE_CONFIGURED",
            message: userMessage,
          },
        }
        return
      }

      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "PDF_GENERATION_ERROR",
          message: "Failed to generate invoice PDF",
          details: errorMessage,
        },
      }
    }
  }

  // GET /api/invoices/:id/versions - Get document versions for invoice
  static async getInvoiceVersions(ctx: Context) {
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
  }

  // POST /api/invoices/:id/send-reminder - Send payment reminder email
  static async sendPaymentReminder(ctx: Context) {
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
  }
}
