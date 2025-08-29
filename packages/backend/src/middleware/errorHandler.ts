import { Context, Next } from "../types/koa"
import { logger } from "../utils/logger"

export interface AppError extends Error {
  status?: number
  code?: string
  details?: any
}

export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (err: any) {
    const error = err as AppError

    // Set default error status and message
    ctx.status = error.status || 500

    const errorResponse = {
      error: {
        code: error.code || "INTERNAL_SERVER_ERROR",
        message: error.message || "An unexpected error occurred",
        details: error.details || null,
        timestamp: new Date().toISOString(),
        requestId: ctx.state.requestId || "unknown",
      },
    }

    // Log error details
    logger.error("Request error", {
      error: error.message,
      stack: error.stack,
      status: ctx.status,
      method: ctx.method,
      url: ctx.url,
      requestId: ctx.state.requestId,
      userAgent: ctx.get("User-Agent"),
      ip: ctx.ip,
    })

    // Don't expose internal error details in production
    if (ctx.status === 500 && process.env.NODE_ENV === "production") {
      errorResponse.error.message = "Internal server error"
      errorResponse.error.details = null
    }

    ctx.body = errorResponse

    // Emit error event for monitoring
    ctx.app.emit("error", error, ctx)
  }
}

export const createError = (
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): AppError => {
  const error = new Error(message) as AppError
  error.status = status
  error.code = code
  error.details = details
  return error
}
