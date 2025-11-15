import cors from "@koa/cors"
import Router from "@koa/router"
import Koa from "koa"
import bodyParser from "koa-bodyparser"
import helmet from "koa-helmet"
import config from "./config/environment"
import { errorHandler } from "./middleware/errorHandler"
import { requestLogger } from "./middleware/requestLogger"
import authRoutes from "./routes/auth"
import billingAnalyticsRoutes from "./routes/billing-analytics"
import callRoutes from "./routes/calls"
import catalogRoutes from "./routes/catalog"
import contactRoutes from "./routes/contacts"
import dashboardRoutes from "./routes/dashboard"
import digiformaRoutes from "./routes/digiforma"
import sageRoutes from "./routes/sage"
import filterOptionsRoutes from "./routes/filterOptions"
import institutionRoutes from "./routes/institutions"
import invoiceRoutes from "./routes/invoices"
import exportRoutes from "./routes/export"
import noteRoutes from "./routes/notes"
import meetingRoutes from "./routes/meetings"
import pluginRoutes from "./routes/plugins"
import quoteRoutes from "./routes/quotes"
import reminderRoutes from "./routes/reminders"
import reminderRuleRoutes from "./routes/reminderRules"
import revenueRoutes from "./routes/revenue"
import segmentRoutes from "./routes/segments"
import socketRoutes from "./routes/socket"
import taskRoutes from "./routes/tasks"
import teamRoutes from "./routes/teams"
import templateRoutes from "./routes/templates"
import userRoutes from "./routes/users"
import webhookRoutes from "./routes/webhooks"
import securityLogRoutes from "./routes/security-logs"
import settingsRoutes from "./routes/settings"
import { logger } from "./utils/logger"
import { securityLoggingMiddleware } from "./middleware/securityLogging"
import { generalRateLimiter } from "./middleware/rateLimiting"
import { inputValidationMiddleware } from "./middleware/inputSanitization"

export const createApp = (): Koa => {
  const app = new Koa()
  const router = new Router()

  // Trust proxy for proper IP detection
  app.proxy = true

  // Global error handler (must be first)
  app.use(errorHandler)

  // Request logging
  app.use(requestLogger)

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP for API
      crossOriginEmbedderPolicy: false,
    })
  )

  // CORS configuration
  // Development: Allow all origins for local testing
  // Production: Only allow configured origin from environment
  app.use(
    cors({
      origin: config.env === 'development' ? '*' : config.cors.origin,
      credentials: config.env !== 'development', // Only enable credentials in production
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "X-Request-ID"],
      exposeHeaders: ["X-Request-ID"],
      maxAge: 86400, // 24 hours
      // @koa/cors handles OPTIONS preflight requests automatically
    })
  )

  // Body parser with size limits
  app.use(
    bodyParser({
      jsonLimit: "10mb",
      formLimit: "10mb",
      textLimit: "10mb",
      enableTypes: ["json", "form", "text"],
      onerror: (err, ctx) => {
        ctx.throw(422, "Body parse error", { details: err.message })
      },
    })
  )

  // Input validation and sanitization middleware
  app.use(inputValidationMiddleware)

  // General rate limiting (apply to all routes)
  app.use(generalRateLimiter)

  // Security logging middleware
  app.use(securityLoggingMiddleware)

  // Health check endpoint
  router.get("/health", async (ctx) => {
    const { checkDatabaseConnection } = await import("./utils/database-init")
    const dbStatus = await checkDatabaseConnection()

    ctx.body = {
      status: dbStatus ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: config.env,
      database: dbStatus ? "connected" : "disconnected",
    }

    if (!dbStatus) {
      ctx.status = 503
    }
  })

  // API info endpoint
  router.get("/api", async (ctx) => {
    ctx.body = {
      name: "Medical CRM Backend API",
      version: "1.0.0",
      environment: config.env,
      timestamp: new Date().toISOString(),
    }
  })

  // Apply auth routes first
  app.use(authRoutes.routes())
  app.use(authRoutes.allowedMethods())

  // Apply other API routes
  app.use(router.routes())
  app.use(router.allowedMethods())

  // Apply billing analytics routes
  app.use(billingAnalyticsRoutes.routes())
  app.use(billingAnalyticsRoutes.allowedMethods())

  // Apply call routes
  app.use(callRoutes.routes())
  app.use(callRoutes.allowedMethods())

  // Apply catalog routes
  app.use(catalogRoutes.routes())
  app.use(catalogRoutes.allowedMethods())

  // Apply contact routes
  app.use(contactRoutes.routes())
  app.use(contactRoutes.allowedMethods())

  // Apply dashboard routes
  app.use(dashboardRoutes.routes())
  app.use(dashboardRoutes.allowedMethods())

  // Apply institution routes
  app.use(institutionRoutes.routes())
  app.use(institutionRoutes.allowedMethods())

  // Apply invoice routes
  app.use(invoiceRoutes.routes())
  app.use(invoiceRoutes.allowedMethods())

  // Apply export routes
  app.use(exportRoutes.routes())
  app.use(exportRoutes.allowedMethods())

  // Apply filter options routes
  app.use(filterOptionsRoutes.routes())
  app.use(filterOptionsRoutes.allowedMethods())

  // Apply quote routes
  app.use(quoteRoutes.routes())
  app.use(quoteRoutes.allowedMethods())

  // Apply reminder routes
  app.use(reminderRoutes.routes())
  app.use(reminderRoutes.allowedMethods())

  // Apply reminder rule routes
  app.use(reminderRuleRoutes.routes())
  app.use(reminderRuleRoutes.allowedMethods())

  // Apply segment routes
  app.use(segmentRoutes.routes())
  app.use(segmentRoutes.allowedMethods())

  // Apply socket routes
  app.use(socketRoutes.routes())
  app.use(socketRoutes.allowedMethods())

  // Apply note routes
  app.use(noteRoutes.routes())
  app.use(noteRoutes.allowedMethods())

  // Apply meeting routes
  app.use(meetingRoutes.routes())
  app.use(meetingRoutes.allowedMethods())

  // Apply task routes
  app.use(taskRoutes.routes())
  app.use(taskRoutes.allowedMethods())

  // Apply team routes
  app.use(teamRoutes.routes())
  app.use(teamRoutes.allowedMethods())

  // Apply user routes
  app.use(userRoutes.routes())
  app.use(userRoutes.allowedMethods())

  // Apply template routes
  app.use(templateRoutes.routes())
  app.use(templateRoutes.allowedMethods())

  // Apply webhook routes
  app.use(webhookRoutes.routes())
  app.use(webhookRoutes.allowedMethods())

  // Apply plugin routes
  app.use(pluginRoutes.routes())
  app.use(pluginRoutes.allowedMethods())

  // Apply Digiforma routes
  app.use(digiformaRoutes.routes())
  app.use(digiformaRoutes.allowedMethods())

  // Apply Sage routes
  app.use(sageRoutes.routes())
  app.use(sageRoutes.allowedMethods())

  // Apply revenue routes (consolidated revenue endpoints)
  app.use(revenueRoutes.routes())
  app.use(revenueRoutes.allowedMethods())

  // Apply security log routes
  app.use(securityLogRoutes.routes())
  app.use(securityLogRoutes.allowedMethods())

  // Apply settings routes
  app.use(settingsRoutes.routes())
  app.use(settingsRoutes.allowedMethods())

  // 404 handler
  app.use(async (ctx) => {
    ctx.status = 404
    ctx.body = {
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found",
        timestamp: new Date().toISOString(),
        requestId: ctx.state.requestId,
      },
    }
  })

  // Error event listener
  app.on("error", (err, ctx) => {
    if (ctx && ctx.status !== 404) {
      logger.error("Application error", {
        error: err.message,
        stack: err.stack,
        url: ctx?.url,
        method: ctx?.method,
      })
    }
  })

  return app
}

export default createApp
