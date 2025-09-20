import { User, UserRole } from "../models/User"
import { Context, Next } from "../types/koa"
import { createError } from "./errorHandler"

/**
 * Role-based permissions interface
 */
interface RolePermissions {
  // System Administration
  canManageSystem: boolean
  canManageAllTeams: boolean
  canManagePlugins: boolean
  canViewSystemLogs: boolean
  canManageSystemSettings: boolean

  // Team Management
  canManageTeam: boolean
  canManageTeamUsers: boolean
  canViewTeamAnalytics: boolean
  canManageTeamSettings: boolean

  // Medical Institutions
  canCreateInstitutions: boolean
  canEditAllInstitutions: boolean
  canEditAssignedInstitutions: boolean
  canDeleteInstitutions: boolean
  canImportInstitutions: boolean
  canViewAllInstitutions: boolean
  canViewAssignedInstitutions: boolean
  canManageInstitutionProfiles: boolean
  canViewInstitutionAnalytics: boolean

  // Billing & Quotes
  canCreateQuotes: boolean
  canEditAllQuotes: boolean
  canEditOwnQuotes: boolean
  canDeleteQuotes: boolean
  canConvertQuotesToInvoices: boolean
  canCreateInvoices: boolean
  canEditAllInvoices: boolean
  canEditOwnInvoices: boolean
  canDeleteInvoices: boolean
  canRecordPayments: boolean
  canViewAllBilling: boolean
  canViewOwnBilling: boolean

  // Tasks
  canCreateTasks: boolean
  canAssignTasks: boolean
  canEditAllTasks: boolean
  canEditAssignedTasks: boolean
  canDeleteTasks: boolean
  canViewAllTasks: boolean
  canViewAssignedTasks: boolean

  // Contact Management
  canCreateContacts: boolean
  canEditAllContacts: boolean
  canDeleteContacts: boolean
  canViewAllContacts: boolean
  canViewAssignedContacts: boolean
  canAssignContacts: boolean
  canManageContactNotes: boolean

  // Webhooks & Integrations
  canManageWebhooks: boolean
  canViewWebhookLogs: boolean
  canManageIntegrations: boolean

  // Collaboration Features - Notes
  canCreateNotes: boolean
  canEditAllNotes: boolean
  canEditOwnNotes: boolean
  canEditSharedNotes: boolean
  canDeleteNotes: boolean
  canShareNotes: boolean
  canViewAllNotes: boolean
  canViewOwnNotes: boolean
  canViewSharedNotes: boolean

  // Collaboration Features - Meetings
  canCreateMeetings: boolean
  canEditAllMeetings: boolean
  canEditOwnMeetings: boolean
  canDeleteMeetings: boolean
  canInviteParticipants: boolean
  canViewAllMeetings: boolean
  canViewOwnMeetings: boolean
  canViewInvitedMeetings: boolean

  // Collaboration Features - Comments
  canCreateComments: boolean
  canEditAllComments: boolean
  canEditOwnComments: boolean
  canDeleteComments: boolean
  canViewComments: boolean

  // Collaboration Features - Calls
  canCreateCalls: boolean
  canEditAllCalls: boolean
  canEditOwnCalls: boolean
  canDeleteCalls: boolean
  canViewAllCalls: boolean
  canViewOwnCalls: boolean

  // Collaboration Features - Reminders
  canCreateReminders: boolean
  canEditAllReminders: boolean
  canEditOwnReminders: boolean
  canDeleteReminders: boolean
  canViewAllReminders: boolean
  canViewOwnReminders: boolean

  // Catalog Management
  canCreateCatalogItems: boolean
  canEditCatalogItems: boolean
  canDeleteCatalogItems: boolean
  canViewCatalogItems: boolean
}

/**
 * Role Permission Matrix
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.SUPER_ADMIN]: {
    // System Administration - Full Access
    canManageSystem: true,
    canManageAllTeams: true,
    canManagePlugins: true,
    canViewSystemLogs: true,
    canManageSystemSettings: true,

    // Team Management - Full Access
    canManageTeam: true,
    canManageTeamUsers: true,
    canViewTeamAnalytics: true,
    canManageTeamSettings: true,

    // Medical Institutions - Full Access
    canCreateInstitutions: true,
    canEditAllInstitutions: true,
    canEditAssignedInstitutions: true,
    canDeleteInstitutions: true,
    canImportInstitutions: true,
    canViewAllInstitutions: true,
    canViewAssignedInstitutions: true,
    canManageInstitutionProfiles: true,
    canViewInstitutionAnalytics: true,

    // Contact Management - Full Access
    canCreateContacts: true,
    canEditAllContacts: true,
    canDeleteContacts: true,
    canViewAllContacts: true,
    canViewAssignedContacts: true,
    canAssignContacts: true,
    canManageContactNotes: true,

    // Billing & Quotes - Full Access
    canCreateQuotes: true,
    canEditAllQuotes: true,
    canEditOwnQuotes: true,
    canDeleteQuotes: true,
    canConvertQuotesToInvoices: true,
    canCreateInvoices: true,
    canEditAllInvoices: true,
    canEditOwnInvoices: true,
    canDeleteInvoices: true,
    canRecordPayments: true,
    canViewAllBilling: true,
    canViewOwnBilling: true,

    // Tasks - Full Access
    canCreateTasks: true,
    canAssignTasks: true,
    canEditAllTasks: true,
    canEditAssignedTasks: true,
    canDeleteTasks: true,
    canViewAllTasks: true,
    canViewAssignedTasks: true,

    // Webhooks & Integrations - Full Access
    canManageWebhooks: true,
    canViewWebhookLogs: true,
    canManageIntegrations: true,

    // Collaboration Features - Notes - Full Access
    canCreateNotes: true,
    canEditAllNotes: true,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: true,
    canShareNotes: true,
    canViewAllNotes: true,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Collaboration Features - Meetings - Full Access
    canCreateMeetings: true,
    canEditAllMeetings: true,
    canEditOwnMeetings: true,
    canDeleteMeetings: true,
    canInviteParticipants: true,
    canViewAllMeetings: true,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Collaboration Features - Comments - Full Access
    canCreateComments: true,
    canEditAllComments: true,
    canEditOwnComments: true,
    canDeleteComments: true,
    canViewComments: true,

    // Collaboration Features - Calls - Full Access
    canCreateCalls: true,
    canEditAllCalls: true,
    canEditOwnCalls: true,
    canDeleteCalls: true,
    canViewAllCalls: true,
    canViewOwnCalls: true,

    // Collaboration Features - Reminders - Full Access
    canCreateReminders: true,
    canEditAllReminders: true,
    canEditOwnReminders: true,
    canDeleteReminders: true,
    canViewAllReminders: true,
    canViewOwnReminders: true,

    // Catalog Management - Full Access
    canCreateCatalogItems: true,
    canEditCatalogItems: true,
    canDeleteCatalogItems: true,
    canViewCatalogItems: true,
  },

  [UserRole.TEAM_ADMIN]: {
    // System Administration - Limited Access
    canManageSystem: false,
    canManageAllTeams: false,
    canManagePlugins: false,
    canViewSystemLogs: false,
    canManageSystemSettings: false,

    // Team Management - Full Access for Own Team
    canManageTeam: true,
    canManageTeamUsers: true,
    canViewTeamAnalytics: true,
    canManageTeamSettings: true,

    // Medical Institutions - Full Access for Team
    canCreateInstitutions: true,
    canEditAllInstitutions: true,
    canEditAssignedInstitutions: true,
    canDeleteInstitutions: true,
    canImportInstitutions: true,
    canViewAllInstitutions: true,
    canViewAssignedInstitutions: true,
    canManageInstitutionProfiles: true,
    canViewInstitutionAnalytics: true,

    // Contact Management - Full Access for Team
    canCreateContacts: true,
    canEditAllContacts: true,
    canDeleteContacts: true,
    canViewAllContacts: true,
    canViewAssignedContacts: true,
    canAssignContacts: true,
    canManageContactNotes: true,

    // Billing & Quotes - Full Access for Team
    canCreateQuotes: true,
    canEditAllQuotes: true,
    canEditOwnQuotes: true,
    canDeleteQuotes: true,
    canConvertQuotesToInvoices: true,
    canCreateInvoices: true,
    canEditAllInvoices: true,
    canEditOwnInvoices: true,
    canDeleteInvoices: true,
    canRecordPayments: true,
    canViewAllBilling: true,
    canViewOwnBilling: true,

    // Tasks - Full Access for Team
    canCreateTasks: true,
    canAssignTasks: true,
    canEditAllTasks: true,
    canEditAssignedTasks: true,
    canDeleteTasks: true,
    canViewAllTasks: true,
    canViewAssignedTasks: true,

    // Webhooks & Integrations - Limited Access
    canManageWebhooks: true,
    canViewWebhookLogs: true,
    canManageIntegrations: false,

    // Collaboration Features - Notes - Full Team Access
    canCreateNotes: true,
    canEditAllNotes: true,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: true,
    canShareNotes: true,
    canViewAllNotes: true,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Collaboration Features - Meetings - Full Team Access
    canCreateMeetings: true,
    canEditAllMeetings: true,
    canEditOwnMeetings: true,
    canDeleteMeetings: true,
    canInviteParticipants: true,
    canViewAllMeetings: true,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Collaboration Features - Comments - Full Team Access
    canCreateComments: true,
    canEditAllComments: true,
    canEditOwnComments: true,
    canDeleteComments: true,
    canViewComments: true,

    // Collaboration Features - Calls - Full Team Access
    canCreateCalls: true,
    canEditAllCalls: true,
    canEditOwnCalls: true,
    canDeleteCalls: true,
    canViewAllCalls: true,
    canViewOwnCalls: true,

    // Collaboration Features - Reminders - Full Team Access
    canCreateReminders: true,
    canEditAllReminders: true,
    canEditOwnReminders: true,
    canDeleteReminders: true,
    canViewAllReminders: true,
    canViewOwnReminders: true,

    // Catalog Management - Full Access
    canCreateCatalogItems: true,
    canEditCatalogItems: true,
    canDeleteCatalogItems: true,
    canViewCatalogItems: true,
  },

  [UserRole.USER]: {
    // System Administration - No Access
    canManageSystem: false,
    canManageAllTeams: false,
    canManagePlugins: false,
    canViewSystemLogs: false,
    canManageSystemSettings: false,

    // Team Management - No Access
    canManageTeam: false,
    canManageTeamUsers: false,
    canViewTeamAnalytics: false,
    canManageTeamSettings: false,

    // Medical Institutions - Limited Access
    canCreateInstitutions: true,
    canEditAllInstitutions: false,
    canEditAssignedInstitutions: true,
    canDeleteInstitutions: false,
    canImportInstitutions: false,
    canViewAllInstitutions: true,
    canViewAssignedInstitutions: true,
    canManageInstitutionProfiles: false,
    canViewInstitutionAnalytics: false,

    // Contact Management - Limited Access
    canCreateContacts: true,
    canEditAllContacts: false,
    canDeleteContacts: false,
    canViewAllContacts: false,
    canViewAssignedContacts: true,
    canAssignContacts: false,
    canManageContactNotes: false,

    // Billing & Quotes - Limited Access
    canCreateQuotes: true,
    canEditAllQuotes: false,
    canEditOwnQuotes: true,
    canDeleteQuotes: false,
    canConvertQuotesToInvoices: true,
    canCreateInvoices: true,
    canEditAllInvoices: false,
    canEditOwnInvoices: true,
    canDeleteInvoices: false,
    canRecordPayments: true,
    canViewAllBilling: false,
    canViewOwnBilling: true,

    // Tasks - Limited Access
    canCreateTasks: true,
    canAssignTasks: false,
    canEditAllTasks: false,
    canEditAssignedTasks: true,
    canDeleteTasks: false,
    canViewAllTasks: true,
    canViewAssignedTasks: true,

    // Webhooks & Integrations - No Access
    canManageWebhooks: false,
    canViewWebhookLogs: false,
    canManageIntegrations: false,

    // Collaboration Features - Notes - Basic Access
    canCreateNotes: true,
    canEditAllNotes: false,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: false,
    canShareNotes: false,
    canViewAllNotes: false,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Collaboration Features - Meetings - Basic Access
    canCreateMeetings: true,
    canEditAllMeetings: false,
    canEditOwnMeetings: true,
    canDeleteMeetings: false,
    canInviteParticipants: false,
    canViewAllMeetings: false,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Collaboration Features - Comments - Basic Access
    canCreateComments: true,
    canEditAllComments: false,
    canEditOwnComments: true,
    canDeleteComments: false,
    canViewComments: true,

    // Collaboration Features - Calls - Basic Access
    canCreateCalls: true,
    canEditAllCalls: false,
    canEditOwnCalls: true,
    canDeleteCalls: false,
    canViewAllCalls: false,
    canViewOwnCalls: true,

    // Collaboration Features - Reminders - Basic Access
    canCreateReminders: true,
    canEditAllReminders: false,
    canEditOwnReminders: true,
    canDeleteReminders: false,
    canViewAllReminders: false,
    canViewOwnReminders: true,

    // Catalog Management - Basic Access
    canCreateCatalogItems: false,
    canEditCatalogItems: false,
    canDeleteCatalogItems: false,
    canViewCatalogItems: true,
  },

  [UserRole.ADMIN]: {
    // System Administration - Limited Access
    canManageSystem: false,
    canManageAllTeams: true,
    canManagePlugins: false,
    canViewSystemLogs: true,
    canManageSystemSettings: false,

    // Team Management - Full Access
    canManageTeam: true,
    canManageTeamUsers: true,
    canViewTeamAnalytics: true,
    canManageTeamSettings: true,

    // Medical Institutions - Full Access
    canCreateInstitutions: true,
    canEditAllInstitutions: true,
    canDeleteInstitutions: true,
    canImportInstitutions: true,
    canViewAllInstitutions: true,
    canViewAssignedInstitutions: true,
    canEditAssignedInstitutions: true,
    canManageInstitutionProfiles: true,
    canViewInstitutionAnalytics: true,

    // Contact Management - Full Access
    canCreateContacts: true,
    canEditAllContacts: true,
    canDeleteContacts: true,
    canViewAllContacts: true,
    canViewAssignedContacts: true,
    canAssignContacts: true,
    canManageContactNotes: true,

    // Billing & Quotes - Full Access
    canCreateQuotes: true,
    canEditAllQuotes: true,
    canEditOwnQuotes: true,
    canDeleteQuotes: true,
    canConvertQuotesToInvoices: true,

    // Billing & Invoicing - Full Access
    canCreateInvoices: true,
    canEditAllInvoices: true,
    canEditOwnInvoices: true,
    canDeleteInvoices: true,
    canRecordPayments: true,
    canViewAllBilling: true,
    canViewOwnBilling: true,

    // Tasks - Full Access
    canCreateTasks: true,
    canAssignTasks: true,
    canEditAllTasks: true,
    canEditAssignedTasks: true,
    canDeleteTasks: true,
    canViewAllTasks: true,
    canViewAssignedTasks: true,

    // Webhooks & Integrations - Limited Access
    canManageWebhooks: false,
    canViewWebhookLogs: true,
    canManageIntegrations: false,

    // Collaboration Features - Notes - Full Access
    canCreateNotes: true,
    canEditAllNotes: true,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: true,
    canShareNotes: true,
    canViewAllNotes: true,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Collaboration Features - Meetings - Full Access
    canCreateMeetings: true,
    canEditAllMeetings: true,
    canEditOwnMeetings: true,
    canDeleteMeetings: true,
    canInviteParticipants: true,
    canViewAllMeetings: true,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Collaboration Features - Comments - Full Access
    canCreateComments: true,
    canEditAllComments: true,
    canEditOwnComments: true,
    canDeleteComments: true,
    canViewComments: true,

    // Collaboration Features - Calls - Full Access
    canCreateCalls: true,
    canEditAllCalls: true,
    canEditOwnCalls: true,
    canDeleteCalls: true,
    canViewAllCalls: true,
    canViewOwnCalls: true,

    // Collaboration Features - Reminders - Full Access
    canCreateReminders: true,
    canEditAllReminders: true,
    canEditOwnReminders: true,
    canDeleteReminders: true,
    canViewAllReminders: true,
    canViewOwnReminders: true,

    // Catalog Management - Full Access
    canCreateCatalogItems: true,
    canEditCatalogItems: true,
    canDeleteCatalogItems: true,
    canViewCatalogItems: true,
  },

  [UserRole.MANAGER]: {
    // System Administration - No Access
    canManageSystem: false,
    canManageAllTeams: false,
    canManagePlugins: false,
    canViewSystemLogs: false,
    canManageSystemSettings: false,

    // Team Management - Limited Access
    canManageTeam: true,
    canManageTeamUsers: true,
    canViewTeamAnalytics: true,
    canManageTeamSettings: false,

    // Medical Institutions - Limited Access
    canCreateInstitutions: true,
    canEditAllInstitutions: false,
    canDeleteInstitutions: false,
    canImportInstitutions: false,
    canViewAllInstitutions: true,
    canViewAssignedInstitutions: true,
    canEditAssignedInstitutions: true,
    canManageInstitutionProfiles: true,
    canViewInstitutionAnalytics: true,

    // Contact Management - Limited Access
    canCreateContacts: true,
    canEditAllContacts: false,
    canDeleteContacts: false,
    canViewAllContacts: true,
    canViewAssignedContacts: true,
    canAssignContacts: true,
    canManageContactNotes: true,

    // Billing & Quotes - Limited Access
    canCreateQuotes: true,
    canEditAllQuotes: false,
    canEditOwnQuotes: true,
    canDeleteQuotes: false,
    canConvertQuotesToInvoices: true,

    // Billing & Invoicing - Limited Access
    canCreateInvoices: true,
    canEditAllInvoices: false,
    canEditOwnInvoices: true,
    canDeleteInvoices: false,
    canRecordPayments: true,
    canViewAllBilling: true,
    canViewOwnBilling: true,

    // Tasks - Limited Access
    canCreateTasks: true,
    canAssignTasks: true,
    canEditAllTasks: false,
    canEditAssignedTasks: true,
    canDeleteTasks: false,
    canViewAllTasks: true,
    canViewAssignedTasks: true,

    // Webhooks & Integrations - No Access
    canManageWebhooks: false,
    canViewWebhookLogs: false,
    canManageIntegrations: false,

    // Collaboration Features - Notes - Limited Access
    canCreateNotes: true,
    canEditAllNotes: false,
    canEditOwnNotes: true,
    canEditSharedNotes: true,
    canDeleteNotes: false,
    canShareNotes: true,
    canViewAllNotes: true,
    canViewOwnNotes: true,
    canViewSharedNotes: true,

    // Collaboration Features - Meetings - Limited Access
    canCreateMeetings: true,
    canEditAllMeetings: false,
    canEditOwnMeetings: true,
    canDeleteMeetings: false,
    canInviteParticipants: true,
    canViewAllMeetings: true,
    canViewOwnMeetings: true,
    canViewInvitedMeetings: true,

    // Collaboration Features - Comments - Limited Access
    canCreateComments: true,
    canEditAllComments: false,
    canEditOwnComments: true,
    canDeleteComments: false,
    canViewComments: true,

    // Collaboration Features - Calls - Limited Access
    canCreateCalls: true,
    canEditAllCalls: false,
    canEditOwnCalls: true,
    canDeleteCalls: false,
    canViewAllCalls: true,
    canViewOwnCalls: true,

    // Collaboration Features - Reminders - Limited Access
    canCreateReminders: true,
    canEditAllReminders: false,
    canEditOwnReminders: true,
    canDeleteReminders: false,
    canViewAllReminders: true,
    canViewOwnReminders: true,

    // Catalog Management - Limited Access
    canCreateCatalogItems: true,
    canEditCatalogItems: true,
    canDeleteCatalogItems: false,
    canViewCatalogItems: true,
  },
}

/**
 * Middleware to validate user permissions based on roles (legacy)
 */
export function validatePermission(allowedRoles: UserRole[]) {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    if (!allowedRoles.includes(user.role)) {
      throw createError(
        "Insufficient permissions to access this resource",
        403,
        "INSUFFICIENT_PERMISSIONS",
        {
          userRole: user.role,
          requiredRoles: allowedRoles,
        }
      )
    }

    await next()
  }
}

/**
 * Modern permission checking middleware
 */
export function requirePermission(permission: keyof RolePermissions) {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const userPermissions = ROLE_PERMISSIONS[user.role]

    if (!userPermissions[permission]) {
      throw createError(
        "Insufficient permissions to access this resource",
        403,
        "INSUFFICIENT_PERMISSIONS",
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
 * Team-based permission checking with resource ownership validation
 */
export function requireTeamPermission(permission: keyof RolePermissions) {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const userPermissions = ROLE_PERMISSIONS[user.role]

    // Super admins can access everything
    if (user.role === UserRole.SUPER_ADMIN) {
      await next()
      return
    }

    // Check if user has the required permission
    if (!userPermissions[permission]) {
      throw createError(
        "Insufficient permissions to access this resource",
        403,
        "INSUFFICIENT_PERMISSIONS",
        {
          required: permission,
          userRole: user.role,
        }
      )
    }

    // Team admins can access their team's resources
    if (user.role === UserRole.TEAM_ADMIN) {
      // Store user context for resource validation
      ctx.state.teamValidation = {
        userId: user.id,
        teamId: user.teamId,
        role: user.role,
      }
      await next()
      return
    }

    // Users can only access their own resources or team resources if assigned
    if (user.role === UserRole.USER) {
      // Store user context for ownership validation
      ctx.state.ownershipValidation = {
        userId: user.id,
        teamId: user.teamId,
        role: user.role,
      }
      await next()
      return
    }

    throw createError(
      "Insufficient permissions to access this resource",
      403,
      "INSUFFICIENT_PERMISSIONS"
    )
  }
}

/**
 * Validate resource ownership for medical institutions
 */
export function validateInstitutionOwnership() {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User
    const institutionId = ctx.params.id

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    // Super admins can access everything
    if (user.role === UserRole.SUPER_ADMIN) {
      await next()
      return
    }

    // If no institution ID in params, skip validation (for list endpoints)
    if (!institutionId) {
      await next()
      return
    }

    // Import MedicalInstitution dynamically to avoid circular dependency
    const MedicalInstitutionModule = await import("../models/MedicalInstitution")
    const MedicalInstitution =
      MedicalInstitutionModule.MedicalInstitution || MedicalInstitutionModule.default

    try {
      const institution = await MedicalInstitution.findByPk(institutionId, {
        include: [
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "teamId"],
          },
        ],
      })

      if (!institution) {
        throw createError("Medical institution not found", 404, "RESOURCE_NOT_FOUND")
      }

      // Team admins can access institutions assigned to their team members
      if (user.role === UserRole.TEAM_ADMIN) {
        if (user.teamId && institution.assignedUser?.teamId === user.teamId) {
          await next()
          return
        }
        // Team admins can also access unassigned institutions
        if (!institution.assignedUserId) {
          await next()
          return
        }
      }

      // Regular users can only access institutions assigned to them
      if (user.role === UserRole.USER) {
        if (institution.assignedUserId === user.id) {
          await next()
          return
        }
      }

      throw createError(
        "Access denied: You don't have permission to access this medical institution",
        403,
        "RESOURCE_ACCESS_DENIED",
        {
          institutionId,
          assignedUserId: institution.assignedUserId,
          userRole: user.role,
        }
      )
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        throw error
      }
      throw createError(
        "Error validating institution ownership",
        500,
        "OWNERSHIP_VALIDATION_ERROR"
      )
    }
  }
}

/**
 * Validate team membership for team-based operations
 */
export function validateTeamMembership() {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User
    const targetUserId = ctx.params.userId || (ctx.request.body as any)?.userId

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    // Super admins can manage all teams
    if (user.role === UserRole.SUPER_ADMIN) {
      await next()
      return
    }

    // Team admins can only manage their own team members
    if (user.role === UserRole.TEAM_ADMIN) {
      if (targetUserId) {
        // Import User model dynamically to avoid circular dependency
        const UserModule = await import("../models/User")
        const UserModel = UserModule.User || UserModule.default

        try {
          const targetUser = await UserModel.findByPk(targetUserId)

          if (!targetUser) {
            throw createError("Target user not found", 404, "USER_NOT_FOUND")
          }

          if (targetUser.teamId !== user.teamId) {
            throw createError(
              "Access denied: You can only manage users in your team",
              403,
              "TEAM_ACCESS_DENIED"
            )
          }
        } catch (error) {
          if (error && typeof error === "object" && "code" in error) {
            throw error
          }
          throw createError(
            "Error validating team membership",
            500,
            "TEAM_VALIDATION_ERROR"
          )
        }
      }
      await next()
      return
    }

    // Regular users cannot manage other users
    throw createError(
      "Insufficient permissions for team management",
      403,
      "INSUFFICIENT_PERMISSIONS"
    )
  }
}

/**
 * Middleware to check if user is super admin
 */
export function requireSuperAdmin() {
  return validatePermission([UserRole.SUPER_ADMIN])
}

/**
 * Middleware to check if user is admin (super admin or team admin)
 */
export function requireAdmin() {
  return validatePermission([UserRole.SUPER_ADMIN, UserRole.TEAM_ADMIN])
}

/**
 * Middleware to check if user can manage institutions
 */
export function canManageInstitutions() {
  return requirePermission("canCreateInstitutions")
}

/**
 * Middleware to check if user can view institutions
 */
export function canViewInstitutions() {
  return requirePermission("canViewAllInstitutions")
}

/**
 * Middleware for editing institutions with ownership validation
 */
export function canEditInstitution() {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const userPermissions = ROLE_PERMISSIONS[user.role]

    // Check if user has permission to edit all institutions
    if (userPermissions.canEditAllInstitutions) {
      await next()
      return
    }

    // Check if user can edit assigned institutions
    if (userPermissions.canEditAssignedInstitutions) {
      // Apply ownership validation
      await validateInstitutionOwnership()(ctx, next)
      return
    }

    throw createError(
      "Insufficient permissions to edit medical institutions",
      403,
      "INSUFFICIENT_PERMISSIONS"
    )
  }
}

/**
 * Middleware for viewing institutions with team/ownership filtering
 */
export function canViewInstitutionsFiltered() {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (!user) {
      throw createError("Authentication required", 401, "AUTHENTICATION_REQUIRED")
    }

    const userPermissions = ROLE_PERMISSIONS[user.role]

    // Super admins and users with canViewAllInstitutions can see everything
    if (userPermissions.canViewAllInstitutions) {
      await next()
      return
    }

    // Users with canViewAssignedInstitutions need filtering
    if (userPermissions.canViewAssignedInstitutions) {
      // Add filtering context to the request
      ctx.state.institutionFilter = {
        filterByAssignment: true,
        userId: user.id,
        teamId: user.teamId,
        role: user.role,
      }
      await next()
      return
    }

    throw createError(
      "Insufficient permissions to view medical institutions",
      403,
      "INSUFFICIENT_PERMISSIONS"
    )
  }
}

/**
 * Get user permissions for the current user
 */
export function getUserPermissions(user: User): RolePermissions {
  return ROLE_PERMISSIONS[user.role]
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: User, permission: keyof RolePermissions): boolean {
  const userPermissions = ROLE_PERMISSIONS[user.role]
  return userPermissions[permission]
}

/**
 * Middleware to add user permissions to context
 */
export function addPermissionsToContext() {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user as User

    if (user) {
      ctx.state.permissions = getUserPermissions(user)
    }

    await next()
  }
}

/**
 * Convenience middleware functions for collaboration permissions
 */
export const canCreateNotes = () => requirePermission("canCreateNotes")
export const canEditNotes = () => requirePermission("canEditOwnNotes")
export const canDeleteNotes = () => requirePermission("canDeleteNotes")
export const canShareNotes = () => requirePermission("canShareNotes")
export const canViewNotes = () => requirePermission("canViewOwnNotes")

export const canCreateMeetings = () => requirePermission("canCreateMeetings")
export const canEditMeetings = () => requirePermission("canEditOwnMeetings")
export const canDeleteMeetings = () => requirePermission("canDeleteMeetings")
export const canInviteToMeetings = () => requirePermission("canInviteParticipants")
export const canViewMeetings = () => requirePermission("canViewOwnMeetings")

export const canCreateComments = () => requirePermission("canCreateComments")
export const canEditComments = () => requirePermission("canEditOwnComments")
export const canDeleteComments = () => requirePermission("canDeleteComments")
export const canViewComments = () => requirePermission("canViewComments")

export const canCreateCalls = () => requirePermission("canCreateCalls")
export const canEditCalls = () => requirePermission("canEditOwnCalls")
export const canDeleteCalls = () => requirePermission("canDeleteCalls")
export const canViewCalls = () => requirePermission("canViewOwnCalls")

export const canCreateReminders = () => requirePermission("canCreateReminders")
export const canEditReminders = () => requirePermission("canEditOwnReminders")
export const canDeleteReminders = () => requirePermission("canDeleteReminders")
export const canViewReminders = () => requirePermission("canViewOwnReminders")
