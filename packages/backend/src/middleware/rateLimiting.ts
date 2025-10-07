import { Context, Next } from "koa"

// Simple in-memory rate limiter store
interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

/**
 * Simple rate limiter middleware factory
 */
function createRateLimiter(options: {
  max: number // Max requests
  windowMs: number // Time window in milliseconds
  message?: string
}) {
  return async (ctx: Context, next: Next) => {
    const key = `${ctx.ip}:${ctx.path}`
    const now = Date.now()

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs,
      }
    } else {
      store[key].count++
    }

    const remaining = Math.max(0, options.max - store[key].count)
    const resetTime = Math.ceil(store[key].resetTime / 1000)

    // Set rate limit headers
    ctx.set("X-RateLimit-Limit", String(options.max))
    ctx.set("X-RateLimit-Remaining", String(remaining))
    ctx.set("X-RateLimit-Reset", String(resetTime))

    if (store[key].count > options.max) {
      ctx.status = 429
      ctx.body = {
        error: "Too Many Requests",
        message: options.message || "Too many requests, please try again later.",
        retryAfter: resetTime,
      }
      return
    }

    await next()
  }
}

/**
 * General rate limiter for API endpoints
 * 100 requests per 15 minutes per IP
 */
export const generalRateLimiter = createRateLimiter({
  max: 100,
  windowMs: 15 * 60 * 1000,
})

/**
 * Strict rate limiter for authentication endpoints
 * 5 login attempts per 15 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  max: 5,
  windowMs: 15 * 60 * 1000,
  message: "Too many login attempts, please try again later.",
})

/**
 * Very strict rate limiter for sensitive operations
 * 3 requests per 15 minutes per IP
 */
export const sensitiveRateLimiter = createRateLimiter({
  max: 3,
  windowMs: 15 * 60 * 1000,
  message: "Too many requests for this sensitive operation.",
})
