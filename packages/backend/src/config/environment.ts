import dotenv from "dotenv"
import Joi from "joi"

// Load environment variables
dotenv.config()

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

  // JWT configuration
  JWT_SECRET: Joi.string().when("NODE_ENV", {
    is: "test",
    then: Joi.string().default("test-jwt-secret"),
    otherwise: Joi.string().required(),
  }),
  JWT_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_SECRET: Joi.string().when("NODE_ENV", {
    is: "test",
    then: Joi.string().default("test-refresh-secret"),
    otherwise: Joi.string().required(),
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),

  // CORS configuration
  CORS_ORIGIN: Joi.string().default("http://localhost:3000"),

  // Logging
  LOG_LEVEL: Joi.string().valid("error", "warn", "info", "debug").default("info"),
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
}

export default config
