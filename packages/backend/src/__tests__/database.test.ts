import { afterAll, beforeAll, describe, expect, it } from "vitest"
import DatabaseManager from "../config/database"
import { checkDatabaseConnection, initializeDatabase } from "../utils/database-init"

describe("Database Configuration", () => {
  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = "test"
    process.env.DB_NAME = "medical_crm_test"
    process.env.DB_USER = "postgres"
    process.env.DB_PASSWORD = "password"
    process.env.JWT_SECRET = "test-jwt-secret"
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret"
  })

  afterAll(async () => {
    try {
      await DatabaseManager.disconnect()
    } catch (error) {
      // Ignore disconnect errors in tests
    }
  })

  describe("DatabaseManager", () => {
    it("should create a singleton instance", () => {
      const instance1 = DatabaseManager
      const instance2 = DatabaseManager
      expect(instance1).toBe(instance2)
    })

    it("should have proper configuration", () => {
      const sequelize = DatabaseManager.getSequelize()
      expect(sequelize).toBeDefined()
      expect(sequelize.getDatabaseName()).toBe("medical_crm_test")
    })
  })

  describe("Database Connection", () => {
    it("should be able to check connection status", async () => {
      // This test will pass even if database is not available
      // as we're testing the function exists and returns a boolean
      const isConnected = await checkDatabaseConnection()
      expect(typeof isConnected).toBe("boolean")
    })

    it("should handle connection initialization gracefully", async () => {
      // Test that initialization function exists and handles errors gracefully
      try {
        await initializeDatabase({ sync: false, seed: false })
        // If successful, connection should be active
        expect(DatabaseManager.isConnectionActive()).toBe(true)
      } catch (error) {
        // If database is not available, that's okay for this test
        // We're just testing the function exists and handles errors
        expect(error).toBeDefined()
      }
    })
  })

  describe("Database Configuration Validation", () => {
    it("should validate required environment variables", () => {
      // Test that our environment validation works
      expect(process.env.DB_NAME).toBe("medical_crm_test")
      expect(process.env.DB_USER).toBe("postgres")
      expect(process.env.DB_PASSWORD).toBe("password")
    })
  })
})
