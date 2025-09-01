import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { sequelize } from "../../config/database"
import { Team } from "../../models/Team"
import { User } from "../../models/User"

describe("Team Model", () => {
  beforeEach(async () => {
    try {
      if (process.env.NODE_ENV === "test") {
        // For pg-mem, just clean tables data without recreating schema
        await User.destroy({ where: {}, force: true })
        await Team.destroy({ where: {}, force: true })
      } else {
        await sequelize.sync({ force: true })
      }
    } catch (error) {
      console.warn("Database cleanup warning:", error.message)
      // Fallback: try sync without force
      try {
        await sequelize.sync()
      } catch (syncError) {
        console.warn("Database sync warning:", syncError.message)
      }
    }
  })

  afterEach(async () => {
    // Clean up is handled in beforeEach
  })

  describe("Model Creation", () => {
    it("should create a team with valid data", async () => {
      const teamData = {
        name: "Sales Team",
        description: "Main sales team for medical institutions",
      }

      const team = await Team.create(teamData)

      expect(team.id).toBeDefined()
      expect(team.name).toBe(teamData.name)
      expect(team.description).toBe(teamData.description)
      expect(team.isActive).toBe(true)
      expect(team.createdAt).toBeDefined()
      expect(team.updatedAt).toBeDefined()
    })

    it("should create a team without description", async () => {
      const teamData = {
        name: "Support Team",
      }

      const team = await Team.create(teamData)

      expect(team.name).toBe(teamData.name)
      expect(team.description).toBeNull()
      expect(team.isActive).toBe(true)
    })

    it("should enforce unique team names", async () => {
      const teamData = {
        name: "Duplicate Team",
      }

      await Team.create(teamData)

      await expect(Team.create(teamData)).rejects.toThrow()
    })

    it("should validate team name length", async () => {
      const teamData = {
        name: "", // Empty name
      }

      await expect(Team.create(teamData)).rejects.toThrow()
    })
  })

  describe("Static Methods", () => {
    it("should create team using createTeam method", async () => {
      const teamData = {
        name: "Marketing Team",
        description: "Digital marketing team",
      }

      const team = await Team.createTeam(teamData)

      expect(team.name).toBe(teamData.name)
      expect(team.description).toBe(teamData.description)
      expect(team.isActive).toBe(true)
    })

    it("should find team by name", async () => {
      const teamData = {
        name: "Research Team",
      }

      const createdTeam = await Team.create(teamData)
      const foundTeam = await Team.findByName(teamData.name)

      expect(foundTeam).toBeDefined()
      expect(foundTeam!.id).toBe(createdTeam.id)
      expect(foundTeam!.name).toBe(teamData.name)
    })

    it("should return null when team not found by name", async () => {
      const foundTeam = await Team.findByName("Non-existent Team")
      expect(foundTeam).toBeNull()
    })

    it("should get active teams only", async () => {
      await Team.create({ name: "Active Team 1", isActive: true })
      await Team.create({ name: "Active Team 2", isActive: true })
      await Team.create({ name: "Inactive Team", isActive: false })

      const activeTeams = await Team.getActiveTeams()

      expect(activeTeams).toHaveLength(2)
      expect(activeTeams.every((team) => team.isActive)).toBe(true)
      expect(activeTeams.map((team) => team.name).sort()).toEqual([
        "Active Team 1",
        "Active Team 2",
      ])
    })
  })

  describe("Instance Methods", () => {
    let team: Team
    let user1: User
    let user2: User

    beforeEach(async () => {
      team = await Team.create({
        name: "Test Team",
        description: "Team for testing",
      })

      user1 = await User.createUser({
        email: "user1@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        teamId: team.id,
      })

      user2 = await User.createUser({
        email: "user2@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
        teamId: team.id,
      })
    })

    it("should get member count", async () => {
      const memberCount = await team.getMemberCount()
      expect(memberCount).toBe(2)
    })

    it("should get all team members", async () => {
      const members = await team.getMembers()

      expect(members).toHaveLength(2)
      expect(members.map((m) => m.email).sort()).toEqual([
        "user1@example.com",
        "user2@example.com",
      ])
      // Ensure password hash is not included
      expect(members[0].passwordHash).toBeUndefined()
    })

    it("should get active members only", async () => {
      // Deactivate one user
      user2.isActive = false
      await user2.save()

      const activeMembers = await team.getActiveMembers()

      expect(activeMembers).toHaveLength(1)
      expect(activeMembers[0].email).toBe("user1@example.com")
    })

    it("should return zero member count for team with no members", async () => {
      const emptyTeam = await Team.create({
        name: "Empty Team",
      })

      const memberCount = await emptyTeam.getMemberCount()
      expect(memberCount).toBe(0)
    })
  })

  describe("Model Validations", () => {
    it("should require team name", async () => {
      await expect(
        Team.create({
          description: "Team without name",
        } as any)
      ).rejects.toThrow()
    })

    it("should validate name length constraints", async () => {
      const longName = "a".repeat(101) // Exceeds 100 character limit

      await expect(
        Team.create({
          name: longName,
        })
      ).rejects.toThrow()
    })

    it("should allow null description", async () => {
      const team = await Team.create({
        name: "Team with null description",
        description: null,
      })

      expect(team.description).toBeNull()
    })
  })

  describe("Database Constraints", () => {
    it("should enforce unique constraint on team name", async () => {
      const teamName = "Unique Team Name"

      await Team.create({ name: teamName })

      await expect(Team.create({ name: teamName })).rejects.toThrow()
    })

    it("should handle case sensitivity in team names", async () => {
      await Team.create({ name: "Case Sensitive Team" })

      // Different case should be allowed (database dependent)
      const team2 = await Team.create({ name: "case sensitive team" })
      expect(team2.name).toBe("case sensitive team")
    })
  })
})
