import Joi from "joi"
import { Op } from "sequelize"
import { createError } from "../middleware/errorHandler"
import { User } from "../models/User"
import { Webhook, WebhookEvent, WebhookStatus } from "../models/Webhook"
import { WebhookLog, WebhookLogStatus } from "../models/WebhookLog"
import { WebhookService } from "../services/WebhookService"
import { Context } from "../types/koa"
import { logger } from "../utils/logger"

// Validation schemas
const createWebhookSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    "string.min": "Webhook name must not be empty",
    "string.max": "Webhook name must not exceed 255 characters",
    "any.required": "Webhook name is required",
  }),
  url: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.uri": "Please provide a valid HTTP or HTTPS URL",
      "any.required": "Webhook URL is required",
    }),
  events: Joi.array()
    .items(Joi.string().valid(...Object.values(WebhookEvent)))
    .min(1)
    .required()
    .messages({
      "array.min": "At least one event must be selected",
      "any.required": "Events are required",
      "any.only": "Invalid webhook event",
    }),
  secret: Joi.string().optional().allow(""),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  timeout: Joi.number().integer().min(1000).max(300000).optional(),
  maxRetries: Joi.number().integer().min(0).max(10).optional(),
  retryDelay: Joi.number().integer().min(1000).max(300000).optional(),
})

const updateWebhookSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  url: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .optional(),
  events: Joi.array()
    .items(Joi.string().valid(...Object.values(WebhookEvent)))
    .min(1)
    .optional(),
  secret: Joi.string().optional().allow(""),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  timeout: Joi.number().integer().min(1000).max(300000).optional(),
  maxRetries: Joi.number().integer().min(0).max(10).optional(),
  retryDelay: Joi.number().integer().min(1000).max(300000).optional(),
  status: Joi.string()
    .valid(...Object.values(WebhookStatus))
    .optional(),
  isActive: Joi.boolean().optional(),
})

const webhookQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  status: Joi.string()
    .valid(...Object.values(WebhookStatus))
    .optional(),
  event: Joi.string()
    .valid(...Object.values(WebhookEvent))
    .optional(),
  search: Joi.string().optional(),
})

const webhookLogQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
  status: Joi.string()
    .valid(...Object.values(WebhookLogStatus))
    .optional(),
  event: Joi.string()
    .valid(...Object.values(WebhookEvent))
    .optional(),
  from: Joi.date().optional(),
  to: Joi.date().optional(),
})

export class WebhookController {
  /**
   * GET /api/webhooks
   * Get all webhooks with pagination and filtering
   */
  static async getWebhooks(ctx: Context) {
    const { error, value } = webhookQuerySchema.validate(ctx.query)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    const { page, limit, status, event, search } = value
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (event) {
      where.events = {
        [Op.contains]: [event],
      }
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { url: { [Op.iLike]: `%${search}%` } },
      ]
    }

    const { rows: webhooks, count: total } = await Webhook.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    })

    // Get statistics for each webhook
    const webhooksWithStats = await Promise.all(
      webhooks.map(async (webhook) => {
        const stats = await WebhookService.getWebhookStats(webhook.id)
        return {
          ...webhook.toJSON(),
          stats,
        }
      })
    )

    ctx.body = {
      success: true,
      data: {
        webhooks: webhooksWithStats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    }
  }

  /**
   * GET /api/webhooks/:id
   * Get a specific webhook by ID
   */
  static async getWebhook(ctx: Context) {
    const { id } = ctx.params

    const webhook = await Webhook.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
    })

    if (!webhook) {
      throw createError("Webhook not found", 404, "WEBHOOK_NOT_FOUND")
    }

    const stats = await WebhookService.getWebhookStats(webhook.id)

    ctx.body = {
      success: true,
      data: {
        webhook: {
          ...webhook.toJSON(),
          stats,
        },
      },
    }
  }

  /**
   * POST /api/webhooks
   * Create a new webhook
   */
  static async createWebhook(ctx: Context) {
    const { error, value } = createWebhookSchema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    const user = ctx.state.user as User
    const webhookData = {
      ...value,
      createdBy: user.id,
      secret: value.secret || Webhook.generateSecret(),
    }

    const webhook = await Webhook.create(webhookData)

    // Load the webhook with associations
    const createdWebhook = await Webhook.findByPk(webhook.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
    })

    logger.info("Webhook created", {
      webhookId: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      createdBy: user.id,
    })

    ctx.status = 201
    ctx.body = {
      success: true,
      message: "Webhook created successfully",
      data: {
        webhook: createdWebhook?.toJSON(),
      },
    }
  }

  /**
   * PUT /api/webhooks/:id
   * Update a webhook
   */
  static async updateWebhook(ctx: Context) {
    const { id } = ctx.params
    const { error, value } = updateWebhookSchema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    const webhook = await Webhook.findByPk(id)
    if (!webhook) {
      throw createError("Webhook not found", 404, "WEBHOOK_NOT_FOUND")
    }

    const user = ctx.state.user as User

    // Update webhook
    await webhook.update(value)

    // Load updated webhook with associations
    const updatedWebhook = await Webhook.findByPk(webhook.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
    })

    logger.info("Webhook updated", {
      webhookId: webhook.id,
      updatedBy: user.id,
      changes: Object.keys(value),
    })

    ctx.body = {
      success: true,
      message: "Webhook updated successfully",
      data: {
        webhook: updatedWebhook?.toJSON(),
      },
    }
  }

  /**
   * DELETE /api/webhooks/:id
   * Delete a webhook
   */
  static async deleteWebhook(ctx: Context) {
    const { id } = ctx.params

    const webhook = await Webhook.findByPk(id)
    if (!webhook) {
      throw createError("Webhook not found", 404, "WEBHOOK_NOT_FOUND")
    }

    const user = ctx.state.user as User

    await webhook.destroy()

    logger.info("Webhook deleted", {
      webhookId: webhook.id,
      name: webhook.name,
      deletedBy: user.id,
    })

    ctx.body = {
      success: true,
      message: "Webhook deleted successfully",
    }
  }

  /**
   * POST /api/webhooks/:id/test
   * Test webhook delivery
   */
  static async testWebhook(ctx: Context) {
    const { id } = ctx.params
    const user = ctx.state.user as User

    const webhook = await Webhook.findByPk(id)
    if (!webhook) {
      throw createError("Webhook not found", 404, "WEBHOOK_NOT_FOUND")
    }

    try {
      const result = await WebhookService.testWebhook(id, user.id)

      ctx.body = {
        success: true,
        message: "Webhook test completed",
        data: {
          result,
        },
      }
    } catch (error) {
      logger.error("Webhook test failed", {
        webhookId: id,
        userId: user.id,
        error: (error as Error).message,
      })

      ctx.body = {
        success: false,
        message: "Webhook test failed",
        data: {
          result: {
            success: false,
            errorMessage: (error as Error).message,
            duration: 0,
          },
        },
      }
    }
  }

  /**
   * POST /api/webhooks/:id/reset
   * Reset webhook status and failure count
   */
  static async resetWebhook(ctx: Context) {
    const { id } = ctx.params

    const webhook = await Webhook.findByPk(id)
    if (!webhook) {
      throw createError("Webhook not found", 404, "WEBHOOK_NOT_FOUND")
    }

    const user = ctx.state.user as User

    await webhook.reset()

    logger.info("Webhook reset", {
      webhookId: webhook.id,
      resetBy: user.id,
    })

    ctx.body = {
      success: true,
      message: "Webhook reset successfully",
    }
  }

  /**
   * GET /api/webhooks/:id/logs
   * Get webhook delivery logs
   */
  static async getWebhookLogs(ctx: Context) {
    const { id } = ctx.params
    const { error, value } = webhookLogQuerySchema.validate(ctx.query)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    const webhook = await Webhook.findByPk(id)
    if (!webhook) {
      throw createError("Webhook not found", 404, "WEBHOOK_NOT_FOUND")
    }

    const { page, limit, status, event, from, to } = value
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = { webhookId: id }

    if (status) {
      where.status = status
    }

    if (event) {
      where.event = event
    }

    if (from || to) {
      where.createdAt = {}
      if (from) {
        where.createdAt[Op.gte] = from
      }
      if (to) {
        where.createdAt[Op.lte] = to
      }
    }

    const { rows: logs, count: total } = await WebhookLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    })

    ctx.body = {
      success: true,
      data: {
        logs: logs.map((log) => ({
          ...log.toJSON(),
          duration: log.getDuration(),
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    }
  }

  /**
   * GET /api/webhooks/events
   * Get available webhook events
   */
  static async getWebhookEvents(ctx: Context) {
    const events = Object.values(WebhookEvent).map((event) => ({
      value: event,
      label: event.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      category: event.split(".")[0],
    }))

    // Group events by category
    const groupedEvents = events.reduce((acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = []
      }
      acc[event.category].push(event)
      return acc
    }, {} as Record<string, typeof events>)

    ctx.body = {
      success: true,
      data: {
        events,
        groupedEvents,
      },
    }
  }

  /**
   * POST /api/webhooks/retry-failed
   * Retry all failed webhook deliveries
   */
  static async retryFailedWebhooks(ctx: Context) {
    const user = ctx.state.user as User

    try {
      await WebhookService.processRetries()

      logger.info("Manual webhook retry triggered", {
        triggeredBy: user.id,
      })

      ctx.body = {
        success: true,
        message: "Webhook retries processed successfully",
      }
    } catch (error) {
      logger.error("Failed to process webhook retries", {
        triggeredBy: user.id,
        error: (error as Error).message,
      })

      throw createError("Failed to process webhook retries", 500, "RETRY_FAILED")
    }
  }
}
