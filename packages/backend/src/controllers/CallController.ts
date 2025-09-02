import { CallType } from "@medical-crm/shared"
import { Call } from "../models/Call"
import { ContactPerson } from "../models/ContactPerson"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { User } from "../models/User"
import { Context, Next } from "../types/koa"
import { createError } from "../utils/logger"

export class CallController {
  /**
   * Get all calls with optional filtering
   */
  public static async getCalls(ctx: Context, _next: Next): Promise<void> {
    try {
      const {
        userId,
        institutionId,
        callType,
        phoneNumber,
        dateFrom,
        dateTo,
        search,
        contactPersonId,
        limit = 50,
        offset = 0,
      } = ctx.query

      const filters: any = {}

      if (userId) filters.userId = userId
      if (institutionId) filters.institutionId = institutionId
      if (callType) filters.callType = callType
      if (phoneNumber) filters.phoneNumber = phoneNumber
      if (contactPersonId) filters.contactPersonId = contactPersonId
      if (search) filters.search = search

      if (dateFrom) {
        filters.dateFrom = new Date(dateFrom as string)
      }

      if (dateTo) {
        filters.dateTo = new Date(dateTo as string)
      }

      const calls = await Call.searchCalls(filters)

      // Apply pagination
      const paginatedCalls = calls.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      )

      ctx.body = {
        success: true,
        data: paginatedCalls,
        pagination: {
          total: calls.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      }
    } catch (error: any) {
      throw createError("Failed to fetch calls", 500, "FETCH_CALLS_ERROR", { error })
    }
  }

  /**
   * Get call by ID
   */
  public static async getCall(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const call = await Call.findByPk(id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
          {
            model: ContactPerson,
            as: "contactPerson",
            attributes: ["id", "firstName", "lastName", "phone", "email"],
          },
        ],
      })

      if (!call) {
        throw createError("Call not found", 404, "CALL_NOT_FOUND")
      }

      ctx.body = {
        success: true,
        data: call,
      }
    } catch (error: any) {
      if (error.status === 404) {
        throw error
      }
      throw createError("Failed to fetch call", 500, "FETCH_CALL_ERROR", { error })
    }
  }

  /**
   * Create a new call
   */
  public static async createCall(ctx: Context, _next: Next): Promise<void> {
    try {
      const {
        phoneNumber,
        duration,
        summary,
        callType,
        userId,
        institutionId,
        contactPersonId,
      } = ctx.request.body as {
        phoneNumber: string
        duration?: number
        summary?: string
        callType: CallType
        userId: string
        institutionId?: string
        contactPersonId?: string
      }

      // Validate required fields
      if (!phoneNumber || !callType || !userId) {
        throw createError("Missing required fields", 400, "MISSING_REQUIRED_FIELDS")
      }

      // Validate callType
      if (!Object.values(CallType).includes(callType)) {
        throw createError("Invalid call type", 400, "INVALID_CALL_TYPE")
      }

      const call = await Call.createCallWithAutoLink({
        phoneNumber,
        duration,
        summary,
        callType,
        userId,
        institutionId,
        contactPersonId,
      })

      ctx.status = 201
      ctx.body = {
        success: true,
        data: call,
      }
    } catch (error: any) {
      if (error.status === 400) {
        throw error
      }
      throw createError("Failed to create call", 500, "CREATE_CALL_ERROR", { error })
    }
  }

  /**
   * Update a call
   */
  public static async updateCall(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const updateData = ctx.request.body as Partial<{
        phoneNumber: string
        duration?: number
        summary?: string
        callType: CallType
        institutionId?: string
        contactPersonId?: string
      }>

      const call = await Call.findByPk(id)

      if (!call) {
        throw createError("Call not found", 404, "CALL_NOT_FOUND")
      }

      // Validate call data before update
      if (updateData) {
        Call.validateCallData(updateData)
      }

      await call.update(updateData)

      // Reload with associations
      await call.reload({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
          {
            model: ContactPerson,
            as: "contactPerson",
            attributes: ["id", "firstName", "lastName", "phone", "email"],
          },
        ],
      })

      ctx.body = {
        success: true,
        data: call,
      }
    } catch (error: any) {
      if (error.status === 404 || error.status === 400) {
        throw error
      }
      throw createError("Failed to update call", 500, "UPDATE_CALL_ERROR", { error })
    }
  }

  /**
   * Delete a call
   */
  public static async deleteCall(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const call = await Call.findByPk(id)

      if (!call) {
        throw createError("Call not found", 404, "CALL_NOT_FOUND")
      }

      await call.destroy()

      ctx.status = 204
    } catch (error: any) {
      if (error.status === 404) {
        throw error
      }
      throw createError("Failed to delete call", 500, "DELETE_CALL_ERROR", { error })
    }
  }

  /**
   * Get calls by user ID
   */
  public static async getCallsByUser(ctx: Context, _next: Next): Promise<void> {
    try {
      const { userId } = ctx.params

      const calls = await Call.findByUser(userId)

      ctx.body = {
        success: true,
        data: calls,
      }
    } catch (error: any) {
      throw createError("Failed to fetch user calls", 500, "FETCH_USER_CALLS_ERROR", {
        error,
      })
    }
  }

  /**
   * Get calls by institution ID
   */
  public static async getCallsByInstitution(ctx: Context, _next: Next): Promise<void> {
    try {
      const { institutionId } = ctx.params

      const calls = await Call.findByInstitution(institutionId)

      ctx.body = {
        success: true,
        data: calls,
      }
    } catch (error: any) {
      throw createError(
        "Failed to fetch institution calls",
        500,
        "FETCH_INSTITUTION_CALLS_ERROR",
        { error }
      )
    }
  }

  /**
   * Get calls by phone number
   */
  public static async getCallsByPhoneNumber(ctx: Context, _next: Next): Promise<void> {
    try {
      const { phoneNumber } = ctx.params

      const calls = await Call.findByPhoneNumber(phoneNumber)

      ctx.body = {
        success: true,
        data: calls,
      }
    } catch (error: any) {
      throw createError(
        "Failed to fetch phone number calls",
        500,
        "FETCH_PHONE_CALLS_ERROR",
        { error }
      )
    }
  }

  /**
   * Get calls by call type
   */
  public static async getCallsByType(ctx: Context, _next: Next): Promise<void> {
    try {
      const { callType } = ctx.params

      if (!Object.values(CallType).includes(callType as CallType)) {
        throw createError("Invalid call type", 400, "INVALID_CALL_TYPE")
      }

      const calls = await Call.findByCallType(callType as CallType)

      ctx.body = {
        success: true,
        data: calls,
      }
    } catch (error: any) {
      if (error.status === 400) {
        throw error
      }
      throw createError("Failed to fetch calls by type", 500, "FETCH_TYPE_CALLS_ERROR", {
        error,
      })
    }
  }

  /**
   * Get calls by date range
   */
  public static async getCallsByDateRange(ctx: Context, _next: Next): Promise<void> {
    try {
      const { startDate, endDate } = ctx.query

      if (!startDate || !endDate) {
        throw createError(
          "Start date and end date are required",
          400,
          "MISSING_DATE_RANGE"
        )
      }

      const start = new Date(startDate as string)
      const end = new Date(endDate as string)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw createError("Invalid date format", 400, "INVALID_DATE_FORMAT")
      }

      if (start > end) {
        throw createError("Start date must be before end date", 400, "INVALID_DATE_RANGE")
      }

      const calls = await Call.findByDateRange(start, end)

      ctx.body = {
        success: true,
        data: calls,
      }
    } catch (error: any) {
      if (error.status === 400) {
        throw error
      }
      throw createError(
        "Failed to fetch calls by date range",
        500,
        "FETCH_DATE_RANGE_CALLS_ERROR",
        { error }
      )
    }
  }
}
