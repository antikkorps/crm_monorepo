import { Context } from "koa"
import Joi from "joi"
import { Op } from "sequelize"
import { Opportunity, OpportunityStage, OpportunityStatus } from "../models/Opportunity"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { ContactPerson } from "../models/ContactPerson"
import { User, UserRole } from "../models/User"
import { createError, logger } from "../utils/logger"

/**
 * Opportunity Controller
 * Handles sales pipeline / deal management
 */
export class OpportunityController {
  /**
   * Validation schema for opportunity creation
   */
  static createOpportunitySchema = Joi.object({
    institutionId: Joi.string().uuid().required(),
    contactPersonId: Joi.string().uuid().allow(null).optional(),
    assignedUserId: Joi.string().uuid().required(),
    name: Joi.string().min(3).max(255).required(),
    description: Joi.string().allow("", null).optional(),
    stage: Joi.string()
      .valid(...Object.values(OpportunityStage))
      .default(OpportunityStage.PROSPECTING),
    value: Joi.number().min(0).required(),
    probability: Joi.number().integer().min(0).max(100).default(50),
    expectedCloseDate: Joi.date().iso().required(),
    products: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          description: Joi.string().allow("", null).optional(),
          quantity: Joi.number().min(0).required(),
          unitPrice: Joi.number().min(0).required(),
          discount: Joi.number().min(0).max(100).default(0),
          total: Joi.number().min(0).required(),
        })
      )
      .optional(),
    competitors: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    notes: Joi.string().allow("", null).optional(),
    source: Joi.string().max(255).allow("", null).optional(),
  })

  /**
   * Validation schema for opportunity update
   */
  static updateOpportunitySchema = Joi.object({
    contactPersonId: Joi.string().uuid().allow(null).optional(),
    assignedUserId: Joi.string().uuid().optional(),
    name: Joi.string().min(3).max(255).optional(),
    description: Joi.string().allow("", null).optional(),
    stage: Joi.string()
      .valid(...Object.values(OpportunityStage))
      .optional(),
    value: Joi.number().min(0).optional(),
    probability: Joi.number().integer().min(0).max(100).optional(),
    expectedCloseDate: Joi.date().iso().optional(),
    products: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          description: Joi.string().allow("", null).optional(),
          quantity: Joi.number().min(0).required(),
          unitPrice: Joi.number().min(0).required(),
          discount: Joi.number().min(0).max(100).default(0),
          total: Joi.number().min(0).required(),
        })
      )
      .optional(),
    competitors: Joi.array().items(Joi.string()).optional(),
    wonReason: Joi.string().allow("", null).optional(),
    lostReason: Joi.string().allow("", null).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    notes: Joi.string().allow("", null).optional(),
    source: Joi.string().max(255).allow("", null).optional(),
  })

  /**
   * GET /api/opportunities
   * Get all opportunities with filtering and pagination
   */
  static async getOpportunities(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const {
        page = 1,
        limit = 50,
        stage,
        status,
        institutionId,
        assignedUserId,
        minValue,
        maxValue,
        minProbability,
        maxProbability,
        search,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = ctx.query

      const pageNum = Math.max(1, parseInt(page as string, 10))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)))
      const offset = (pageNum - 1) * limitNum

      // Build where clause
      const where: any = {}

      if (stage) {
        where.stage = Array.isArray(stage) ? { [Op.in]: stage } : stage
      }

      if (status) {
        where.status = Array.isArray(status) ? { [Op.in]: status } : status
      }

      if (institutionId) {
        where.institutionId = institutionId
      }

      if (assignedUserId) {
        where.assignedUserId = assignedUserId
      }

      if (minValue) {
        where.value = { ...where.value, [Op.gte]: parseFloat(minValue as string) }
      }

      if (maxValue) {
        where.value = { ...where.value, [Op.lte]: parseFloat(maxValue as string) }
      }

      if (minProbability) {
        where.probability = {
          ...where.probability,
          [Op.gte]: parseInt(minProbability as string, 10),
        }
      }

      if (maxProbability) {
        where.probability = {
          ...where.probability,
          [Op.lte]: parseInt(maxProbability as string, 10),
        }
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { notes: { [Op.iLike]: `%${search}%` } },
        ]
      }

      // Team filtering (only see team's opportunities unless SUPER_ADMIN)
      if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
        const teamUserIds = await User.findAll({
          where: { teamId: user.teamId },
          attributes: ["id"],
        }).then((users) => users.map((u) => u.id))
        where.assignedUserId = { [Op.in]: teamUserIds }
      }

      const { count, rows: opportunities } = await Opportunity.findAndCountAll({
        where,
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
          {
            model: ContactPerson,
            as: "contactPerson",
            attributes: ["id", "firstName", "lastName", "email", "phone"],
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        limit: limitNum,
        offset,
        order: [[sortBy as string, sortOrder as string]],
      })

      ctx.body = {
        success: true,
        data: {
          opportunities,
          pagination: {
            total: count,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(count / limitNum),
          },
        },
      }
    } catch (error) {
      logger.error("Get opportunities failed", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/opportunities/:id
   * Get a single opportunity by ID
   */
  static async getOpportunity(ctx: Context) {
    try {
      const { id } = ctx.params

      const opportunity = await Opportunity.findByPk(id, {
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
          },
          {
            model: ContactPerson,
            as: "contactPerson",
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      if (!opportunity) {
        throw createError("Opportunity not found", 404, "NOT_FOUND")
      }

      ctx.body = {
        success: true,
        data: { opportunity },
      }
    } catch (error) {
      logger.error("Get opportunity failed", {
        userId: ctx.state.user?.id,
        opportunityId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/opportunities
   * Create a new opportunity
   */
  static async createOpportunity(ctx: Context) {
    try {
      const user = ctx.state.user as User

      const { error, value } = OpportunityController.createOpportunitySchema.validate(
        ctx.request.body
      )

      if (error) {
        throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
      }

      // Verify institution exists
      const institution = await MedicalInstitution.findByPk(value.institutionId)
      if (!institution) {
        throw createError("Institution not found", 404, "NOT_FOUND")
      }

      // Verify contact person exists if provided
      if (value.contactPersonId) {
        const contact = await ContactPerson.findByPk(value.contactPersonId)
        if (!contact) {
          throw createError("Contact person not found", 404, "NOT_FOUND")
        }
        if (contact.institutionId !== value.institutionId) {
          throw createError(
            "Contact person does not belong to this institution",
            400,
            "INVALID_CONTACT"
          )
        }
      }

      // Verify assigned user exists
      const assignedUser = await User.findByPk(value.assignedUserId)
      if (!assignedUser) {
        throw createError("Assigned user not found", 404, "NOT_FOUND")
      }

      const opportunity = await Opportunity.create(value)

      // Reload with associations
      await opportunity.reload({
        include: [
          { model: MedicalInstitution, as: "institution" },
          { model: ContactPerson, as: "contactPerson" },
          { model: User, as: "assignedUser", attributes: ["id", "firstName", "lastName", "email"] },
        ],
      })

      logger.info("Opportunity created", {
        userId: user.id,
        opportunityId: opportunity.id,
        institutionId: opportunity.institutionId,
      })

      ctx.status = 201
      ctx.body = {
        success: true,
        data: { opportunity },
      }
    } catch (error) {
      logger.error("Create opportunity failed", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * PUT /api/opportunities/:id
   * Update an opportunity
   */
  static async updateOpportunity(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const { error, value } = OpportunityController.updateOpportunitySchema.validate(
        ctx.request.body
      )

      if (error) {
        throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
      }

      const opportunity = await Opportunity.findByPk(id)

      if (!opportunity) {
        throw createError("Opportunity not found", 404, "NOT_FOUND")
      }

      // Store original stage before update
      const oldStage = opportunity.stage

      // Update fields
      await opportunity.update(value)

      // Auto-update status based on stage if stage changed
      if (value.stage && value.stage !== oldStage) {
        await opportunity.updateStatusFromStage()
      }

      // Reload with associations
      await opportunity.reload({
        include: [
          { model: MedicalInstitution, as: "institution" },
          { model: ContactPerson, as: "contactPerson" },
          { model: User, as: "assignedUser", attributes: ["id", "firstName", "lastName", "email"] },
        ],
      })

      logger.info("Opportunity updated", {
        userId: user.id,
        opportunityId: opportunity.id,
      })

      ctx.body = {
        success: true,
        data: { opportunity },
      }
    } catch (error) {
      logger.error("Update opportunity failed", {
        userId: ctx.state.user?.id,
        opportunityId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * PUT /api/opportunities/:id/stage
   * Update opportunity stage (move in pipeline)
   */
  static async updateStage(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const body = ctx.request.body as { stage?: string; wonReason?: string; lostReason?: string }

      const stageSchema = Joi.object({
        stage: Joi.string()
          .valid(...Object.values(OpportunityStage))
          .required(),
        wonReason: Joi.string().allow("", null).optional(),
        lostReason: Joi.string().allow("", null).optional(),
      })

      const { error, value } = stageSchema.validate(body)

      if (error) {
        throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
      }

      const opportunity = await Opportunity.findByPk(id)

      if (!opportunity) {
        throw createError("Opportunity not found", 404, "NOT_FOUND")
      }

      opportunity.stage = value.stage

      if (value.wonReason) {
        opportunity.wonReason = value.wonReason
      }

      if (value.lostReason) {
        opportunity.lostReason = value.lostReason
      }

      await opportunity.save()
      await opportunity.updateStatusFromStage()

      // Reload with associations
      await opportunity.reload({
        include: [
          { model: MedicalInstitution, as: "institution" },
          { model: ContactPerson, as: "contactPerson" },
          { model: User, as: "assignedUser", attributes: ["id", "firstName", "lastName", "email"] },
        ],
      })

      logger.info("Opportunity stage updated", {
        userId: user.id,
        opportunityId: opportunity.id,
        newStage: opportunity.stage,
      })

      ctx.body = {
        success: true,
        data: { opportunity },
      }
    } catch (error) {
      logger.error("Update opportunity stage failed", {
        userId: ctx.state.user?.id,
        opportunityId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * DELETE /api/opportunities/:id
   * Soft delete an opportunity
   */
  static async deleteOpportunity(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const opportunity = await Opportunity.findByPk(id)

      if (!opportunity) {
        throw createError("Opportunity not found", 404, "NOT_FOUND")
      }

      await opportunity.destroy()

      logger.info("Opportunity deleted", {
        userId: user.id,
        opportunityId: id,
      })

      ctx.body = {
        success: true,
        message: "Opportunity deleted successfully",
      }
    } catch (error) {
      logger.error("Delete opportunity failed", {
        userId: ctx.state.user?.id,
        opportunityId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/opportunities/pipeline
   * Get pipeline view (opportunities grouped by stage)
   * Includes closed opportunities from the last 30 days
   */
  static async getPipeline(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { assignedUserId, institutionId, includeArchived } = ctx.query

      // Calculate date 30 days ago for closed opportunities filter
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Base filters for user/institution
      const baseFilters: any = {}
      if (assignedUserId) {
        baseFilters.assignedUserId = assignedUserId
      }
      if (institutionId) {
        baseFilters.institutionId = institutionId
      }

      // Team filtering
      if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
        const teamUserIds = await User.findAll({
          where: { teamId: user.teamId },
          attributes: ["id"],
        }).then((users) => users.map((u) => u.id))

        if (baseFilters.assignedUserId !== undefined) {
          baseFilters.assignedUserId = {
            [Op.and]: [
              { [Op.eq]: baseFilters.assignedUserId },
              { [Op.in]: teamUserIds }
            ]
          }
        } else {
          baseFilters.assignedUserId = { [Op.in]: teamUserIds }
        }
      }

      // Fetch active opportunities
      const activeOpportunities = await Opportunity.findAll({
        where: {
          ...baseFilters,
          status: OpportunityStatus.ACTIVE,
        },
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
          {
            model: ContactPerson,
            as: "contactPerson",
            attributes: ["id", "firstName", "lastName"],
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        order: [["expectedCloseDate", "ASC"]],
      })

      // Fetch closed opportunities (won/lost) from last 30 days (or all if includeArchived)
      const closedWhere: any = {
        ...baseFilters,
        status: { [Op.in]: [OpportunityStatus.WON, OpportunityStatus.LOST] },
      }

      // Only filter by date if not including archived
      if (includeArchived !== "true") {
        closedWhere.actualCloseDate = { [Op.gte]: thirtyDaysAgo }
      }

      const closedOpportunities = await Opportunity.findAll({
        where: closedWhere,
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
          {
            model: ContactPerson,
            as: "contactPerson",
            attributes: ["id", "firstName", "lastName"],
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        order: [["actualCloseDate", "DESC"]],
      })

      // Combine all opportunities
      const allOpportunities = [...activeOpportunities, ...closedOpportunities]

      // Define stage order (active stages first, then closed)
      const stageOrder = [
        OpportunityStage.PROSPECTING,
        OpportunityStage.QUALIFICATION,
        OpportunityStage.PROPOSAL,
        OpportunityStage.NEGOTIATION,
        OpportunityStage.CLOSED_WON,
        OpportunityStage.CLOSED_LOST,
      ]

      // Group by stage
      const pipeline = stageOrder.map((stage) => {
        const stageOpportunities = allOpportunities.filter((opp) => opp.stage === stage)
        const totalValue = stageOpportunities.reduce((sum, opp) => sum + parseFloat(opp.value.toString()), 0)
        const weightedValue = stageOpportunities.reduce((sum, opp) => sum + opp.getWeightedValue(), 0)

        return {
          stage,
          count: stageOpportunities.length,
          totalValue,
          weightedValue,
          opportunities: stageOpportunities,
        }
      })

      ctx.body = {
        success: true,
        data: { pipeline },
      }
    } catch (error) {
      logger.error("Get pipeline failed", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/opportunities/forecast
   * Get revenue forecast based on active opportunities
   */
  static async getForecast(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { assignedUserId, months = 3 } = ctx.query

      const where: any = { status: OpportunityStatus.ACTIVE }

      if (assignedUserId) {
        where.assignedUserId = assignedUserId
      }

      // Team filtering
      if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
        const teamUserIds = await User.findAll({
          where: { teamId: user.teamId },
          attributes: ["id"],
        }).then((users) => users.map((u) => u.id))

        // Combine with existing assignedUserId filter if present
        if (where.assignedUserId !== undefined) {
          where.assignedUserId = {
            [Op.and]: [
              { [Op.eq]: where.assignedUserId },
              { [Op.in]: teamUserIds }
            ]
          }
        } else {
          where.assignedUserId = { [Op.in]: teamUserIds }
        }
      }

      // Get forecast period
      const now = new Date()
      const forecastMonths = Math.min(12, Math.max(1, parseInt(months as string, 10)))
      const forecastEnd = new Date(now)
      forecastEnd.setMonth(forecastEnd.getMonth() + forecastMonths)

      where.expectedCloseDate = {
        [Op.between]: [now, forecastEnd],
      }

      const opportunities = await Opportunity.findAll({
        where,
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name"],
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      })

      // Calculate totals
      const totalValue = opportunities.reduce((sum, opp) => sum + parseFloat(opp.value.toString()), 0)
      const weightedValue = opportunities.reduce((sum, opp) => sum + opp.getWeightedValue(), 0)

      // Group by month
      const byMonth = opportunities.reduce((acc, opp) => {
        const month = new Date(opp.expectedCloseDate).toISOString().slice(0, 7) // YYYY-MM
        if (!acc[month]) {
          acc[month] = {
            month,
            count: 0,
            totalValue: 0,
            weightedValue: 0,
            opportunities: [],
          }
        }
        acc[month].count++
        acc[month].totalValue += parseFloat(opp.value.toString())
        acc[month].weightedValue += opp.getWeightedValue()
        acc[month].opportunities.push(opp)
        return acc
      }, {} as Record<string, any>)

      const monthlyForecast = Object.values(byMonth).sort((a: any, b: any) =>
        a.month.localeCompare(b.month)
      )

      ctx.body = {
        success: true,
        data: {
          summary: {
            totalOpportunities: opportunities.length,
            totalValue,
            weightedValue,
            forecastPeriod: `${forecastMonths} months`,
          },
          monthlyForecast,
        },
      }
    } catch (error) {
      logger.error("Get forecast failed", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/opportunities/analytics
   * Get comprehensive pipeline analytics (conversion rates, sales cycle, win/loss analysis)
   */
  static async getAnalytics(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { startDate, endDate, assignedUserId } = ctx.query

      const { OpportunityAnalyticsService } = await import("../services/OpportunityAnalyticsService")

      const filters: any = {}

      if (startDate) filters.startDate = new Date(startDate as string)
      if (endDate) filters.endDate = new Date(endDate as string)
      if (assignedUserId) filters.assignedUserId = assignedUserId as string

      // Apply team filtering for non-super admins
      if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
        filters.teamId = user.teamId
      }

      const analytics = await OpportunityAnalyticsService.getPipelineAnalytics(filters)

      ctx.body = {
        success: true,
        data: analytics,
      }

      logger.info("Pipeline analytics retrieved", {
        userId: user.id,
        filters,
      })
    } catch (error) {
      logger.error("Get analytics failed", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/opportunities/forecast/advanced
   * Get advanced revenue forecast with weighted pipeline and monthly breakdown
   */
  static async getForecastAdvanced(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { months = 6, assignedUserId } = ctx.query

      const { OpportunityAnalyticsService } = await import("../services/OpportunityAnalyticsService")

      const filters: any = {
        months: parseInt(months as string, 10),
      }

      if (assignedUserId) filters.assignedUserId = assignedUserId as string

      // Apply team filtering for non-super admins
      if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
        filters.teamId = user.teamId
      }

      const forecast = await OpportunityAnalyticsService.getRevenueForecast(filters)

      ctx.body = {
        success: true,
        data: forecast,
      }

      logger.info("Advanced forecast retrieved", {
        userId: user.id,
        months: filters.months,
      })
    } catch (error) {
      logger.error("Get advanced forecast failed", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/opportunities/stats/by-user
   * Get opportunity statistics grouped by assigned user
   */
  static async getStatsByUser(ctx: Context) {
    try {
      const user = ctx.state.user as User

      const where: any = { status: OpportunityStatus.ACTIVE }

      // Team filtering for non-super-admins
      if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
        const teamUsers = await User.findAll({
          where: { teamId: user.teamId },
          attributes: ["id"],
        })
        const teamUserIds = teamUsers.map((u) => u.id)
        where.assignedUserId = { [Op.in]: teamUserIds }
      }

      const opportunities = await Opportunity.findAll({
        where,
        include: [
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      // Group by assigned user
      const statsByUser: Record<
        string,
        {
          userId: string
          userName: string
          userEmail: string
          count: number
          totalValue: number
          weightedValue: number
          overdueCount: number
        }
      > = {}

      const now = new Date()

      opportunities.forEach((opp) => {
        const userId = opp.assignedUserId
        const userName = opp.assignedUser
          ? `${opp.assignedUser.firstName} ${opp.assignedUser.lastName}`
          : "Non assigné"
        const userEmail = opp.assignedUser?.email || ""

        if (!statsByUser[userId]) {
          statsByUser[userId] = {
            userId,
            userName,
            userEmail,
            count: 0,
            totalValue: 0,
            weightedValue: 0,
            overdueCount: 0,
          }
        }

        statsByUser[userId].count++
        statsByUser[userId].totalValue += parseFloat(opp.value.toString())
        statsByUser[userId].weightedValue +=
          (parseFloat(opp.value.toString()) * opp.probability) / 100

        // Check if overdue
        if (opp.expectedCloseDate && new Date(opp.expectedCloseDate) < now) {
          statsByUser[userId].overdueCount++
        }
      })

      ctx.body = {
        success: true,
        data: {
          statsByUser: Object.values(statsByUser).sort(
            (a, b) => b.totalValue - a.totalValue
          ),
        },
      }

      logger.info("Stats by user retrieved", {
        userId: user.id,
        userCount: Object.keys(statsByUser).length,
      })
    } catch (error) {
      logger.error("Get stats by user failed", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }
}
