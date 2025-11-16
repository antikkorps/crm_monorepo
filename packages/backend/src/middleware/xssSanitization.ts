import { Context, Next } from "koa"
import sanitizeHtml from "sanitize-html"

/**
 * XSS Sanitization Middleware
 * Replaces the insecure koa-xss-sanitizer (which uses vulnerable lodash.set)
 * Uses sanitize-html for robust HTML sanitization
 */

interface SanitizeOptions {
  allowedTags?: string[]
  allowedAttributes?: Record<string, string[]>
  allowedSchemes?: string[]
}

// Default sanitization options - very restrictive for security
const defaultOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'u', 'p', 'br',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'a'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto']
  },
  // Remove all classes and IDs
  allowedClasses: {},
  // Disallow all iframe, script, style, etc.
  disallowedTagsMode: 'discard',
  // Remove script tags and their content
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeValue(value: any, options: sanitizeHtml.IOptions = defaultOptions): any {
  if (value === null || value === undefined) {
    return value
  }

  // String - sanitize HTML
  if (typeof value === 'string') {
    // Skip sanitization for very short strings (likely not HTML)
    if (value.length < 3) return value

    // Skip if string doesn't contain HTML-like characters
    if (!/<|>|&/.test(value)) return value

    return sanitizeHtml(value, options)
  }

  // Array - sanitize each element
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item, options))
  }

  // Object - sanitize all properties
  if (typeof value === 'object') {
    const sanitized: Record<string, any> = {}
    for (const [key, val] of Object.entries(value)) {
      // Sanitize the key as well (prevent property injection)
      const sanitizedKey = typeof key === 'string' ? key.replace(/[<>&"']/g, '') : key
      sanitized[sanitizedKey] = sanitizeValue(val, options)
    }
    return sanitized
  }

  // Other types (number, boolean, etc.) - return as is
  return value
}

/**
 * Koa middleware for XSS sanitization
 * Sanitizes request body, query, and params
 */
export function xssSanitization(customOptions?: SanitizeOptions) {
  const options = customOptions ? { ...defaultOptions, ...customOptions } : defaultOptions

  return async (ctx: Context, next: Next) => {
    // Sanitize request body (POST, PUT, PATCH)
    if (ctx.request.body && typeof ctx.request.body === 'object') {
      ctx.request.body = sanitizeValue(ctx.request.body, options)
    }

    // Sanitize query parameters (GET)
    if (ctx.query && typeof ctx.query === 'object') {
      ctx.query = sanitizeValue(ctx.query, options)
    }

    // Sanitize URL parameters
    if (ctx.params && typeof ctx.params === 'object') {
      ctx.params = sanitizeValue(ctx.params, options)
    }

    await next()
  }
}

/**
 * Strict sanitization for fields that should never contain HTML
 * (e.g., emails, usernames, IDs)
 */
export function sanitizeText(text: string): string {
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  })
}

/**
 * Sanitization for rich text fields (e.g., descriptions, notes)
 * Allows more formatting tags
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'b', 'i', 'em', 'strong', 'u', 'p', 'br',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'a', 'img', 'table', 'thead',
      'tbody', 'tr', 'th', 'td'
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'table': ['border', 'cellpadding', 'cellspacing'],
      'td': ['colspan', 'rowspan'],
      'th': ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto'],
      img: ['http', 'https', 'data']
    },
  })
}

export default xssSanitization
