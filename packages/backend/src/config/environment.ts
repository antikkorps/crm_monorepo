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
  DB_HOST: Joi.string().default("localhost"),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().when("NODE_ENV", {
    is: "test",
    then: Joi.string().default("test_db"),
    otherwise: Joi.string().required(),
  }),
  DB_USER: Joi.string().when("NODE_ENV", {
    is: "test",
    then: Joi.string().default("test_user"),
    otherwise: Joi.string().required(),
  }),
  DB_PASSWORD: Joi.string().when("NODE_ENV", {
    is: "test",
    then: Joi.string().default("test_password"),
    otherwise: Joi.string().required(),
  }),
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
}).unknown()

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env)

if (error) {
  throw new Error(`Environment validation error: ${error.message}`)
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,

  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    syncOnStart: envVars.DB_SYNC_ON_START,
  },

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
}

export default config
