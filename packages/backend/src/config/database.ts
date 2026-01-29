import { Options, Sequelize } from "sequelize"
import { logger } from "../utils/logger"
import config from "./environment"

// Create Sequelize instance
let sequelize: Sequelize

if (config.env === "test") {
  // Use real PostgreSQL database for tests (more reliable than pg-mem)
  sequelize = new Sequelize({
    dialect: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "medical_crm_test",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    logging: false,
    dialectOptions: {
      ssl: false,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 3000,
      idle: 1000,
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  })
} else {
  // Production/development configuration
  if (config.database.url) {
    // Use DATABASE_URL for cloud services (Neon, Supabase, Railway, etc.)
    sequelize = new Sequelize(config.database.url, {
      dialect: "postgres",
      dialectOptions: {
        ssl: config.database.ssl ? {
          require: true,
          rejectUnauthorized: false, // Required for Neon and most cloud providers
        } : false,
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      logging:
        config.env === "development"
          ? (msg: string) => logger.debug(`Sequelize: ${msg}`)
          : false,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
      timezone: "+00:00",
      // retry disabled to see real transaction errors
    })
  } else {
    // Use individual variables for local Docker development
    const dbConfig: Options = {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      username: config.database.user,
      password: config.database.password,
      dialect: "postgres",

      // Connection pool configuration
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },

      // Logging configuration
      // Note: Winston's console simple formatter ignores metadata args,
      // so we must concatenate the SQL string into the message.
      logging:
        config.env === "development"
          ? (msg: string) => logger.debug(`Sequelize: ${msg}`)
          : false,

      // Additional options
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },

      // Timezone configuration
      timezone: "+00:00",

      // retry disabled to see real transaction errors
    }

    // Create Sequelize instance
    sequelize = new Sequelize(dbConfig)
  }
}

// Export the sequelize instance
export { sequelize }

// Database connection management
export class DatabaseManager {
  private static instance: DatabaseManager
  private isConnected = false

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  async connect(): Promise<void> {
    try {
      await sequelize.authenticate()
      this.isConnected = true
      if (config.env !== "test") {
        if (config.database.url) {
          logger.info("Database connection established successfully", {
            mode: "DATABASE_URL",
            ssl: config.database.ssl,
          })
        } else {
          logger.info("Database connection established successfully", {
            mode: "individual variables",
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
          })
        }
      }
    } catch (error) {
      this.isConnected = false
      logger.error("Unable to connect to the database", { error })
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      await sequelize.close()
      this.isConnected = false
      if (config.env !== "test") {
        logger.info("Database connection closed")
      }
    } catch (error) {
      logger.error("Error closing database connection", { error })
      throw error
    }
  }

  async sync(options: { force?: boolean; alter?: boolean } = {}): Promise<void> {
    try {
      await sequelize.sync(options)
      if (config.env !== "test") {
        logger.info("Database synchronized successfully", options)
      }
    } catch (error) {
      logger.error("Database synchronization failed", { error })
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await sequelize.authenticate()
      return true
    } catch (error) {
      if (config.env !== "test") {
        logger.error("Database connection test failed", { error })
      }
      return false
    }
  }

  isConnectionActive(): boolean {
    return this.isConnected
  }

  getSequelize(): Sequelize {
    return sequelize
  }
}

export default DatabaseManager.getInstance()
