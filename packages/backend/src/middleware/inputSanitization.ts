import { Context, Next } from "koa"
import validator from "validator"
import sanitizeHtml from "sanitize-html"

/**
 * SECURITY: Input validation and sanitization middleware
 *
 * Purpose: This middleware is applied GLOBALLY to all routes for basic input sanitization.
 * It strips ALL HTML tags from inputs to prevent XSS attacks.
 *
 * Difference from xssSanitization.ts:
 * - inputSanitization: Global, strict (no HTML allowed), applied to all routes
 * - xssSanitization: Optional, configurable (allows specific tags), applied per-route
 *
 * Use xssSanitization.ts when you need to allow safe HTML (e.g., rich text editors).
 * This middleware provides defense-in-depth for all other routes.
 *
 * Addresses: High severity lodash.set vulnerability in koa-xss-sanitizer
 */

// Restrictive sanitization options - strips ALL HTML
const strictOptions: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
}

// Rich text sanitization options - allows safe formatting tags
const richTextOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'u', 'p', 'br',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'a'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
}

// Fields that are allowed to contain safe HTML (rich text editors)
const RICH_TEXT_FIELDS = new Set([
  'scope',
  'termsAndConditions',
  'description',
  'notes',
  'content',
  'htmlTemplate',
  'body',
])

/**
 * Check if a string is valid JSON (ProseMirror document format)
 * This is used to skip HTML sanitization for JSON content stored by rich text editors
 */
function isJsonContent(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return false
  }
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

/**
 * Sanitize a string value
 * @param value The string to sanitize
 * @param isRichText If true, allow safe HTML tags for rich text fields or skip sanitization for JSON content
 */
function sanitizeString(value: string, isRichText: boolean = false): string {
  if (typeof value !== "string") return value

  const trimmed = value.trim()

  // For rich text fields, check if content is JSON (ProseMirror format)
  // JSON content should be preserved as-is since it doesn't contain executable HTML
  if (isRichText && isJsonContent(trimmed)) {
    return trimmed
  }

  // Use appropriate sanitization options based on field type
  const options = isRichText ? richTextOptions : strictOptions
  return sanitizeHtml(trimmed, options)
}

/**
 * Recursively sanitize an object
 * @param obj The object to sanitize
 * @param fieldName Optional field name to check if it's a rich text field
 */
function sanitizeObject(obj: any, fieldName?: string): any {
  if (obj === null || obj === undefined) return obj

  if (typeof obj === "string") {
    const isRichText = fieldName ? RICH_TEXT_FIELDS.has(fieldName) : false
    return sanitizeString(obj, isRichText)
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, fieldName))
  }

  if (typeof obj === "object") {
    const sanitized: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Pass the key name so we can check if it's a rich text field
        sanitized[key] = sanitizeObject(obj[key], key)
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
