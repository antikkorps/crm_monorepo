import {
  BillingSearchFilters,
  DiscountType,
  QuoteCreateRequest,
  QuoteLineCreateRequest,
  QuoteLineUpdateRequest,
  QuoteStatus,
  QuoteUpdateRequest,
} from "@medical-crm/shared"
import { Op, Transaction } from "sequelize"
import { sequelize } from "../config/database"
import { createError } from "../middleware/errorHandler"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Quote } from "../models/Quote"
import { QuoteLine } from "../models/QuoteLine"
import { User } from "../models/User"

export class QuoteService {
  /**
   * Create a new quote with lines
   */
  public static async createQuote(
    data: QuoteCreateRequest,
    userId: string
  ): Promise<Quote> {
    const transaction = await sequelize.transaction()

    try {
      // Validate institution exists
      const institution = await MedicalInstitution.findByPk(data.institutionId)
      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // Validate user exists
      const user = await User.findByPk(userId)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND")
      }

      // Create the quote
      const quote = await Quote.createQuote({
        ...data,
        assignedUserId: userId,
      })

      // Create quote lines if provided
      if (data.lines && data.lines.length > 0) {
        for (let i = 0; i < data.lines.length; i++) {
          const lineData = data.lines[i]
          await QuoteLine.createLine({
            ...lineData,
            quoteId: quote.id,
            orderIndex: i + 1,
          })
        }

        // Recalculate quote totals
        await this.recalculateQuoteTotals(quote.id, transaction)
      }

      await transaction.commit()

      // Return the complete quote with lines
      return this.getQuoteById(quote.id)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Get quote by ID with all associations
   */
  public static async getQuoteById(quoteId: string): Promise<Quote> {
    const quote = await Quote.findByPk(quoteId, {
      include: [
        {
          model: QuoteLine,
          as: "lines",
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
      ],
    })

    if (!quote) {
      throw createError("Quote not found", 404, "QUOTE_NOT_FOUND")
    }

    return quote
  }

  /**
   * Update quote details
   */
  public static async updateQuote(
    quoteId: string,
    data: QuoteUpdateRequest,
    userId: string
  ): Promise<Quote> {
    const quote = await Quote.findByPk(quoteId)
    if (!quote) {
      throw createError("Quote not found", 404, "QUOTE_NOT_FOUND")
    }

    // Check if user can modify this quote
    if (!this.canUserModifyQuote(quote, userId)) {
      throw createError(
        "Insufficient permissions to modify this quote",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if quote can be modified
    if (!quote.canBeModified()) {
      throw createError(
        "Quote cannot be modified in its current state",
        400,
        "QUOTE_NOT_MODIFIABLE"
      )
    }

    // Update quote
    await quote.update(data)

    return this.getQuoteById(quoteId)
  }

  /**
   * Delete quote
   */
  public static async deleteQuote(quoteId: string, userId: string): Promise<void> {
    const quote = await Quote.findByPk(quoteId)
    if (!quote) {
      throw createError("Quote not found", 404, "QUOTE_NOT_FOUND")
    }

    // Check if user can modify this quote
    if (!this.canUserModifyQuote(quote, userId)) {
      throw createError(
        "Insufficient permissions to delete this quote",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if quote can be deleted (only draft quotes)
    if (quote.status !== QuoteStatus.DRAFT) {
      throw createError("Only draft quotes can be deleted", 400, "QUOTE_NOT_DELETABLE")
    }

    await quote.destroy()
  }

  /**
   * Send quote to client
   */
  public static async sendQuote(quoteId: string, userId: string): Promise<Quote> {
    const quote = await Quote.findByPk(quoteId)
    if (!quote) {
      throw createError("Quote not found", 404, "QUOTE_NOT_FOUND")
    }

    // Check if user can modify this quote
    if (!this.canUserModifyQuote(quote, userId)) {
      throw createError(
        "Insufficient permissions to send this quote",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Validate quote has lines
    const lines = await quote.getLines()
    if (lines.length === 0) {
      throw createError("Cannot send quote without line items", 400, "QUOTE_NO_LINES")
    }

    await quote.send()
    return this.getQuoteById(quoteId)
  }

  /**
   * Accept quote
   */
  public static async acceptQuote(
    quoteId: string,
    clientComments?: string
  ): Promise<Quote> {
    const quote = await Quote.findByPk(quoteId)
    if (!quote) {
      throw createError("Quote not found", 404, "QUOTE_NOT_FOUND")
    }

    await quote.accept(clientComments)
    return this.getQuoteById(quoteId)
  }

  /**
   * Reject quote
   */
  public static async rejectQuote(
    quoteId: string,
    clientComments?: string
  ): Promise<Quote> {
    const quote = await Quote.findByPk(quoteId)
    if (!quote) {
      throw createError("Quote not found", 404, "QUOTE_NOT_FOUND")
    }

    await quote.reject(clientComments)
    return this.getQuoteById(quoteId)
  }

  /**
   * Cancel quote
   */
  public static async cancelQuote(quoteId: string, userId: string): Promise<Quote> {
    const quote = await Quote.findByPk(quoteId)
    if (!quote) {
      throw createError("Quote not found", 404, "QUOTE_NOT_FOUND")
    }

    // Check if user can modify this quote
    if (!this.canUserModifyQuote(quote, userId)) {
      throw createError(
        "Insufficient permissions to cancel this quote",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    await quote.cancel()
    return this.getQuoteById(quoteId)
  }

  /**
   * Add line to quote
   */
  public static async addQuoteLine(
    quoteId: string,
    lineData: QuoteLineCreateRequest,
    userId: string
  ): Promise<QuoteLine> {
    const quote = await Quote.findByPk(quoteId)
    if (!quote) {
      throw createError("Quote not found", 404, "QUOTE_NOT_FOUND")
    }

    // Check if user can modify this quote
    if (!this.canUserModifyQuote(quote, userId)) {
      throw createError(
        "Insufficient permissions to modify this quote",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if quote can be modified
    if (!quote.canBeModified()) {
      throw createError(
        "Quote cannot be modified in its current state",
        400,
        "QUOTE_NOT_MODIFIABLE"
      )
    }

    const transaction = await sequelize.transaction()

    try {
      // Create the line
      const line = await QuoteLine.createLine(
        {
          ...lineData,
          quoteId,
        },
        { transaction }
      )

      // Recalculate quote totals
      await this.recalculateQuoteTotals(quoteId, transaction)

      await transaction.commit()
      return line
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Update quote line
   */
  public static async updateQuoteLine(
    lineId: string,
    lineData: QuoteLineUpdateRequest,
    userId: string
  ): Promise<QuoteLine> {
    const line = await QuoteLine.findByPk(lineId, {
      include: [{ model: Quote, as: "quote" }],
    })

    if (!line) {
      throw createError("Quote line not found", 404, "QUOTE_LINE_NOT_FOUND")
    }

    const quote = line.quote!

    // Check if user can modify this quote
    if (!this.canUserModifyQuote(quote, userId)) {
      throw createError(
        "Insufficient permissions to modify this quote",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if quote can be modified
    if (!quote.canBeModified()) {
      throw createError(
        "Quote cannot be modified in its current state",
        400,
        "QUOTE_NOT_MODIFIABLE"
      )
    }

    const transaction = await sequelize.transaction()

    try {
      // Update the line
      await line.update(lineData, { transaction })

      // Recalculate quote totals
      await this.recalculateQuoteTotals(quote.id, transaction)

      await transaction.commit()
      return line
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Delete quote line
   */
  public static async deleteQuoteLine(lineId: string, userId: string): Promise<void> {
    const line = await QuoteLine.findByPk(lineId, {
      include: [{ model: Quote, as: "quote" }],
    })

    if (!line) {
      throw createError("Quote line not found", 404, "QUOTE_LINE_NOT_FOUND")
    }

    const quote = line.quote!

    // Check if user can modify this quote
    if (!this.canUserModifyQuote(quote, userId)) {
      throw createError(
        "Insufficient permissions to modify this quote",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if quote can be modified
    if (!quote.canBeModified()) {
      throw createError(
        "Quote cannot be modified in its current state",
        400,
        "QUOTE_NOT_MODIFIABLE"
      )
    }

    const transaction = await sequelize.transaction()

    try {
      const quoteId = quote.id

      // Delete the line
      await line.destroy({ transaction })

      // Update order indexes for remaining lines
      await QuoteLine.updateOrderIndexes(quoteId)

      // Recalculate quote totals
      await this.recalculateQuoteTotals(quoteId, transaction)

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Reorder quote lines
   */
  public static async reorderQuoteLines(
    quoteId: string,
    lineIds: string[],
    userId: string
  ): Promise<QuoteLine[]> {
    const quote = await Quote.findByPk(quoteId)
    if (!quote) {
      throw createError("Quote not found", 404, "QUOTE_NOT_FOUND")
    }

    // Check if user can modify this quote
    if (!this.canUserModifyQuote(quote, userId)) {
      throw createError(
        "Insufficient permissions to modify this quote",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if quote can be modified
    if (!quote.canBeModified()) {
      throw createError(
        "Quote cannot be modified in its current state",
        400,
        "QUOTE_NOT_MODIFIABLE"
      )
    }

    // Validate all line IDs belong to this quote
    const existingLines = await QuoteLine.findAll({
      where: { quoteId },
      attributes: ["id"],
    })

    const existingLineIds = existingLines.map((line) => line.id)
    const invalidLineIds = lineIds.filter((id) => !existingLineIds.includes(id))

    if (invalidLineIds.length > 0) {
      throw createError("Invalid line IDs provided", 400, "INVALID_LINE_IDS")
    }

    if (lineIds.length !== existingLineIds.length) {
      throw createError(
        "All quote lines must be included in reorder",
        400,
        "INCOMPLETE_LINE_LIST"
      )
    }

    await QuoteLine.reorderLines(quoteId, lineIds)

    return QuoteLine.findByQuote(quoteId)
  }

  /**
   * Search quotes with filters
   */
  public static async searchQuotes(
    filters: BillingSearchFilters,
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ quotes: Quote[]; total: number; pages: number }> {
    const whereClause: any = {}

    // Apply filters
    if (filters.institutionId) {
      whereClause.institutionId = filters.institutionId
    }

    if (filters.status) {
      whereClause.status = filters.status
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.createdAt = {}
      if (filters.dateFrom) {
        whereClause.createdAt[Op.gte] = filters.dateFrom
      }
      if (filters.dateTo) {
        whereClause.createdAt[Op.lte] = filters.dateTo
      }
    }

    if (filters.amountMin || filters.amountMax) {
      whereClause.total = {}
      if (filters.amountMin) {
        whereClause.total[Op.gte] = filters.amountMin
      }
      if (filters.amountMax) {
        whereClause.total[Op.lte] = filters.amountMax
      }
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
        { quoteNumber: { [Op.iLike]: `%${filters.search}%` } },
      ]
    }

    // Apply user-based filtering based on role
    if (userRole === "USER") {
      whereClause.assignedUserId = userId
    } else if (filters.assignedUserId) {
      whereClause.assignedUserId = filters.assignedUserId
    }

    const offset = (page - 1) * limit

    const { count, rows } = await Quote.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: QuoteLine,
          as: "lines",
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
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    })

    return {
      quotes: rows,
      total: count,
      pages: Math.ceil(count / limit),
    }
  }

  /**
   * Get quotes by institution
   */
  public static async getQuotesByInstitution(institutionId: string): Promise<Quote[]> {
    return Quote.findByInstitution(institutionId)
  }

  /**
   * Get quotes by user
   */
  public static async getQuotesByUser(userId: string): Promise<Quote[]> {
    return Quote.findByUser(userId)
  }

  /**
   * Get quotes by status
   */
  public static async getQuotesByStatus(status: QuoteStatus): Promise<Quote[]> {
    return Quote.findByStatus(status)
  }

  /**
   * Mark expired quotes
   */
  public static async markExpiredQuotes(): Promise<number> {
    return Quote.markExpiredQuotes()
  }

  /**
   * Get quote statistics
   */
  public static async getQuoteStatistics(userId?: string): Promise<any> {
    const whereClause: any = {}
    if (userId) {
      whereClause.assignedUserId = userId
    }

    const [
      totalQuotes,
      draftQuotes,
      sentQuotes,
      acceptedQuotes,
      rejectedQuotes,
      expiredQuotes,
      totalValue,
      acceptedValue,
    ] = await Promise.all([
      Quote.count({ where: whereClause }),
      Quote.count({ where: { ...whereClause, status: QuoteStatus.DRAFT } }),
      Quote.count({ where: { ...whereClause, status: QuoteStatus.SENT } }),
      Quote.count({ where: { ...whereClause, status: QuoteStatus.ACCEPTED } }),
      Quote.count({ where: { ...whereClause, status: QuoteStatus.REJECTED } }),
      Quote.count({ where: { ...whereClause, status: QuoteStatus.EXPIRED } }),
      Quote.sum("total", { where: whereClause }) || 0,
      Quote.sum("total", { where: { ...whereClause, status: QuoteStatus.ACCEPTED } }) ||
        0,
    ])

    const conversionRate = sentQuotes > 0 ? (acceptedQuotes / sentQuotes) * 100 : 0

    return {
      totalQuotes,
      draftQuotes,
      sentQuotes,
      acceptedQuotes,
      rejectedQuotes,
      expiredQuotes,
      totalValue: parseFloat(totalValue.toString()),
      acceptedValue: parseFloat(acceptedValue.toString()),
      conversionRate: Math.round(conversionRate * 100) / 100,
    }
  }

  /**
   * Validate quote data
   */
  public static validateQuoteData(data: QuoteCreateRequest | QuoteUpdateRequest): void {
    if ("title" in data && (!data.title || data.title.trim().length === 0)) {
      throw createError("Quote title is required", 400, "VALIDATION_ERROR")
    }

    if (
      "validUntil" in data &&
      data.validUntil &&
      new Date(data.validUntil) <= new Date()
    ) {
      throw createError("Valid until date must be in the future", 400, "VALIDATION_ERROR")
    }

    if ("lines" in data && data.lines) {
      for (const line of data.lines) {
        this.validateQuoteLineData(line)
      }
    }
  }

  /**
   * Validate quote line data
   */
  public static validateQuoteLineData(
    data: QuoteLineCreateRequest | QuoteLineUpdateRequest
  ): void {
    if (
      "description" in data &&
      (!data.description || data.description.trim().length === 0)
    ) {
      throw createError("Line description is required", 400, "VALIDATION_ERROR")
    }

    if ("quantity" in data && data.quantity !== undefined && data.quantity <= 0) {
      throw createError("Quantity must be greater than 0", 400, "VALIDATION_ERROR")
    }

    if ("unitPrice" in data && data.unitPrice !== undefined && data.unitPrice < 0) {
      throw createError("Unit price cannot be negative", 400, "VALIDATION_ERROR")
    }

    if (
      "discountValue" in data &&
      data.discountValue !== undefined &&
      data.discountValue < 0
    ) {
      throw createError("Discount value cannot be negative", 400, "VALIDATION_ERROR")
    }

    if (
      "taxRate" in data &&
      data.taxRate !== undefined &&
      (data.taxRate < 0 || data.taxRate > 100)
    ) {
      throw createError("Tax rate must be between 0 and 100", 400, "VALIDATION_ERROR")
    }

    if (
      "discountType" in data &&
      "discountValue" in data &&
      data.discountType === DiscountType.PERCENTAGE &&
      data.discountValue !== undefined &&
      data.discountValue > 100
    ) {
      throw createError("Percentage discount cannot exceed 100%", 400, "VALIDATION_ERROR")
    }
  }

  /**
   * Recalculate quote totals
   */
  private static async recalculateQuoteTotals(
    quoteId: string,
    transaction?: Transaction
  ): Promise<void> {
    const quote = await Quote.findByPk(quoteId, { transaction })
    if (quote) {
      await quote.recalculateTotals()
    }
  }

  /**
   * Check if user can modify quote
   */
  private static canUserModifyQuote(quote: Quote, userId: string): boolean {
    // For now, only the assigned user can modify the quote
    // This can be extended based on role-based permissions
    return quote.assignedUserId === userId
  }
}

export default QuoteService
