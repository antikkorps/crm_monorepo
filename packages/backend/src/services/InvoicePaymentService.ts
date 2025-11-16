import {
  PaymentCreateRequest,
  PaymentMethod,
  PaymentStatus,
} from "@medical-crm/shared"
import { Op } from "sequelize"
import { sequelize } from "../config/database"
import { logger } from "../utils/logger"
import { Invoice } from "../models/Invoice"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Payment } from "../models/Payment"
import { User } from "../models/User"

/**
 * InvoicePaymentService
 *
 * Handles all payment-related operations for invoices including:
 * - Recording payments
 * - Confirming/canceling payments
 * - Payment history and analytics
 * - Payment reconciliation
 *
 * Extracted from InvoiceService to follow Single Responsibility Principle
 */
export class InvoicePaymentService {
  /**
   * Record a new payment for an invoice
   * @param paymentData - Payment details
   * @param recordedBy - User ID who records the payment
   * @returns Created payment with associations
   * @throws INVOICE_NOT_FOUND, INVOICE_CANNOT_RECEIVE_PAYMENTS, INVALID_PAYMENT_AMOUNT, PAYMENT_EXCEEDS_REMAINING
   */
  static async recordPayment(
    paymentData: PaymentCreateRequest,
    recordedBy: string
  ): Promise<Payment> {
    const invoice = await this.getInvoiceForPayment(paymentData.invoiceId)

    // Check if invoice can receive payments
    if (!invoice.canReceivePayments()) {
      throw {
        code: "INVOICE_CANNOT_RECEIVE_PAYMENTS",
        message: "Invoice cannot receive payments in its current state",
        status: 400,
      }
    }

    // Validate payment amount
    if (paymentData.amount <= 0) {
      throw {
        code: "INVALID_PAYMENT_AMOUNT",
        message: "Payment amount must be greater than zero",
        status: 400,
      }
    }

    // Check if payment amount doesn't exceed remaining amount
    if (paymentData.amount > invoice.remainingAmount) {
      throw {
        code: "PAYMENT_EXCEEDS_REMAINING",
        message: "Payment amount exceeds remaining invoice amount",
        status: 400,
      }
    }

    const transaction = await sequelize.transaction()

    try {
      // Create payment
      const payment = await Payment.createPayment({
        invoiceId: paymentData.invoiceId,
        amount: paymentData.amount,
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        reference: paymentData.reference,
        notes: paymentData.notes,
        recordedBy,
      })

      await transaction.commit()

      // Return payment with associations
      const paymentId = (payment as any).getDataValue ? (payment as any).getDataValue('id') : (payment as any).id
      if (!paymentId) {
        // As a fallback, fetch latest payment for invoiceId and amount/date combo
        const fetched = await Payment.findOne({
          where: {
            invoiceId: paymentData.invoiceId,
            amount: paymentData.amount,
            paymentDate: paymentData.paymentDate,
          },
          order: [["created_at", "DESC"]],
        })
        if (fetched) {
          return this.getPaymentById((fetched as any).getDataValue ? (fetched as any).getDataValue('id') : (fetched as any).id)
        }
      }
      return this.getPaymentById(paymentId)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Confirm a pending payment
   * @param paymentId - Payment ID to confirm
   * @param userId - User ID performing the confirmation
   * @returns Updated payment
   * @throws PAYMENT_NOT_FOUND, PAYMENT_CONFIRM_ERROR
   */
  static async confirmPayment(paymentId: string, userId: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId)

    // Check permissions (only the recorder or admin can confirm)
    const recordedBy = (payment as any).getDataValue ? (payment as any).getDataValue('recordedBy') : (payment as any).recordedBy
    if (recordedBy !== userId) {
      // TODO: Add role-based permission check
    }

    try {
      const currStatus = (payment as any).getDataValue ? (payment as any).getDataValue('status') : (payment as any).status
      logger.debug("InvoicePaymentService.confirmPayment: before confirm", { paymentId, status: currStatus })
      await payment.confirm()
      const updated = await this.getPaymentById(paymentId)
      const updStatus = (updated as any).getDataValue ? (updated as any).getDataValue('status') : (updated as any).status
      logger.debug("InvoicePaymentService.confirmPayment: after confirm", { paymentId, status: updStatus })
      return updated
    } catch (e: any) {
      logger.error("InvoicePaymentService.confirmPayment failed", { paymentId, error: e?.message, stack: e?.stack })
      throw {
        code: "PAYMENT_CONFIRM_ERROR",
        message: e?.message || "Failed to confirm payment",
        status: e?.status || 500,
      }
    }
  }

  /**
   * Cancel a payment
   * @param paymentId - Payment ID to cancel
   * @param userId - User ID performing the cancellation
   * @param reason - Optional cancellation reason
   * @returns Updated payment
   * @throws PAYMENT_NOT_FOUND
   */
  static async cancelPayment(
    paymentId: string,
    userId: string,
    reason?: string
  ): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId)

    // Check permissions (only the recorder or admin can cancel)
    const recordedBy = (payment as any).getDataValue ? (payment as any).getDataValue('recordedBy') : (payment as any).recordedBy
    if (recordedBy !== userId) {
      // TODO: Add role-based permission check
    }

    await payment.cancel(reason)

    return this.getPaymentById(paymentId)
  }

  /**
   * Get payment by ID with associations
   * @param id - Payment ID
   * @returns Payment with invoice and user associations
   * @throws PAYMENT_NOT_FOUND
   */
  static async getPaymentById(id: string): Promise<Payment> {
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: sequelize.models.Invoice,
          as: "invoice",
          attributes: ["id", "invoiceNumber", "title", "total"],
        },
        {
          model: User,
          as: "recordedByUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })

    if (!payment) {
      throw {
        code: "PAYMENT_NOT_FOUND",
        message: "Payment not found",
        status: 404,
      }
    }

    return payment
  }

  /**
   * Reconcile invoice payments
   * Recalculates payment totals and updates invoice status accordingly
   * @param invoiceId - Invoice ID to reconcile
   * @param userId - User ID performing the reconciliation
   * @returns Reconciliation result with updated invoice
   * @throws INVOICE_NOT_FOUND, INSUFFICIENT_PERMISSIONS
   */
  static async reconcileInvoicePayments(
    invoiceId: string,
    userId: string
  ): Promise<{
    invoice: Invoice
    totalPaid: number
    remainingAmount: number
    statusChanged: boolean
  }> {
    const invoice = await this.getInvoiceForPayment(invoiceId)

    // Check permissions
    if (!(await this.canUserModifyInvoice(invoice, userId))) {
      throw {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to reconcile this invoice",
        status: 403,
      }
    }

    const transaction = await sequelize.transaction()

    try {
      const oldStatus = invoice.status

      // Recalculate payment totals
      await invoice.recalculatePaymentTotals()

      // Update invoice status based on payments
      await invoice.updateStatusFromPayments()

      await transaction.commit()

      const updatedInvoice = await this.getInvoiceForPayment(invoiceId)

      return {
        invoice: updatedInvoice,
        totalPaid: updatedInvoice.totalPaid,
        remainingAmount: updatedInvoice.remainingAmount,
        statusChanged: oldStatus !== updatedInvoice.status,
      }
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Get payment history with filtering and pagination
   * @param filters - Payment filters (userId, invoiceId, status, method, dates)
   * @param requestingUserId - User requesting the history
   * @param userRole - Role of requesting user
   * @param page - Page number (default: 1)
   * @param limit - Results per page (default: 20)
   * @returns Paginated payment history
   */
  static async getPaymentHistory(
    filters: {
      userId?: string
      invoiceId?: string
      status?: PaymentStatus
      paymentMethod?: PaymentMethod
      dateFrom?: Date
      dateTo?: Date
    },
    requestingUserId: string,
    userRole: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    payments: Payment[]
    total: number
    pages: number
  }> {
    const where: any = {}
    const include: any[] = [
      {
        model: sequelize.models.Invoice,
        as: "invoice",
        attributes: ["id", "invoiceNumber", "title", "total", "assignedUserId"],
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      },
      {
        model: User,
        as: "recordedByUser",
        attributes: ["id", "firstName", "lastName", "email"],
      },
    ]

    // Apply filters
    if (filters.status) {
      where.status = filters.status
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod
    }

    if (filters.dateFrom || filters.dateTo) {
      where.paymentDate = {}
      if (filters.dateFrom) {
        where.paymentDate[Op.gte] = filters.dateFrom
      }
      if (filters.dateTo) {
        where.paymentDate[Op.lte] = filters.dateTo
      }
    }

    if (filters.invoiceId) {
      where.invoiceId = filters.invoiceId
    }

    // Handle user-based filtering
    if (filters.userId) {
      where.recordedBy = filters.userId
    } else if (userRole === "USER") {
      // Regular users can only see payments they recorded or for their invoices
      where[Op.or] = [
        { recordedBy: requestingUserId },
        {
          "$invoice.assignedUserId$": requestingUserId,
        },
      ]
    }

    const offset = (page - 1) * limit

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [["paymentDate", "DESC"]],
      distinct: true,
    })

    return {
      payments: rows,
      total: count,
      pages: Math.ceil(count / limit),
    }
  }

  /**
   * Get payment summary and analytics
   * Provides comprehensive payment statistics including:
   * - Total amounts by status
   * - Payment method breakdown
   * - Monthly trends
   * @param userId - Optional user ID to filter by
   * @param filters - Date range filters
   * @returns Payment analytics summary
   */
  static async getPaymentSummary(
    userId?: string,
    filters: {
      dateFrom?: Date
      dateTo?: Date
    } = {}
  ): Promise<{
    totalPayments: number
    totalAmount: number
    confirmedAmount: number
    pendingAmount: number
    cancelledAmount: number
    averagePaymentAmount: number
    paymentMethodBreakdown: Record<PaymentMethod, { count: number; amount: number }>
    statusBreakdown: Record<PaymentStatus, { count: number; amount: number }>
    monthlyTrends: Array<{
      month: string
      year: number
      count: number
      amount: number
    }>
  }> {
    const where: any = {}
    const invoiceWhere: any = {}

    if (userId) {
      invoiceWhere.assignedUserId = userId
    }

    if (filters.dateFrom || filters.dateTo) {
      where.paymentDate = {}
      if (filters.dateFrom) {
        where.paymentDate[Op.gte] = filters.dateFrom
      }
      if (filters.dateTo) {
        where.paymentDate[Op.lte] = filters.dateTo
      }
    }

    const payments = await Payment.findAll({
      where,
      include: [
        {
          model: sequelize.models.Invoice,
          as: "invoice",
          where: invoiceWhere,
          attributes: ["id", "assignedUserId"],
        },
      ],
    })

    // Calculate basic statistics
    const totalPayments = payments.length
    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const confirmedAmount = payments
      .filter((p) => p.status === PaymentStatus.CONFIRMED)
      .reduce((sum, payment) => sum + payment.amount, 0)
    const pendingAmount = payments
      .filter((p) => p.status === PaymentStatus.PENDING)
      .reduce((sum, payment) => sum + payment.amount, 0)
    const cancelledAmount = payments
      .filter((p) => p.status === PaymentStatus.CANCELLED)
      .reduce((sum, payment) => sum + payment.amount, 0)
    const averagePaymentAmount = totalPayments > 0 ? totalAmount / totalPayments : 0

    // Payment method breakdown
    const paymentMethodBreakdown: Record<
      PaymentMethod,
      { count: number; amount: number }
    > = {
      [PaymentMethod.BANK_TRANSFER]: { count: 0, amount: 0 },
      [PaymentMethod.CHECK]: { count: 0, amount: 0 },
      [PaymentMethod.CASH]: { count: 0, amount: 0 },
      [PaymentMethod.CREDIT_CARD]: { count: 0, amount: 0 },
      [PaymentMethod.OTHER]: { count: 0, amount: 0 },
    }

    payments.forEach((payment) => {
      paymentMethodBreakdown[payment.paymentMethod].count++
      paymentMethodBreakdown[payment.paymentMethod].amount += payment.amount
    })

    // Status breakdown
    const statusBreakdown: Record<PaymentStatus, { count: number; amount: number }> = {
      [PaymentStatus.PENDING]: { count: 0, amount: 0 },
      [PaymentStatus.CONFIRMED]: { count: 0, amount: 0 },
      [PaymentStatus.FAILED]: { count: 0, amount: 0 },
      [PaymentStatus.CANCELLED]: { count: 0, amount: 0 },
    }

    payments.forEach((payment) => {
      statusBreakdown[payment.status].count++
      statusBreakdown[payment.status].amount += payment.amount
    })

    // Monthly trends
    const monthlyData: Record<string, { count: number; amount: number }> = {}
    payments.forEach((payment) => {
      const date = new Date(payment.paymentDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!monthlyData[key]) {
        monthlyData[key] = { count: 0, amount: 0 }
      }

      monthlyData[key].count++
      monthlyData[key].amount += payment.amount
    })

    const monthlyTrends = Object.entries(monthlyData)
      .map(([key, data]) => {
        const [year, month] = key.split("-")
        return {
          month: new Date(Number.parseInt(year), Number.parseInt(month) - 1).toLocaleString("default", {
            month: "long",
          }),
          year: Number.parseInt(year),
          count: data.count,
          amount: data.amount,
        }
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return (
          new Date(`${a.month} 1, ${a.year}`).getMonth() -
          new Date(`${b.month} 1, ${b.year}`).getMonth()
        )
      })

    return {
      totalPayments,
      totalAmount,
      confirmedAmount,
      pendingAmount,
      cancelledAmount,
      averagePaymentAmount,
      paymentMethodBreakdown,
      statusBreakdown,
      monthlyTrends,
    }
  }

  /**
   * Helper: Get invoice for payment operations
   * @param invoiceId - Invoice ID
   * @returns Invoice with associations
   * @throws INVOICE_NOT_FOUND
   */
  private static async getInvoiceForPayment(invoiceId: string): Promise<Invoice> {
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: sequelize.models.InvoiceLine,
          as: "lines",
        },
        {
          model: sequelize.models.Payment,
          as: "payments",
        },
      ],
    })

    if (!invoice) {
      throw {
        code: "INVOICE_NOT_FOUND",
        message: "Invoice not found",
        status: 404,
      }
    }

    return invoice
  }

  /**
   * Helper: Check if user can modify invoice
   * @param invoice - Invoice to check
   * @param userId - User ID to check permissions for
   * @returns True if user can modify
   */
  private static async canUserModifyInvoice(invoice: Invoice, userId: string): Promise<boolean> {
    // Allow elevated roles to modify any invoice, otherwise only assigned user
    const user = await User.findByPk(userId)
    if (!user) return false

    if (user.role === "super_admin" || user.role === "team_admin" || user.role === "manager") {
      return true
    }

    return invoice.assignedUserId === userId
  }
}

export default InvoicePaymentService
