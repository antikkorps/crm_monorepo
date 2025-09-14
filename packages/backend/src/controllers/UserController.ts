import { Context, Next } from "../types/koa"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Team } from "../models/Team"
import { User, UserRole } from "../models/User"
import { AvatarService } from "../services/AvatarService"
import { createError } from "../utils/logger"

export class UserController {
  /**
   * Get all users
   */
  public static async getUsers(ctx: Context, next: Next): Promise<void> {
    try {
      const { teamId, role, isActive } = ctx.query

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

      ctx.body = {
        success: true,
        data: users,
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
}
