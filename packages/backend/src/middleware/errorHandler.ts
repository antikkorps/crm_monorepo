import config from "../config/environment"
import { Context, Next } from "../types/koa"
import { AppError } from "../utils/AppError"
import { logger } from "../utils/logger"

export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (err: any) {
    let error = err

    // Convert unknown errors to AppError
    if (!(error instanceof AppError)) {
      error = new AppError(
        err.message || "An unexpected error occurred",
        err.status || 500,
        err.code || "INTERNAL_SERVER_ERROR",
        err.details || null
      )
      // Preserve original stack if available
      if (err.stack) {
        error.stack = err.stack
      }
    }

    ctx.status = error.status

    const errorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId: ctx.state.requestId || "unknown",
      },
    }

    // Log error details
    // Log 5xx errors as error, 4xx as warn/info
    const logLevel = ctx.status >= 500 ? "error" : "warn"
    
    logger.log(logLevel, "Request error", {
      error: error.message,
      code: error.code,
      stack: error.stack,
      status: ctx.status,
      method: ctx.method,
      url: ctx.url,
      requestId: ctx.state.requestId,
      userAgent: ctx.get("User-Agent"),
      ip: ctx.ip,
      userId: ctx.state.user?.id, // Log user ID if authenticated
    })

    // Don't expose internal error details in production for 500 errors
    if (ctx.status === 500 && config.env === "production") {
      errorResponse.error.message = "Internal server error"
      errorResponse.error.details = null
    }

    // Ensure CORS headers on error responses
    try {
      const allowOrigin = config.env === "development" ? "*" : config.cors.origin
      ctx.set("Access-Control-Allow-Origin", allowOrigin)
      ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
      ctx.set(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID"
      )
    } catch {}

    ctx.body = errorResponse

    // Emit error event for monitoring if it's a 500
    if (ctx.status >= 500) {
      ctx.app.emit("error", error, ctx)
    }
  }
}

// Deprecated: Use new AppError() or subclasses instead
export const createError = (
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): AppError => {
  return new AppError(message, status, code, details)
}
