import Koa from "koa"
import bodyParser from "koa-bodyparser"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { errorHandler } from "../../middleware/errorHandler"
import { Team } from "../../models/Team"
import { User, UserRole } from "../../models/User"
import teamRoutes from "../../routes/teams"
import userRoutes from "../../routes/users"
import { AuthService } from "../../services/AuthService"

describe("Team and User API Integration", () => {
  let app: Koa
  let adminUser: User
  let regularUser: User
  let adminToken: string
  let userToken: string

  beforeEach(async () => {
    // Only sync the models we need
    await User.sync({ force: true })
    await Team.sync({ force: true })

    // Create simple Koa app for testing
    app = new Koa()
    app.use(errorHandler)
    app.use(bodyParser())
    app.use(teamRoutes.routes())
    app.use(teamRoutes.allowedMethods())
    app.use(userRoutes.routes())
    app.use(userRoutes.allowedMethods())

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
    await User.destroy({ where: {}, force: true })
    await Team.destroy({ where: {}, force: true })
  })

  describe("Team Management", () => {
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
    })

    describe("Team Member Management", () => {
      it("should add and remove team members", async () => {
        const team = await Team.create({ name: "Test Team" })

        // Add member to team
        const addResponse = await request(app.callback())
          .post(`/api/teams/${team.id}/members`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ userId: regularUser.id })
          .expect(200)

        expect(addResponse.body.success).toBe(true)
        expect(addResponse.body.data.user.teamId).toBe(team.id)

        // Verify user is assigned to team
        await regularUser.reload()
        expect(regularUser.teamId).toBe(team.id)

        // Get team members
        const membersResponse = await request(app.callback())
          .get(`/api/teams/${team.id}/members`)
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200)

        expect(membersResponse.body.success).toBe(true)
        expect(membersResponse.body.data).toHaveLength(1)
        expect(membersResponse.body.data[0].email).toBe("user@example.com")

        // Remove member from team
        const removeResponse = await request(app.callback())
          .delete(`/api/teams/${team.id}/members/${regularUser.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200)

        expect(removeResponse.body.success).toBe(true)

        // Verify user is removed from team
        await regularUser.reload()
        expect(regularUser.teamId).toBeUndefined()
      })
    })
  })

  describe("User Management", () => {
    describe("GET /api/users", () => {
      it("should get all users for admin", async () => {
        const response = await request(app.callback())
          .get("/api/users")
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveLength(2)
        expect(response.body.data[0]).not.toHaveProperty("passwordHash")
      })

      it("should filter users by team", async () => {
        const team = await Team.create({ name: "Test Team" })
        await regularUser.assignToTeam(team.id)

        const response = await request(app.callback())
          .get(`/api/users?teamId=${team.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0].email).toBe("user@example.com")
      })
    })

    describe("PUT /api/users/:id", () => {
      it("should update user profile", async () => {
        const updateData = {
          firstName: "Updated",
          lastName: "Name",
          email: "updated@example.com",
        }

        const response = await request(app.callback())
          .put(`/api/users/${regularUser.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.data.firstName).toBe(updateData.firstName)
        expect(response.body.data.lastName).toBe(updateData.lastName)
        expect(response.body.data.email).toBe(updateData.email)
      })

      it("should assign user to team", async () => {
        const team = await Team.create({ name: "Test Team" })

        const response = await request(app.callback())
          .put(`/api/users/${regularUser.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ teamId: team.id })
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.data.teamId).toBe(team.id)
        expect(response.body.data.team.name).toBe("Test Team")
      })
    })

    describe("Avatar Management", () => {
      it("should get and update user avatar", async () => {
        // Get avatar
        const getResponse = await request(app.callback())
          .get(`/api/users/${regularUser.id}/avatar`)
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200)

        expect(getResponse.body.success).toBe(true)
        expect(getResponse.body.data).toHaveProperty("seed")
        expect(getResponse.body.data).toHaveProperty("url")
        expect(getResponse.body.data.url).toContain("api.dicebear.com")

        const originalSeed = getResponse.body.data.seed

        // Update avatar
        const updateResponse = await request(app.callback())
          .put(`/api/users/${regularUser.id}/avatar`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ forceNew: true })
          .expect(200)

        expect(updateResponse.body.success).toBe(true)
        expect(updateResponse.body.data.avatar.seed).not.toBe(originalSeed)
      })
    })
  })
})
