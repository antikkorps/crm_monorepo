import { Context } from "koa"
import { ReminderRule } from "../models/ReminderRule"
import { ReminderNotificationLog } from "../models/ReminderNotificationLog"
import { User, UserRole } from "../models/User"
import { ReminderService } from "../services/ReminderService"
import { logger } from "../utils/logger"
import { validateReminderRule } from "../validation/reminderValidation"
import { sequelize } from "../config/database"

// Type guard function to check if user is authenticated
function isAuthenticated(ctx: Context): ctx is Context & { state: { user: User } } {
  return ctx.state.user !== undefined
}

// Helper function to ensure user is authenticated
function requireAuth(ctx: Context): User {
  if (!isAuthenticated(ctx)) {
    ctx.status = 401
    ctx.body = {
      success: false,
      message: "Authentication required",
    }
    throw new Error("Authentication required")
  }
  return ctx.state.user
}

export class ReminderRuleController {
  private reminderService: ReminderService

  constructor() {
    this.reminderService = ReminderService.getInstance()
  }

  /**
   * Get all reminder rules
   */
  public async getReminderRules(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const { entityType, isActive, teamId } = ctx.query as any
      const whereClause: any = {}

      if (entityType) {
        whereClause.entityType = entityType
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true"
      }

      if (teamId) {
        whereClause.teamId = teamId
      }

      // If user is not SUPER_ADMIN, only show their team's rules
      if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
        whereClause.teamId = user.teamId
      }

      const rules = await ReminderRule.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: User,
            as: "updater",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        order: [["priority", "DESC"], ["entityType", "ASC"], ["triggerType", "ASC"]],
      })

      ctx.body = {
        success: true,
        data: rules,
        count: rules.length,
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error fetching reminder rules", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to fetch reminder rules",
      }
    }
  }

  /**
   * Get reminder rule by ID
   */
  public async getReminderRule(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const { id } = ctx.params

      const rule = await ReminderRule.findByPk(id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: User,
            as: "updater",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      if (!rule) {
        ctx.status = 404
        ctx.body = {
          success: false,
          message: "Reminder rule not found",
        }
        return
      }

      // Check permissions
      if (
        user.role !== UserRole.SUPER_ADMIN &&
        rule.teamId !== user.teamId
      ) {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: "Access denied",
        }
        return
      }

      ctx.body = {
        success: true,
        data: rule,
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error fetching reminder rule", {
        error: error instanceof Error ? error.message : String(error),
        ruleId: ctx.params.id,
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to fetch reminder rule",
      }
    }
  }

  /**
   * Create reminder rule
   */
  public async createReminderRule(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const ruleData = ctx.request.body as any

      // Validate input
      const validationResult = validateReminderRule(ruleData)
      if (!validationResult.isValid) {
        ctx.status = 400
        ctx.body = {
          success: false,
          message: "Validation failed",
          errors: validationResult.errors,
        }
        return
      }

      // Set creator
      ruleData.createdBy = user.id

      // Check permissions for team assignment
      if (user.role !== UserRole.SUPER_ADMIN) {
        if (ruleData.teamId && ruleData.teamId !== user.teamId) {
          ctx.status = 403
          ctx.body = {
            success: false,
            message: "Cannot assign rules to other teams",
          }
          return
        }
        // Default to user's team if not specified
        if (!ruleData.teamId && user.teamId) {
          ruleData.teamId = user.teamId
        }
      }

      const rule = await ReminderRule.create(ruleData)

      // Fetch created rule with associations
      const createdRule = await ReminderRule.findByPk(rule.id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      logger.info("Reminder rule created", {
        ruleId: rule.id,
        entityType: rule.entityType,
        triggerType: rule.triggerType,
        createdBy: user.id,
      })

      ctx.status = 201
      ctx.body = {
        success: true,
        data: createdRule,
        message: "Reminder rule created successfully",
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error creating reminder rule", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to create reminder rule",
      }
    }
  }

  /**
   * Update reminder rule
   */
  public async updateReminderRule(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const { id } = ctx.params
      const updateData = ctx.request.body as any

      const rule = await ReminderRule.findByPk(id)
      if (!rule) {
        ctx.status = 404
        ctx.body = {
          success: false,
          message: "Reminder rule not found",
        }
        return
      }

      // Check permissions
      if (
        user.role !== UserRole.SUPER_ADMIN &&
        rule.teamId !== user.teamId
      ) {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: "Access denied",
        }
        return
      }

      // Validate input
      const validationResult = validateReminderRule({ ...rule.toJSON(), ...updateData })
      if (!validationResult.isValid) {
        ctx.status = 400
        ctx.body = {
          success: false,
          message: "Validation failed",
          errors: validationResult.errors,
        }
        return
      }

      // Set updater
      updateData.updatedBy = user.id

      // Check team assignment permissions
      if (user.role !== UserRole.SUPER_ADMIN) {
        if (updateData.teamId && updateData.teamId !== user.teamId) {
          ctx.status = 403
          ctx.body = {
            success: false,
            message: "Cannot assign rules to other teams",
          }
          return
        }
      }

      await rule.update(updateData)

      // Fetch updated rule with associations
      const updatedRule = await ReminderRule.findByPk(id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: User,
            as: "updater",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      logger.info("Reminder rule updated", {
        ruleId: rule.id,
        entityType: rule.entityType,
        triggerType: rule.triggerType,
        updatedBy: user.id,
      })

      ctx.body = {
        success: true,
        data: updatedRule,
        message: "Reminder rule updated successfully",
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error updating reminder rule", {
        error: error instanceof Error ? error.message : String(error),
        ruleId: ctx.params.id,
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to update reminder rule",
      }
    }
  }

  /**
   * Delete reminder rule
   */
  public async deleteReminderRule(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const { id } = ctx.params

      const rule = await ReminderRule.findByPk(id)
      if (!rule) {
        ctx.status = 404
        ctx.body = {
          success: false,
          message: "Reminder rule not found",
        }
        return
      }

      // Check permissions
      if (
        user.role !== UserRole.SUPER_ADMIN &&
        rule.teamId !== user.teamId
      ) {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: "Access denied",
        }
        return
      }

      await rule.destroy()

      logger.info("Reminder rule deleted", {
        ruleId: rule.id,
        entityType: rule.entityType,
        triggerType: rule.triggerType,
        deletedBy: user.id,
      })

      ctx.body = {
        success: true,
        message: "Reminder rule deleted successfully",
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error deleting reminder rule", {
        error: error instanceof Error ? error.message : String(error),
        ruleId: ctx.params.id,
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to delete reminder rule",
      }
    }
  }

  /**
   * Toggle reminder rule active status
   */
  public async toggleReminderRule(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const { id } = ctx.params

      const rule = await ReminderRule.findByPk(id)
      if (!rule) {
        ctx.status = 404
        ctx.body = {
          success: false,
          message: "Reminder rule not found",
        }
        return
      }

      // Check permissions
      if (
        user.role !== UserRole.SUPER_ADMIN &&
        rule.teamId !== user.teamId
      ) {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: "Access denied",
        }
        return
      }

      const newStatus = !rule.isActive
      await rule.update({
        isActive: newStatus,
        updatedBy: user.id,
      })

      logger.info("Reminder rule toggled", {
        ruleId: rule.id,
        entityType: rule.entityType,
        triggerType: rule.triggerType,
        oldStatus: !newStatus,
        newStatus,
        updatedBy: user.id,
      })

      ctx.body = {
        success: true,
        data: {
          id: rule.id,
          isActive: newStatus,
        },
        message: `Reminder rule ${newStatus ? "activated" : "deactivated"} successfully`,
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error toggling reminder rule", {
        error: error instanceof Error ? error.message : String(error),
        ruleId: ctx.params.id,
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to toggle reminder rule",
      }
    }
  }

  /**
   * Manually trigger reminder processing
   */
  public async processReminders(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      
      // Only SUPER_ADMIN can manually trigger reminders
      if (user.role !== UserRole.SUPER_ADMIN) {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: "Access denied. Only SUPER_ADMIN can manually trigger reminders.",
        }
        return
      }

      await this.reminderService.processAllReminders()

      logger.info("Manual reminder processing triggered", {
        triggeredBy: user.id,
      })

      ctx.body = {
        success: true,
        message: "Reminder processing completed successfully",
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error in manual reminder processing", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to process reminders",
      }
    }
  }

  /**
   * Get reminder statistics
   */
  public async getReminderStats(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const whereClause: any = {}

      // If user is not SUPER_ADMIN, only show their team's rules
      if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
        whereClause.teamId = user.teamId
      }

      const totalRules = await ReminderRule.count({ where: whereClause })
      const activeRules = await ReminderRule.count({
        where: { ...whereClause, isActive: true },
      })

      const rulesByEntityType = await ReminderRule.findAll({
        attributes: [
          "entityType",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: whereClause,
        group: ["entityType"],
        raw: true,
      })

      const rulesByTriggerType = await ReminderRule.findAll({
        attributes: [
          "triggerType",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: whereClause,
        group: ["triggerType"],
        raw: true,
      })

      ctx.body = {
        success: true,
        data: {
          totalRules,
          activeRules,
          inactiveRules: totalRules - activeRules,
          rulesByEntityType,
          rulesByTriggerType,
        },
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error fetching reminder stats", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to fetch reminder statistics",
      }
    }
  }

  /**
   * Get detailed reminder system statistics with notification logs
   * Includes: rule counts, notification volume, success rates, top rules, last job run
   */
  public async getDetailedStats(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const { daysBack = "30" } = ctx.query as any
      const days = Number.parseInt(daysBack)

      // Date range for analytics
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      // Build where clause based on user permissions
      const ruleWhereClause: any = {}
      if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
        ruleWhereClause.teamId = user.teamId
      }

      // 1. Summary stats
      const totalRules = await ReminderRule.count({ where: ruleWhereClause })
      const activeRules = await ReminderRule.count({
        where: { ...ruleWhereClause, isActive: true },
      })

      // 2. Notification volume stats
      const [notificationStats] = (await sequelize.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
          COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
          COUNT(DISTINCT DATE(sent_at)) as days_active,
          MAX(sent_at) as last_sent
        FROM reminder_notification_logs
        WHERE sent_at >= :cutoffDate
          ${user.role !== UserRole.SUPER_ADMIN && user.teamId ? "AND rule_id IN (SELECT id FROM reminder_rules WHERE team_id = :teamId)" : ""}
      `,
        {
          replacements: {
            cutoffDate,
            ...(user.teamId && { teamId: user.teamId }),
          },
        }
      )) as any

      const stats = notificationStats[0]
      const totalSent = Number.parseInt(stats.total_sent) || 0
      const totalFailed = Number.parseInt(stats.total_failed) || 0
      const totalNotifications = totalSent + totalFailed
      const successRate = totalNotifications > 0 ? (totalSent / totalNotifications) * 100 : 0

      // 3. Top performing rules (by volume)
      const [topRules] = (await sequelize.query(
        `
        SELECT
          rr.id,
          rr.entity_type,
          rr.trigger_type,
          rr.priority,
          rr.is_active,
          COUNT(rnl.id) as notifications_sent,
          MAX(rnl.sent_at) as last_triggered
        FROM reminder_rules rr
        LEFT JOIN reminder_notification_logs rnl ON rnl.rule_id = rr.id
          AND rnl.sent_at >= :cutoffDate
          AND rnl.status = 'sent'
        WHERE 1=1
          ${user.role !== UserRole.SUPER_ADMIN && user.teamId ? "AND rr.team_id = :teamId" : ""}
        GROUP BY rr.id, rr.entity_type, rr.trigger_type, rr.priority, rr.is_active
        ORDER BY notifications_sent DESC
        LIMIT 10
      `,
        {
          replacements: {
            cutoffDate,
            ...(user.teamId && { teamId: user.teamId }),
          },
        }
      )) as any

      // 4. Notification timeline (daily breakdown for last 7 days)
      const timelineStart = new Date()
      timelineStart.setDate(timelineStart.getDate() - 7)

      const [timeline] = (await sequelize.query(
        `
        SELECT
          DATE(sent_at) as date,
          COUNT(*) FILTER (WHERE status = 'sent') as sent,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM reminder_notification_logs
        WHERE sent_at >= :timelineStart
          ${user.role !== UserRole.SUPER_ADMIN && user.teamId ? "AND rule_id IN (SELECT id FROM reminder_rules WHERE team_id = :teamId)" : ""}
        GROUP BY DATE(sent_at)
        ORDER BY DATE(sent_at) DESC
      `,
        {
          replacements: {
            timelineStart,
            ...(user.teamId && { teamId: user.teamId }),
          },
        }
      )) as any

      ctx.body = {
        success: true,
        data: {
          summary: {
            totalRules,
            activeRules,
            inactiveRules: totalRules - activeRules,
          },
          notifications: {
            totalSent,
            totalFailed,
            successRate: Math.round(successRate * 100) / 100,
            daysActive: Number.parseInt(stats.days_active) || 0,
            averagePerDay: stats.days_active > 0 ? Math.round(totalSent / Number.parseInt(stats.days_active)) : 0,
          },
          topRules: topRules.map((rule: any) => ({
            id: rule.id,
            entityType: rule.entity_type,
            triggerType: rule.trigger_type,
            priority: rule.priority,
            isActive: rule.is_active,
            notificationsSent: Number.parseInt(rule.notifications_sent),
            lastTriggered: rule.last_triggered,
          })),
          timeline: timeline.map((day: any) => ({
            date: day.date,
            sent: Number.parseInt(day.sent),
            failed: Number.parseInt(day.failed),
          })),
          lastJobRun: stats.last_sent ? new Date(stats.last_sent) : null,
          periodDays: days,
        },
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error fetching detailed reminder stats", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to fetch detailed reminder statistics",
      }
    }
  }

  /**
   * Get notification logs for a specific reminder rule
   * Includes pagination and filtering
   */
  public async getReminderRuleLogs(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const { id } = ctx.params
      const { limit = "50", offset = "0", status, daysBack = "30" } = ctx.query as any

      // Check if rule exists and user has access
      const rule = await ReminderRule.findByPk(id)
      if (!rule) {
        ctx.status = 404
        ctx.body = {
          success: false,
          message: "Reminder rule not found",
        }
        return
      }

      // Check permissions
      if (
        user.role !== UserRole.SUPER_ADMIN &&
        rule.teamId !== user.teamId
      ) {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: "Access denied",
        }
        return
      }

      // Build where clause
      const whereClause: any = {
        ruleId: id,
      }

      // Filter by status if provided
      if (status && ["sent", "failed", "pending"].includes(status)) {
        whereClause.status = status
      }

      // Filter by date range
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - Number.parseInt(daysBack))
      whereClause.sentAt = {
        [sequelize.Sequelize.Op.gte]: cutoffDate,
      }

      // Get logs with pagination
      const { count, rows: logs } = await ReminderNotificationLog.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "recipient",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        order: [["sentAt", "DESC"]],
        limit: Number.parseInt(limit),
        offset: Number.parseInt(offset),
      })

      // Get rule stats
      const ruleStats = await ReminderNotificationLog.getRuleStats(id, Number.parseInt(daysBack))

      ctx.body = {
        success: true,
        data: {
          logs,
          stats: ruleStats,
          pagination: {
            total: count,
            limit: Number.parseInt(limit),
            offset: Number.parseInt(offset),
            hasMore: Number.parseInt(offset) + Number.parseInt(limit) < count,
          },
        },
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error fetching reminder rule logs", {
        error: error instanceof Error ? error.message : String(error),
        ruleId: ctx.params.id,
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to fetch reminder rule logs",
      }
    }
  }

  /**
   * Get notification history for the current user
   * Shows all reminders they have received
   */
  public async getMyNotificationHistory(ctx: Context): Promise<void> {
    try {
      const user = requireAuth(ctx)
      const { limit = "50", offset = "0", daysBack = "30" } = ctx.query as any

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - Number.parseInt(daysBack))

      const { count, rows: logs } = await ReminderNotificationLog.findAndCountAll({
        where: {
          recipientId: user.id,
          sentAt: {
            [sequelize.Sequelize.Op.gte]: cutoffDate,
          },
        },
        include: [
          {
            model: ReminderRule,
            as: "rule",
            attributes: ["id", "entityType", "triggerType", "priority"],
          },
        ],
        order: [["sentAt", "DESC"]],
        limit: Number.parseInt(limit),
        offset: Number.parseInt(offset),
      })

      ctx.body = {
        success: true,
        data: {
          logs,
          pagination: {
            total: count,
            limit: Number.parseInt(limit),
            offset: Number.parseInt(offset),
            hasMore: Number.parseInt(offset) + Number.parseInt(limit) < count,
          },
        },
      }
    } catch (error) {
      const userId = isAuthenticated(ctx) ? ctx.state.user.id : "unknown"
      logger.error("Error fetching user notification history", {
        error: error instanceof Error ? error.message : String(error),
        userId,
      })
      ctx.status = 500
      ctx.body = {
        success: false,
        message: "Failed to fetch notification history",
      }
    }
  }
}

export default ReminderRuleController