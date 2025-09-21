import DatabaseManager from "../config/database"
import { logger } from "./logger"
import { DatabaseSeeder } from "./seeder"

export async function initializeDatabase(
  options: {
    sync?: boolean
    seed?: boolean
    force?: boolean
  } = {}
) {
  const { sync = false, seed = false, force = false } = options

  try {
    // Connect to database
    await DatabaseManager.connect()

    // Sync database schema if requested
    if (sync) {
      logger.info("Synchronizing database schema...")
      // In development, prefer alter to add new columns without dropping data
      await DatabaseManager.sync({ force, alter: !force })
      logger.info("Database schema synchronized")
    }

    // Seed database if requested
    if (seed) {
      logger.info("Seeding database with initial data...")
      await DatabaseSeeder.seedAll()
      logger.info("Database seeding completed")
    }

    return true
  } catch (error) {
    logger.error("Database initialization failed", { error })
    throw error
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    return await DatabaseManager.testConnection()
  } catch (error) {
    logger.error("Database connection check failed", { error })
    return false
  }
}
