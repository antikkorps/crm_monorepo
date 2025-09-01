import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { sequelize } from "../../config/database"
import { Team } from "../../models/Team"
import { User, UserRole } from "../../models/User"
import { AvatarService } from "../../services/AvatarService"

describe("User Model", () => {
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
    it("should create a user with valid data", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
        role: UserRole.USER,
      }

      const user = await User.createUser(userData)

      expect(user.id).toBeDefined()
      expect(user.email).toBe(userData.email)
      expect(user.firstName).toBe(userData.firstName)
      expect(user.lastName).toBe(userData.lastName)
      expect(user.role).toBe(userData.role)
      expect(user.isActive).toBe(true)
      expect(user.avatarSeed).toBeDefined()
      expect(user.passwordHash).toBeDefined()
      expect(user.createdAt).toBeDefined()
      expect(user.updatedAt).toBeDefined()
    })

    it("should create user with team assignment", async () => {
      const team = await Team.create({
        name: "Test Team",
      })

      const userData = {
        email: "team-user@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
        teamId: team.id,
      }

      const user = await User.createUser(userData)

      expect(user.teamId).toBe(team.id)
    })

    it("should generate avatar seed from name", async () => {
      const userData = {
        email: "avatar-test@example.com",
        password: "password123",
        firstName: "Avatar",
        lastName: "Test",
      }

      const user = await User.createUser(userData)
      const expectedSeed = AvatarService.generateSeedFromName("Avatar", "Test")

      expect(user.avatarSeed).toBe(expectedSeed)
    })

    it("should default to USER role", async () => {
      const userData = {
        email: "default-role@example.com",
        password: "password123",
        firstName: "Default",
        lastName: "User",
      }

      const user = await User.createUser(userData)

      expect(user.role).toBe(UserRole.USER)
    })

    it("should normalize email to lowercase", async () => {
      const userData = {
        email: "UPPERCASE@EXAMPLE.COM",
        password: "password123",
        firstName: "Upper",
        lastName: "Case",
      }

      const user = await User.createUser(userData)

      expect(user.email).toBe("uppercase@example.com")
    })
  })

  describe("Authentication Methods", () => {
    let user: User

    beforeEach(async () => {
      user = await User.createUser({
        email: "auth-test@example.com",
        password: "password123",
        firstName: "Auth",
        lastName: "Test",
      })
    })

    it("should validate correct password", async () => {
      const isValid = await user.validatePassword("password123")
      expect(isValid).toBe(true)
    })

    it("should reject incorrect password", async () => {
      const isValid = await user.validatePassword("wrongpassword")
      expect(isValid).toBe(false)
    })

    it("should hash password securely", async () => {
      expect(user.passwordHash).not.toBe("password123")
      expect(user.passwordHash.length).toBeGreaterThan(50)
    })

    it("should find user by email", async () => {
      const foundUser = await User.findByEmail("auth-test@example.com")

      expect(foundUser).toBeDefined()
      expect(foundUser!.id).toBe(user.id)
    })

    it("should find user by email case-insensitive", async () => {
      const foundUser = await User.findByEmail("AUTH-TEST@EXAMPLE.COM")

      expect(foundUser).toBeDefined()
      expect(foundUser!.id).toBe(user.id)
    })

    it("should return null for non-existent email", async () => {
      const foundUser = await User.findByEmail("nonexistent@example.com")
      expect(foundUser).toBeNull()
    })
  })

  describe("Avatar Methods", () => {
    let user: User

    beforeEach(async () => {
      user = await User.createUser({
        email: "avatar-user@example.com",
        password: "password123",
        firstName: "Avatar",
        lastName: "User",
      })
    })

    it("should generate avatar URL", () => {
      const avatarUrl = user.getAvatarUrl()

      expect(avatarUrl).toContain("api.dicebear.com")
      expect(avatarUrl).toContain(user.avatarSeed)
    })

    it("should generate avatar URL with custom style", () => {
      const avatarUrl = user.getAvatarUrl("bottts")

      expect(avatarUrl).toContain("bottts")
      expect(avatarUrl).toContain(user.avatarSeed)
    })

    it("should get avatar metadata", () => {
      const metadata = user.getAvatarMetadata()

      expect(metadata.seed).toBe(user.avatarSeed)
      expect(metadata.url).toContain(user.avatarSeed)
      expect(metadata.style).toBe("avataaars") // default style
    })

    it("should update avatar seed", async () => {
      const originalSeed = user.avatarSeed

      await user.updateAvatarSeed(true) // force new seed

      expect(user.avatarSeed).not.toBe(originalSeed)
    })

    it("should update avatar seed based on name", async () => {
      user.firstName = "Updated"
      user.lastName = "Name"

      await user.updateAvatarSeed(false) // use name-based seed

      const expectedSeed = AvatarService.generateSeedFromName("Updated", "Name")
      expect(user.avatarSeed).toBe(expectedSeed)
    })

    it("should include avatar URL in JSON output", () => {
      const userJson = user.toJSON()

      expect(userJson.avatarUrl).toBeDefined()
      expect(userJson.avatarUrl).toContain(user.avatarSeed)
      expect(userJson.passwordHash).toBeUndefined()
    })
  })

  describe("Team Methods", () => {
    let team: Team
    let user: User

    beforeEach(async () => {
      team = await Team.create({
        name: "Test Team",
        description: "Team for testing",
      })

      user = await User.createUser({
        email: "team-user@example.com",
        password: "password123",
        firstName: "Team",
        lastName: "User",
        teamId: team.id,
      })
    })

    it("should get user's team", async () => {
      const userTeam = await user.getTeam()

      expect(userTeam).toBeDefined()
      expect(userTeam.id).toBe(team.id)
      expect(userTeam.name).toBe(team.name)
    })

    it("should return null for user without team", async () => {
      const userWithoutTeam = await User.createUser({
        email: "no-team@example.com",
        password: "password123",
        firstName: "No",
        lastName: "Team",
      })

      const userTeam = await userWithoutTeam.getTeam()
      expect(userTeam).toBeNull()
    })

    it("should assign user to team", async () => {
      const newTeam = await Team.create({
        name: "New Team",
      })

      const userWithoutTeam = await User.createUser({
        email: "assign-team@example.com",
        password: "password123",
        firstName: "Assign",
        lastName: "Team",
      })

      await userWithoutTeam.assignToTeam(newTeam.id)

      expect(userWithoutTeam.teamId).toBe(newTeam.id)
    })

    it("should remove user from team", async () => {
      expect(user.teamId).toBe(team.id)

      await user.removeFromTeam()

      expect(user.teamId).toBeUndefined()
    })
  })

  describe("Static Team Methods", () => {
    let team1: Team
    let team2: Team

    beforeEach(async () => {
      team1 = await Team.create({ name: "Team 1" })
      team2 = await Team.create({ name: "Team 2" })

      await User.createUser({
        email: "user1@example.com",
        password: "password123",
        firstName: "User",
        lastName: "One",
        teamId: team1.id,
      })

      await User.createUser({
        email: "user2@example.com",
        password: "password123",
        firstName: "User",
        lastName: "Two",
        teamId: team1.id,
      })

      await User.createUser({
        email: "user3@example.com",
        password: "password123",
        firstName: "User",
        lastName: "Three",
        teamId: team2.id,
      })

      await User.createUser({
        email: "user4@example.com",
        password: "password123",
        firstName: "User",
        lastName: "Four",
        // No team assigned
      })
    })

    it("should find users by team", async () => {
      const team1Users = await User.findByTeam(team1.id)

      expect(team1Users).toHaveLength(2)
      expect(team1Users.map((u) => u.email).sort()).toEqual([
        "user1@example.com",
        "user2@example.com",
      ])
    })

    it("should find users without team", async () => {
      const usersWithoutTeam = await User.findWithoutTeam()

      expect(usersWithoutTeam).toHaveLength(1)
      expect(usersWithoutTeam[0].email).toBe("user4@example.com")
    })

    it("should exclude inactive users from team queries", async () => {
      // Deactivate one user
      const user = await User.findByEmail("user1@example.com")
      user!.isActive = false
      await user!.save()

      const team1Users = await User.findByTeam(team1.id)

      expect(team1Users).toHaveLength(1)
      expect(team1Users[0].email).toBe("user2@example.com")
    })
  })

  describe("Utility Methods", () => {
    let user: User

    beforeEach(async () => {
      user = await User.createUser({
        email: "utility-test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      })
    })

    it("should get full name", () => {
      const fullName = user.getFullName()
      expect(fullName).toBe("John Doe")
    })

    it("should exclude password hash from JSON", () => {
      const userJson = user.toJSON()

      expect(userJson.passwordHash).toBeUndefined()
      expect(userJson.email).toBe(user.email)
      expect(userJson.firstName).toBe(user.firstName)
    })
  })

  describe("Model Validations", () => {
    it("should validate email format", async () => {
      await expect(
        User.createUser({
          email: "invalid-email",
          password: "password123",
          firstName: "Invalid",
          lastName: "Email",
        })
      ).rejects.toThrow()
    })

    it("should enforce unique email constraint", async () => {
      const userData = {
        email: "duplicate@example.com",
        password: "password123",
        firstName: "First",
        lastName: "User",
      }

      await User.createUser(userData)

      await expect(
        User.createUser({
          ...userData,
          firstName: "Second",
          lastName: "User",
        })
      ).rejects.toThrow()
    })

    it("should validate name length constraints", async () => {
      await expect(
        User.createUser({
          email: "long-name@example.com",
          password: "password123",
          firstName: "a".repeat(51), // Exceeds 50 character limit
          lastName: "Doe",
        })
      ).rejects.toThrow()
    })

    it("should require non-empty names", async () => {
      await expect(
        User.createUser({
          email: "empty-name@example.com",
          password: "password123",
          firstName: "",
          lastName: "Doe",
        })
      ).rejects.toThrow()
    })
  })
})
