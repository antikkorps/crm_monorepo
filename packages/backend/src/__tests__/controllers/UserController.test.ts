import { Context } from "koa"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { UserController } from "../../controllers/UserController"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Team } from "../../models/Team"
import { User, UserRole } from "../../models/User"
import { AvatarService } from "../../services/AvatarService"

// Mock les modèles et services
vi.mock("../../models/User")
vi.mock("../../models/Team")
vi.mock("../../models/MedicalInstitution")
vi.mock("../../services/AvatarService")
vi.mock("../../utils/logger", () => ({
  createError: vi.fn((message: string, status: number, code: string) => {
    const error = new Error(message) as any
    error.statusCode = status
    error.code = code
    return error
  }),
}))

describe("UserController", () => {
  let mockCtx: Partial<Context>
  let mockNext: any

  beforeEach(() => {
    mockCtx = {
      params: {},
      query: {},
      request: { body: {} },
      body: {},
      status: 200,
    }
    mockNext = vi.fn()
    vi.clearAllMocks()
  })

  describe("getUsers", () => {
    it("should return all users", async () => {
      const mockUsers = [
        { id: "user1", email: "user1@example.com", firstName: "John", lastName: "Doe" },
        { id: "user2", email: "user2@example.com", firstName: "Jane", lastName: "Smith" },
      ]

      vi.mocked(User.findAll).mockResolvedValue(mockUsers as any)

      await UserController.getUsers(mockCtx as Context, mockNext)

      expect(mockCtx.body).toEqual({
        success: true,
        data: mockUsers,
      })
    })

    it("should filter users by team", async () => {
      mockCtx.query = { teamId: "team1" }

      const mockUsers = [{ id: "user1", email: "user1@example.com", teamId: "team1" }]

      vi.mocked(User.findAll).mockResolvedValue(mockUsers as any)

      await UserController.getUsers(mockCtx as Context, mockNext)

      expect(User.findAll).toHaveBeenCalledWith({
        where: { teamId: "team1" },
        attributes: { exclude: ["passwordHash"] },
        order: [
          ["firstName", "ASC"],
          ["lastName", "ASC"],
        ],
      })
    })

    it("should filter users by role", async () => {
      mockCtx.query = { role: UserRole.SUPER_ADMIN }

      vi.mocked(User.findAll).mockResolvedValue([])

      await UserController.getUsers(mockCtx as Context, mockNext)

      expect(User.findAll).toHaveBeenCalledWith({
        where: { role: UserRole.SUPER_ADMIN },
        attributes: { exclude: ["passwordHash"] },
        order: [
          ["firstName", "ASC"],
          ["lastName", "ASC"],
        ],
      })
    })
  })

  describe("getUser", () => {
    it("should return user with team info", async () => {
      mockCtx.params = { id: "user1" }

      const mockUser = {
        id: "user1",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        getTeam: vi.fn().mockResolvedValue({ id: "team1", name: "Test Team" }),
        toJSON: () => ({
          id: "user1",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        }),
      }

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)

      await UserController.getUser(mockCtx as Context, mockNext)

      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          id: "user1",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          team: { id: "team1", name: "Test Team" },
        },
      })
    })

    it("should throw error when user not found", async () => {
      mockCtx.params = { id: "nonexistent" }
      vi.mocked(User.findByPk).mockResolvedValue(null)

      await expect(UserController.getUser(mockCtx as Context, mockNext)).rejects.toThrow(
        "User not found"
      )
    })
  })

  describe("updateUser", () => {
    it("should update user profile", async () => {
      mockCtx.params = { id: "user1" }
      mockCtx.request.body = {
        firstName: "Updated",
        lastName: "Name",
        email: "updated@example.com",
      }

      const mockUser = {
        id: "user1",
        email: "original@example.com",
        firstName: "Original",
        lastName: "Name",
        avatarSeed: "original-seed",
        save: vi.fn().mockResolvedValue(undefined),
        getTeam: vi.fn().mockResolvedValue(null),
        toJSON: () => ({
          id: "user1",
          email: "updated@example.com",
          firstName: "Updated",
          lastName: "Name",
        }),
      }

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)
      vi.mocked(User.findByEmail).mockResolvedValue(null)
      vi.mocked(AvatarService.generateSeedFromName).mockReturnValue("updated-name")

      await UserController.updateUser(mockCtx as Context, mockNext)

      expect(mockUser.firstName).toBe("Updated")
      expect(mockUser.lastName).toBe("Name")
      expect(mockUser.email).toBe("updated@example.com")
      expect(mockUser.avatarSeed).toBe("updated-name")
      expect(mockUser.save).toHaveBeenCalled()
    })

    it("should assign user to team", async () => {
      mockCtx.params = { id: "user1" }
      mockCtx.request.body = { teamId: "team1" }

      const mockUser = {
        id: "user1",
        teamId: null,
        save: vi.fn().mockResolvedValue(undefined),
        getTeam: vi.fn().mockResolvedValue({ id: "team1", name: "Test Team" }),
        toJSON: () => ({ id: "user1", teamId: "team1" }),
      }

      const mockTeam = { id: "team1", name: "Test Team" }

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)
      vi.mocked(Team.findByPk).mockResolvedValue(mockTeam as any)

      await UserController.updateUser(mockCtx as Context, mockNext)

      expect(mockUser.teamId).toBe("team1")
      expect(mockUser.save).toHaveBeenCalled()
    })

    it("should reject duplicate email", async () => {
      mockCtx.params = { id: "user1" }
      mockCtx.request.body = { email: "existing@example.com" }

      const mockUser = { id: "user1", email: "original@example.com" }
      const mockExistingUser = { id: "user2", email: "existing@example.com" }

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)
      vi.mocked(User.findByEmail).mockResolvedValue(mockExistingUser as any)

      await expect(
        UserController.updateUser(mockCtx as Context, mockNext)
      ).rejects.toThrow("Email already exists")
    })
  })

  describe("getUserAvatar", () => {
    it("should return user avatar metadata", async () => {
      mockCtx.params = { id: "user1" }

      const mockUser = {
        id: "user1",
        avatarSeed: "john-doe",
        getAvatarMetadata: vi.fn().mockReturnValue({
          seed: "john-doe",
          url: "https://api.dicebear.com/7.x/avataaars/svg?seed=john-doe",
          style: "avataaars",
        }),
      }

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)
      vi.mocked(AvatarService.generateAvatarFromSeed).mockReturnValue(
        "https://api.dicebear.com/7.x/avataaars/svg?seed=john-doe&size=200"
      )

      await UserController.getUserAvatar(mockCtx as Context, mockNext)

      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          seed: "john-doe",
          url: "https://api.dicebear.com/7.x/avataaars/svg?seed=john-doe&size=200",
          style: "avataaars",
        },
      })
    })

    it("should handle custom style and size", async () => {
      mockCtx.params = { id: "user1" }
      mockCtx.query = { style: "bottts", size: "150" }

      const mockUser = {
        id: "user1",
        avatarSeed: "john-doe",
        getAvatarMetadata: vi.fn().mockReturnValue({
          seed: "john-doe",
          url: "https://api.dicebear.com/7.x/bottts/svg?seed=john-doe",
          style: "bottts",
        }),
      }

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)
      vi.mocked(AvatarService.isValidStyle).mockReturnValue(true)
      vi.mocked(AvatarService.generateAvatarFromSeed).mockReturnValue(
        "https://api.dicebear.com/7.x/bottts/svg?seed=john-doe&size=150"
      )

      await UserController.getUserAvatar(mockCtx as Context, mockNext)

      expect(AvatarService.generateAvatarFromSeed).toHaveBeenCalledWith("john-doe", {
        style: "bottts",
        size: 150,
      })
    })
  })

  describe("updateUserAvatar", () => {
    it("should update user avatar", async () => {
      mockCtx.params = { id: "user1" }
      mockCtx.request.body = { forceNew: true }

      const mockUser = {
        id: "user1",
        updateAvatarSeed: vi.fn().mockResolvedValue(undefined),
        getAvatarMetadata: vi.fn().mockReturnValue({
          seed: "new-seed",
          url: "https://api.dicebear.com/7.x/avataaars/svg?seed=new-seed",
          style: "avataaars",
        }),
      }

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)

      await UserController.updateUserAvatar(mockCtx as Context, mockNext)

      expect(mockUser.updateAvatarSeed).toHaveBeenCalledWith(true)
      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          message: "Avatar updated successfully",
          avatar: {
            seed: "new-seed",
            url: "https://api.dicebear.com/7.x/avataaars/svg?seed=new-seed",
            style: "avataaars",
          },
        },
      })
    })
  })

  describe("assignInstitutions", () => {
    it("should assign institutions to user", async () => {
      mockCtx.params = { id: "user1" }
      mockCtx.request.body = { institutionIds: ["inst1", "inst2"] }

      const mockUser = { id: "user1", email: "user@example.com" }
      const mockInstitutions = [
        { id: "inst1", name: "Hospital A" },
        { id: "inst2", name: "Clinic B" },
      ]
      const mockUpdatedInstitutions = [
        { id: "inst1", name: "Hospital A", assignedUserId: "user1" },
        { id: "inst2", name: "Clinic B", assignedUserId: "user1" },
      ]

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)
      vi.mocked(MedicalInstitution.findAll)
        .mockResolvedValueOnce(mockInstitutions as any)
        .mockResolvedValueOnce(mockUpdatedInstitutions as any)
      vi.mocked(MedicalInstitution.update).mockResolvedValue([2] as any)

      await UserController.assignInstitutions(mockCtx as Context, mockNext)

      expect(MedicalInstitution.update).toHaveBeenCalledWith(
        { assignedUserId: "user1" },
        { where: { id: ["inst1", "inst2"] } }
      )
      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          message: "Institutions assigned successfully",
          assignedInstitutions: mockUpdatedInstitutions,
        },
      })
    })

    it("should validate institution IDs", async () => {
      mockCtx.params = { id: "user1" }
      mockCtx.request.body = { institutionIds: ["inst1", "nonexistent"] }

      const mockUser = { id: "user1" }
      const mockInstitutions = [{ id: "inst1", name: "Hospital A" }]

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)
      vi.mocked(MedicalInstitution.findAll).mockResolvedValue(mockInstitutions as any)

      await expect(
        UserController.assignInstitutions(mockCtx as Context, mockNext)
      ).rejects.toThrow("Some institutions not found")
    })

    it("should validate request body", async () => {
      mockCtx.params = { id: "user1" }
      mockCtx.request.body = { institutionIds: "not-an-array" }

      await expect(
        UserController.assignInstitutions(mockCtx as Context, mockNext)
      ).rejects.toThrow("Institution IDs must be an array")
    })
  })

  describe("getUserInstitutions", () => {
    it("should return user's assigned institutions", async () => {
      mockCtx.params = { id: "user1" }

      const mockUser = { id: "user1" }
      const mockInstitutions = [
        { id: "inst1", name: "Hospital A", assignedUserId: "user1" },
        { id: "inst2", name: "Clinic B", assignedUserId: "user1" },
      ]

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)
      vi.mocked(MedicalInstitution.findAll).mockResolvedValue(mockInstitutions as any)

      await UserController.getUserInstitutions(mockCtx as Context, mockNext)

      expect(MedicalInstitution.findAll).toHaveBeenCalledWith({
        where: { assignedUserId: "user1" },
        order: [["name", "ASC"]],
      })
      expect(mockCtx.body).toEqual({
        success: true,
        data: mockInstitutions,
      })
    })
  })

  describe("removeInstitutionAssignments", () => {
    it("should remove institution assignments", async () => {
      mockCtx.params = { id: "user1" }
      mockCtx.request.body = { institutionIds: ["inst1", "inst2"] }

      const mockUser = { id: "user1" }

      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)
      vi.mocked(MedicalInstitution.update).mockResolvedValue([2] as any)

      await UserController.removeInstitutionAssignments(mockCtx as Context, mockNext)

      expect(MedicalInstitution.update).toHaveBeenCalledWith(
        { assignedUserId: null },
        {
          where: {
            id: ["inst1", "inst2"],
            assignedUserId: "user1",
          },
        }
      )
      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          message: "Institution assignments removed successfully",
        },
      })
    })
  })
})
