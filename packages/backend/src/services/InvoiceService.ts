import {
  BillingSearchFilters,
  DiscountType,
  InvoiceCreateRequest,
  InvoiceLineCreateRequest,
  InvoiceStatus,
  PaymentCreateRequest,
  PaymentMethod,
  PaymentStatus,
} from "@medical-crm/shared"
import { Op } from "sequelize"
import { sequelize } from "../config/database"
import { Invoice } from "../models/Invoice"
import { InvoiceLine } from "../models/InvoiceLine"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Payment } from "../models/Payment"
import { Quote } from "../models/Quote"
import { User } from "../models/User"

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

export class InvoiceService {
  // Create a new invoice
  static async createInvoice(
    invoiceData: InvoiceCreateRequest,
    assignedUserId: string
  ): Promise<Invoice> {
    const transaction = await sequelize.transaction()

    try {
      // Validate institution exists
      const institution = await MedicalInstitution.findByPk(invoiceData.institutionId)
      if (!institution) {
        throw {
          code: "INSTITUTION_NOT_FOUND",
          message: "Medical institution not found",
          status: 404,
        }
      }

      // Create invoice within the transaction
      let invoiceNumber: string
      let attempts = 0
      const maxAttempts = 5

      while (attempts < maxAttempts) {
        try {
          invoiceNumber = await Invoice.generateInvoiceNumber()
          break
        } catch (error) {
          attempts++
          if (attempts >= maxAttempts) {
            throw new Error('Failed to generate invoice number after multiple attempts')
          }
        }
      }

      // Create invoice
      const invoice = await Invoice.create({
        institutionId: invoiceData.institutionId,
        assignedUserId,
        quoteId: invoiceData.quoteId,
        templateId: invoiceData.templateId,
        title: invoiceData.title,
        description: invoiceData.description,
        dueDate: invoiceData.dueDate,
        invoiceNumber: invoiceNumber!,
        status: InvoiceStatus.DRAFT,
        totalPaid: 0,
        remainingAmount: 0,
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 0,
      }, { transaction })

      // Get the raw data which contains the actual values
      const invoiceRawData = invoice.get({ plain: true }) as any

      // Verify invoice was created with an ID (check both instance and raw data)
      const invoiceId = invoice.id || invoiceRawData.id
      if (!invoiceId) {
        throw new Error('Failed to create invoice - no ID generated')
      }

      // Add invoice lines if provided
      if (invoiceData.lines && invoiceData.lines.length > 0) {
        for (let i = 0; i < invoiceData.lines.length; i++) {
          const lineData = invoiceData.lines[i]

          const processedData = {
            invoiceId: invoiceId,
            orderIndex: i + 1,
            description: lineData.description,
            quantity: Number(lineData.quantity),
            unitPrice: Number(lineData.unitPrice),
            discountType: lineData.discountType || DiscountType.PERCENTAGE,
            discountValue: Number(lineData.discountValue) || 0,
            taxRate: Number(lineData.taxRate) || 0,
          }

          // Create without hooks to avoid timing issues, then calculate totals manually
          const createdLine = await InvoiceLine.create(processedData, {
            transaction,
            hooks: false // Disable hooks to avoid timing issues
          })

          // Now manually calculate and update totals
          const quantity = Number(processedData.quantity) || 0
          const unitPrice = Number(processedData.unitPrice) || 0
          const discountValue = Number(processedData.discountValue) || 0
          const taxRate = Number(processedData.taxRate) || 0

          const subtotal = quantity * unitPrice
          const discountAmount = processedData.discountType === DiscountType.PERCENTAGE
            ? subtotal * (discountValue / 100)
            : Math.min(discountValue, subtotal)
          const totalAfterDiscount = subtotal - discountAmount
          const taxAmount = totalAfterDiscount * (taxRate / 100)
          const total = totalAfterDiscount + taxAmount

          // Update with calculated values
          await createdLine.update({
            subtotal,
            discountAmount,
            totalAfterDiscount,
            taxAmount,
            total
          }, { transaction })
        }

        // Recalculate totals manually since the instance has ID issues
        const lines = await InvoiceLine.findAll({
          where: { invoiceId: invoiceId },
          transaction
        })

        // Use getDataValue to access real values, not shadowed properties
        const subtotal = lines.reduce((sum, line) => sum + (Number(line.getDataValue('subtotal')) || 0), 0)
        const totalDiscountAmount = lines.reduce((sum, line) => sum + (Number(line.getDataValue('discountAmount')) || 0), 0)
        const totalTaxAmount = lines.reduce((sum, line) => sum + (Number(line.getDataValue('taxAmount')) || 0), 0)
        const total = lines.reduce((sum, line) => sum + (Number(line.getDataValue('total')) || 0), 0)

        // Update the invoice with calculated totals
        await Invoice.update({
          subtotal,
          totalDiscountAmount,
          totalTaxAmount,
          total,
          remainingAmount: total
        }, {
          where: { id: invoiceId },
          transaction
        })
      }

      await transaction.commit()

      // Return invoice with associations using the correct ID
      return this.getInvoiceById(invoiceId)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  // Create invoice from quote
  static async createInvoiceFromQuote(
    quoteId: string,
    assignedUserId: string
  ): Promise<Invoice> {
    const transaction = await sequelize.transaction()

    try {
      // Get quote with lines
      const quote = await Quote.findByPk(quoteId, {
        include: [
          {
            model: sequelize.models.QuoteLine,
            as: "lines",
          },
        ],
      })

      if (!quote) {
        throw {
          code: "QUOTE_NOT_FOUND",
          message: "Quote not found",
          status: 404,
        }
      }

      // Check if quote is accepted
      if (quote.status !== "accepted") {
        throw {
          code: "QUOTE_NOT_ACCEPTED",
          message: "Only accepted quotes can be converted to invoices",
          status: 400,
        }
      }

      // Create invoice from quote
      const invoice = await Invoice.createFromQuote(quote)

      await transaction.commit()

      // Return invoice with associations
      return this.getInvoiceById(invoice.id)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  // Get invoice by ID
  static async getInvoiceById(id: string): Promise<Invoice> {
    const invoice = await Invoice.findByPk(id, {
      include: [
        {
          model: sequelize.models.InvoiceLine,
          as: "lines",
        },
        {
          model: sequelize.models.Payment,
          as: "payments",
          include: [
            {
              model: User,
              as: "recordedByUser",
              attributes: ["id", "firstName", "lastName", "email"],
            },
          ],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Quote,
          as: "quote",
          attributes: ["id", "quoteNumber", "title"],
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

  // Update invoice
  static async updateInvoice(
    id: string,
    updateData: Partial<InvoiceCreateRequest>,
    userId: string
  ): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id)

    // Check permissions
    if (!this.canUserModifyInvoice(invoice, userId)) {
      throw {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to modify this invoice",
        status: 403,
      }
    }

    // Check if invoice can be modified
    if (!invoice.canBeModified()) {
      throw {
        code: "INVOICE_NOT_MODIFIABLE",
        message: "Invoice cannot be modified in its current state",
        status: 400,
      }
    }

    // Update invoice fields
    if (updateData.title !== undefined) invoice.title = updateData.title
    if (updateData.description !== undefined) invoice.description = updateData.description
    if (updateData.dueDate !== undefined) invoice.dueDate = updateData.dueDate

    await invoice.save()

    return this.getInvoiceById(id)
  }

  // Delete invoice
  static async deleteInvoice(id: string, userId: string): Promise<void> {
    const invoice = await this.getInvoiceById(id)

    // Check permissions
    if (!this.canUserModifyInvoice(invoice, userId)) {
      throw {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to delete this invoice",
        status: 403,
      }
    }

    // Check if invoice can be deleted
    if (!invoice.canBeDeleted()) {
      throw {
        code: "INVOICE_NOT_DELETABLE",
        message: "Invoice cannot be deleted in its current state",
        status: 400,
      }
    }

    await invoice.destroy()
  }

  // Send invoice
  static async sendInvoice(id: string, userId: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id)

    // Check permissions
    if (!this.canUserModifyInvoice(invoice, userId)) {
      throw {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to send this invoice",
        status: 403,
      }
    }

    await invoice.send()

    return this.getInvoiceById(id)
  }

  // Cancel invoice
  static async cancelInvoice(id: string, userId: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id)

    // Check permissions
    if (!this.canUserModifyInvoice(invoice, userId)) {
      throw {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to cancel this invoice",
        status: 403,
      }
    }

    await invoice.cancel()

    return this.getInvoiceById(id)
  }

  // Add invoice line
  static async addInvoiceLine(
    invoiceId: string,
    lineData: InvoiceLineCreateRequest,
    userId: string
  ): Promise<InvoiceLine> {
    const invoice = await this.getInvoiceById(invoiceId)

    // Check permissions
    if (!this.canUserModifyInvoice(invoice, userId)) {
      throw {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to modify this invoice",
        status: 403,
      }
    }

    // Check if invoice can be modified
    if (!invoice.canBeModified()) {
      throw {
        code: "INVOICE_NOT_MODIFIABLE",
        message: "Invoice cannot be modified in its current state",
        status: 400,
      }
    }

    const transaction = await sequelize.transaction()

    try {
      // Create line
      const line = await InvoiceLine.createLine({
        invoiceId,
        description: lineData.description,
        quantity: lineData.quantity,
        unitPrice: lineData.unitPrice,
        discountType: lineData.discountType,
        discountValue: lineData.discountValue,
        taxRate: lineData.taxRate,
      })

      // Recalculate invoice totals
      await invoice.recalculateTotals()

      await transaction.commit()

      return line
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  // Update invoice line
  static async updateInvoiceLine(
    lineId: string,
    lineData: InvoiceLineUpdateRequest,
    userId: string
  ): Promise<InvoiceLine> {
    const line = await InvoiceLine.findByPk(lineId)
    if (!line) {
      throw {
        code: "INVOICE_LINE_NOT_FOUND",
        message: "Invoice line not found",
        status: 404,
      }
    }

    const invoice = await this.getInvoiceById(line.invoiceId)

    // Check permissions
    if (!this.canUserModifyInvoice(invoice, userId)) {
      throw {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to modify this invoice",
        status: 403,
      }
    }

    // Check if invoice can be modified
    if (!invoice.canBeModified()) {
      throw {
        code: "INVOICE_NOT_MODIFIABLE",
        message: "Invoice cannot be modified in its current state",
        status: 400,
      }
    }

    const transaction = await sequelize.transaction()

    try {
      // Update line fields
      if (lineData.description !== undefined) line.description = lineData.description
      if (lineData.quantity !== undefined) line.quantity = lineData.quantity
      if (lineData.unitPrice !== undefined) line.unitPrice = lineData.unitPrice
      if (lineData.discountType !== undefined) line.discountType = lineData.discountType
      if (lineData.discountValue !== undefined)
        line.discountValue = lineData.discountValue
      if (lineData.taxRate !== undefined) line.taxRate = lineData.taxRate
      if (lineData.orderIndex !== undefined) line.orderIndex = lineData.orderIndex

      // Recalculate totals
      line.calculateTotals()
      await line.save()

      // Recalculate invoice totals
      await invoice.recalculateTotals()

      await transaction.commit()

      return line
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  // Delete invoice line
  static async deleteInvoiceLine(lineId: string, userId: string): Promise<void> {
    const line = await InvoiceLine.findByPk(lineId)
    if (!line) {
      throw {
        code: "INVOICE_LINE_NOT_FOUND",
        message: "Invoice line not found",
        status: 404,
      }
    }

    const invoice = await this.getInvoiceById(line.invoiceId)

    // Check permissions
    if (!this.canUserModifyInvoice(invoice, userId)) {
      throw {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to modify this invoice",
        status: 403,
      }
    }

    // Check if invoice can be modified
    if (!invoice.canBeModified()) {
      throw {
        code: "INVOICE_NOT_MODIFIABLE",
        message: "Invoice cannot be modified in its current state",
        status: 400,
      }
    }

    const transaction = await sequelize.transaction()

    try {
      await line.destroy()

      // Update order indexes
      await InvoiceLine.updateOrderIndexes(invoice.id)

      // Recalculate invoice totals
      await invoice.recalculateTotals()

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  // Reorder invoice lines
  static async reorderInvoiceLines(
    invoiceId: string,
    lineIds: string[],
    userId: string
  ): Promise<InvoiceLine[]> {
    const invoice = await this.getInvoiceById(invoiceId)

    // Check permissions
    if (!this.canUserModifyInvoice(invoice, userId)) {
      throw {
        code: "INSUFFICIENT_PERMISSIONS",
        message: "You don't have permission to modify this invoice",
        status: 403,
      }
    }

    // Check if invoice can be modified
    if (!invoice.canBeModified()) {
      throw {
        code: "INVOICE_NOT_MODIFIABLE",
        message: "Invoice cannot be modified in its current state",
        status: 400,
      }
    }

    await InvoiceLine.reorderLines(invoiceId, lineIds)

    return InvoiceLine.findByInvoice(invoiceId)
  }

  // Record payment
  static async recordPayment(
    paymentData: PaymentCreateRequest,
    recordedBy: string
  ): Promise<Payment> {
    const invoice = await this.getInvoiceById(paymentData.invoiceId)

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
      return this.getPaymentById(payment.id)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  // Confirm payment
  static async confirmPayment(paymentId: string, userId: string): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId)

    // Check permissions (only the recorder or admin can confirm)
    if (payment.recordedBy !== userId) {
      // TODO: Add role-based permission check
    }

    await payment.confirm()

    return this.getPaymentById(paymentId)
  }

  // Cancel payment
  static async cancelPayment(
    paymentId: string,
    userId: string,
    reason?: string
  ): Promise<Payment> {
    const payment = await this.getPaymentById(paymentId)

    // Check permissions (only the recorder or admin can cancel)
    if (payment.recordedBy !== userId) {
      // TODO: Add role-based permission check
    }

    await payment.cancel(reason)

    return this.getPaymentById(paymentId)
  }

  // Get payment by ID
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

  // Search invoices
  static async searchInvoices(
    filters: BillingSearchFilters,
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    invoices: Invoice[]
    total: number
    pages: number
  }> {
    const where: any = {}
    const include: any[] = [
      {
        model: sequelize.models.InvoiceLine,
        as: "lines",
      },
      {
        model: sequelize.models.Payment,
        as: "payments",
      },
      {
        model: MedicalInstitution,
        as: "institution",
        attributes: ["id", "name", "type"],
      },
      {
        model: User,
        as: "assignedUser",
        attributes: ["id", "firstName", "lastName", "email"],
      },
    ]

    // Apply filters
    if (filters.institutionId) {
      where.institutionId = filters.institutionId
    }

    if (filters.assignedUserId) {
      where.assignedUserId = filters.assignedUserId
    } else if (userRole === "USER") {
      // Regular users can only see their own invoices
      where.assignedUserId = userId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) {
        where.createdAt[Op.gte] = filters.dateFrom
      }
      if (filters.dateTo) {
        where.createdAt[Op.lte] = filters.dateTo
      }
    }

    if (filters.amountMin || filters.amountMax) {
      where.total = {}
      if (filters.amountMin) {
        where.total[Op.gte] = filters.amountMin
      }
      if (filters.amountMax) {
        where.total[Op.lte] = filters.amountMax
      }
    }

    if (filters.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${filters.search}%` } },
        { invoiceNumber: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
      ]
    }

    const offset = (page - 1) * limit

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    })

    return {
      invoices: rows,
      total: count,
      pages: Math.ceil(count / limit),
    }
  }

  // Get invoices by institution
  static async getInvoicesByInstitution(institutionId: string): Promise<Invoice[]> {
    return Invoice.findByInstitution(institutionId)
  }

  // Get invoices by user
  static async getInvoicesByUser(userId: string): Promise<Invoice[]> {
    return Invoice.findByUser(userId)
  }

  // Get invoices by status
  static async getInvoicesByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    return Invoice.findByStatus(status)
  }

  // Get invoice statistics
  static async getInvoiceStatistics(userId?: string): Promise<{
    totalInvoices: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    overdueAmount: number
    statusBreakdown: Record<InvoiceStatus, number>
    paymentMethodBreakdown: Record<PaymentMethod, number>
  }> {
    const where: any = {}
    if (userId) {
      where.assignedUserId = userId
    }

    const invoices = await Invoice.findAll({
      where,
      include: [
        {
          model: sequelize.models.Payment,
          as: "payments",
          where: { status: PaymentStatus.CONFIRMED },
          required: false,
        },
      ],
    })

    const payments = await Payment.findAll({
      include: [
        {
          model: sequelize.models.Invoice,
          as: "invoice",
          where: userId ? { assignedUserId: userId } : {},
        },
      ],
    })

    // Calculate statistics
    const totalInvoices = invoices.length
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0)
    const paidAmount = invoices.reduce((sum, inv) => sum + inv.totalPaid, 0)
    const pendingAmount = invoices
      .filter((inv) => inv.status === InvoiceStatus.SENT)
      .reduce((sum, inv) => sum + inv.remainingAmount, 0)
    const overdueAmount = invoices
      .filter((inv) => inv.status === InvoiceStatus.OVERDUE)
      .reduce((sum, inv) => sum + inv.remainingAmount, 0)

    // Status breakdown
    const statusBreakdown: Record<InvoiceStatus, number> = {
      [InvoiceStatus.DRAFT]: 0,
      [InvoiceStatus.SENT]: 0,
      [InvoiceStatus.PARTIALLY_PAID]: 0,
      [InvoiceStatus.PAID]: 0,
      [InvoiceStatus.OVERDUE]: 0,
      [InvoiceStatus.CANCELLED]: 0,
    }

    invoices.forEach((invoice) => {
      statusBreakdown[invoice.status]++
    })

    // Payment method breakdown
    const paymentMethodBreakdown: Record<PaymentMethod, number> = {
      [PaymentMethod.BANK_TRANSFER]: 0,
      [PaymentMethod.CHECK]: 0,
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.CREDIT_CARD]: 0,
      [PaymentMethod.OTHER]: 0,
    }

    payments
      .filter((payment) => payment.status === PaymentStatus.CONFIRMED)
      .forEach((payment) => {
        paymentMethodBreakdown[payment.paymentMethod]++
      })

    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      statusBreakdown,
      paymentMethodBreakdown,
    }
  }

  // Validation methods
  static validateInvoiceData(data: Partial<InvoiceCreateRequest>): void {
    if (data.title !== undefined && data.title.trim().length === 0) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Invoice title cannot be empty",
        status: 400,
      }
    }

    if (data.dueDate && new Date(data.dueDate) < new Date()) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Due date cannot be in the past",
        status: 400,
      }
    }
  }

  static validateInvoiceLineData(data: Partial<InvoiceLineCreateRequest>): void {
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Quantity must be greater than zero",
        status: 400,
      }
    }

    if (data.unitPrice !== undefined && data.unitPrice < 0) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Unit price cannot be negative",
        status: 400,
      }
    }

    if (data.discountValue !== undefined && data.discountValue < 0) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Discount value cannot be negative",
        status: 400,
      }
    }

    if (data.taxRate !== undefined && (data.taxRate < 0 || data.taxRate > 100)) {
      throw {
        code: "VALIDATION_ERROR",
        message: "Tax rate must be between 0 and 100",
        status: 400,
      }
    }
  }

  // Reconcile invoice payments
  static async reconcileInvoicePayments(
    invoiceId: string,
    userId: string
  ): Promise<{
    invoice: Invoice
    totalPaid: number
    remainingAmount: number
    statusChanged: boolean
  }> {
    const invoice = await this.getInvoiceById(invoiceId)

    // Check permissions
    if (!this.canUserModifyInvoice(invoice, userId)) {
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

      const updatedInvoice = await this.getInvoiceById(invoiceId)

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

  // Get payment history with filtering
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

  // Get payment summary and analytics
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
          month: new Date(parseInt(year), parseInt(month) - 1).toLocaleString("default", {
            month: "long",
          }),
          year: parseInt(year),
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

  // Permission helper
  private static canUserModifyInvoice(invoice: Invoice, userId: string): boolean {
    // For now, only the assigned user can modify
    // TODO: Add role-based permissions
    return invoice.assignedUserId === userId
  }
}
