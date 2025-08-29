import { Context, Next } from "koa"
import { Team } from "../models/Team"
import { User } from "../models/User"
import { createError } from "../utils/logger"

export class TeamController {
  /**
   * Get all teams
   */
  public static async getTeams(ctx: Context, next: Next): Promise<void> {
    try {
      const teams = await Team.getActiveTeams()

      // Add member count to each team
      const teamsWithCounts = await Promise.all(
        teams.map(async (team) => ({
          ...team.toJSON(),
          memberCount: await team.getMemberCount(),
        }))
      )

      ctx.body = {
        success: true,
        data: teamsWithCounts,
      }
    } catch (error) {
      throw createError("Failed to fetch teams", 500, "FETCH_TEAMS_ERROR", { error })
    }
  }

  /**
   * Get team by ID
   */
  public static async getTeam(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const team = await Team.findByPk(id)
      if (!team) {
        throw createError("Team not found", 404, "TEAM_NOT_FOUND", { teamId: id })
      }

      const members = await team.getActiveMembers()
      const memberCount = await team.getMemberCount()

      ctx.body = {
        success: true,
        data: {
          ...team.toJSON(),
          members,
          memberCount,
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to fetch team", 500, "FETCH_TEAM_ERROR", { error })
    }
  }

  /**
   * Create new team
   */
  public static async createTeam(ctx: Context, next: Next): Promise<void> {
    try {
      const { name, description } = ctx.request.body as {
        name: string
        description?: string
      }

      // Validate required fields
      if (!name || name.trim().length === 0) {
        throw createError("Team name is required", 400, "VALIDATION_ERROR", {
          field: "name",
        })
      }

      // Check if team name already exists
      const existingTeam = await Team.findByName(name.trim())
      if (existingTeam) {
        throw createError("Team name already exists", 409, "TEAM_NAME_EXISTS", {
          name: name.trim(),
        })
      }

      const team = await Team.createTeam({
        name: name.trim(),
        description: description?.trim(),
      })

      ctx.status = 201
      ctx.body = {
        success: true,
        data: {
          ...team.toJSON(),
          memberCount: 0,
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to create team", 500, "CREATE_TEAM_ERROR", { error })
    }
  }

  /**
   * Update team
   */
  public static async updateTeam(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const { name, description, isActive } = ctx.request.body as {
        name?: string
        description?: string
        isActive?: boolean
      }

      const team = await Team.findByPk(id)
      if (!team) {
        throw createError("Team not found", 404, "TEAM_NOT_FOUND", { teamId: id })
      }

      // Check if new name conflicts with existing team
      if (name && name.trim() !== team.name) {
        const existingTeam = await Team.findByName(name.trim())
        if (existingTeam) {
          throw createError("Team name already exists", 409, "TEAM_NAME_EXISTS", {
            name: name.trim(),
          })
        }
        team.name = name.trim()
      }

      if (description !== undefined) {
        team.description = description?.trim() || undefined
      }

      if (isActive !== undefined) {
        team.isActive = isActive
      }

      await team.save()

      const memberCount = await team.getMemberCount()

      ctx.body = {
        success: true,
        data: {
          ...team.toJSON(),
          memberCount,
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to update team", 500, "UPDATE_TEAM_ERROR", { error })
    }
  }

  /**
   * Delete team
   */
  public static async deleteTeam(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const team = await Team.findByPk(id)
      if (!team) {
        throw createError("Team not found", 404, "TEAM_NOT_FOUND", { teamId: id })
      }

      // Check if team has members
      const memberCount = await team.getMemberCount()
      if (memberCount > 0) {
        throw createError(
          "Cannot delete team with active members",
          400,
          "TEAM_HAS_MEMBERS",
          { memberCount }
        )
      }

      await team.destroy()

      ctx.status = 204
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to delete team", 500, "DELETE_TEAM_ERROR", { error })
    }
  }

  /**
   * Get team members
   */
  public static async getTeamMembers(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const team = await Team.findByPk(id)
      if (!team) {
        throw createError("Team not found", 404, "TEAM_NOT_FOUND", { teamId: id })
      }

      const members = await team.getMembers()

      ctx.body = {
        success: true,
        data: members,
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to fetch team members", 500, "FETCH_MEMBERS_ERROR", {
        error,
      })
    }
  }

  /**
   * Add member to team
   */
  public static async addTeamMember(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const { userId } = ctx.request.body as { userId: string }

      if (!userId) {
        throw createError("User ID is required", 400, "VALIDATION_ERROR", {
          field: "userId",
        })
      }

      const team = await Team.findByPk(id)
      if (!team) {
        throw createError("Team not found", 404, "TEAM_NOT_FOUND", { teamId: id })
      }

      const user = await User.findByPk(userId)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId })
      }

      if (user.teamId === id) {
        throw createError(
          "User is already a member of this team",
          409,
          "USER_ALREADY_MEMBER",
          {
            userId,
            teamId: id,
          }
        )
      }

      await user.assignToTeam(id)

      ctx.body = {
        success: true,
        data: {
          message: "User added to team successfully",
          user: user.toJSON(),
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to add team member", 500, "ADD_MEMBER_ERROR", { error })
    }
  }

  /**
   * Remove member from team
   */
  public static async removeTeamMember(ctx: Context, next: Next): Promise<void> {
    try {
      const { id, userId } = ctx.params

      const team = await Team.findByPk(id)
      if (!team) {
        throw createError("Team not found", 404, "TEAM_NOT_FOUND", { teamId: id })
      }

      const user = await User.findByPk(userId)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND", { userId })
      }

      if (user.teamId !== id) {
        throw createError("User is not a member of this team", 400, "USER_NOT_MEMBER", {
          userId,
          teamId: id,
        })
      }

      await user.removeFromTeam()

      ctx.body = {
        success: true,
        data: {
          message: "User removed from team successfully",
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to remove team member", 500, "REMOVE_MEMBER_ERROR", {
        error,
      })
    }
  }
}
