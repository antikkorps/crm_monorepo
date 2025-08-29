import { v4 as uuidv4 } from "uuid"
import { Context, Next } from "../types/koa"
import { logger } from "../utils/logger"

export const requestLogger = async (ctx: Context, next: Next) => {
  // Generate unique request ID
  const requestId = uuidv4()
  ctx.state.requestId = requestId

  // Set request ID header
  ctx.set("X-Request-ID", requestId)

  const start = Date.now()

  // Log incoming request
  logger.info("Incoming request", {
    method: ctx.method,
    url: ctx.url,
    userAgent: ctx.get("User-Agent"),
    ip: ctx.ip,
    requestId,
  })

  await next()

  const duration = Date.now() - start

  // Log completed request
  logger.info("Request completed", {
    method: ctx.method,
    url: ctx.url,
    status: ctx.status,
    duration: `${duration}ms`,
    requestId,
  })
}
