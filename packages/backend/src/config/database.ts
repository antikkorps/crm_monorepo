import { Options, Sequelize } from "sequelize"
import { logger } from "../utils/logger"
import config from "./environment"

// Create Sequelize instance - use mock database for tests
let sequelize: Sequelize

if (config.env === "test") {
  try {
    // Use pg-mem for testing
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pgMem = require("pg-mem")
    const db = pgMem.newDb({ 
      autoCreateForeignKeyIndices: true,
    })
    
    // Add some PostgreSQL functions that might be used
    db.public.registerFunction({
      name: "version",
      returns: "text",
      implementation: () => "PostgreSQL 13.0 (pg-mem)",
    })

    // Enable uuid generation
    db.public.registerFunction({
      name: "gen_random_uuid",
      returns: "uuid",
      implementation: () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
          const r = (Math.random() * 16) | 0
          const v = c === "x" ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      },
    })

    // Create custom ENUM types that pg-mem needs
    try {
      db.public.none(`
        CREATE TYPE enum_users_role AS ENUM (
          'super_admin', 'admin', 'team_admin', 'manager', 'user'
        );
      `)
    } catch (e) {
      // Enum might already exist
    }

    // Create the pg adapter
    const pgAdapter = db.adapters.createPg()

    // Create Sequelize instance with the mock
    sequelize = new Sequelize("test", "test", "test", {
      dialect: "postgres",
      dialectModule: pgAdapter,
      logging: false,
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    })
  } catch (error) {
    // Fallback to regular postgres connection if pg-mem is not available
    console.warn("pg-mem not available, falling back to postgres:", error)
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
  }
} else {
  // Production/development configuration
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
  sequelize = new Sequelize(dbConfig)
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
        logger.info("Database connection established successfully", {
          host: config.database.host,
          port: config.database.port,
          database: config.database.name,
        })
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