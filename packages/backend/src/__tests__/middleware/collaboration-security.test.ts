import { Context } from "koa"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createError } from "../../middleware/errorHandler"
import {
  requireCollaborationPermission,
  validateNoteAccess,
  validateMeetingAccess,
  validateCallAccess,
  validateReminderAccess,
  validateCommentAccess,
  validateCollaborationOwnership,
  getCollaborationPermissions,
  hasCollaborationPermission,
  COLLABORATION_PERMISSIONS,
} from "../../middleware/collaboration"
import {
  validateTeamAccess,
  applyTeamFiltering,
  validateSharedResourcePermission,
  validateTeamMemberSharing,
  isTeamMember,
} from "../../middleware/teamAccess"
import { User, UserRole } from "../../models/User"

// Mock the models and dependencies
vi.mock("../../models/User")
vi.mock("../../models/Note")
vi.mock("../../models/Meeting")
vi.mock("../../models/Call")
vi.mock("../../models/Reminder")
vi.mock("../../models/Comment")
vi.mock("../../models/NoteShare")
vi.mock("../../models/MeetingParticipant")
vi.mock("../../middleware/errorHandler")

const mockCreateError = vi.mocked(createError)
const mockUser = vi.mocked(User)

describe("Collaboration Security Middleware", () => {
  let mockCtx: Partial<Context>
  let mockNext: any

  beforeEach(() => {
    mockCtx = {
      state: {},
      params: {},
      request: { body: {} },
      path: "/test",
      method: "GET",
    }
    mockNext = vi.fn()
    vi.clearAllMocks()

    // Setup default mock for createError
    mockCreateError.mockImplementation((message, status, code, details) => {
      const error = new Error(message) as any
      error.status = status
      error.code = code
      error.details = details
      return error
    })
  })

  describe("Collaboration Permissions Matrix", () => {
    it("should have correct permissions for SUPER_ADMIN", () => {
      const permissions = COLLABORATION_PERMISSIONS.SUPER_ADMIN

      // Notes permissions
      expect(permissions.canCreateNotes).toBe(true)
      expect(permissions.canEditAllNotes).toBe(true)
      expect(permissions.canEditOwnNotes).toBe(true)
      expect(permissions.canEditSharedNotes).toBe(true)
      expect(permissions.canDeleteNotes).toBe(true)
      expect(permissions.canShareNotes).toBe(true)
      expect(permissions.canViewAllNotes).toBe(true)
      expect(permissions.canViewOwnNotes).toBe(true)
      expect(permissions.canViewSharedNotes).toBe(true)

      // Meetings permissions
      expect(permissions.canCreateMeetings).toBe(true)
      expect(permissions.canEditAllMeetings).toBe(true)
      expect(permissions.canDeleteMeetings).toBe(true)
      expect(permissions.canInviteParticipants).toBe(true)
      expect(permissions.canViewAllMeetings).toBe(true)

      // Comments, Calls, Reminders permissions
      expect(permissions.canCreateComments).toBe(true)
      expect(permissions.canEditAllComments).toBe(true)
      expect(permissions.canDeleteComments).toBe(true)
      expect(permissions.canCreateCalls).toBe(true)
      expect(permissions.canEditAllCalls).toBe(true)
      expect(permissions.canCreateReminders).toBe(true)
    })

    it("should have limited permissions for USER", () => {
      const permissions = COLLABORATION_PERMISSIONS.USER

      // Notes permissions - basic access only
      expect(permissions.canCreateNotes).toBe(true)
      expect(permissions.canEditAllNotes).toBe(false)
      expect(permissions.canEditOwnNotes).toBe(true)
      expect(permissions.canEditSharedNotes).toBe(true)
      expect(permissions.canDeleteNotes).toBe(false)
      expect(permissions.canShareNotes).toBe(false)
      expect(permissions.canViewAllNotes).toBe(false)
      expect(permissions.canViewOwnNotes).toBe(true)

      // Meetings permissions - basic access only
      expect(permissions.canCreateMeetings).toBe(true)
      expect(permissions.canEditAllMeetings).toBe(false)
      expect(permissions.canDeleteMeetings).toBe(false)
      expect(permissions.canInviteParticipants).toBe(false)
      expect(permissions.canViewAllMeetings).toBe(false)
      expect(permissions.canViewOwnMeetings).toBe(true)

      // Comments, Calls, Reminders - basic access only
      expect(permissions.canEditAllComments).toBe(false)
      expect(permissions.canDeleteComments).toBe(false)
      expect(permissions.canEditAllCalls).toBe(false)
      expect(permissions.canDeleteCalls).toBe(false)
      expect(permissions.canEditAllReminders).toBe(false)
      expect(permissions.canDeleteReminders).toBe(false)
    })

    it("should have team access for TEAM_ADMIN", () => {
      const permissions = COLLABORATION_PERMISSIONS.TEAM_ADMIN

      // Should have all permissions for team resources
      expect(permissions.canEditAllNotes).toBe(true)
      expect(permissions.canDeleteNotes).toBe(true)
      expect(permissions.canShareNotes).toBe(true)
      expect(permissions.canViewAllNotes).toBe(true)
      expect(permissions.canEditAllMeetings).toBe(true)
      expect(permissions.canDeleteMeetings).toBe(true)
      expect(permissions.canInviteParticipants).toBe(true)
    })
  })

  describe("requireCollaborationPermission", () => {
    it("should allow access for users with required permission", async () => {
      const user = { id: "user1", role: "SUPER_ADMIN" } as User
      mockCtx.state!.user = user

      const middleware = requireCollaborationPermission("canCreateNotes")
      await middleware(mockCtx as Context, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(mockCreateError).not.toHaveBeenCalled()
    })

    it("should deny access for users without required permission", async () => {
      const user = { id: "user1", role: "USER" } as User
      mockCtx.state!.user = user

      const middleware = requireCollaborationPermission("canDeleteNotes")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Insufficient permissions for this collaboration feature",
        403,
        "INSUFFICIENT_COLLABORATION_PERMISSIONS",
        {
          required: "canDeleteNotes",
          userRole: "USER",
        }
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should require authentication", async () => {
      const middleware = requireCollaborationPermission("canCreateNotes")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED"
      )
    })
  })

  describe("validateNoteAccess", () => {
    it("should allow note creation for users with permission", async () => {
      const user = { id: "user1", role: "USER" } as User
      mockCtx.state!.user = user

      const middleware = validateNoteAccess("create")
      await middleware(mockCtx as Context, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
      expect(mockCtx.state!.collaborationPermissions).toBeDefined()
    })

    it("should deny note deletion for regular users", async () => {
      const user = { id: "user1", role: "USER" } as User
      mockCtx.state!.user = user

      const middleware = validateNoteAccess("delete")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Insufficient permissions to delete notes",
        403,
        "CANNOT_DELETE_NOTES"
      )
    })

    it("should allow all operations for super admin", async () => {
      const user = { id: "user1", role: "SUPER_ADMIN" } as User
      mockCtx.state!.user = user

      const operations: Array<'create' | 'view' | 'edit' | 'delete'> = ['create', 'view', 'edit', 'delete']
      
      for (const operation of operations) {
        const middleware = validateNoteAccess(operation)
        mockNext.mockClear()
        
        await middleware(mockCtx as Context, mockNext)
        expect(mockNext).toHaveBeenCalledOnce()
      }
    })
  })

  describe("validateMeetingAccess", () => {
    it("should allow meeting creation for users with permission", async () => {
      const user = { id: "user1", role: "USER" } as User
      mockCtx.state!.user = user

      const middleware = validateMeetingAccess("create")
      await middleware(mockCtx as Context, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
    })

    it("should deny meeting deletion for regular users", async () => {
      const user = { id: "user1", role: "USER" } as User
      mockCtx.state!.user = user

      const middleware = validateMeetingAccess("delete")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Insufficient permissions to delete meetings",
        403,
        "CANNOT_DELETE_MEETINGS"
      )
    })
  })

  describe("validateCollaborationOwnership", () => {
    it("should allow super admin access to any resource", async () => {
      const user = { id: "user1", role: "SUPER_ADMIN" } as User
      mockCtx.state!.user = user
      mockCtx.params!.id = "resource1"

      const middleware = validateCollaborationOwnership("note")
      await middleware(mockCtx as Context, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
    })

    it("should skip validation for list endpoints without resource ID", async () => {
      const user = { id: "user1", role: "USER" } as User
      mockCtx.state!.user = user

      const middleware = validateCollaborationOwnership("note")
      await middleware(mockCtx as Context, mockNext)

      expect(mockNext).toHaveBeenCalledOnce()
    })

    it("should deny access to non-owned resources for regular users", async () => {
      const user = { id: "user1", role: "USER", teamId: "team1" } as User
      mockCtx.state!.user = user
      mockCtx.params!.id = "note1"

      // Mock Note model
      const mockNote = {
        id: "note1",
        creatorId: "user2",
        canUserAccess: vi.fn().mockResolvedValue(false)
      }
      
      const { Note } = await import("../../models/Note")
      vi.mocked(Note.findByPk).mockResolvedValue(mockNote as any)

      const middleware = validateCollaborationOwnership("note")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Access denied: You don't have permission to access this note",
        403,
        "RESOURCE_ACCESS_DENIED",
        {
          resourceType: "note",
          resourceId: "note1",
          userRole: "USER",
        }
      )
    })
  })

  describe("Team Access Control", () => {
    describe("validateTeamAccess", () => {
      it("should allow super admin access to any team resource", async () => {
        const user = { id: "user1", role: "SUPER_ADMIN" } as User
        mockCtx.state!.user = user
        mockCtx.params!.id = "resource1"

        const middleware = validateTeamAccess("note")
        await middleware(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledOnce()
      })

      it("should apply team filtering for list endpoints", async () => {
        const user = { id: "user1", role: "USER", teamId: "team1" } as User
        mockCtx.state!.user = user

        const middleware = validateTeamAccess("note")
        await middleware(mockCtx as Context, mockNext)

        expect(mockCtx.state!.teamFilter).toEqual({
          userId: "user1",
          teamId: "team1",
          role: "USER",
        })
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it("should allow team admin access to team member resources", async () => {
        const user = { id: "user1", role: "TEAM_ADMIN", teamId: "team1" } as User
        mockCtx.state!.user = user
        mockCtx.params!.id = "note1"

        const mockNote = {
          id: "note1",
          creatorId: "user2",
          creator: { id: "user2", teamId: "team1" }
        }
        
        const { Note } = await import("../../models/Note")
        vi.mocked(Note.findByPk).mockResolvedValue(mockNote as any)

        const middleware = validateTeamAccess("note")
        await middleware(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledOnce()
      })

      it("should deny cross-team access for regular users", async () => {
        const user = { id: "user1", role: "USER", teamId: "team1" } as User
        mockCtx.state!.user = user
        mockCtx.params!.id = "note1"

        const mockNote = {
          id: "note1",
          creatorId: "user2",
          creator: { id: "user2", teamId: "team2" },
          canUserAccess: vi.fn().mockResolvedValue(false)
        }
        
        const { Note } = await import("../../models/Note")
        vi.mocked(Note.findByPk).mockResolvedValue(mockNote as any)

        const middleware = validateTeamAccess("note")

        await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
        expect(mockCreateError).toHaveBeenCalledWith(
          "Access denied: You can only access notes from your team",
          403,
          "TEAM_ACCESS_DENIED",
          expect.objectContaining({
            resourceType: "note",
            resourceId: "note1",
            userTeamId: "team1",
            resourceTeamId: "team2",
          })
        )
      })
    })

    describe("applyTeamFiltering", () => {
      it("should not apply filtering for super admins", async () => {
        const user = { id: "user1", role: "SUPER_ADMIN" } as User
        mockCtx.state!.user = user

        const middleware = applyTeamFiltering()
        await middleware(mockCtx as Context, mockNext)

        expect(mockCtx.state!.teamFilter).toBeUndefined()
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it("should apply team filtering with correct flags", async () => {
        const user = { id: "user1", role: "TEAM_ADMIN", teamId: "team1" } as User
        mockCtx.state!.user = user

        const middleware = applyTeamFiltering()
        await middleware(mockCtx as Context, mockNext)

        expect(mockCtx.state!.teamFilter).toEqual({
          userId: "user1",
          teamId: "team1",
          role: "TEAM_ADMIN",
          canViewTeamResources: true,
        })
      })

      it("should limit regular users to own resources", async () => {
        const user = { id: "user1", role: "USER", teamId: "team1" } as User
        mockCtx.state!.user = user

        const middleware = applyTeamFiltering()
        await middleware(mockCtx as Context, mockNext)

        expect(mockCtx.state!.teamFilter).toEqual({
          userId: "user1",
          teamId: "team1",
          role: "USER",
          canViewTeamResources: false,
        })
      })
    })

    describe("validateTeamMemberSharing", () => {
      it("should allow super admin to share with anyone", async () => {
        const user = { id: "user1", role: "SUPER_ADMIN" } as User
        mockCtx.state!.user = user
        mockCtx.request!.body = { userId: "user2" }

        const middleware = validateTeamMemberSharing()
        await middleware(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledOnce()
      })

      it("should allow team admin to share within team", async () => {
        const user = { id: "user1", role: "TEAM_ADMIN", teamId: "team1" } as User
        mockCtx.state!.user = user
        mockCtx.request!.body = { userId: "user2" }

        const targetUser = { id: "user2", teamId: "team1" } as User
        vi.mocked(User.findByPk).mockResolvedValue(targetUser)

        const middleware = validateTeamMemberSharing()
        await middleware(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledOnce()
      })

      it("should deny cross-team sharing for team admin", async () => {
        const user = { id: "user1", role: "TEAM_ADMIN", teamId: "team1" } as User
        mockCtx.state!.user = user
        mockCtx.request!.body = { userId: "user2" }

        const targetUser = { id: "user2", teamId: "team2" } as User
        vi.mocked(User.findByPk).mockResolvedValue(targetUser)

        const middleware = validateTeamMemberSharing()

        await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
        expect(mockCreateError).toHaveBeenCalledWith(
          "You can only share resources with members of your team",
          403,
          "CROSS_TEAM_SHARING_DENIED",
          {
            userTeamId: "team1",
            targetUserTeamId: "team2",
          }
        )
      })

      it("should handle target user not found", async () => {
        const user = { id: "user1", role: "USER", teamId: "team1" } as User
        mockCtx.state!.user = user
        mockCtx.request!.body = { userId: "nonexistent" }

        vi.mocked(User.findByPk).mockResolvedValue(null)

        const middleware = validateTeamMemberSharing()

        await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
        expect(mockCreateError).toHaveBeenCalledWith(
          "Target user not found",
          404,
          "TARGET_USER_NOT_FOUND"
        )
      })
    })
  })

  describe("Utility Functions", () => {
    describe("getCollaborationPermissions", () => {
      it("should return correct permissions for user role", () => {
        const user = { role: "USER" } as User
        const permissions = getCollaborationPermissions(user)

        expect(permissions).toEqual(COLLABORATION_PERMISSIONS.USER)
      })

      it("should fallback to USER permissions for unknown role", () => {
        const user = { role: "UNKNOWN_ROLE" } as User
        const permissions = getCollaborationPermissions(user)

        expect(permissions).toEqual(COLLABORATION_PERMISSIONS.USER)
      })
    })

    describe("hasCollaborationPermission", () => {
      it("should return true for allowed permissions", () => {
        const user = { role: "SUPER_ADMIN" } as User
        const result = hasCollaborationPermission(user, "canCreateNotes")

        expect(result).toBe(true)
      })

      it("should return false for denied permissions", () => {
        const user = { role: "USER" } as User
        const result = hasCollaborationPermission(user, "canDeleteNotes")

        expect(result).toBe(false)
      })
    })

    describe("isTeamMember", () => {
      it("should return true for same team members", async () => {
        const user1 = { id: "user1", teamId: "team1" } as User
        const user2 = { id: "user2", teamId: "team1" } as User
        
        vi.mocked(User.findByPk)
          .mockResolvedValueOnce(user1)
          .mockResolvedValueOnce(user2)

        const result = await isTeamMember("user1", "user2")
        expect(result).toBe(true)
      })

      it("should return false for different team members", async () => {
        const user1 = { id: "user1", teamId: "team1" } as User
        const user2 = { id: "user2", teamId: "team2" } as User
        
        vi.mocked(User.findByPk)
          .mockResolvedValueOnce(user1)
          .mockResolvedValueOnce(user2)

        const result = await isTeamMember("user1", "user2")
        expect(result).toBe(false)
      })

      it("should return false for non-existent users", async () => {
        vi.mocked(User.findByPk).mockResolvedValue(null)

        const result = await isTeamMember("user1", "user2")
        expect(result).toBe(false)
      })
    })
  })

  describe("Error Handling", () => {
    it("should handle database errors gracefully in ownership validation", async () => {
      const user = { id: "user1", role: "USER" } as User
      mockCtx.state!.user = user
      mockCtx.params!.id = "note1"

      const { Note } = await import("../../models/Note")
      vi.mocked(Note.findByPk).mockRejectedValue(new Error("Database error"))

      const middleware = validateCollaborationOwnership("note")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Error validating note ownership",
        500,
        "OWNERSHIP_VALIDATION_ERROR"
      )
    })

    it("should handle database errors gracefully in team access validation", async () => {
      const user = { id: "user1", role: "USER", teamId: "team1" } as User
      mockCtx.state!.user = user
      mockCtx.params!.id = "note1"

      const { Note } = await import("../../models/Note")
      vi.mocked(Note.findByPk).mockRejectedValue(new Error("Database error"))

      const middleware = validateTeamAccess("note")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Error validating team access for note",
        500,
        "TEAM_ACCESS_VALIDATION_ERROR"
      )
    })
  })
})