import { Context } from "koa"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createError } from "../../middleware/errorHandler"
import {
  addPermissionsToContext,
  getUserPermissions,
  hasPermission,
  requirePermission,
  requireTeamPermission,
  ROLE_PERMISSIONS,
} from "../../middleware/permissions"
import { User, UserRole } from "../../models/User"

// Mock the models
vi.mock("../../models/User")
vi.mock("../../models/MedicalInstitution")
vi.mock("../../middleware/errorHandler")

const mockCreateError = vi.mocked(createError)

describe("Permissions Middleware", () => {
  let mockCtx: Partial<Context>
  let mockNext: any

  beforeEach(() => {
    mockCtx = {
      state: {},
      params: {},
      request: { body: {} },
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

  describe("Role Permissions Matrix", () => {
    it("should have correct permissions for SUPER_ADMIN", () => {
      const permissions = ROLE_PERMISSIONS[UserRole.SUPER_ADMIN]

      expect(permissions.canManageSystem).toBe(true)
      expect(permissions.canManageAllTeams).toBe(true)
      expect(permissions.canEditAllInstitutions).toBe(true)
      expect(permissions.canDeleteInstitutions).toBe(true)
      expect(permissions.canManageWebhooks).toBe(true)
    })

    it("should have correct permissions for TEAM_ADMIN", () => {
      const permissions = ROLE_PERMISSIONS[UserRole.TEAM_ADMIN]

      expect(permissions.canManageSystem).toBe(false)
      expect(permissions.canManageAllTeams).toBe(false)
      expect(permissions.canManageTeam).toBe(true)
      expect(permissions.canEditAllInstitutions).toBe(true)
      expect(permissions.canManageIntegrations).toBe(false)
    })

    it("should have correct permissions for USER", () => {
      const permissions = ROLE_PERMISSIONS[UserRole.USER]

      expect(permissions.canManageSystem).toBe(false)
      expect(permissions.canManageTeam).toBe(false)
      expect(permissions.canEditAllInstitutions).toBe(false)
      expect(permissions.canEditAssignedInstitutions).toBe(true)
      expect(permissions.canDeleteInstitutions).toBe(false)
    })
  })

  describe("requirePermission", () => {
    it("should allow access when user has required permission", async () => {
      const user = {
        id: "user-1",
        role: UserRole.SUPER_ADMIN,
      } as User

      mockCtx.state!.user = user

      const middleware = requirePermission("canManageSystem")
      await middleware(mockCtx as Context, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it("should deny access when user lacks required permission", async () => {
      const user = {
        id: "user-1",
        role: UserRole.USER,
      } as User

      mockCtx.state!.user = user

      const middleware = requirePermission("canManageSystem")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Insufficient permissions to access this resource",
        403,
        "INSUFFICIENT_PERMISSIONS",
        {
          required: "canManageSystem",
          userRole: UserRole.USER,
        }
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it("should deny access when user is not authenticated", async () => {
      const middleware = requirePermission("canManageSystem")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Authentication required",
        401,
        "AUTHENTICATION_REQUIRED"
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe("requireTeamPermission", () => {
    it("should allow super admin access to everything", async () => {
      const user = {
        id: "user-1",
        role: UserRole.SUPER_ADMIN,
        teamId: "team-1",
      } as User

      mockCtx.state!.user = user

      const middleware = requireTeamPermission("canManageTeam")
      await middleware(mockCtx as Context, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })

    it("should set team validation context for team admin", async () => {
      const user = {
        id: "user-1",
        role: UserRole.TEAM_ADMIN,
        teamId: "team-1",
      } as User

      mockCtx.state!.user = user

      const middleware = requireTeamPermission("canManageTeam")
      await middleware(mockCtx as Context, mockNext)

      expect(mockCtx.state!.teamValidation).toEqual({
        userId: "user-1",
        teamId: "team-1",
        role: UserRole.TEAM_ADMIN,
      })
      expect(mockNext).toHaveBeenCalled()
    })

    it("should set ownership validation context for regular user", async () => {
      const user = {
        id: "user-1",
        role: UserRole.USER,
        teamId: "team-1",
      } as User

      mockCtx.state!.user = user

      const middleware = requireTeamPermission("canCreateInstitutions")
      await middleware(mockCtx as Context, mockNext)

      expect(mockCtx.state!.ownershipValidation).toEqual({
        userId: "user-1",
        teamId: "team-1",
        role: UserRole.USER,
      })
      expect(mockNext).toHaveBeenCalled()
    })

    it("should deny access when user lacks permission", async () => {
      const user = {
        id: "user-1",
        role: UserRole.USER,
        teamId: "team-1",
      } as User

      mockCtx.state!.user = user

      const middleware = requireTeamPermission("canManageTeam")

      await expect(middleware(mockCtx as Context, mockNext)).rejects.toThrow()
      expect(mockCreateError).toHaveBeenCalledWith(
        "Insufficient permissions to access this resource",
        403,
        "INSUFFICIENT_PERMISSIONS",
        {
          required: "canManageTeam",
          userRole: UserRole.USER,
        }
      )
    })
  })

  describe("Utility Functions", () => {
    describe("getUserPermissions", () => {
      it("should return correct permissions for user role", () => {
        const user = { role: UserRole.TEAM_ADMIN } as User
        const permissions = getUserPermissions(user)

        expect(permissions).toEqual(ROLE_PERMISSIONS[UserRole.TEAM_ADMIN])
        expect(permissions.canManageTeam).toBe(true)
        expect(permissions.canManageSystem).toBe(false)
      })
    })

    describe("hasPermission", () => {
      it("should return true when user has permission", () => {
        const user = { role: UserRole.SUPER_ADMIN } as User
        const result = hasPermission(user, "canManageSystem")

        expect(result).toBe(true)
      })

      it("should return false when user lacks permission", () => {
        const user = { role: UserRole.USER } as User
        const result = hasPermission(user, "canManageSystem")

        expect(result).toBe(false)
      })
    })

    describe("addPermissionsToContext", () => {
      it("should add user permissions to context", async () => {
        const user = {
          id: "user-1",
          role: UserRole.TEAM_ADMIN,
        } as User

        mockCtx.state!.user = user

        const middleware = addPermissionsToContext()
        await middleware(mockCtx as Context, mockNext)

        expect(mockCtx.state!.permissions).toEqual(ROLE_PERMISSIONS[UserRole.TEAM_ADMIN])
        expect(mockNext).toHaveBeenCalled()
      })

      it("should handle missing user gracefully", async () => {
        const middleware = addPermissionsToContext()
        await middleware(mockCtx as Context, mockNext)

        expect(mockCtx.state!.permissions).toBeUndefined()
        expect(mockNext).toHaveBeenCalled()
      })
    })
  })
})
