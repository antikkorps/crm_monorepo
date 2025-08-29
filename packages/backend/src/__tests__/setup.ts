import dotenv from "dotenv"
import { resolve } from "path"

// Load test environment variables
dotenv.config({ path: resolve(__dirname, "../../.env.test") })

// Ensure required test environment variables are set
process.env.NODE_ENV = "test"
process.env.DB_NAME = process.env.DB_NAME || "medical_crm_test"
process.env.DB_USER = process.env.DB_USER || "postgres"
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "password"
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret"
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret"
