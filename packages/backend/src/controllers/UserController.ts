import { Context, Next } from "../types/koa"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Team } from "../models/Team"
import { User, UserRole } from "../models/User"
import { PasswordResetToken } from "../models/PasswordResetToken"
import { AvatarService } from "../services/AvatarService"
import { EmailService } from "../services/EmailService"
import { createError, logger } from "../utils/logger"

export class UserController {
  /**
   * Get all users
   */
  public static async getUsers(ctx: Context, next: Next): Promise<void> {
    try {
      const user = ctx.state.user as User
      const { teamId, role, isActive } = ctx.query

      // Check permissions - only admins can list all users
      if (!user.role || (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN)) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only administrators can list all users",
          },
        }
        return
      }

      const whereClause: any = {}

      if (teamId) {
        whereClause.teamId = teamId
      }

      if (role) {
        whereClause.role = role
      }

      if (isActive !== undefined) {
        whereClause.isActive = isActive === "true"
      }

      const users = await User.findAll({
        where: whereClause,
        attributes: { exclude: ["passwordHash"] },
        order: [
          ["firstName", "ASC"],
          ["lastName", "ASC"],
        ],
      })

      // Apply toJSON() to each user to include avatarUrl
      const usersWithAvatar = users.map(user => user.toJSON())

      ctx.body = {
        success: true,
        data: usersWithAvatar,
      }
    } catch (error) {
      throw createError("Failed to fetch users", 500, "FETCH_USERS_ERROR", { error })
    }
  }

  /**
   * Get user by ID
   */
  public static async getUser(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const user = await User.findByPk(id, {
        attributes: { exclude: ["passwordHash"] },
      })

      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId: id })
      }

      // Get user's team if they have one
      const team = await user.getTeam()

      ctx.body = {
        success: true,
        data: {
          ...user.toJSON(),
          team,
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to fetch user", 500, "FETCH_USER_ERROR", { error })
    }
  }

  /**
   * Update user profile
   */
  public static async updateUser(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const { firstName, lastName, email, role, teamId, isActive } = ctx.request.body as {
        firstName?: string
        lastName?: string
        email?: string
        role?: UserRole
        teamId?: string
        isActive?: boolean
      }

      const user = await User.findByPk(id)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId: id })
      }

      // Check if email is being changed and if it conflicts
      if (email && email.toLowerCase() !== user.email) {
        const existingUser = await User.findByEmail(email)
        if (existingUser) {
          throw createError("Email already exists", 409, "EMAIL_EXISTS", { email })
        }
        user.email = email.toLowerCase()
      }

      // Update name fields and regenerate avatar seed if names changed
      let nameChanged = false
      if (firstName && firstName.trim() !== user.firstName) {
        user.firstName = firstName.trim()
        nameChanged = true
      }
      if (lastName && lastName.trim() !== user.lastName) {
        user.lastName = lastName.trim()
        nameChanged = true
      }

      if (nameChanged) {
        user.avatarSeed = AvatarService.generateSeedFromName(
          user.firstName,
          user.lastName
        )
      }

      if (role && Object.values(UserRole).includes(role)) {
        user.role = role
      }

      if (teamId !== undefined) {
        if (teamId === null || teamId === "") {
          user.teamId = undefined
        } else {
          // Verify team exists
          const team = await Team.findByPk(teamId)
          if (!team) {
            throw createError("Team not found", 404, "TEAM_NOT_FOUND", { teamId })
          }
          user.teamId = teamId
        }
      }

      if (isActive !== undefined) {
        user.isActive = isActive
      }

      await user.save()

      // Get updated user with team info
      const team = await user.getTeam()

      ctx.body = {
        success: true,
        data: {
          ...user.toJSON(),
          team,
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to update user", 500, "UPDATE_USER_ERROR", { error })
    }
  }

  /**
   * Get user's avatar
   */
  public static async getUserAvatar(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const { style, size } = ctx.query

      const user = await User.findByPk(id)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId: id })
      }

      const avatarOptions: any = {}
      if (style && AvatarService.isValidStyle(style as string)) {
        avatarOptions.style = style
      }
      if (size && !isNaN(Number(size))) {
        avatarOptions.size = Number(size)
      }

      const avatarMetadata = user.getAvatarMetadata(avatarOptions.style)

      ctx.body = {
        success: true,
        data: {
          ...avatarMetadata,
          url: AvatarService.generateAvatarFromSeed(user.avatarSeed, avatarOptions),
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to get user avatar", 500, "GET_AVATAR_ERROR", { error })
    }
  }

  /**
   * Update user's avatar
   */
  public static async updateUserAvatar(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const { forceNew, avatarSeed } = ctx.request.body as {
        forceNew?: boolean
        avatarSeed?: string
      }

      const user = await User.findByPk(id)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId: id })
      }

      if (avatarSeed) {
        // Update with specific seed
        user.avatarSeed = avatarSeed
        await user.save()
      } else {
        // Generate new seed
        await user.updateAvatarSeed(forceNew || false)
      }

      const avatarMetadata = user.getAvatarMetadata()

      ctx.body = {
        success: true,
        data: {
          message: "Avatar updated successfully",
          avatar: avatarMetadata,
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to update user avatar", 500, "UPDATE_AVATAR_ERROR", {
        error,
      })
    }
  }

  /**
   * Update current user's profile
   */
  public static async updateCurrentUserProfile(ctx: Context, next: Next): Promise<void> {
    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        throw createError("Unauthorized", 401, "UNAUTHORIZED")
      }

      const { firstName, lastName, email, avatarSeed, avatarStyle } = ctx.request.body as {
        firstName?: string
        lastName?: string
        email?: string
        avatarSeed?: string
        avatarStyle?: string
      }

      const user = await User.findByPk(userId)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId })
      }

      // Check if email is being changed and if it conflicts
      if (email && email.toLowerCase() !== user.email) {
        const existingUser = await User.findByEmail(email)
        if (existingUser) {
          throw createError("Email already exists", 409, "EMAIL_EXISTS", { email })
        }
        user.email = email.toLowerCase()
      }

      // Update name fields and regenerate avatar seed if names changed (unless custom seed provided)
      let nameChanged = false
      if (firstName && firstName.trim() !== user.firstName) {
        user.firstName = firstName.trim()
        nameChanged = true
      }
      if (lastName && lastName.trim() !== user.lastName) {
        user.lastName = lastName.trim()
        nameChanged = true
      }

      // Update avatar seed and style
      if (avatarSeed) {
        user.avatarSeed = avatarSeed
      } else if (nameChanged) {
        user.avatarSeed = AvatarService.generateSeedFromName(
          user.firstName,
          user.lastName
        )
      }

      if (avatarStyle && AvatarService.isValidStyle(avatarStyle)) {
        user.avatarStyle = avatarStyle
      }

      await user.save()

      // Get user with team info
      const team = await user.getTeam()

      ctx.body = {
        success: true,
        data: {
          message: "Profile updated successfully",
          user: {
            ...user.toJSON(),
            team,
          },
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to update profile", 500, "UPDATE_PROFILE_ERROR", { error })
    }
  }

  /**
   * Change current user's password
   */
  public static async changePassword(ctx: Context, next: Next): Promise<void> {
    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        throw createError("Unauthorized", 401, "UNAUTHORIZED")
      }

      const { currentPassword, newPassword } = ctx.request.body as {
        currentPassword: string
        newPassword: string
      }

      if (!currentPassword || !newPassword) {
        throw createError(
          "Current password and new password are required",
          400,
          "VALIDATION_ERROR",
          { field: "password" }
        )
      }

      const user = await User.findByPk(userId)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId })
      }

      // Verify current password
      const isCurrentPasswordValid = await user.validatePassword(currentPassword)
      if (!isCurrentPasswordValid) {
        throw createError(
          "Current password is incorrect",
          400,
          "INVALID_CURRENT_PASSWORD",
          { field: "currentPassword" }
        )
      }

      // Validate new password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/
      if (!passwordRegex.test(newPassword)) {
        throw createError(
          "New password does not meet security requirements",
          400,
          "WEAK_PASSWORD",
          { field: "newPassword" }
        )
      }

      // Hash and save new password
      user.passwordHash = await User.hashPassword(newPassword)
      await user.save()

      ctx.body = {
        success: true,
        data: {
          message: "Password changed successfully",
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to change password", 500, "CHANGE_PASSWORD_ERROR", { error })
    }
  }

  /**
   * Get current user's profile
   */
  public static async getCurrentUserProfile(ctx: Context, next: Next): Promise<void> {
    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        throw createError("Unauthorized", 401, "UNAUTHORIZED")
      }

      const user = await User.findByPk(userId, {
        attributes: { exclude: ["passwordHash"] },
      })

      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId })
      }

      // Get user's team if they have one
      const team = await user.getTeam()

      ctx.body = {
        success: true,
        data: {
          ...user.toJSON(),
          team,
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to fetch profile", 500, "FETCH_PROFILE_ERROR", { error })
    }
  }

  /**
   * Get users without team
   */
  public static async getUsersWithoutTeam(ctx: Context, next: Next): Promise<void> {
    try {
      const users = await User.findWithoutTeam()

      ctx.body = {
        success: true,
        data: users,
      }
    } catch (error) {
      throw createError("Failed to fetch users without team", 500, "FETCH_USERS_ERROR", {
        error,
      })
    }
  }

  /**
   * Assign medical institutions to user (territory assignment)
   */
  public static async assignInstitutions(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const { institutionIds } = ctx.request.body as { institutionIds: string[] }

      if (!Array.isArray(institutionIds)) {
        throw createError("Institution IDs must be an array", 400, "VALIDATION_ERROR", {
          field: "institutionIds",
        })
      }

      const user = await User.findByPk(id)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId: id })
      }

      // Verify all institutions exist
      const institutions = await MedicalInstitution.findAll({
        where: { id: institutionIds },
      })

      if (institutions.length !== institutionIds.length) {
        const foundIds = institutions.map((inst) => inst.id)
        const missingIds = institutionIds.filter((id) => !foundIds.includes(id))
        throw createError("Some institutions not found", 404, "INSTITUTIONS_NOT_FOUND", {
          missingIds,
        })
      }

      // Update institutions to assign them to the user
      await MedicalInstitution.update(
        { assignedUserId: id },
        { where: { id: institutionIds } }
      )

      // Get updated institutions
      const updatedInstitutions = await MedicalInstitution.findAll({
        where: { assignedUserId: id },
      })

      ctx.body = {
        success: true,
        data: {
          message: "Institutions assigned successfully",
          assignedInstitutions: updatedInstitutions,
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError(
        "Failed to assign institutions",
        500,
        "ASSIGN_INSTITUTIONS_ERROR",
        { error }
      )
    }
  }

  /**
   * Get user's assigned medical institutions
   */
  public static async getUserInstitutions(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const user = await User.findByPk(id)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId: id })
      }

      const institutions = await MedicalInstitution.findAll({
        where: { assignedUserId: id },
        order: [["name", "ASC"]],
      })

      ctx.body = {
        success: true,
        data: institutions,
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError(
        "Failed to fetch user institutions",
        500,
        "FETCH_INSTITUTIONS_ERROR",
        { error }
      )
    }
  }

  /**
   * Remove institution assignments from user
   */
  public static async removeInstitutionAssignments(
    ctx: Context,
    next: Next
  ): Promise<void> {
    try {
      const { id } = ctx.params
      const { institutionIds } = ctx.request.body as { institutionIds: string[] }

      if (!Array.isArray(institutionIds)) {
        throw createError("Institution IDs must be an array", 400, "VALIDATION_ERROR", {
          field: "institutionIds",
        })
      }

      const user = await User.findByPk(id)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId: id })
      }

      // Remove assignments by setting assignedUserId to null
      await MedicalInstitution.update(
        { assignedUserId: undefined },
        {
          where: {
            id: institutionIds,
            assignedUserId: id,
          },
        }
      )

      ctx.body = {
        success: true,
        data: {
          message: "Institution assignments removed successfully",
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError(
        "Failed to remove institution assignments",
        500,
        "REMOVE_ASSIGNMENTS_ERROR",
        { error }
      )
    }
  }

  /**
   * Validate password strength
   * @private
   */
  private static validatePasswordStrength(password: string): void {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/
    if (!passwordRegex.test(password)) {
      throw createError(
        'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (!@#$%^&*(),.?":{}|<>)',
        400,
        "WEAK_PASSWORD"
      )
    }
  }

  /**
   * Create a new user (super admin only)
   */
  public static async createUser(ctx: Context): Promise<void> {
    try {
      const currentUser = ctx.state.user as User

      // Only super admins can create users
      if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw createError(
          "Only super admins can create users",
          403,
          "INSUFFICIENT_PERMISSIONS"
        )
      }

      const { email, firstName, lastName, password, role, teamId } = ctx.request.body as {
        email: string
        firstName: string
        lastName: string
        password: string
        role?: UserRole
        teamId?: string
      }

      // Validate required fields
      if (!email || !firstName || !lastName || !password) {
        throw createError(
          "Email, first name, last name, and password are required",
          400,
          "VALIDATION_ERROR"
        )
      }

      // Check if email already exists
      const existingUser = await User.findByEmail(email)
      if (existingUser) {
        throw createError("Email already exists", 409, "EMAIL_EXISTS", { email })
      }

      // Validate password strength
      UserController.validatePasswordStrength(password)

      // Validate role if provided
      const userRole = role && Object.values(UserRole).includes(role) ? role : UserRole.USER

      // Validate team if provided
      if (teamId) {
        const team = await Team.findByPk(teamId)
        if (!team) {
          throw createError("Team not found", 404, "TEAM_NOT_FOUND", { teamId })
        }
      }

      // Hash password
      const passwordHash = await User.hashPassword(password)

      // Generate avatar seed from name
      const avatarSeed = AvatarService.generateSeedFromName(firstName, lastName)

      // Create user
      const user = await User.create({
        email: email.toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        passwordHash,
        role: userRole,
        teamId: teamId || undefined,
        avatarSeed,
        avatarStyle: "avataaars",
        isActive: true,
      })

      // Get user with team info
      const team = await user.getTeam()

      ctx.status = 201
      ctx.body = {
        success: true,
        data: {
          message: "User created successfully",
          user: {
            ...user.toJSON(),
            team,
          },
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to create user", 500, "CREATE_USER_ERROR", { error })
    }
  }

  /**
   * Reset user password (super admin only)
   */
  public static async resetUserPassword(ctx: Context): Promise<void> {
    try {
      const currentUser = ctx.state.user as User

      // Only super admins can reset passwords
      if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw createError(
          "Only super admins can reset user passwords",
          403,
          "INSUFFICIENT_PERMISSIONS"
        )
      }

      const { id } = ctx.params
      const { newPassword } = ctx.request.body as {
        newPassword: string
      }

      if (!newPassword) {
        throw createError("New password is required", 400, "VALIDATION_ERROR")
      }

      const user = await User.findByPk(id)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId: id })
      }

      // Validate password strength
      UserController.validatePasswordStrength(newPassword)

      // Hash and save new password
      user.passwordHash = await User.hashPassword(newPassword)
      await user.save()

      ctx.body = {
        success: true,
        data: {
          message: `Password reset successfully for user ${user.getFullName()}`,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to reset password", 500, "RESET_PASSWORD_ERROR", { error })
    }
  }

  /**
   * Send invitation email to a user
   * Creates an invitation token and sends an email with a link to set password
   */
  public static async sendInvitation(ctx: Context): Promise<void> {
    try {
      const currentUser = ctx.state.user as User

      // Only super admins can send invitations
      if (currentUser.role !== UserRole.SUPER_ADMIN) {
        throw createError(
          "Seuls les super administrateurs peuvent envoyer des invitations",
          403,
          "INSUFFICIENT_PERMISSIONS"
        )
      }

      const { id } = ctx.params

      const user = await User.findByPk(id)
      if (!user) {
        throw createError("Utilisateur non trouvé", 404, "USER_NOT_FOUND", { userId: id })
      }

      // Generate 6-digit code (same format as password reset)
      const code = Math.floor(100000 + Math.random() * 900000).toString()

      // Expire in 24 hours (longer than password reset)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      // Invalidate any existing tokens for this user
      await PasswordResetToken.update(
        { used: true },
        { where: { userId: user.id, used: false } }
      )

      // Create new invitation token
      await PasswordResetToken.create({
        userId: user.id,
        code,
        expiresAt,
        used: false,
      })

      // Send invitation email
      const emailService = new EmailService()
      const inviterName = currentUser.getFullName()
      const result = await emailService.sendInvitationEmail(
        user.email,
        user.firstName,
        inviterName,
        code
      )

      if (!result.success) {
        throw createError(
          "Échec de l'envoi de l'email d'invitation",
          500,
          "EMAIL_SEND_FAILED",
          { error: result.error }
        )
      }

      logger.info("Invitation email sent", {
        userId: user.id,
        email: user.email,
        invitedBy: currentUser.id,
      })

      ctx.body = {
        success: true,
        data: {
          message: `Invitation envoyée à ${user.email}`,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Échec de l'envoi de l'invitation", 500, "SEND_INVITATION_ERROR", { error })
    }
  }
}
