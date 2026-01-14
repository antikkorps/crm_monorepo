import Joi from "joi"
import { createError } from "../middleware/errorHandler"
import { User } from "../models/User"
import { PasswordResetToken } from "../models/PasswordResetToken"
import { AuthService } from "../services/AuthService"
import { SecurityLogService } from "../services/SecurityLogService"
import { EmailService } from "../services/EmailService"
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
  rememberMe: Joi.boolean().optional().default(false),
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

    const { email, password, rememberMe } = value

    try {
      // Authenticate user
      const { user, tokens } = await AuthService.login({ email, password })

      // Log successful authentication
      await SecurityLogService.logAuthSuccess(ctx, user.id).catch((err) => {
        logger.error("Failed to log auth success", { error: err })
      })

      // Set secure HTTP-only cookie for refresh token
      // If rememberMe is true, set maxAge to 7 days, otherwise set to undefined (session cookie)
      ctx.cookies.set("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : undefined, // 7 days if rememberMe, session cookie otherwise
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
        rememberMe,
        ip: ctx.ip,
        userAgent: ctx.get("User-Agent"),
      })
    } catch (error) {
      // Log failed authentication
      await SecurityLogService.logAuthFailure(
        ctx,
        email,
        (error as Error).message
      ).catch((err) => {
        logger.error("Failed to log auth failure", { error: err })
      })

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
    // Log logout
    await SecurityLogService.logLogout(ctx).catch((err) => {
      logger.error("Failed to log logout", { error: err })
    })

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
   * PUT /api/auth/me
   * Update current authenticated user profile
   */
  static async updateProfile(ctx: Context) {
    const updateProfileSchema = Joi.object({
      firstName: Joi.string().optional(),
      lastName: Joi.string().optional(),
      email: Joi.string().email().optional(),
      phone: Joi.string().optional(),
    })

    // Validate request body
    const { error, value } = updateProfileSchema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    const user = ctx.state.user as User

    try {
      // Update user profile
      await user.update(value)
      await user.reload()

      ctx.body = {
        success: true,
        message: "Profile updated successfully",
        data: {
          user: user.toJSON(),
        },
      }

      logger.info("Profile updated successfully", {
        userId: user.id,
        email: user.email,
        updatedFields: Object.keys(value),
      })
    } catch (error) {
      logger.warn("Profile update failed", {
        userId: user.id,
        error: (error as Error).message,
      })
      throw error
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

  /**
   * Request password reset - send code to email
   */
  static async forgotPassword(ctx: Context, next: Next) {
    try {
      const { email } = ctx.request.body as { email: string }

      if (!email) {
        throw createError("Email est requis", 400, "MISSING_EMAIL")
      }

      // Find user by email
      const user = await User.findOne({ where: { email: email.toLowerCase() } })

      if (!user) {
        // Don't reveal if user exists or not for security
        ctx.body = {
          success: true,
          message: "Si un compte existe avec cet email, un code de réinitialisation a été envoyé.",
        }
        return
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString()

      // Expire in 15 minutes
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      // Invalidate any existing tokens for this user
      await PasswordResetToken.update(
        { used: true },
        { where: { userId: user.id, used: false } }
      )

      // Create new token
      await PasswordResetToken.create({
        userId: user.id,
        code,
        expiresAt,
        used: false,
      })

      // Send email with code
      const emailService = new EmailService()
      await emailService.sendPasswordResetCode(user.email, code, user.firstName)

      ctx.body = {
        success: true,
        message: "Si un compte existe avec cet email, un code de réinitialisation a été envoyé.",
      }

      logger.info("Password reset code sent", {
        userId: user.id,
        email: user.email,
      })
    } catch (error) {
      logger.error("Forgot password error", {
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Verify password reset code
   */
  static async verifyResetCode(ctx: Context, next: Next) {
    try {
      const { email, code } = ctx.request.body as { email: string; code: string }

      if (!email || !code) {
        throw createError("Email et code sont requis", 400, "MISSING_FIELDS")
      }

      // Find user
      const user = await User.findOne({ where: { email: email.toLowerCase() } })

      if (!user) {
        throw createError("Code invalide ou expiré", 400, "INVALID_CODE")
      }

      // Find valid token
      const token = await PasswordResetToken.findOne({
        where: {
          userId: user.id,
          code,
          used: false,
        },
      })

      if (!token) {
        throw createError("Code invalide ou expiré", 400, "INVALID_CODE")
      }

      // Check if expired
      if (new Date() > token.expiresAt) {
        throw createError("Le code a expiré. Veuillez demander un nouveau code.", 400, "CODE_EXPIRED")
      }

      ctx.body = {
        success: true,
        message: "Code vérifié avec succès",
      }

      logger.info("Password reset code verified", {
        userId: user.id,
        email: user.email,
      })
    } catch (error) {
      logger.warn("Verify reset code failed", {
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Reset password using verified code
   */
  static async resetPassword(ctx: Context, next: Next) {
    try {
      const { email, code, newPassword } = ctx.request.body as {
        email: string
        code: string
        newPassword: string
      }

      if (!email || !code || !newPassword) {
        throw createError("Tous les champs sont requis", 400, "MISSING_FIELDS")
      }

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      if (!passwordRegex.test(newPassword)) {
        throw createError(
          "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial",
          400,
          "WEAK_PASSWORD"
        )
      }

      // Find user
      const user = await User.findOne({ where: { email: email.toLowerCase() } })

      if (!user) {
        throw createError("Code invalide ou expiré", 400, "INVALID_CODE")
      }

      // Find valid token
      const token = await PasswordResetToken.findOne({
        where: {
          userId: user.id,
          code,
          used: false,
        },
      })

      if (!token) {
        throw createError("Code invalide ou expiré", 400, "INVALID_CODE")
      }

      // Check if expired
      if (new Date() > token.expiresAt) {
        throw createError("Le code a expiré. Veuillez demander un nouveau code.", 400, "CODE_EXPIRED")
      }

      // Hash new password and update user
      const newPasswordHash = await User.hashPassword(newPassword)
      await user.update({ passwordHash: newPasswordHash })

      // Mark token as used
      await token.update({ used: true })

      // Log security event
      await SecurityLogService.logFromContext(
        ctx,
        "PASSWORD_RESET" as any,
        "USER" as any,
        user.id,
        "SUCCESS" as any,
        "Password reset via email code"
      )

      ctx.body = {
        success: true,
        message: "Mot de passe réinitialisé avec succès",
      }

      logger.info("Password reset successfully", {
        userId: user.id,
        email: user.email,
      })
    } catch (error) {
      logger.warn("Password reset failed", {
        error: (error as Error).message,
      })
      throw error
    }
  }
}
