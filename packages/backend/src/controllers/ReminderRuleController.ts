import { Context } from "koa"
import { ReminderRule } from "../models/ReminderRule"
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
}

export default ReminderRuleController