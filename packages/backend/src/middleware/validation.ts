import Joi from "joi"
import { Context, Next } from "../types/koa"
import { createError } from "./errorHandler"

/**
 * Generic validation middleware factory
 */
export function validate(
  schema: Joi.ObjectSchema,
  source: "body" | "query" | "params" = "body"
) {
  return async (ctx: Context, next: Next) => {
    const data =
      source === "body" ? ctx.request.body : source === "query" ? ctx.query : ctx.params

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }))

      throw createError("Validation failed", 400, "VALIDATION_ERROR", { details })
    }

    // Replace the original data with validated and sanitized data
    if (source === "body") {
      ctx.request.body = value
    } else if (source === "query") {
      ctx.query = value
    } else {
      ctx.params = value
    }

    await next()
  }
}

/**
 * Validate UUID parameter
 */
export const validateUUID = validate(
  Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Invalid ID format",
      "any.required": "ID is required",
    }),
  }),
  "params"
)

/**
 * Validate UUID for institutionId parameter
 */
export const validateInstitutionId = validate(
  Joi.object({
    institutionId: Joi.string().uuid().required().messages({
      "string.guid": "Invalid institution ID format",
      "any.required": "Institution ID is required",
    }),
  }),
  "params"
)

/**
 * Validate UUID for both id and userId parameters (for share routes)
 */
export const validateIdAndUserId = validate(
  Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.guid": "Invalid ID format",
      "any.required": "ID is required",
    }),
    userId: Joi.string().uuid().required().messages({
      "string.guid": "Invalid user ID format",
      "any.required": "User ID is required",
    }),
  }),
  "params"
)

/**
 * Validate pagination parameters
 */
export const validatePagination = validate(
  Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("ASC", "DESC").default("ASC"),
  }),
  "query"
)
