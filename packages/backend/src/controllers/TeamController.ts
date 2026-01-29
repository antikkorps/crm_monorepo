import { Context, Next } from "../types/koa"
import { Team } from "../models/Team"
import { User } from "../models/User"
import { Task } from "../models/Task"
import { Note } from "../models/Note"
import { Call } from "../models/Call"
import { Meeting } from "../models/Meeting"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { EngagementLetter } from "../models/EngagementLetter"
import { createError } from "../utils/logger"
import { Op } from "sequelize"

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

  /**
   * Get team activities
   * Aggregates tasks, notes, calls, and meetings from team members
   */
  public static async getTeamActivities(ctx: Context, next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const { limit = 20, page = 1, type } = ctx.query as {
        limit?: string
        page?: string
        type?: string
      }

      const team = await Team.findByPk(id)
      if (!team) {
        throw createError("Team not found", 404, "TEAM_NOT_FOUND", { teamId: id })
      }

      // Get all team members
      const members = await team.getMembers()
      const memberIds = members.map((m) => m.id)

      if (memberIds.length === 0) {
        ctx.body = {
          success: true,
          data: [],
          meta: {
            pagination: {
              page: 1,
              limit: parseInt(limit as string, 10),
              total: 0,
              totalPages: 0,
            },
          },
        }
        return
      }

      // Build activity array
      const activities: any[] = []
      const limitNum = parseInt(limit as string, 10)
      const pageNum = parseInt(page as string, 10)
      const offset = (pageNum - 1) * limitNum

      // Helper function to format activity
      const formatActivity = (
        item: any,
        type: string,
        description: string,
        userId: string
      ) => ({
        id: `${type}_${item.id}`,
        type,
        userId,
        description,
        timestamp: item.createdAt,
        user: item.user || item.creator || item.organizer,
        metadata: {
          ...(item.institution && { institutionName: item.institution.name }),
          ...(item.title && { taskTitle: item.title }),
        },
      })

      // Fetch activities based on type filter or all if no filter
      if (!type || type === "all" || type === "task") {
        const tasks = await Task.findAll({
          where: {
            [Op.or]: [{ assigneeId: { [Op.in]: memberIds } }, { creatorId: { [Op.in]: memberIds } }],
          },
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "firstName", "lastName", "avatarSeed"],
            },
            {
              model: MedicalInstitution,
              as: "institution",
              attributes: ["id", "name"],
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: limitNum * 2, // Get more to have enough after filtering
        })

        tasks.forEach((task) => {
          let activityType = "task_created"
          let description = `Created task "${task.title}"`

          if (task.status === "completed") {
            activityType = "task_completed"
            description = `Completed task "${task.title}"`
          } else if (task.assigneeId !== task.creatorId && task.assigneeId) {
            activityType = "task_assigned"
            description = `Assigned task "${task.title}"`
          }

          activities.push(
            formatActivity(task, activityType, description, task.creatorId)
          )
        })
      }

      // Track institution assignments
      if (!type || type === "all" || type === "institution") {
        const institutions = await MedicalInstitution.findAll({
          where: {
            assignedUserId: { [Op.in]: memberIds },
          },
          attributes: ["id", "name", "assignedUserId", "createdAt", "updatedAt"],
          order: [["updatedAt", "DESC"]],
          limit: limitNum,
        })

        for (const institution of institutions) {
          const assignedUser = members.find((m) => m.id === institution.assignedUserId)
          if (assignedUser) {
            activities.push({
              id: `institution_assigned_${institution.id}`,
              type: "institution_updated",
              userId: institution.assignedUserId || "",
              description: `Assigned to institution`,
              timestamp: institution.updatedAt,
              user: {
                id: assignedUser.id,
                firstName: assignedUser.firstName,
                lastName: assignedUser.lastName,
                avatarSeed: assignedUser.avatarSeed,
              },
              metadata: {
                institutionName: institution.name,
              },
            })
          }
        }
      }

      // Track meetings
      if (!type || type === "all" || type === "user") {
        const meetings = await Meeting.findAll({
          where: {
            organizerId: { [Op.in]: memberIds },
          },
          include: [
            {
              model: User,
              as: "organizer",
              attributes: ["id", "firstName", "lastName", "avatarSeed"],
            },
            {
              model: MedicalInstitution,
              as: "institution",
              attributes: ["id", "name"],
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: limitNum,
        })

        meetings.forEach((meeting) => {
          activities.push(
            formatActivity(
              meeting,
              "meeting_created",
              `Created meeting "${meeting.title}"`,
              meeting.organizerId
            )
          )
        })
      }

      // Track calls
      if (!type || type === "all" || type === "user") {
        const calls = await Call.findAll({
          where: {
            userId: { [Op.in]: memberIds },
          },
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "avatarSeed"],
            },
            {
              model: MedicalInstitution,
              as: "institution",
              attributes: ["id", "name"],
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: limitNum,
        })

        calls.forEach((call) => {
          activities.push(
            formatActivity(
              call,
              "call_created",
              `Made a call`,
              call.userId
            )
          )
        })
      }

      if (!type || type === "all" || type === "user") {
        const notes = await Note.findAll({
          where: {
            creatorId: { [Op.in]: memberIds },
          },
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "firstName", "lastName", "avatarSeed"],
            },
            {
              model: MedicalInstitution,
              as: "institution",
              attributes: ["id", "name"],
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: limitNum,
        })

        notes.forEach((note) => {
          activities.push(
            formatActivity(
              note,
              "note_created",
              `Created note "${note.title}"`,
              note.creatorId
            )
          )
        })
      }

      // Track engagement letters
      if (!type || type === "all" || type === "engagement_letter") {
        const engagementLetters = await EngagementLetter.findAll({
          where: {
            assignedUserId: { [Op.in]: memberIds },
          },
          include: [
            {
              model: User,
              as: "assignedUser",
              attributes: ["id", "firstName", "lastName", "avatarSeed"],
            },
            {
              model: MedicalInstitution,
              as: "institution",
              attributes: ["id", "name"],
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: limitNum,
        })

        engagementLetters.forEach((letter) => {
          let activityType = "engagement_letter_created"
          let description = `Created engagement letter "${letter.title}"`

          if (letter.status === "completed") {
            activityType = "engagement_letter_completed"
            description = `Completed engagement letter "${letter.title}"`
          } else if (letter.status === "accepted") {
            activityType = "engagement_letter_accepted"
            description = `Engagement letter "${letter.title}" accepted`
          } else if (letter.status === "rejected") {
            activityType = "engagement_letter_rejected"
            description = `Engagement letter "${letter.title}" rejected`
          } else if (letter.status === "sent") {
            activityType = "engagement_letter_sent"
            description = `Sent engagement letter "${letter.title}"`
          }

          activities.push({
            id: `${activityType}_${letter.id}`,
            type: activityType,
            userId: letter.assignedUserId || "",
            description,
            timestamp: letter.createdAt,
            user: letter.assignedUser,
            metadata: {
              ...(letter.institution && { institutionName: letter.institution.name }),
              ...(letter.estimatedTotal && { amount: letter.estimatedTotal }),
              letterNumber: letter.letterNumber,
            },
          })
        })
      }

      // Sort all activities by timestamp
      activities.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime()
        const dateB = new Date(b.timestamp).getTime()
        return dateB - dateA
      })

      // Paginate
      const paginatedActivities = activities.slice(offset, offset + limitNum)
      const totalActivities = activities.length

      ctx.body = {
        success: true,
        data: paginatedActivities,
        meta: {
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalActivities,
            totalPages: Math.ceil(totalActivities / limitNum),
            hasMore: offset + limitNum < totalActivities,
          },
        },
      }
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error) throw error
      throw createError("Failed to fetch team activities", 500, "FETCH_ACTIVITIES_ERROR", {
        error,
      })
    }
  }
}
