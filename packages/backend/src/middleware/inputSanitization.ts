import { Context, Next } from "koa"
import validator from "validator"
import sanitizeHtml from "sanitize-html"

/**
 * SECURITY: Improved XSS sanitization using sanitize-html
 * Replaces basic validator.escape() with comprehensive HTML sanitization
 * Addresses: High severity lodash.set vulnerability in koa-xss-sanitizer
 */

// Restrictive sanitization options for general input
const strictOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
}

/**
 * Sanitize a string value
 * Removes all HTML tags for security
 */
function sanitizeString(value: string): string {
  if (typeof value !== "string") return value

  const trimmed = value.trim()

  // Skip sanitization for very short strings (performance optimization)
  if (trimmed.length < 3) return trimmed

  // If no HTML-like characters, return as-is (performance optimization)
  if (!/<|>|&/.test(trimmed)) return trimmed

  // Use sanitize-html to strip all HTML
  return sanitizeHtml(trimmed, strictOptions)
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj

  if (typeof obj === "string") {
    return sanitizeString(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }

  if (typeof obj === "object") {
    const sanitized: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key])
      }
    }
    return sanitized
  }

  return obj
}

/**
 * Input validation middleware
 */
export const inputValidationMiddleware = async (ctx: Context, next: Next) => {
  try {
    // Validate Content-Type for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(ctx.method)) {
      const contentType = ctx.request.type
      if (contentType && !contentType.includes("application/json") && !contentType.includes("multipart/form-data")) {
        ctx.status = 415
        ctx.body = {
          error: "Unsupported Media Type",
          message: "Content-Type must be application/json or multipart/form-data",
        }
        return
      }
    }

    // Sanitize request body
    if (ctx.request.body && typeof ctx.request.body === "object") {
      ctx.request.body = sanitizeObject(ctx.request.body)
    }

    // Sanitize query parameters
    if (ctx.query && typeof ctx.query === "object") {
      ctx.query = sanitizeObject(ctx.query)
    }

    // Sanitize URL parameters
    if (ctx.params && typeof ctx.params === "object") {
      ctx.params = sanitizeObject(ctx.params)
    }

    await next()
  } catch (error) {
    console.error("Input validation error:", error)
    throw error
  }
}

/**
 * Input validator utility class
 */
export class InputValidator {
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false
    return validator.isEmail(email)
  }

  static isValidUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== "string") return false
    return validator.isUUID(uuid, 4)
  }

  static isValidURL(url: string): boolean {
    if (!url || typeof url !== "string") return false
    return validator.isURL(url, { protocols: ["http", "https"], require_protocol: true })
  }

  static isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== "string") return false
    return /^[\d\s\+\-\(\)]+$/.test(phone) && phone.replace(/\D/g, "").length >= 10
  }

  static isValidDate(date: string): boolean {
    if (!date || typeof date !== "string") return false
    return validator.isISO8601(date)
  }

  static isValidInteger(value: string | number): boolean {
    if (typeof value === "number") return Number.isInteger(value)
    if (typeof value !== "string") return false
    return validator.isInt(value)
  }

  static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== "string") return ""
    return filename
      .replace(/\.\./g, "")
      .replace(/[/\\]/g, "")
      .replace(/\0/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
  }
}
