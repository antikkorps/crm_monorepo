import { User, UserRole } from "../models/User"
import { AuthService } from "../services/AuthService"
import { Context, Next } from "../types/koa"
import { logger } from "../utils/logger"
import { createError } from "./errorHandler"

// Extend Koa context to include user
declare module "koa" {
  interface DefaultState {
    user?: User
  }
}

/**
 * JWT Authentication middleware
 * Verifies JWT token and adds user to context
 */
export const authenticate = async (ctx: Context, next: Next) => {
  try {
    const authHeader = ctx.get("Authorization")
    const token = AuthService.extractTokenFromHeader(authHeader)

    if (!token) {
      throw createError("Authentication token required", 401, "TOKEN_REQUIRED")
    }

    // Get user from token
    const user = await AuthService.getUserFromToken(token)

    // Add user to context state
    ctx.state.user = user

    await next()
  } catch (error) {
    // Log authentication failure
    logger.warn("Authentication failed", {
      error: (error as Error).message,
      ip: ctx.ip,
      userAgent: ctx.get("User-Agent"),
      path: ctx.path,
      method: ctx.method,
    })

    throw error
  }
}

/**
 * Optional authentication middleware
 * Adds user to context if token is valid, but doesn't require it
 */
export const optionalAuth = async (ctx: Context, next: Next) => {
  try {
    const authHeader = ctx.get("Authorization")
    const token = AuthService.extractTokenFromHeader(authHeader)

    if (token) {
      const user = await AuthService.getUserFromToken(token)
      ctx.state.user = user
    }
  } catch (error) {
    // Ignore authentication errors for optional auth
    logger.debug("Optional authentication failed", {
      error: (error as Error).message,
      path: ctx.path,
    })
  }

  await next()
}

/**
 * Role-based authorization middleware factory
 * Requires authentication and checks user role
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return async (ctx: Context, next: Next) => {
    // Ensure user is authenticated
    if (!ctx.state.user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const user = ctx.state.user as User

    // Check if user role is allowed
    if (!allowedRoles.includes(user.role)) {
      logger.warn("Authorization failed - insufficient permissions", {
        userId: user.id,
        userRole: user.role,
        requiredRoles: allowedRoles,
        path: ctx.path,
        method: ctx.method,
      })

      throw createError("Insufficient permissions", 403, "INSUFFICIENT_PERMISSIONS")
    }

    await next()
  }
}

/**
 * Admin-only authorization middleware
 */
export const requireAdmin = authorize([UserRole.ADMIN])

/**
 * Manager or Admin authorization middleware
 */
export const requireManager = authorize([UserRole.ADMIN, UserRole.MANAGER])

/**
 * Any authenticated user authorization middleware
 */
export const requireAuth = authenticate
