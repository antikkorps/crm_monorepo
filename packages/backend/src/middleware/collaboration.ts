import { SharePermission } from "@medical-crm/shared"
import { Context, Next } from "../types/koa"
import { User } from "../models/User"
import { createError } from "./errorHandler"
import { ROLE_PERMISSIONS } from "./permissions"
import { logger } from "../utils/logger"

/**
 * Collaboration-specific permissions interface
 */
interface CollaborationPermissions {
  // Notes
  canCreateNotes: boolean
  canEditAllNotes: boolean
  canEditOwnNotes: boolean
  canEditSharedNotes: boolean
  canDeleteNotes: boolean
  canShareNotes: boolean
  canViewAllNotes: boolean
  canViewOwnNotes: boolean
  canViewSharedNotes: boolean

  // Meetings
  canCreateMeetings: boolean
  canEditAllMeetings: boolean
  canEditOwnMeetings: boolean
  canDeleteMeetings: boolean
  canInviteParticipants: boolean
  canViewAllMeetings: boolean
  canViewOwnMeetings: boolean
  canViewInvitedMeetings: boolean

  // Comments
  canCreateComments: boolean
  canEditAllComments: boolean
  canEditOwnComments: boolean
  canDeleteComments: boolean
  canViewComments: boolean

  // Calls
  canCreateCalls: boolean
  canEditAllCalls: boolean
  canEditOwnCalls: boolean
  canDeleteCalls: boolean
  canViewAllCalls: boolean
  canViewOwnCalls: boolean

  // Reminders
  canCreateReminders: boolean
  canEditAllReminders: boolean
  canEditOwnReminders: boolean
  canDeleteReminders: boolean
  canViewAllReminders: boolean
  canViewOwnReminders: boolean
}

/**
 * Collaboration Role Permission Matrix
 */
export const COLLABORATION_PERMISSIONS: Record<string, CollaborationPermissions> = {
  SUPER_ADMIN: {
    // Notes - Full Access
    canCreateNotes: true,
    canEditAllNotes: true,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: true,
    canShareNotes: true,
    canViewAllNotes: true,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Meetings - Full Access
    canCreateMeetings: true,
    canEditAllMeetings: true,
    canEditOwnMeetings: true,
    canDeleteMeetings: true,
    canInviteParticipants: true,
    canViewAllMeetings: true,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Comments - Full Access
    canCreateComments: true,
    canEditAllComments: true,
    canEditOwnComments: true,
    canDeleteComments: true,
    canViewComments: true,

    // Calls - Full Access
    canCreateCalls: true,
    canEditAllCalls: true,
    canEditOwnCalls: true,
    canDeleteCalls: true,
    canViewAllCalls: true,
    canViewOwnCalls: true,

    // Reminders - Full Access
    canCreateReminders: true,
    canEditAllReminders: true,
    canEditOwnReminders: true,
    canDeleteReminders: true,
    canViewAllReminders: true,
    canViewOwnReminders: true,
  },

  TEAM_ADMIN: {
    // Notes - Full team access
    canCreateNotes: true,
    canEditAllNotes: true,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: true,
    canShareNotes: true,
    canViewAllNotes: true,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Meetings - Full team access
    canCreateMeetings: true,
    canEditAllMeetings: true,
    canEditOwnMeetings: true,
    canDeleteMeetings: true,
    canInviteParticipants: true,
    canViewAllMeetings: true,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Comments - Full team access
    canCreateComments: true,
    canEditAllComments: true,
    canEditOwnComments: true,
    canDeleteComments: true,
    canViewComments: true,

    // Calls - Full team access
    canCreateCalls: true,
    canEditAllCalls: true,
    canEditOwnCalls: true,
    canDeleteCalls: true,
    canViewAllCalls: true,
    canViewOwnCalls: true,

    // Reminders - Full team access
    canCreateReminders: true,
    canEditAllReminders: true,
    canEditOwnReminders: true,
    canDeleteReminders: true,
    canViewAllReminders: true,
    canViewOwnReminders: true,
  },

  ADMIN: {
    // Notes - Full access
    canCreateNotes: true,
    canEditAllNotes: true,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: true,
    canShareNotes: true,
    canViewAllNotes: true,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Meetings - Full access
    canCreateMeetings: true,
    canEditAllMeetings: true,
    canEditOwnMeetings: true,
    canDeleteMeetings: true,
    canInviteParticipants: true,
    canViewAllMeetings: true,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Comments - Full access
    canCreateComments: true,
    canEditAllComments: true,
    canEditOwnComments: true,
    canDeleteComments: true,
    canViewComments: true,

    // Calls - Full access
    canCreateCalls: true,
    canEditAllCalls: true,
    canEditOwnCalls: true,
    canDeleteCalls: true,
    canViewAllCalls: true,
    canViewOwnCalls: true,

    // Reminders - Full access
    canCreateReminders: true,
    canEditAllReminders: true,
    canEditOwnReminders: true,
    canDeleteReminders: true,
    canViewAllReminders: true,
    canViewOwnReminders: true,
  },

  MANAGER: {
    // Notes - Limited access
    canCreateNotes: true,
    canEditAllNotes: false,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: false,
    canShareNotes: true,
    canViewAllNotes: true,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Meetings - Limited access
    canCreateMeetings: true,
    canEditAllMeetings: false,
    canEditOwnMeetings: true,
    canDeleteMeetings: false,
    canInviteParticipants: true,
    canViewAllMeetings: true,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Comments - Limited access
    canCreateComments: true,
    canEditAllComments: false,
    canEditOwnComments: true,
    canDeleteComments: false,
    canViewComments: true,

    // Calls - Limited access
    canCreateCalls: true,
    canEditAllCalls: false,
    canEditOwnCalls: true,
    canDeleteCalls: false,
    canViewAllCalls: true,
    canViewOwnCalls: true,

    // Reminders - Limited access
    canCreateReminders: true,
    canEditAllReminders: false,
    canEditOwnReminders: true,
    canDeleteReminders: false,
    canViewAllReminders: true,
    canViewOwnReminders: true,
  },

  USER: {
    // Notes - Basic access
    canCreateNotes: true,
    canEditAllNotes: false,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: false,
    canShareNotes: false,
    canViewAllNotes: false,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Meetings - Basic access
    canCreateMeetings: true,
    canEditAllMeetings: false,
    canEditOwnMeetings: true,
    canDeleteMeetings: false,
    canInviteParticipants: false,
    canViewAllMeetings: false,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Comments - Basic access
    canCreateComments: true,
    canEditAllComments: false,
    canEditOwnComments: true,
    canDeleteComments: false,
    canViewComments: true,

    // Calls - Basic access
    canCreateCalls: true,
    canEditAllCalls: false,
    canEditOwnCalls: true,
    canDeleteCalls: false,
    canViewAllCalls: false,
    canViewOwnCalls: true,

    // Reminders - Basic access
    canCreateReminders: true,
    canEditAllReminders: false,
    canEditOwnReminders: true,
    canDeleteReminders: false,
    canViewAllReminders: false,
    canViewOwnReminders: true,
  },
}

/**
 * Middleware to check collaboration-specific permissions
 */
export function requireCollaborationPermission(permission: keyof CollaborationPermissions) {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const userPermissions = COLLABORATION_PERMISSIONS[user.role]

    if (!userPermissions || !userPermissions[permission]) {
      logger.warn("Collaboration permission denied", {
        userId: user.id,
        userRole: user.role,
        requiredPermission: permission,
        path: ctx.path,
        method: ctx.method,
      })

      throw createError(
        "Insufficient permissions for this collaboration feature",
        403,
        "INSUFFICIENT_COLLABORATION_PERMISSIONS",
        {
          required: permission,
          userRole: user.role,
        }
      )
    }

    await next()
  }
}

/**
 * Middleware to validate note access (creation, viewing, editing)
 */
export function validateNoteAccess(operation: 'create' | 'view' | 'edit' | 'delete') {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const noteId = ctx.params.id || ctx.params.noteId
    const userPermissions = COLLABORATION_PERMISSIONS[user.role]

    // Super admins have full access
    if (user.role === 'super_admin') {
      await next()
      return
    }

    switch (operation) {
      case 'create':
        if (!userPermissions.canCreateNotes) {
          throw createError(
            "Insufficient permissions to create notes",
            403,
            "CANNOT_CREATE_NOTES"
          )
        }
        break

      case 'view':
        // For viewing, we'll check the actual note access in the controller
        if (!userPermissions.canViewOwnNotes && !userPermissions.canViewAllNotes && !userPermissions.canViewSharedNotes) {
          throw createError(
            "Insufficient permissions to view notes",
            403,
            "CANNOT_VIEW_NOTES"
          )
        }
        break

      case 'edit':
        if (noteId) {
          // Dynamic check for note ownership/sharing will be done in controller
          if (!userPermissions.canEditOwnNotes && !userPermissions.canEditAllNotes && !userPermissions.canEditSharedNotes) {
            throw createError(
              "Insufficient permissions to edit notes",
              403,
              "CANNOT_EDIT_NOTES"
            )
          }
        }
        break

      case 'delete':
        if (!userPermissions.canDeleteNotes) {
          throw createError(
            "Insufficient permissions to delete notes",
            403,
            "CANNOT_DELETE_NOTES"
          )
        }
        break
    }

    // Store user permissions in context for use in controllers
    ctx.state.collaborationPermissions = userPermissions
    await next()
  }
}

/**
 * Middleware to validate meeting access
 */
export function validateMeetingAccess(operation: 'create' | 'view' | 'edit' | 'delete') {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const userPermissions = COLLABORATION_PERMISSIONS[user.role]

    // Super admins have full access
    if (user.role === 'super_admin') {
      await next()
      return
    }

    switch (operation) {
      case 'create':
        if (!userPermissions.canCreateMeetings) {
          throw createError(
            "Insufficient permissions to create meetings",
            403,
            "CANNOT_CREATE_MEETINGS"
          )
        }
        break

      case 'view':
        if (!userPermissions.canViewOwnMeetings && !userPermissions.canViewAllMeetings && !userPermissions.canViewInvitedMeetings) {
          throw createError(
            "Insufficient permissions to view meetings",
            403,
            "CANNOT_VIEW_MEETINGS"
          )
        }
        break

      case 'edit':
        if (!userPermissions.canEditOwnMeetings && !userPermissions.canEditAllMeetings) {
          throw createError(
            "Insufficient permissions to edit meetings",
            403,
            "CANNOT_EDIT_MEETINGS"
          )
        }
        break

      case 'delete':
        if (!userPermissions.canDeleteMeetings) {
          throw createError(
            "Insufficient permissions to delete meetings",
            403,
            "CANNOT_DELETE_MEETINGS"
          )
        }
        break
    }

    ctx.state.collaborationPermissions = userPermissions
    await next()
  }
}

/**
 * Middleware to validate call access
 */
export function validateCallAccess(operation: 'create' | 'view' | 'edit' | 'delete') {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const userPermissions = COLLABORATION_PERMISSIONS[user.role]

    // Super admins have full access
    if (user.role === 'super_admin') {
      await next()
      return
    }

    switch (operation) {
      case 'create':
        if (!userPermissions.canCreateCalls) {
          throw createError(
            "Insufficient permissions to create calls",
            403,
            "CANNOT_CREATE_CALLS"
          )
        }
        break

      case 'view':
        if (!userPermissions.canViewOwnCalls && !userPermissions.canViewAllCalls) {
          throw createError(
            "Insufficient permissions to view calls",
            403,
            "CANNOT_VIEW_CALLS"
          )
        }
        break

      case 'edit':
        if (!userPermissions.canEditOwnCalls && !userPermissions.canEditAllCalls) {
          throw createError(
            "Insufficient permissions to edit calls",
            403,
            "CANNOT_EDIT_CALLS"
          )
        }
        break

      case 'delete':
        if (!userPermissions.canDeleteCalls) {
          throw createError(
            "Insufficient permissions to delete calls",
            403,
            "CANNOT_DELETE_CALLS"
          )
        }
        break
    }

    ctx.state.collaborationPermissions = userPermissions
    await next()
  }
}

/**
 * Middleware to validate reminder access
 */
export function validateReminderAccess(operation: 'create' | 'view' | 'edit' | 'delete') {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const userPermissions = COLLABORATION_PERMISSIONS[user.role]

    // Super admins have full access
    if (user.role === 'super_admin') {
      await next()
      return
    }

    switch (operation) {
      case 'create':
        if (!userPermissions.canCreateReminders) {
          throw createError(
            "Insufficient permissions to create reminders",
            403,
            "CANNOT_CREATE_REMINDERS"
          )
        }
        break

      case 'view':
        if (!userPermissions.canViewOwnReminders && !userPermissions.canViewAllReminders) {
          throw createError(
            "Insufficient permissions to view reminders",
            403,
            "CANNOT_VIEW_REMINDERS"
          )
        }
        break

      case 'edit':
        if (!userPermissions.canEditOwnReminders && !userPermissions.canEditAllReminders) {
          throw createError(
            "Insufficient permissions to edit reminders",
            403,
            "CANNOT_EDIT_REMINDERS"
          )
        }
        break

      case 'delete':
        if (!userPermissions.canDeleteReminders) {
          throw createError(
            "Insufficient permissions to delete reminders",
            403,
            "CANNOT_DELETE_REMINDERS"
          )
        }
        break
    }

    ctx.state.collaborationPermissions = userPermissions
    await next()
  }
}

/**
 * Middleware to validate comment access
 */
export function validateCommentAccess(operation: 'create' | 'view' | 'edit' | 'delete') {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const userPermissions = COLLABORATION_PERMISSIONS[user.role]

    // Super admins have full access
    if (user.role === 'super_admin') {
      await next()
      return
    }

    switch (operation) {
      case 'create':
        if (!userPermissions.canCreateComments) {
          throw createError(
            "Insufficient permissions to create comments",
            403,
            "CANNOT_CREATE_COMMENTS"
          )
        }
        break

      case 'view':
        if (!userPermissions.canViewComments) {
          throw createError(
            "Insufficient permissions to view comments",
            403,
            "CANNOT_VIEW_COMMENTS"
          )
        }
        break

      case 'edit':
        if (!userPermissions.canEditOwnComments && !userPermissions.canEditAllComments) {
          throw createError(
            "Insufficient permissions to edit comments",
            403,
            "CANNOT_EDIT_COMMENTS"
          )
        }
        break

      case 'delete':
        if (!userPermissions.canDeleteComments) {
          throw createError(
            "Insufficient permissions to delete comments",
            403,
            "CANNOT_DELETE_COMMENTS"
          )
        }
        break
    }

    ctx.state.collaborationPermissions = userPermissions
    await next()
  }
}

/**
 * Middleware to validate resource ownership for collaboration features
 */
export function validateCollaborationOwnership(resourceType: 'note' | 'meeting' | 'call' | 'reminder' | 'comment') {
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

    const userPermissions = COLLABORATION_PERMISSIONS[user.role] || COLLABORATION_PERMISSIONS.USER

    // If no resource ID, skip ownership validation (for list endpoints)
    if (!resourceId) {
      await next()
      return
    }

    try {
      let resource: any
      let canEditAll = false
      let canViewAll = false

      switch (resourceType) {
        case 'note':
          const { Note } = await import("../models/Note")
          resource = await Note.findByPk(resourceId)
          canEditAll = userPermissions.canEditAllNotes
          canViewAll = userPermissions.canViewAllNotes
          break

        case 'meeting':
          const { Meeting } = await import("../models/Meeting")
          resource = await Meeting.findByPk(resourceId)
          canEditAll = userPermissions.canEditAllMeetings
          canViewAll = userPermissions.canViewAllMeetings
          break

        case 'call':
          const { Call } = await import("../models/Call")
          resource = await Call.findByPk(resourceId)
          canEditAll = userPermissions.canEditAllCalls
          canViewAll = userPermissions.canViewAllCalls
          break

        case 'reminder':
          const { Reminder } = await import("../models/Reminder")
          resource = await Reminder.findByPk(resourceId)
          canEditAll = userPermissions.canEditAllReminders
          canViewAll = userPermissions.canViewAllReminders
          break

        case 'comment':
          const { Comment } = await import("../models/Comment")
          resource = await Comment.findByPk(resourceId)
          canEditAll = userPermissions.canEditAllComments
          canViewAll = userPermissions.canViewComments
          break
      }

      if (!resource) {
        throw createError(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found`, 404, "RESOURCE_NOT_FOUND")
      }

      // Check if user can access all resources of this type
      if (canEditAll || canViewAll) {
        await next()
        return
      }

      // Check ownership for resources that have creatorId or userId
      const ownerId = resource.creatorId || resource.userId || resource.organizerId
      if (ownerId === user.id) {
        await next()
        return
      }

      // For notes, check sharing permissions
      if (resourceType === 'note') {
        const canAccess = await resource.canUserAccess(user.id)
        if (canAccess) {
          await next()
          return
        }
      }

      // For meetings, check if user is a participant
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

      // Team-based access for team admins
      if (user.role === 'team_admin' && resource.creatorId) {
        const { User: UserModel } = await import("../models/User")
        const resourceOwner = await UserModel.findByPk(resource.creatorId)
        if (resourceOwner && resourceOwner.teamId === user.teamId) {
          await next()
          return
        }
      }

      throw createError(
        `Access denied: You don't have permission to access this ${resourceType}`,
        403,
        "RESOURCE_ACCESS_DENIED",
        {
          resourceType,
          resourceId,
          userRole: user.role,
        }
      )

    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        throw error
      }
      throw createError(
        `Error validating ${resourceType} ownership`,
        500,
        "OWNERSHIP_VALIDATION_ERROR"
      )
    }
  }
}

/**
 * Get collaboration permissions for the current user
 */
export function getCollaborationPermissions(user: User): CollaborationPermissions {
  return COLLABORATION_PERMISSIONS[user.role] || COLLABORATION_PERMISSIONS.USER
}

/**
 * Check if user has specific collaboration permission
 */
export function hasCollaborationPermission(user: User, permission: keyof CollaborationPermissions): boolean {
  const userPermissions = COLLABORATION_PERMISSIONS[user.role] || COLLABORATION_PERMISSIONS.USER
  return userPermissions[permission]
}
