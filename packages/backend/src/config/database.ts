import { Options, Sequelize } from "sequelize"
import { logger } from "../utils/logger"
import config from "./environment"

// Database configuration
const dbConfig: Options =
  config.env === "test"
    ? {
        dialect: "sqlite",
        storage: ":memory:",
        logging: false,
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true,
        },
      }
    : {
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
        logging:
          config.env === "development"
            ? (msg: string) => logger.debug("Sequelize:", msg)
            : false,

        // Additional options
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true,
        },

        // Timezone configuration
        timezone: "+00:00",

        // Retry configuration
        retry: {
          max: 3,
        },
      }

// Create Sequelize instance
export const sequelize = new Sequelize(dbConfig)

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
      logger.info("Database connection established successfully", {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
      })
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
      logger.info("Database connection closed")
    } catch (error) {
      logger.error("Error closing database connection", { error })
      throw error
    }
  }

  async sync(options: { force?: boolean; alter?: boolean } = {}): Promise<void> {
    try {
      await sequelize.sync(options)
      logger.info("Database synchronized successfully", options)
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
      logger.error("Database connection test failed", { error })
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
