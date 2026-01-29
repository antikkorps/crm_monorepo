import {
  SimplifiedTransactionCreateRequest,
  SimplifiedTransactionSearchFilters,
  SimplifiedTransactionStatus,
  SimplifiedTransactionType,
  SimplifiedTransactionUpdateRequest,
  getValidStatusesForType,
} from "@medical-crm/shared"
import { Op } from "sequelize"
import { createError } from "../middleware/errorHandler"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { SimplifiedTransaction } from "../models/SimplifiedTransaction"
import { User } from "../models/User"

export class SimplifiedTransactionService {
  /**
   * Create a new simplified transaction
   */
  public static async createTransaction(
    data: SimplifiedTransactionCreateRequest,
    userId: string
  ): Promise<SimplifiedTransaction> {
    // Validate institution exists
    const institution = await MedicalInstitution.findByPk(data.institutionId)
    if (!institution) {
      throw createError(
        "Medical institution not found",
        404,
        "INSTITUTION_NOT_FOUND"
      )
    }

    // Validate user exists
    const user = await User.findByPk(userId)
    if (!user) {
      throw createError("User not found", 404, "USER_NOT_FOUND")
    }

    // Validate status is valid for the type
    const validStatuses = getValidStatusesForType(data.type)
    if (!validStatuses.includes(data.status)) {
      throw createError(
        `Status '${data.status}' is not valid for transaction type '${data.type}'`,
        400,
        "INVALID_STATUS_FOR_TYPE"
      )
    }

    // Calculate TTC if not provided
    const vatRate = data.vatRate ?? 20
    const amountHt = Number(data.amountHt) || 0
    const amountTtc =
      data.amountTtc ?? SimplifiedTransaction.calculateAmountTtc(amountHt, vatRate)

    // Create the transaction
    const transaction = await SimplifiedTransaction.create({
      ...data,
      createdById: userId,
      vatRate,
      amountTtc: Number(amountTtc.toFixed(2)),
    })

    // Return with associations
    return this.getTransactionById(transaction.id)
  }

  /**
   * Get a simplified transaction by ID with all associations
   */
  public static async getTransactionById(
    transactionId: string
  ): Promise<SimplifiedTransaction> {
    const transaction = await SimplifiedTransaction.findByPk(transactionId, {
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })

    if (!transaction) {
      throw createError(
        "Simplified transaction not found",
        404,
        "SIMPLIFIED_TRANSACTION_NOT_FOUND"
      )
    }

    return transaction
  }

  /**
   * Get simplified transactions with filtering and pagination
   */
  public static async getTransactions(
    filters: SimplifiedTransactionSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    transactions: SimplifiedTransaction[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const {
      search,
      type,
      status,
      institutionId,
      createdById,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
    } = filters

    // Build where clause
    const whereClause: any = {}

    // Add search filter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { referenceNumber: { [Op.iLike]: `%${search}%` } },
      ]
    }

    // Add type filter
    if (type) {
      whereClause.type = type
    }

    // Add status filter
    if (status) {
      whereClause.status = status
    }

    // Add institution filter
    if (institutionId) {
      whereClause.institutionId = institutionId
    }

    // Add creator filter
    if (createdById) {
      whereClause.createdById = createdById
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      whereClause.date = {}
      if (dateFrom) {
        whereClause.date[Op.gte] = dateFrom
      }
      if (dateTo) {
        whereClause.date[Op.lte] = dateTo
      }
    }

    // Add amount range filter
    if (amountMin !== undefined || amountMax !== undefined) {
      whereClause.amountHt = {}
      if (amountMin !== undefined) {
        whereClause.amountHt[Op.gte] = amountMin
      }
      if (amountMax !== undefined) {
        whereClause.amountHt[Op.lte] = amountMax
      }
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Get transactions and total count
    const { rows: transactions, count: total } =
      await SimplifiedTransaction.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [["date", "DESC"]],
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
          {
            model: User,
            as: "createdBy",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Get simplified transactions for a specific institution
   */
  public static async getByInstitution(
    institutionId: string,
    filters: Omit<SimplifiedTransactionSearchFilters, "institutionId"> = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{
    transactions: SimplifiedTransaction[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    return this.getTransactions({ ...filters, institutionId }, page, limit)
  }

  /**
   * Update a simplified transaction
   */
  public static async updateTransaction(
    transactionId: string,
    data: SimplifiedTransactionUpdateRequest,
    userId: string
  ): Promise<SimplifiedTransaction> {
    const transaction = await this.getTransactionById(transactionId)

    // Check if transaction can be modified
    if (!transaction.canBeModified()) {
      throw createError(
        "This transaction cannot be modified in its current status",
        400,
        "TRANSACTION_NOT_MODIFIABLE"
      )
    }

    // Validate status if being updated
    if (data.status) {
      const type = transaction.type
      const validStatuses = getValidStatusesForType(type)
      if (!validStatuses.includes(data.status)) {
        throw createError(
          `Status '${data.status}' is not valid for transaction type '${type}'`,
          400,
          "INVALID_STATUS_FOR_TYPE"
        )
      }
    }

    // Recalculate TTC if HT or VAT rate changes
    const updateData: any = { ...data }
    if (data.amountHt !== undefined || data.vatRate !== undefined) {
      const amountHt =
        data.amountHt !== undefined
          ? Number(data.amountHt)
          : Number(transaction.amountHt)
      const vatRate =
        data.vatRate !== undefined
          ? Number(data.vatRate)
          : Number(transaction.vatRate)

      if (data.amountTtc === undefined) {
        updateData.amountTtc = Number(
          SimplifiedTransaction.calculateAmountTtc(amountHt, vatRate).toFixed(2)
        )
      }
    }

    await transaction.update(updateData)

    return this.getTransactionById(transactionId)
  }

  /**
   * Delete a simplified transaction (soft delete)
   */
  public static async deleteTransaction(
    transactionId: string,
    userId: string
  ): Promise<void> {
    const transaction = await this.getTransactionById(transactionId)

    await transaction.destroy()
  }

  /**
   * Get transaction statistics
   */
  public static async getStatistics(institutionId?: string): Promise<{
    total: number
    byType: Record<SimplifiedTransactionType, number>
    byStatus: Record<SimplifiedTransactionStatus, number>
    totalAmountHt: number
    totalAmountTtc: number
    recentTransactions: SimplifiedTransaction[]
  }> {
    const whereClause: any = {}
    if (institutionId) {
      whereClause.institutionId = institutionId
    }

    const transactions = await SimplifiedTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["date", "DESC"]],
    })

    // Initialize counters
    const byType: Record<SimplifiedTransactionType, number> = {
      [SimplifiedTransactionType.QUOTE]: 0,
      [SimplifiedTransactionType.INVOICE]: 0,
      [SimplifiedTransactionType.ENGAGEMENT_LETTER]: 0,
      [SimplifiedTransactionType.CONTRACT]: 0,
    }

    const byStatus: Record<SimplifiedTransactionStatus, number> = {
      [SimplifiedTransactionStatus.DRAFT]: 0,
      [SimplifiedTransactionStatus.SENT]: 0,
      [SimplifiedTransactionStatus.ACCEPTED]: 0,
      [SimplifiedTransactionStatus.REJECTED]: 0,
      [SimplifiedTransactionStatus.EXPIRED]: 0,
      [SimplifiedTransactionStatus.CANCELLED]: 0,
      [SimplifiedTransactionStatus.PENDING]: 0,
      [SimplifiedTransactionStatus.PAID]: 0,
      [SimplifiedTransactionStatus.PARTIAL]: 0,
      [SimplifiedTransactionStatus.OVERDUE]: 0,
      [SimplifiedTransactionStatus.ACTIVE]: 0,
      [SimplifiedTransactionStatus.TERMINATED]: 0,
    }

    let totalAmountHt = 0
    let totalAmountTtc = 0

    for (const tx of transactions) {
      byType[tx.type]++
      byStatus[tx.status]++
      totalAmountHt += Number(tx.amountHt) || 0
      totalAmountTtc += Number(tx.amountTtc) || 0
    }

    return {
      total: transactions.length,
      byType,
      byStatus,
      totalAmountHt,
      totalAmountTtc,
      recentTransactions: transactions.slice(0, 5),
    }
  }

  /**
   * Get transactions for timeline display
   * Returns transactions formatted for timeline integration
   */
  public static async getForTimeline(
    institutionId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<
    Array<{
      id: string
      type: string
      title: string
      description: string
      date: Date
      amount: number
      status: string
      isExternal: true
      metadata: {
        transactionType: SimplifiedTransactionType
        referenceNumber?: string
        amountHt: number
        amountTtc: number
        vatRate: number
      }
    }>
  > {
    const whereClause: any = { institutionId }

    if (dateFrom || dateTo) {
      whereClause.date = {}
      if (dateFrom) whereClause.date[Op.gte] = dateFrom
      if (dateTo) whereClause.date[Op.lte] = dateTo
    }

    const transactions = await SimplifiedTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["date", "DESC"]],
    })

    return transactions.map((tx) => ({
      id: tx.id,
      type: `simplified_${tx.type}`,
      title: tx.title,
      description: tx.description || "",
      date: tx.date,
      amount: Number(tx.amountTtc),
      status: tx.status,
      isExternal: true as const,
      metadata: {
        transactionType: tx.type,
        referenceNumber: tx.referenceNumber,
        amountHt: Number(tx.amountHt),
        amountTtc: Number(tx.amountTtc),
        vatRate: Number(tx.vatRate),
      },
    }))
  }

  /**
   * Validate transaction data
   */
  public static validateTransactionData(
    data: SimplifiedTransactionCreateRequest | SimplifiedTransactionUpdateRequest
  ): void {
    // Validate amounts
    if ("amountHt" in data && data.amountHt !== undefined) {
      if (Number(data.amountHt) < 0) {
        throw createError(
          "Amount HT must be greater than or equal to 0",
          400,
          "INVALID_AMOUNT_HT"
        )
      }
    }

    if ("amountTtc" in data && data.amountTtc !== undefined) {
      if (Number(data.amountTtc) < 0) {
        throw createError(
          "Amount TTC must be greater than or equal to 0",
          400,
          "INVALID_AMOUNT_TTC"
        )
      }
    }

    if ("vatRate" in data && data.vatRate !== undefined) {
      if (Number(data.vatRate) < 0 || Number(data.vatRate) > 100) {
        throw createError(
          "VAT rate must be between 0 and 100",
          400,
          "INVALID_VAT_RATE"
        )
      }
    }

    // Validate payment amount for invoices
    if ("paymentAmount" in data && data.paymentAmount !== undefined) {
      if (Number(data.paymentAmount) < 0) {
        throw createError(
          "Payment amount must be greater than or equal to 0",
          400,
          "INVALID_PAYMENT_AMOUNT"
        )
      }
    }

    // Validate contract dates
    if (
      "contractStartDate" in data &&
      "contractEndDate" in data &&
      data.contractStartDate &&
      data.contractEndDate
    ) {
      if (new Date(data.contractEndDate) < new Date(data.contractStartDate)) {
        throw createError(
          "Contract end date must be after start date",
          400,
          "INVALID_CONTRACT_DATES"
        )
      }
    }
  }
}

export default SimplifiedTransactionService
