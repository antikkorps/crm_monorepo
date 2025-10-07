import { Context } from "koa"
import { Op } from "sequelize"
import { SecurityLog, SecurityLogAction, SecurityLogResource, SecurityLogSeverity, SecurityLogStatus } from "../models/SecurityLog"
import { User } from "../models/User"
import { SecurityLogCleanupJob } from "../jobs/securityLogCleanup"

export class SecurityLogController {
  /**
   * Get security logs with filtering and pagination
   */
  static async getSecurityLogs(ctx: Context) {
    try {
      const {
        page = 1,
        limit = 50,
        userId,
        action,
        resource,
        status,
        severity,
        startDate,
        endDate,
        ipAddress,
      } = ctx.query

      const offset = (Number(page) - 1) * Number(limit)

      // Build where clause
      const where: any = {}

      if (userId) where.userId = userId
      if (action) where.action = action
      if (resource) where.resource = resource
      if (status) where.status = status
      if (severity) where.severity = severity
      if (ipAddress) where.ipAddress = { [Op.like]: `%${ipAddress}%` }

      // Date range filter
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt[Op.gte] = new Date(startDate as string)
        if (endDate) where.createdAt[Op.lte] = new Date(endDate as string)
      }

      const { rows: logs, count } = await SecurityLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "email", "firstName", "lastName"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: Number(limit),
        offset,
      })

      ctx.body = {
        logs,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit)),
        },
      }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = { error: error.message }
    }
  }

  /**
   * Get security log statistics
   */
  static async getStats(ctx: Context) {
    try {
      const { startDate, endDate } = ctx.query

      // Build date filter
      const dateFilter: any = {}
      if (startDate || endDate) {
        dateFilter.createdAt = {}
        if (startDate) dateFilter.createdAt[Op.gte] = new Date(startDate as string)
        if (endDate) dateFilter.createdAt[Op.lte] = new Date(endDate as string)
      }

      // Get total counts
      const totalLogs = await SecurityLog.count({ where: dateFilter })

      // Count by severity
      const bySeverity = await Promise.all(
        Object.values(SecurityLogSeverity).map(async (severity) => ({
          severity,
          count: await SecurityLog.count({
            where: { ...dateFilter, severity },
          }),
        }))
      )

      // Count by action
      const byAction = await Promise.all(
        Object.values(SecurityLogAction).map(async (action) => ({
          action,
          count: await SecurityLog.count({
            where: { ...dateFilter, action },
          }),
        }))
      )

      // Count by status
      const byStatus = await Promise.all(
        Object.values(SecurityLogStatus).map(async (status) => ({
          status,
          count: await SecurityLog.count({
            where: { ...dateFilter, status },
          }),
        }))
      )

      // Get recent failed logins
      const recentFailedLogins = await SecurityLog.findAll({
        where: {
          ...dateFilter,
          action: SecurityLogAction.AUTH_FAILED,
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "email", "firstName", "lastName"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 10,
      })

      ctx.body = {
        totalLogs,
        bySeverity,
        byAction,
        byStatus,
        recentFailedLogins,
      }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = { error: error.message }
    }
  }

  /**
   * Get security logs for a specific user
   */
  static async getUserLogs(ctx: Context) {
    try {
      const { userId } = ctx.params
      const { page = 1, limit = 50 } = ctx.query

      const offset = (Number(page) - 1) * Number(limit)

      const { rows: logs, count } = await SecurityLog.findAndCountAll({
        where: { userId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "email", "firstName", "lastName"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: Number(limit),
        offset,
      })

      ctx.body = {
        logs,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit)),
        },
      }
    } catch (error: any) {
      ctx.status = 500
      ctx.body = { error: error.message }
    }
  }

  /**
   * Manually trigger log cleanup
   */
  static async triggerCleanup(ctx: Context) {
    try {
      await SecurityLogCleanupJob.runManual()

      ctx.body = {
        message: "Security log cleanup completed successfully",
      }
    } catch (error: any) {
      if (error.message === "Cleanup is already running") {
        ctx.status = 409
        ctx.body = { error: "Cleanup is already running" }
      } else {
        ctx.status = 500
        ctx.body = { error: error.message }
      }
    }
  }
}
