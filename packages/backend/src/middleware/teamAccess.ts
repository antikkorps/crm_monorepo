import { Context, Next } from "../types/koa"
import { User } from "../models/User"
import { createError } from "./errorHandler"
import { logger } from "../utils/logger"

/**
 * Team-based access control middleware for collaboration features
 * This ensures users can only access resources from their own team or shared resources
 */
export function validateTeamAccess(resourceType: 'note' | 'meeting' | 'call' | 'reminder' | 'comment') {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User
    const resourceId = ctx.params.id

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    // Super admins can access everything
    if (user.role === 'super_admin') {
      await next()
      return
    }

    // If no resource ID, this is likely a list endpoint - apply team filtering
    if (!resourceId) {
      ctx.state.teamFilter = {
        userId: user.id,
        teamId: user.teamId,
        role: user.role,
      }
      await next()
      return
    }

    try {
      let resource: any
      let resourceOwnerId: string | null = null
      let resourceTeamId: string | null = null

      switch (resourceType) {
        case 'note':
          const { Note } = await import("../models/Note")
          resource = await Note.findByPk(resourceId, {
            include: [
              {
                model: User,
                as: "creator",
                attributes: ["id", "teamId"],
              },
            ],
          })
          if (resource) {
            resourceOwnerId = resource.creatorId
            resourceTeamId = resource.creator?.teamId
          }
          break

        case 'meeting':
          const { Meeting } = await import("../models/Meeting")
          resource = await Meeting.findByPk(resourceId, {
            include: [
              {
                model: User,
                as: "organizer",
                attributes: ["id", "teamId"],
              },
            ],
          })
          if (resource) {
            resourceOwnerId = resource.organizerId
            resourceTeamId = resource.organizer?.teamId
          }
          break

        case 'call':
          const { Call } = await import("../models/Call")
          resource = await Call.findByPk(resourceId, {
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "teamId"],
              },
            ],
          })
          if (resource) {
            resourceOwnerId = resource.userId
            resourceTeamId = resource.user?.teamId
          }
          break

        case 'reminder':
          const { Reminder } = await import("../models/Reminder")
          resource = await Reminder.findByPk(resourceId, {
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "teamId"],
              },
            ],
          })
          if (resource) {
            resourceOwnerId = resource.userId
            resourceTeamId = resource.user?.teamId
          }
          break

        case 'comment':
          const { Comment } = await import("../models/Comment")
          resource = await Comment.findByPk(resourceId, {
            include: [
              {
                model: User,
                as: "author",
                attributes: ["id", "teamId"],
              },
            ],
          })
          if (resource) {
            resourceOwnerId = resource.authorId
            resourceTeamId = resource.author?.teamId
          }
          break
      }

      if (!resource) {
        throw createError(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found`, 404, "RESOURCE_NOT_FOUND")
      }

      // User can access their own resources
      if (resourceOwnerId === user.id) {
        await next()
        return
      }

      // Team admins can access resources from their team members
      if (user.role === 'team_admin' && user.teamId && resourceTeamId === user.teamId) {
        await next()
        return
      }

      // Check for special sharing permissions for notes
      if (resourceType === 'note') {
        const canAccess = await resource.canUserAccess(user.id)
        if (canAccess) {
          await next()
          return
        }
      }

      // Check for meeting participation
      if (resourceType === 'meeting') {
        const { MeetingParticipant } = await import("../models/MeetingParticipant")
        const participant = await MeetingParticipant.findOne({
          where: { meetingId: resourceId, userId: user.id }
        })
        if (participant) {
          await next()
          return
        }
      }

      // Regular users can only access their own team's resources or shared resources
      if (user.teamId && resourceTeamId === user.teamId) {
        await next()
        return
      }

      logger.warn("Team access denied", {
        userId: user.id,
        userTeamId: user.teamId,
        userRole: user.role,
        resourceType,
        resourceId,
        resourceOwnerId,
        resourceTeamId,
        path: ctx.path,
        method: ctx.method,
      })

      throw createError(
        `Access denied: You can only access ${resourceType}s from your team`,
        403,
        "TEAM_ACCESS_DENIED",
        {
          resourceType,
          resourceId,
          userTeamId: user.teamId,
          resourceTeamId,
        }
      )

    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        throw error
      }
      throw createError(
        `Error validating team access for ${resourceType}`,
        500,
        "TEAM_ACCESS_VALIDATION_ERROR"
      )
    }
  }
}

/**
 * Middleware to filter collaboration resources by team membership for list endpoints
 */
export function applyTeamFiltering() {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    // Super admins can see everything - no filtering needed
    if (user.role === 'super_admin') {
      await next()
      return
    }

    // Add team filtering context for controllers to use
    ctx.state.teamFilter = {
      userId: user.id,
      teamId: user.teamId,
      role: user.role,
      // Team admins can see all team resources, regular users only their own + shared
      canViewTeamResources: user.role === 'team_admin' || user.role === 'admin',
    }

    await next()
  }
}

/**
 * Middleware to validate shared resource permissions for collaboration features
 */
export function validateSharedResourcePermission(resourceType: 'note' | 'meeting') {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User
    const resourceId = ctx.params.id

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    // Super admins can access everything
    if (user.role === 'super_admin') {
      await next()
      return
    }

    if (!resourceId) {
      await next()
      return
    }

    try {
      let hasAccess = false

      switch (resourceType) {
        case 'note':
          const { Note } = await import("../models/Note")
          const note = await Note.findByPk(resourceId)
          if (note) {
            hasAccess = await note.canUserAccess(user.id)
          }
          break

        case 'meeting':
          const { Meeting } = await import("../models/Meeting")
          const { MeetingParticipant } = await import("../models/MeetingParticipant")
          const meeting = await Meeting.findByPk(resourceId)
          if (meeting) {
            // Check if user is organizer
            if (meeting.organizerId === user.id) {
              hasAccess = true
            } else {
              // Check if user is a participant
              const participant = await MeetingParticipant.findOne({
                where: { meetingId: resourceId, userId: user.id }
              })
              hasAccess = !!participant
            }
          }
          break
      }

      if (!hasAccess) {
        throw createError(
          `Access denied: You don't have permission to access this ${resourceType}`,
          403,
          "SHARED_RESOURCE_ACCESS_DENIED",
          {
            resourceType,
            resourceId,
            userId: user.id,
          }
        )
      }

      await next()
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        throw error
      }
      throw createError(
        `Error validating shared resource access for ${resourceType}`,
        500,
        "SHARED_RESOURCE_ACCESS_ERROR"
      )
    }
  }
}

/**
 * Middleware to ensure users can only share resources with team members
 */
export function validateTeamMemberSharing() {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User
    const shareData = ctx.request.body as any

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    // Super admins can share with anyone
    if (user.role === 'super_admin') {
      await next()
      return
    }

    // Extract target user ID from various possible locations
    const targetUserId = shareData?.userId || shareData?.targetUserId || ctx.params.userId

    if (targetUserId) {
      try {
        const targetUser = await User.findByPk(targetUserId)

        if (!targetUser) {
          throw createError("Target user not found", 404, "TARGET_USER_NOT_FOUND")
        }

        // Team admins can share with anyone in their team
        if (user.role === 'team_admin') {
          if (user.teamId && targetUser.teamId !== user.teamId) {
            throw createError(
              "You can only share resources with members of your team",
              403,
              "CROSS_TEAM_SHARING_DENIED",
              {
                userTeamId: user.teamId,
                targetUserTeamId: targetUser.teamId,
              }
            )
          }
        } else {
          // Regular users can only share within their team
          if (user.teamId && targetUser.teamId !== user.teamId) {
            throw createError(
              "You can only share resources with members of your team",
              403,
              "CROSS_TEAM_SHARING_DENIED",
              {
                userTeamId: user.teamId,
                targetUserTeamId: targetUser.teamId,
              }
            )
          }
        }
      } catch (error) {
        if (error && typeof error === "object" && "code" in error) {
          throw error
        }
        throw createError(
          "Error validating team member sharing",
          500,
          "TEAM_SHARING_VALIDATION_ERROR"
        )
      }
    }

    await next()
  }
}

/**
 * Utility function to check if a user belongs to the same team as the resource owner
 */
export async function isTeamMember(userId: string, resourceOwnerId: string): Promise<boolean> {
  try {
    const [user, resourceOwner] = await Promise.all([
      User.findByPk(userId, { attributes: ['id', 'teamId'] }),
      User.findByPk(resourceOwnerId, { attributes: ['id', 'teamId'] }),
    ])

    if (!user || !resourceOwner) {
      return false
    }

    return user.teamId === resourceOwner.teamId && user.teamId !== null
  } catch (error) {
    logger.error("Error checking team membership", { error, userId, resourceOwnerId })
    return false
  }
}

/**
 * Utility function to get team-based filtering conditions for Sequelize queries
 */
export function getTeamFilterConditions(user: User, includeShared: boolean = true) {
    if (user.role === 'super_admin') {
    // Super admins see everything
    return {}
  }

  const conditions: any = {
    $or: []
  }

  // Always include user's own resources
  conditions.$or.push({ creatorId: user.id })
  conditions.$or.push({ organizerId: user.id })
  conditions.$or.push({ userId: user.id })
  conditions.$or.push({ authorId: user.id })

  // Team admins and admins can see team resources
  if ((user.role === 'team_admin' || user.role === 'admin') && user.teamId) {
    // Add team-based filtering through joins or subqueries
    // This would need to be implemented in each specific controller
  }

  // Include public/shared resources if requested
  if (includeShared) {
    conditions.$or.push({ isPrivate: false })
  }

  return conditions
}
