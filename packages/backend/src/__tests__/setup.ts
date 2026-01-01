import dotenv from "dotenv"
import { resolve } from "path"
import { beforeAll, afterAll } from "vitest"

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

// Use global to persist state across test files in the same process
declare global {
  // eslint-disable-next-line no-var
  var __testDbInitialized: boolean | undefined
  // eslint-disable-next-line no-var
  var __testSequelize: any
}

beforeAll(async () => {
  // Skip database initialization for logic-only tests
  if (process.env.SKIP_DB_INIT === 'true') {
    console.log("Skipping database initialization (SKIP_DB_INIT=true)")
    return
  }

  // Use global flag to ensure we only sync once across all test files
  if (globalThis.__testDbInitialized) {
    return
  }

  try {
    const db = await import("../config/database")
    globalThis.__testSequelize = db.sequelize

    // Import all models to ensure they're registered
    await import("../models")

    // Drop all tables first to ensure clean state, then recreate
    await globalThis.__testSequelize.drop({ cascade: true })
    await globalThis.__testSequelize.sync({ force: true })

    globalThis.__testDbInitialized = true
    console.log("Test database initialized successfully")
  } catch (error) {
    console.error("Database initialization failed:", (error as Error).message)
    throw error
  }
})

// Don't close connection in afterAll - let it be reused across test files
// The process will clean up when it exits
afterAll(async () => {
  // Skip cleanup if we skipped database initialization
  if (process.env.SKIP_DB_INIT === 'true') {
    return
  }

  // Explicitly close the Sequelize connection to avoid resource leaks in watch mode or reused processes
  if (globalThis.__testSequelize) {
    await globalThis.__testSequelize.close();
    globalThis.__testDbInitialized = false;
    globalThis.__testSequelize = undefined;
  }
})
