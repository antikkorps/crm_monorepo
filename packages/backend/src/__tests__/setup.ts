import dotenv from "dotenv"
import { resolve } from "path"
import { beforeAll } from "vitest"

// Load test environment variables first
dotenv.config({ path: resolve(__dirname, "../../.env.test") })

// Ensure required test environment variables are set
process.env.NODE_ENV = "test"
process.env.DB_NAME = process.env.DB_NAME || "medical_crm_test"
process.env.DB_USER = process.env.DB_USER || "postgres"
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "password"
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret"
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret"
// Ensure a default host/port for Postgres-like config
process.env.DB_HOST = process.env.DB_HOST || "localhost"
process.env.DB_PORT = process.env.DB_PORT || "5432"

// Initialize database connection and models once for all tests
beforeAll(async () => {
  try {
    const { sequelize } = await import("../config/database")

    // Import all models to ensure they're registered
    await import("../models")

    // Sync database schema once at the start
    await sequelize.sync({ force: true })

    console.log("Test database initialized successfully")
  } catch (error) {
    console.warn("Database initialization warning:", (error as Error).message)
  }
})
