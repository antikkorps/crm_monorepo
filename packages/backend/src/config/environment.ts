import dotenv from "dotenv"
import path from "path"
import Joi from "joi"

// Load environment variables
// 1) Load from current working directory (e.g., packages/backend/.env)
dotenv.config()
// 2) Additionally attempt to load monorepo root .env if available
try {
  const rootEnvPath = path.resolve(process.cwd(), "../../.env")
  dotenv.config({ path: rootEnvPath })
} catch (_) {
  // Ignore if not present
}

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3001),

  // Database configuration
  // Support both DATABASE_URL (for cloud services like Neon, Supabase, Railway)
  // and individual variables (for local Docker development)
  DATABASE_URL: Joi.string().uri().optional(),

  DB_HOST: Joi.string().when("DATABASE_URL", {
    is: Joi.exist(),
    then: Joi.string().optional(),
    otherwise: Joi.string().default("localhost"),
  }),
  DB_PORT: Joi.number().when("DATABASE_URL", {
    is: Joi.exist(),
    then: Joi.number().optional(),
    otherwise: Joi.number().default(5432),
  }),
  DB_NAME: Joi.string().when("DATABASE_URL", {
    is: Joi.exist(),
    then: Joi.string().optional(),
    otherwise: Joi.when("NODE_ENV", {
      is: "test",
      then: Joi.string().default("test_db"),
      otherwise: Joi.string().required(),
    }),
  }),
  DB_USER: Joi.string().when("DATABASE_URL", {
    is: Joi.exist(),
    then: Joi.string().optional(),
    otherwise: Joi.when("NODE_ENV", {
      is: "test",
      then: Joi.string().default("test_user"),
      otherwise: Joi.string().required(),
    }),
  }),
  DB_PASSWORD: Joi.string().when("DATABASE_URL", {
    is: Joi.exist(),
    then: Joi.string().optional(),
    otherwise: Joi.when("NODE_ENV", {
      is: "test",
      then: Joi.string().default("test_password"),
      otherwise: Joi.string().required(),
    }),
  }),
  DB_SSL: Joi.boolean().truthy("true").truthy("1").falsy("false").falsy("0").default(false),
  DB_SYNC_ON_START: Joi.boolean().truthy("true").truthy("1").falsy("false").falsy("0").default(false),

  // JWT configuration
  // Minimum 32 characters for production secrets to prevent brute force attacks
  JWT_SECRET: Joi.string().when("NODE_ENV", {
    is: "test",
    then: Joi.string().default("test-jwt-secret-must-be-32-chars-long!"),
    otherwise: Joi.string().min(32).required(),
  }),
  JWT_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_SECRET: Joi.string().when("NODE_ENV", {
    is: "test",
    then: Joi.string().default("test-refresh-secret-must-be-32-chars!"),
    otherwise: Joi.string().min(32).required(),
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),

  // CORS configuration
  CORS_ORIGIN: Joi.string().default("http://localhost:3000"),

  // Logging
  LOG_LEVEL: Joi.string().valid("error", "warn", "info", "debug").default("info"),

  // Plugin configuration
  PLUGIN_DIRECTORY: Joi.string().optional(),
  PLUGIN_AUTO_ENABLE: Joi.boolean().default(true),

  // Initial admin user (auto-created on first startup if no users exist)
  ADMIN_EMAIL: Joi.string().email().optional(),
  ADMIN_PASSWORD: Joi.string().min(8).optional(),
  ADMIN_FIRST_NAME: Joi.string().default("Admin"),
  ADMIN_LAST_NAME: Joi.string().default("User"),
}).unknown()

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env)

if (error) {
  throw new Error(`Environment validation error: ${error.message}`)
}

// Parse DATABASE_URL if provided (for cloud services like Neon)
let databaseConfig: {
  url?: string
  host?: string
  port?: number
  name?: string
  user?: string
  password?: string
  ssl?: boolean
  syncOnStart: boolean
}

if (envVars.DATABASE_URL) {
  // Use DATABASE_URL for cloud deployments
  databaseConfig = {
    url: envVars.DATABASE_URL,
    ssl: envVars.DB_SSL,
    syncOnStart: envVars.DB_SYNC_ON_START,
  }
} else {
  // Use individual variables for local development
  databaseConfig = {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    ssl: envVars.DB_SSL,
    syncOnStart: envVars.DB_SYNC_ON_START,
  }
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,

  database: databaseConfig,

  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },

  cors: {
    origin: envVars.CORS_ORIGIN,
  },

  logging: {
    level: envVars.LOG_LEVEL,
  },

  plugins: {
    directory: envVars.PLUGIN_DIRECTORY,
    autoEnable: envVars.PLUGIN_AUTO_ENABLE,
  },

  adminUser: {
    email: envVars.ADMIN_EMAIL,
    password: envVars.ADMIN_PASSWORD,
    firstName: envVars.ADMIN_FIRST_NAME,
    lastName: envVars.ADMIN_LAST_NAME,
  },
}

export default config
