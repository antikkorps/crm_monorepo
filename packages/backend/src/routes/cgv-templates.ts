import Router from "@koa/router"
import { Context } from "koa"
import Joi from "joi"
import { CgvTemplate } from "../models/CgvTemplate"
import { createError } from "../middleware/errorHandler"
import { authenticate, requireAdmin } from "../middleware/auth"

const router = new Router({ prefix: "/api/cgv-templates" })

// Validation schemas
const createSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).allow("", null),
  content: Joi.string().required(),
  category: Joi.string().max(50).allow("", null),
  isDefault: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  orderIndex: Joi.number().integer().default(0),
})

const updateSchema = Joi.object({
  name: Joi.string().max(100),
  description: Joi.string().max(500).allow("", null),
  content: Joi.string(),
  category: Joi.string().max(50).allow("", null),
  isDefault: Joi.boolean(),
  isActive: Joi.boolean(),
  orderIndex: Joi.number().integer(),
})

/**
 * GET /api/cgv-templates
 * List all active CGV templates (public for selection)
 */
router.get("/", authenticate, async (ctx: Context) => {
  try {
    const templates = await CgvTemplate.getActiveTemplates()
    ctx.body = { success: true, data: templates }
  } catch (error) {
    throw createError("Erreur lors de la récupération des modèles de CGV", 500, "CGV_TEMPLATES_FETCH_ERROR")
  }
})

/**
 * GET /api/cgv-templates/all
 * List all CGV templates including inactive (admin only)
 */
router.get("/all", authenticate, requireAdmin, async (ctx: Context) => {
  try {
    const templates = await CgvTemplate.findAll({
      order: [["orderIndex", "ASC"], ["name", "ASC"]],
    })
    ctx.body = { success: true, data: templates }
  } catch (error) {
    throw createError("Erreur lors de la récupération des modèles de CGV", 500, "CGV_TEMPLATES_FETCH_ERROR")
  }
})

/**
 * GET /api/cgv-templates/:id
 * Get a single CGV template
 */
router.get("/:id", authenticate, async (ctx: Context) => {
  try {
    const template = await CgvTemplate.findByPk(ctx.params.id)
    if (!template) {
      throw createError("Modèle de CGV non trouvé", 404, "CGV_TEMPLATE_NOT_FOUND")
    }
    ctx.body = { success: true, data: template }
  } catch (error: any) {
    if (error.status) throw error
    throw createError("Erreur lors de la récupération du modèle de CGV", 500, "CGV_TEMPLATE_FETCH_ERROR")
  }
})

/**
 * POST /api/cgv-templates
 * Create a new CGV template (admin only)
 */
router.post("/", authenticate, requireAdmin, async (ctx: Context) => {
  try {
    const { error, value } = createSchema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR")
    }

    const template = await CgvTemplate.create({
      ...value,
      createdBy: ctx.state.user?.id,
    })

    // If this is set as default, unset others
    if (value.isDefault) {
      await template.setAsDefault()
    }

    ctx.status = 201
    ctx.body = { success: true, data: template }
  } catch (error: any) {
    if (error.status) throw error
    throw createError("Erreur lors de la création du modèle de CGV", 500, "CGV_TEMPLATE_CREATE_ERROR")
  }
})

/**
 * PUT /api/cgv-templates/:id
 * Update a CGV template (admin only)
 */
router.put("/:id", authenticate, requireAdmin, async (ctx: Context) => {
  try {
    const template = await CgvTemplate.findByPk(ctx.params.id)
    if (!template) {
      throw createError("Modèle de CGV non trouvé", 404, "CGV_TEMPLATE_NOT_FOUND")
    }

    const { error, value } = updateSchema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR")
    }

    await template.update(value)

    // If this is set as default, unset others
    if (value.isDefault) {
      await template.setAsDefault()
    }

    ctx.body = { success: true, data: template }
  } catch (error: any) {
    if (error.status) throw error
    throw createError("Erreur lors de la mise à jour du modèle de CGV", 500, "CGV_TEMPLATE_UPDATE_ERROR")
  }
})

/**
 * DELETE /api/cgv-templates/:id
 * Delete a CGV template (admin only)
 */
router.delete("/:id", authenticate, requireAdmin, async (ctx: Context) => {
  try {
    const template = await CgvTemplate.findByPk(ctx.params.id)
    if (!template) {
      throw createError("Modèle de CGV non trouvé", 404, "CGV_TEMPLATE_NOT_FOUND")
    }

    await template.destroy()
    ctx.body = { success: true, message: "Modèle de CGV supprimé" }
  } catch (error: any) {
    if (error.status) throw error
    throw createError("Erreur lors de la suppression du modèle de CGV", 500, "CGV_TEMPLATE_DELETE_ERROR")
  }
})

/**
 * PUT /api/cgv-templates/:id/set-default
 * Set a template as default (admin only)
 */
router.put("/:id/set-default", authenticate, requireAdmin, async (ctx: Context) => {
  try {
    const template = await CgvTemplate.findByPk(ctx.params.id)
    if (!template) {
      throw createError("Modèle de CGV non trouvé", 404, "CGV_TEMPLATE_NOT_FOUND")
    }

    await template.setAsDefault()
    ctx.body = { success: true, data: template }
  } catch (error: any) {
    if (error.status) throw error
    throw createError("Erreur lors de la définition du modèle par défaut", 500, "CGV_TEMPLATE_DEFAULT_ERROR")
  }
})

/**
 * PUT /api/cgv-templates/reorder
 * Reorder templates (admin only)
 */
router.put("/reorder", authenticate, requireAdmin, async (ctx: Context) => {
  try {
    const { templateIds } = ctx.request.body as { templateIds: string[] }

    if (!Array.isArray(templateIds)) {
      throw createError("templateIds doit être un tableau", 400, "VALIDATION_ERROR")
    }

    // Update order for each template
    for (let i = 0; i < templateIds.length; i++) {
      await CgvTemplate.update(
        { orderIndex: i },
        { where: { id: templateIds[i] } }
      )
    }

    const templates = await CgvTemplate.getActiveTemplates()
    ctx.body = { success: true, data: templates }
  } catch (error: any) {
    if (error.status) throw error
    throw createError("Erreur lors de la réorganisation des modèles", 500, "CGV_TEMPLATES_REORDER_ERROR")
  }
})

export default router
