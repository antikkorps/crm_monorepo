import {
  SimplifiedTransactionCreateRequest,
  SimplifiedTransactionSearchFilters,
  SimplifiedTransactionStatus,
  SimplifiedTransactionType,
  SimplifiedTransactionUpdateRequest,
} from "@medical-crm/shared"
import { User } from "../models/User"
import { SimplifiedTransactionService } from "../services/SimplifiedTransactionService"
import { Context } from "../types/koa"
import { BadRequestError, NotFoundError } from "../utils/AppError"

export class SimplifiedTransactionController {
  /**
   * GET /api/simplified-transactions
   * Get all simplified transactions with optional filtering
   */
  static async getTransactions(ctx: Context) {
    const {
      institutionId,
      type,
      status,
      createdById,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      search,
      page = 1,
      limit = 20,
    } = ctx.query

    // Build filters
    const filters: SimplifiedTransactionSearchFilters = {}

    if (institutionId) filters.institutionId = institutionId as string
    if (type) filters.type = type as SimplifiedTransactionType
    if (status) filters.status = status as SimplifiedTransactionStatus
    if (createdById) filters.createdById = createdById as string
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string)
    if (dateTo) filters.dateTo = new Date(dateTo as string)
    if (amountMin) filters.amountMin = Number(amountMin)
    if (amountMax) filters.amountMax = Number(amountMax)
    if (search) filters.search = search as string

    const result = await SimplifiedTransactionService.getTransactions(
      filters,
      Number(page),
      Number(limit)
    )

    ctx.body = {
      success: true,
      data: result.transactions,
      meta: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
    }
  }

  /**
   * GET /api/simplified-transactions/statistics
   * Get statistics for simplified transactions
   */
  static async getStatistics(ctx: Context) {
    const { institutionId } = ctx.query

    const statistics = await SimplifiedTransactionService.getStatistics(
      institutionId as string | undefined
    )

    ctx.body = {
      success: true,
      data: statistics,
    }
  }

  /**
   * GET /api/simplified-transactions/institution/:institutionId
   * Get simplified transactions by institution
   */
  static async getTransactionsByInstitution(ctx: Context) {
    const { institutionId } = ctx.params
    const { type, status, dateFrom, dateTo, page = 1, limit = 50 } = ctx.query

    // Build filters
    const filters: Omit<SimplifiedTransactionSearchFilters, "institutionId"> = {}
    if (type) filters.type = type as SimplifiedTransactionType
    if (status) filters.status = status as SimplifiedTransactionStatus
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string)
    if (dateTo) filters.dateTo = new Date(dateTo as string)

    const result = await SimplifiedTransactionService.getByInstitution(
      institutionId,
      filters,
      Number(page),
      Number(limit)
    )

    ctx.body = {
      success: true,
      data: result.transactions,
      meta: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
    }
  }

  /**
   * GET /api/simplified-transactions/type/:type
   * Get simplified transactions by type
   */
  static async getTransactionsByType(ctx: Context) {
    const { type } = ctx.params
    const { page = 1, limit = 20 } = ctx.query

    const result = await SimplifiedTransactionService.getTransactions(
      { type: type as SimplifiedTransactionType },
      Number(page),
      Number(limit)
    )

    ctx.body = {
      success: true,
      data: result.transactions,
      meta: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
    }
  }

  /**
   * GET /api/simplified-transactions/:id
   * Get a specific simplified transaction
   */
  static async getTransaction(ctx: Context) {
    const { id } = ctx.params

    const transaction = await SimplifiedTransactionService.getTransactionById(id)

    if (!transaction) {
      throw new NotFoundError("Simplified transaction not found")
    }

    ctx.body = {
      success: true,
      data: transaction,
    }
  }

  /**
   * POST /api/simplified-transactions
   * Create a new simplified transaction
   */
  static async createTransaction(ctx: Context) {
    const user = ctx.state.user as User
    const transactionData = ctx.request.body as SimplifiedTransactionCreateRequest

    // Validate required fields
    if (
      !transactionData.institutionId ||
      !transactionData.type ||
      !transactionData.title ||
      !transactionData.date ||
      transactionData.amountHt === undefined ||
      !transactionData.status
    ) {
      throw new BadRequestError(
        "Institution ID, type, title, date, amount HT, and status are required",
        "VALIDATION_ERROR"
      )
    }

    // Validate transaction data
    SimplifiedTransactionService.validateTransactionData(transactionData)

    const transaction = await SimplifiedTransactionService.createTransaction(
      transactionData,
      user.id
    )

    ctx.status = 201
    ctx.body = {
      success: true,
      data: transaction,
    }
  }

  /**
   * PUT /api/simplified-transactions/:id
   * Update a simplified transaction
   */
  static async updateTransaction(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const updateData = ctx.request.body as SimplifiedTransactionUpdateRequest

    // Validate transaction data
    SimplifiedTransactionService.validateTransactionData(updateData)

    const transaction = await SimplifiedTransactionService.updateTransaction(
      id,
      updateData,
      user.id
    )

    ctx.body = {
      success: true,
      data: transaction,
    }
  }

  /**
   * DELETE /api/simplified-transactions/:id
   * Delete a simplified transaction (soft delete)
   */
  static async deleteTransaction(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    await SimplifiedTransactionService.deleteTransaction(id, user.id)

    ctx.body = {
      success: true,
      message: "Simplified transaction deleted successfully",
    }
  }

  /**
   * GET /api/simplified-transactions/timeline/:institutionId
   * Get simplified transactions formatted for timeline display
   */
  static async getForTimeline(ctx: Context) {
    const { institutionId } = ctx.params
    const { dateFrom, dateTo } = ctx.query

    const timelineItems = await SimplifiedTransactionService.getForTimeline(
      institutionId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    )

    ctx.body = {
      success: true,
      data: timelineItems,
    }
  }
}

export default SimplifiedTransactionController
