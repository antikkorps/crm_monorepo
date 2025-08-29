import Joi from "joi"
import { createError } from "../middleware/errorHandler"
import { User } from "../models/User"
import { AuthService } from "../services/AuthService"
import { Context, Next } from "../types/koa"
import { logger } from "../utils/logger"

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
})

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required",
  }),
})

export class AuthController {
  /**
   * POST /api/auth/login
   * Authenticate user with email and password
   */
  static async login(ctx: Context, next: Next) {
    console.log("AuthController.login called with:", ctx.request.body)
    // Validate request body
    const { error, value } = loginSchema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    const { email, password } = value

    try {
      // Authenticate user
      const { user, tokens } = await AuthService.login({ email, password })

      // Set secure HTTP-only cookie for refresh token
      ctx.cookies.set("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })

      ctx.status = 200
      ctx.body = {
        success: true,
        message: "Login successful",
        data: {
          user: user.toJSON(),
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
        },
      }

      logger.info("User login successful", {
        userId: user.id,
        email: user.email,
        ip: ctx.ip,
        userAgent: ctx.get("User-Agent"),
      })
    } catch (error) {
      logger.warn("Login failed", {
        email,
        error: (error as Error).message,
        ip: ctx.ip,
        userAgent: ctx.get("User-Agent"),
      })
      throw error
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  static async refresh(ctx: Context) {
    // Get refresh token from cookie or request body
    let refreshToken = ctx.cookies.get("refreshToken")

    if (!refreshToken && ctx.request.body) {
      const { error, value } = refreshTokenSchema.validate(ctx.request.body)
      if (!error) {
        refreshToken = value.refreshToken
      }
    }

    if (!refreshToken) {
      throw createError("Refresh token required", 401, "REFRESH_TOKEN_REQUIRED")
    }

    try {
      // Refresh tokens
      const tokens = await AuthService.refreshToken(refreshToken)

      // Update refresh token cookie
      ctx.cookies.set("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })

      ctx.body = {
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
        },
      }

      logger.info("Token refresh successful", {
        ip: ctx.ip,
        userAgent: ctx.get("User-Agent"),
      })
    } catch (error) {
      logger.warn("Token refresh failed", {
        error: (error as Error).message,
        ip: ctx.ip,
      })
      throw error
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user and clear refresh token
   */
  static async logout(ctx: Context) {
    // Clear refresh token cookie
    ctx.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
    })

    ctx.body = {
      success: true,
      message: "Logout successful",
    }

    const user = ctx.state.user as User | undefined
    logger.info("User logout", {
      userId: user?.id,
      email: user?.email,
      ip: ctx.ip,
    })
  }

  /**
   * GET /api/auth/me
   * Get current authenticated user information
   */
  static async me(ctx: Context) {
    const user = ctx.state.user as User

    ctx.body = {
      success: true,
      data: {
        user: user.toJSON(),
      },
    }
  }

  /**
   * POST /api/auth/change-password
   * Change user password
   */
  static async changePassword(ctx: Context) {
    const changePasswordSchema = Joi.object({
      currentPassword: Joi.string().required().messages({
        "any.required": "Current password is required",
      }),
      newPassword: Joi.string().min(6).required().messages({
        "string.min": "New password must be at least 6 characters long",
        "any.required": "New password is required",
      }),
    })

    // Validate request body
    const { error, value } = changePasswordSchema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    const { currentPassword, newPassword } = value
    const user = ctx.state.user as User

    try {
      // Verify current password
      const isCurrentPasswordValid = await user.validatePassword(currentPassword)
      if (!isCurrentPasswordValid) {
        throw createError(
          "Current password is incorrect",
          400,
          "INVALID_CURRENT_PASSWORD"
        )
      }

      // Hash new password and update user
      const newPasswordHash = await User.hashPassword(newPassword)
      await user.update({ passwordHash: newPasswordHash })

      ctx.body = {
        success: true,
        message: "Password changed successfully",
      }

      logger.info("Password changed successfully", {
        userId: user.id,
        email: user.email,
      })
    } catch (error) {
      logger.warn("Password change failed", {
        userId: user.id,
        error: (error as Error).message,
      })
      throw error
    }
  }
}
