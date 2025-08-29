import { Context } from "koa"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TeamController } from "../../controllers/TeamController"
import { Team } from "../../models/Team"
import { User } from "../../models/User"

// Mock les modèles et utilitaires
vi.mock("../../models/Team")
vi.mock("../../models/User")
vi.mock("../../utils/logger", () => ({
  createError: vi.fn((message: string, status: number, code: string) => {
    const error = new Error(message) as any
    error.statusCode = status
    error.code = code
    return error
  }),
}))

describe("TeamController", () => {
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

  describe("getTeams", () => {
    it("should return all active teams with member counts", async () => {
      const mockTeams = [
        {
          id: "team1",
          name: "Team 1",
          description: "First team",
          isActive: true,
          toJSON: () => ({ id: "team1", name: "Team 1", description: "First team" }),
          getMemberCount: vi.fn().mockResolvedValue(5),
        },
        {
          id: "team2",
          name: "Team 2",
          description: "Second team",
          isActive: true,
          toJSON: () => ({ id: "team2", name: "Team 2", description: "Second team" }),
          getMemberCount: vi.fn().mockResolvedValue(3),
        },
      ]

      vi.mocked(Team.getActiveTeams).mockResolvedValue(mockTeams as any)

      await TeamController.getTeams(mockCtx as Context, mockNext)

      expect(mockCtx.body).toEqual({
        success: true,
        data: [
          { id: "team1", name: "Team 1", description: "First team", memberCount: 5 },
          { id: "team2", name: "Team 2", description: "Second team", memberCount: 3 },
        ],
      })
    })
  })

  describe("getTeam", () => {
    it("should return team with members and member count", async () => {
      mockCtx.params = { id: "team1" }

      const mockTeam = {
        id: "team1",
        name: "Test Team",
        description: "Test description",
        toJSON: () => ({
          id: "team1",
          name: "Test Team",
          description: "Test description",
        }),
        getActiveMembers: vi.fn().mockResolvedValue([
          {
            id: "user1",
            email: "user1@example.com",
            firstName: "John",
            lastName: "Doe",
          },
        ]),
        getMemberCount: vi.fn().mockResolvedValue(1),
      }

      vi.mocked(Team.findByPk).mockResolvedValue(mockTeam as any)

      await TeamController.getTeam(mockCtx as Context, mockNext)

      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          id: "team1",
          name: "Test Team",
          description: "Test description",
          members: [
            {
              id: "user1",
              email: "user1@example.com",
              firstName: "John",
              lastName: "Doe",
            },
          ],
          memberCount: 1,
        },
      })
    })

    it("should throw error when team not found", async () => {
      mockCtx.params = { id: "nonexistent" }
      vi.mocked(Team.findByPk).mockResolvedValue(null)

      await expect(TeamController.getTeam(mockCtx as Context, mockNext)).rejects.toThrow(
        "Team not found"
      )
    })
  })

  describe("createTeam", () => {
    it("should create new team successfully", async () => {
      mockCtx.request.body = {
        name: "New Team",
        description: "A new team for testing",
      }

      const mockCreatedTeam = {
        id: "new-team-id",
        name: "New Team",
        description: "A new team for testing",
        isActive: true,
        toJSON: () => ({
          id: "new-team-id",
          name: "New Team",
          description: "A new team for testing",
          isActive: true,
        }),
      }

      vi.mocked(Team.findByName).mockResolvedValue(null)
      vi.mocked(Team.createTeam).mockResolvedValue(mockCreatedTeam as any)

      await TeamController.createTeam(mockCtx as Context, mockNext)

      expect(mockCtx.status).toBe(201)
      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          id: "new-team-id",
          name: "New Team",
          description: "A new team for testing",
          isActive: true,
          memberCount: 0,
        },
      })
    })

    it("should throw error for duplicate team name", async () => {
      mockCtx.request.body = { name: "Existing Team" }

      const mockExistingTeam = { id: "existing-id", name: "Existing Team" }
      vi.mocked(Team.findByName).mockResolvedValue(mockExistingTeam as any)

      await expect(
        TeamController.createTeam(mockCtx as Context, mockNext)
      ).rejects.toThrow("Team name already exists")
    })

    it("should throw error for missing team name", async () => {
      mockCtx.request.body = {}

      await expect(
        TeamController.createTeam(mockCtx as Context, mockNext)
      ).rejects.toThrow("Team name is required")
    })
  })

  describe("updateTeam", () => {
    it("should update team successfully", async () => {
      mockCtx.params = { id: "team1" }
      mockCtx.request.body = {
        name: "Updated Team",
        description: "Updated description",
      }

      const mockTeam = {
        id: "team1",
        name: "Original Team",
        description: "Original description",
        save: vi.fn().mockResolvedValue(undefined),
        toJSON: () => ({
          id: "team1",
          name: "Updated Team",
          description: "Updated description",
        }),
        getMemberCount: vi.fn().mockResolvedValue(2),
      }

      vi.mocked(Team.findByPk).mockResolvedValue(mockTeam as any)
      vi.mocked(Team.findByName).mockResolvedValue(null)

      await TeamController.updateTeam(mockCtx as Context, mockNext)

      expect(mockTeam.name).toBe("Updated Team")
      expect(mockTeam.description).toBe("Updated description")
      expect(mockTeam.save).toHaveBeenCalled()
      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          id: "team1",
          name: "Updated Team",
          description: "Updated description",
          memberCount: 2,
        },
      })
    })
  })

  describe("deleteTeam", () => {
    it("should delete empty team successfully", async () => {
      mockCtx.params = { id: "team1" }

      const mockTeam = {
        id: "team1",
        name: "Team to Delete",
        getMemberCount: vi.fn().mockResolvedValue(0),
        destroy: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(Team.findByPk).mockResolvedValue(mockTeam as any)

      await TeamController.deleteTeam(mockCtx as Context, mockNext)

      expect(mockTeam.destroy).toHaveBeenCalled()
      expect(mockCtx.status).toBe(204)
    })

    it("should not delete team with members", async () => {
      mockCtx.params = { id: "team1" }

      const mockTeam = {
        id: "team1",
        name: "Team with Members",
        getMemberCount: vi.fn().mockResolvedValue(3),
      }

      vi.mocked(Team.findByPk).mockResolvedValue(mockTeam as any)

      await expect(
        TeamController.deleteTeam(mockCtx as Context, mockNext)
      ).rejects.toThrow("Cannot delete team with active members")
    })
  })

  describe("addTeamMember", () => {
    it("should add member to team successfully", async () => {
      mockCtx.params = { id: "team1" }
      mockCtx.request.body = { userId: "user1" }

      const mockTeam = { id: "team1", name: "Test Team" }
      const mockUser = {
        id: "user1",
        email: "user@example.com",
        teamId: null,
        assignToTeam: vi.fn().mockResolvedValue(undefined),
        toJSON: () => ({ id: "user1", email: "user@example.com", teamId: "team1" }),
      }

      vi.mocked(Team.findByPk).mockResolvedValue(mockTeam as any)
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)

      await TeamController.addTeamMember(mockCtx as Context, mockNext)

      expect(mockUser.assignToTeam).toHaveBeenCalledWith("team1")
      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          message: "User added to team successfully",
          user: { id: "user1", email: "user@example.com", teamId: "team1" },
        },
      })
    })

    it("should not add user already in team", async () => {
      mockCtx.params = { id: "team1" }
      mockCtx.request.body = { userId: "user1" }

      const mockTeam = { id: "team1", name: "Test Team" }
      const mockUser = { id: "user1", teamId: "team1" }

      vi.mocked(Team.findByPk).mockResolvedValue(mockTeam as any)
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)

      await expect(
        TeamController.addTeamMember(mockCtx as Context, mockNext)
      ).rejects.toThrow("User is already a member of this team")
    })
  })

  describe("removeTeamMember", () => {
    it("should remove member from team successfully", async () => {
      mockCtx.params = { id: "team1", userId: "user1" }

      const mockTeam = { id: "team1", name: "Test Team" }
      const mockUser = {
        id: "user1",
        teamId: "team1",
        removeFromTeam: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(Team.findByPk).mockResolvedValue(mockTeam as any)
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)

      await TeamController.removeTeamMember(mockCtx as Context, mockNext)

      expect(mockUser.removeFromTeam).toHaveBeenCalled()
      expect(mockCtx.body).toEqual({
        success: true,
        data: {
          message: "User removed from team successfully",
        },
      })
    })

    it("should not remove user not in team", async () => {
      mockCtx.params = { id: "team1", userId: "user1" }

      const mockTeam = { id: "team1", name: "Test Team" }
      const mockUser = { id: "user1", teamId: "team2" }

      vi.mocked(Team.findByPk).mockResolvedValue(mockTeam as any)
      vi.mocked(User.findByPk).mockResolvedValue(mockUser as any)

      await expect(
        TeamController.removeTeamMember(mockCtx as Context, mockNext)
      ).rejects.toThrow("User is not a member of this team")
    })
  })
})
