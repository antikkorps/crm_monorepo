import jwt from "jsonwebtoken"
import config from "../config/environment"
import { createError } from "../middleware/errorHandler"
import { User, UserRole } from "../models/User"
import { logger } from "../utils/logger"

export interface JwtPayload {
  userId: string
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export class AuthService {
  private static readonly ACCESS_TOKEN_SECRET = config.jwt.secret
  private static readonly REFRESH_TOKEN_SECRET = config.jwt.refreshSecret
  private static readonly ACCESS_TOKEN_EXPIRES_IN = config.jwt.expiresIn
  private static readonly REFRESH_TOKEN_EXPIRES_IN = config.jwt.refreshExpiresIn

  /**
   * Generate JWT access token
   */
  static generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      issuer: "medical-crm",
      audience: "medical-crm-users",
    })
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: "medical-crm",
      audience: "medical-crm-users",
    })
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokens(user: User): AuthTokens {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    }
  }

  /**
   * Verify JWT access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: "medical-crm",
        audience: "medical-crm-users",
      }) as JwtPayload
    } catch (error) {
      logger.warn("Invalid access token", { error: (error as Error).message })
      throw createError("Invalid or expired access token", 401, "INVALID_TOKEN")
    }
  }

  /**
   * Verify JWT refresh token
   */
  static verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        issuer: "medical-crm",
        audience: "medical-crm-users",
      }) as JwtPayload
    } catch (error) {
      logger.warn("Invalid refresh token", { error: (error as Error).message })
      throw createError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN")
    }
  }

  /**
   * Authenticate user with email and password
   */
  static async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password } = credentials

    // Find user by email
    const user = await User.findByEmail(email)
    if (!user) {
      logger.warn("Login attempt with non-existent email", { email })
      throw createError("Invalid email or password", 401, "INVALID_CREDENTIALS")
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn("Login attempt with inactive user", { userId: user.id, email })
      throw createError("Account is deactivated", 401, "ACCOUNT_DEACTIVATED")
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(password)
    if (!isPasswordValid) {
      logger.warn("Login attempt with invalid password", { userId: user.id, email })
      throw createError("Invalid email or password", 401, "INVALID_CREDENTIALS")
    }

    // Update last login timestamp
    await user.update({ lastLoginAt: new Date() })

    // Generate tokens
    const tokens = this.generateTokens(user)

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return { user, tokens }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const payload = this.verifyRefreshToken(refreshToken)

    // Find user
    const user = await User.findByPk(payload.userId)
    if (!user) {
      logger.warn("Refresh token for non-existent user", { userId: payload.userId })
      throw createError("User not found", 401, "USER_NOT_FOUND")
    }

    // Check if user is still active
    if (!user.isActive) {
      logger.warn("Refresh token for inactive user", { userId: user.id })
      throw createError("Account is deactivated", 401, "ACCOUNT_DEACTIVATED")
    }

    // Generate new tokens
    const tokens = this.generateTokens(user)

    logger.info("Token refreshed successfully", { userId: user.id })

    return tokens
  }

  /**
   * Get user from access token
   */
  static async getUserFromToken(token: string): Promise<User> {
    const payload = this.verifyAccessToken(token)

    const user = await User.findByPk(payload.userId)
    if (!user) {
      throw createError("User not found", 401, "USER_NOT_FOUND")
    }

    if (!user.isActive) {
      throw createError("Account is deactivated", 401, "ACCOUNT_DEACTIVATED")
    }

    return user
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null
    }

    const parts = authHeader.split(" ")
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null
    }

    return parts[1]
  }
}
