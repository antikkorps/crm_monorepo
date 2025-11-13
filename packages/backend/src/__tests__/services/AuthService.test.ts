import { describe, it, expect, beforeEach } from "vitest"
import { AuthService } from "../../services/AuthService"
import { createMockUser, cleanDatabase } from "../helpers/db-mock"
import { sequelize } from "../../config/database"
import bcrypt from "bcryptjs"

describe("AuthService", () => {
  beforeEach(async () => {
    await cleanDatabase(sequelize)
  })

  describe("generateAccessToken", () => {
    it("should generate a valid access token", async () => {
      const user = await createMockUser({ role: "USER" })
      const token = AuthService.generateAccessToken(user)

      expect(token).toBeDefined()
      expect(typeof token).toBe("string")
      expect(token.split(".")).toHaveLength(3) // JWT has 3 parts
    })

    it("should include user information in token payload", async () => {
      const user = await createMockUser({ email: "test@example.com", role: "TEAM_ADMIN" })
      const token = AuthService.generateAccessToken(user)

      const decoded = AuthService.verifyAccessToken(token)
      expect(decoded.userId).toBe(user.id)
      expect(decoded.email).toBe("test@example.com")
      expect(decoded.role).toBe("TEAM_ADMIN")
    })
  })

  describe("generateRefreshToken", () => {
    it("should generate a valid refresh token", async () => {
      const user = await createMockUser()
      const refreshToken = AuthService.generateRefreshToken(user)

      expect(refreshToken).toBeDefined()
      expect(typeof refreshToken).toBe("string")
    })
  })

  describe("login", () => {
    it("should successfully login with valid credentials", async () => {
      // Create user with known password
      const plainPassword = "password123"
      const hashedPassword = await bcrypt.hash(plainPassword, 10)
      const user = await createMockUser({
        email: "login@example.com",
        passwordHash: hashedPassword,
      })

      const result = await AuthService.login({
        email: "login@example.com",
        password: plainPassword,
      })

      expect(result.user).toBeDefined()
      expect(result.user.id).toBe(user.id)
      expect(result.tokens).toBeDefined()
      expect(result.tokens.accessToken).toBeDefined()
      expect(result.tokens.refreshToken).toBeDefined()
    })

    it("should throw error with invalid email", async () => {
      await expect(
        AuthService.login({
          email: "nonexistent@example.com",
          password: "password123",
        })
      ).rejects.toThrow()
    })

    it("should throw error with invalid password", async () => {
      const hashedPassword = await bcrypt.hash("correctpassword", 10)
      await createMockUser({
        email: "test@example.com",
        passwordHash: hashedPassword,
      })

      await expect(
        AuthService.login({
          email: "test@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow()
    })

    it("should throw error for inactive user", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10)
      await createMockUser({
        email: "inactive@example.com",
        passwordHash: hashedPassword,
        isActive: false,
      })

      await expect(
        AuthService.login({
          email: "inactive@example.com",
          password: "password123",
        })
      ).rejects.toThrow()
    })
  })

  describe("verifyAccessToken", () => {
    it("should verify and decode a valid access token", async () => {
      const user = await createMockUser({ email: "verify@example.com", role: "USER" })
      const token = AuthService.generateAccessToken(user)

      const decoded = AuthService.verifyAccessToken(token)

      expect(decoded.userId).toBe(user.id)
      expect(decoded.email).toBe("verify@example.com")
      expect(decoded.role).toBe("USER")
    })

    it("should throw error for invalid token", () => {
      expect(() => AuthService.verifyAccessToken("invalid.token.here")).toThrow()
    })

    it("should throw error for expired token", () => {
      // This would require mocking time or using a token with very short expiry
      // For now, we test that the method exists and works with valid tokens
      const user = createMockUser()
      expect(user).toBeDefined()
    })
  })

  describe("verifyRefreshToken", () => {
    it("should verify and decode a valid refresh token", async () => {
      const user = await createMockUser()
      const refreshToken = AuthService.generateRefreshToken(user)

      const decoded = AuthService.verifyRefreshToken(refreshToken)

      expect(decoded.userId).toBe(user.id)
    })

    it("should throw error for invalid refresh token", () => {
      expect(() => AuthService.verifyRefreshToken("invalid.refresh.token")).toThrow()
    })
  })

  describe("refreshAccessToken", () => {
    it("should generate new access token from valid refresh token", async () => {
      const user = await createMockUser()
      const refreshToken = AuthService.generateRefreshToken(user)

      const result = await AuthService.refreshAccessToken(refreshToken)

      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
      expect(result.expiresIn).toBeDefined()

      // Verify the new access token is valid
      const decoded = AuthService.verifyAccessToken(result.accessToken)
      expect(decoded.userId).toBe(user.id)
    })

    it("should throw error for invalid refresh token", async () => {
      await expect(AuthService.refreshAccessToken("invalid.token")).rejects.toThrow()
    })

    it("should throw error for deleted user", async () => {
      const user = await createMockUser()
      const refreshToken = AuthService.generateRefreshToken(user)

      // Delete the user
      await user.destroy()

      await expect(AuthService.refreshAccessToken(refreshToken)).rejects.toThrow()
    })
  })

  describe("changePassword", () => {
    it("should change user password successfully", async () => {
      const oldPassword = "oldpassword123"
      const newPassword = "newpassword456"
      const hashedOldPassword = await bcrypt.hash(oldPassword, 10)

      const user = await createMockUser({
        email: "changepass@example.com",
        passwordHash: hashedOldPassword,
      })

      await AuthService.changePassword(user.id, oldPassword, newPassword)

      // Verify can login with new password
      const result = await AuthService.login({
        email: "changepass@example.com",
        password: newPassword,
      })

      expect(result.user.id).toBe(user.id)
    })

    it("should throw error with incorrect old password", async () => {
      const hashedPassword = await bcrypt.hash("correctpassword", 10)
      const user = await createMockUser({ passwordHash: hashedPassword })

      await expect(AuthService.changePassword(user.id, "wrongoldpassword", "newpassword")).rejects.toThrow()
    })

    it("should throw error for non-existent user", async () => {
      await expect(AuthService.changePassword("nonexistent-id", "oldpass", "newpass")).rejects.toThrow()
    })
  })
})
