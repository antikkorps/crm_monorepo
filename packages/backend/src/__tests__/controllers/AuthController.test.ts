import { describe, it, expect, beforeEach } from "vitest"
import supertest from "supertest"
import bcrypt from "bcryptjs"
import { createMockUser, cleanDatabase } from "../helpers/db-mock"
import { createAuthenticatedUser } from "../helpers/auth-helpers"
import { sequelize } from "../../config/database"
import app from "../../app"

describe("AuthController", () => {
  beforeEach(async () => {
    await cleanDatabase(sequelize)
  })

  describe("POST /api/auth/login", () => {
    it("should login successfully with valid credentials", async () => {
      const plainPassword = "password123"
      const hashedPassword = await bcrypt.hash(plainPassword, 10)
      await createMockUser({
        email: "login@example.com",
        passwordHash: hashedPassword,
      })

      const response = await supertest(app.callback())
        .post("/api/auth/login")
        .send({
          email: "login@example.com",
          password: plainPassword,
        })
        .expect(200)

      expect(response.body).toHaveProperty("user")
      expect(response.body).toHaveProperty("tokens")
      expect(response.body.user.email).toBe("login@example.com")
      expect(response.body.tokens).toHaveProperty("accessToken")
      expect(response.body.tokens).toHaveProperty("refreshToken")
    })

    it("should return 400 for invalid email format", async () => {
      const response = await supertest(app.callback())
        .post("/api/auth/login")
        .send({
          email: "notanemail",
          password: "password123",
        })
        .expect(400)

      expect(response.body).toHaveProperty("error")
    })

    it("should return 400 for missing password", async () => {
      const response = await supertest(app.callback())
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
        })
        .expect(400)

      expect(response.body).toHaveProperty("error")
    })

    it("should return 401 for wrong password", async () => {
      const hashedPassword = await bcrypt.hash("correctpassword", 10)
      await createMockUser({
        email: "test@example.com",
        passwordHash: hashedPassword,
      })

      const response = await supertest(app.callback())
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(401)

      expect(response.body).toHaveProperty("error")
    })

    it("should return 401 for non-existent user", async () => {
      const response = await supertest(app.callback())
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123",
        })
        .expect(401)

      expect(response.body).toHaveProperty("error")
    })
  })

  describe("POST /api/auth/refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const plainPassword = "password123"
      const hashedPassword = await bcrypt.hash(plainPassword, 10)
      await createMockUser({
        email: "refresh@example.com",
        passwordHash: hashedPassword,
      })

      // Login to get tokens
      const loginResponse = await supertest(app.callback())
        .post("/api/auth/login")
        .send({
          email: "refresh@example.com",
          password: plainPassword,
        })

      const { refreshToken } = loginResponse.body.tokens

      // Use refresh token
      const response = await supertest(app.callback())
        .post("/api/auth/refresh")
        .send({ refreshToken })
        .expect(200)

      expect(response.body).toHaveProperty("accessToken")
      expect(response.body).toHaveProperty("refreshToken")
      expect(response.body).toHaveProperty("expiresIn")
    })

    it("should return 400 for missing refresh token", async () => {
      const response = await supertest(app.callback()).post("/api/auth/refresh").send({}).expect(400)

      expect(response.body).toHaveProperty("error")
    })

    it("should return 401 for invalid refresh token", async () => {
      const response = await supertest(app.callback())
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid.token.here" })
        .expect(401)

      expect(response.body).toHaveProperty("error")
    })
  })

  describe("POST /api/auth/logout", () => {
    it("should logout successfully", async () => {
      const user = await createAuthenticatedUser()

      const response = await supertest(app.callback())
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${user.token}`)
        .expect(200)

      expect(response.body).toHaveProperty("message")
    })

    it("should return 401 without authentication", async () => {
      await supertest(app.callback()).post("/api/auth/logout").expect(401)
    })
  })

  describe("GET /api/auth/me", () => {
    it("should return current user profile", async () => {
      const user = await createAuthenticatedUser("USER")

      const response = await supertest(app.callback())
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${user.token}`)
        .expect(200)

      expect(response.body).toHaveProperty("id", user.id)
      expect(response.body).toHaveProperty("email", user.email)
      expect(response.body).not.toHaveProperty("password")
    })

    it("should return 401 without authentication", async () => {
      await supertest(app.callback()).get("/api/auth/me").expect(401)
    })

    it("should return 401 with invalid token", async () => {
      await supertest(app.callback()).get("/api/auth/me").set("Authorization", "Bearer invalid.token").expect(401)
    })
  })

  describe("POST /api/auth/change-password", () => {
    it("should change password successfully", async () => {
      const plainPassword = "oldpassword123"
      const hashedPassword = await bcrypt.hash(plainPassword, 10)
      const user = await createMockUser({
        email: "changepass@example.com",
        passwordHash: hashedPassword,
      })

      // Login to get token
      const loginResponse = await supertest(app.callback())
        .post("/api/auth/login")
        .send({
          email: "changepass@example.com",
          password: plainPassword,
        })

      const { accessToken } = loginResponse.body.tokens

      // Change password
      const response = await supertest(app.callback())
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          oldPassword: plainPassword,
          newPassword: "newpassword456",
        })
        .expect(200)

      expect(response.body).toHaveProperty("message")

      // Verify can login with new password
      const newLoginResponse = await supertest(app.callback())
        .post("/api/auth/login")
        .send({
          email: "changepass@example.com",
          password: "newpassword456",
        })
        .expect(200)

      expect(newLoginResponse.body.user.id).toBe(user.id)
    })

    it("should return 400 for incorrect old password", async () => {
      const user = await createAuthenticatedUser()

      const response = await supertest(app.callback())
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${user.token}`)
        .send({
          oldPassword: "wrongoldpassword",
          newPassword: "newpassword456",
        })
        .expect(400)

      expect(response.body).toHaveProperty("error")
    })

    it("should return 401 without authentication", async () => {
      await supertest(app.callback())
        .post("/api/auth/change-password")
        .send({
          oldPassword: "oldpass",
          newPassword: "newpass",
        })
        .expect(401)
    })
  })
})
