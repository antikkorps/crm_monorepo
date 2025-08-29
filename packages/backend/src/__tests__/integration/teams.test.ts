import request from "supertest"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../../app"
import { sequelize } from "../../config/database"
import { Team } from "../../models/Team"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"

describe("Teams API", () => {
  let app: any
  let adminUser: User
  let regularUser: User
  let adminToken: string
  let userToken: string

  beforeEach(async () => {
    await sequelize.sync({ force: true })
    app = createApp()

    // Create test users
    adminUser = await User.createUser({
      email: "admin@example.com",
      password: "password123",
      firstName: "Admin",
      lastName: "User",
      role: UserRole.SUPER_ADMIN,
    })

    regularUser = await User.createUser({
      email: "user@example.com",
      password: "password123",
      firstName: "Regular",
      lastName: "User",
      role: UserRole.USER,
    })

    // Generate tokens
    adminToken = AuthService.generateAccessToken(adminUser.id, adminUser.role)
    userToken = AuthService.generateAccessToken(regularUser.id, regularUser.role)
  })

  afterEach(async () => {
    await sequelize.truncate({ cascade: true })
  })

  describe("GET /api/teams", () => {
    it("should get all teams for admin user", async () => {
      // Create test teams
      await Team.create({ name: "Team A", description: "First team" })
      await Team.create({ name: "Team B", description: "Second team" })

      const response = await request(app.callback())
        .get("/api/teams")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0]).toHaveProperty("memberCount", 0)
    })

    it("should deny access for regular user without permission", async () => {
      await request(app.callback())
        .get("/api/teams")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403)
    })

    it("should require authentication", async () => {
      await request(app.callback()).get("/api/teams").expect(401)
    })
  })

  describe("GET /api/teams/:id", () => {
    it("should get team by ID with members", async () => {
      const team = await Team.create({
        name: "Test Team",
        description: "Test description",
      })

      // Add a user to the team
      await regularUser.assignToTeam(team.id)

      const response = await request(app.callback())
        .get(`/api/teams/${team.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe("Test Team")
      expect(response.body.data.memberCount).toBe(1)
      expect(response.body.data.members).toHaveLength(1)
      expect(response.body.data.members[0].email).toBe("user@example.com")
    })

    it("should return 404 for non-existent team", async () => {
      const response = await request(app.callback())
        .get("/api/teams/non-existent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404)

      expect(response.body.error.code).toBe("TEAM_NOT_FOUND")
    })
  })

  describe("POST /api/teams", () => {
    it("should create new team", async () => {
      const teamData = {
        name: "New Team",
        description: "A new team for testing",
      }

      const response = await request(app.callback())
        .post("/api/teams")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(teamData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe(teamData.name)
      expect(response.body.data.description).toBe(teamData.description)
      expect(response.body.data.memberCount).toBe(0)
    })

    it("should create team without description", async () => {
      const teamData = {
        name: "Simple Team",
      }

      const response = await request(app.callback())
        .post("/api/teams")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(teamData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe(teamData.name)
      expect(response.body.data.description).toBeNull()
    })

    it("should reject duplicate team names", async () => {
      await Team.create({ name: "Existing Team" })

      const response = await request(app.callback())
        .post("/api/teams")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Existing Team" })
        .expect(409)

      expect(response.body.error.code).toBe("TEAM_NAME_EXISTS")
    })

    it("should validate required fields", async () => {
      const response = await request(app.callback())
        .post("/api/teams")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400)

      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("should deny access for regular user", async () => {
      await request(app.callback())
        .post("/api/teams")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "Test Team" })
        .expect(403)
    })
  })

  describe("PUT /api/teams/:id", () => {
    it("should update team", async () => {
      const team = await Team.create({
        name: "Original Team",
        description: "Original description",
      })

      const updateData = {
        name: "Updated Team",
        description: "Updated description",
      }

      const response = await request(app.callback())
        .put(`/api/teams/${team.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe(updateData.name)
      expect(response.body.data.description).toBe(updateData.description)
    })

    it("should reject duplicate names when updating", async () => {
      const team1 = await Team.create({ name: "Team 1" })
      const team2 = await Team.create({ name: "Team 2" })

      const response = await request(app.callback())
        .put(`/api/teams/${team2.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Team 1" })
        .expect(409)

      expect(response.body.error.code).toBe("TEAM_NAME_EXISTS")
    })

    it("should return 404 for non-existent team", async () => {
      await request(app.callback())
        .put("/api/teams/non-existent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Updated Team" })
        .expect(404)
    })
  })

  describe("DELETE /api/teams/:id", () => {
    it("should delete empty team", async () => {
      const team = await Team.create({ name: "Team to Delete" })

      await request(app.callback())
        .delete(`/api/teams/${team.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204)

      // Verify team is deleted
      const deletedTeam = await Team.findByPk(team.id)
      expect(deletedTeam).toBeNull()
    })

    it("should not delete team with members", async () => {
      const team = await Team.create({ name: "Team with Members" })
      await regularUser.assignToTeam(team.id)

      const response = await request(app.callback())
        .delete(`/api/teams/${team.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)

      expect(response.body.error.code).toBe("TEAM_HAS_MEMBERS")
    })

    it("should return 404 for non-existent team", async () => {
      await request(app.callback())
        .delete("/api/teams/non-existent-id")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404)
    })
  })

  describe("GET /api/teams/:id/members", () => {
    it("should get team members", async () => {
      const team = await Team.create({ name: "Team with Members" })
      await regularUser.assignToTeam(team.id)

      const response = await request(app.callback())
        .get(`/api/teams/${team.id}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].email).toBe("user@example.com")
      expect(response.body.data[0]).not.toHaveProperty("passwordHash")
    })

    it("should return empty array for team with no members", async () => {
      const team = await Team.create({ name: "Empty Team" })

      const response = await request(app.callback())
        .get(`/api/teams/${team.id}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(0)
    })
  })

  describe("POST /api/teams/:id/members", () => {
    it("should add member to team", async () => {
      const team = await Team.create({ name: "Test Team" })

      const response = await request(app.callback())
        .post(`/api/teams/${team.id}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: regularUser.id })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.teamId).toBe(team.id)

      // Verify user is assigned to team
      await regularUser.reload()
      expect(regularUser.teamId).toBe(team.id)
    })

    it("should not add user already in team", async () => {
      const team = await Team.create({ name: "Test Team" })
      await regularUser.assignToTeam(team.id)

      const response = await request(app.callback())
        .post(`/api/teams/${team.id}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: regularUser.id })
        .expect(409)

      expect(response.body.error.code).toBe("USER_ALREADY_MEMBER")
    })

    it("should validate required fields", async () => {
      const team = await Team.create({ name: "Test Team" })

      const response = await request(app.callback())
        .post(`/api/teams/${team.id}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400)

      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("DELETE /api/teams/:id/members/:userId", () => {
    it("should remove member from team", async () => {
      const team = await Team.create({ name: "Test Team" })
      await regularUser.assignToTeam(team.id)

      const response = await request(app.callback())
        .delete(`/api/teams/${team.id}/members/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verify user is removed from team
      await regularUser.reload()
      expect(regularUser.teamId).toBeUndefined()
    })

    it("should not remove user not in team", async () => {
      const team = await Team.create({ name: "Test Team" })

      const response = await request(app.callback())
        .delete(`/api/teams/${team.id}/members/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)

      expect(response.body.error.code).toBe("USER_NOT_MEMBER")
    })

    it("should return 404 for non-existent user", async () => {
      const team = await Team.create({ name: "Test Team" })

      await request(app.callback())
        .delete(`/api/teams/${team.id}/members/non-existent-id`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404)
    })
  })
})
