import bcrypt from "bcryptjs"
import { QueryTypes } from "sequelize"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"
import { logger } from "./logger"
import config from "../config/environment"

/**
 * Result type for the COUNT query
 */
interface CountQueryResult {
  count: string | number
}

/**
 * Initialize the first admin user if no users exist
 * This runs automatically on application startup
 */
export async function initializeAdminUser(): Promise<void> {
  try {
    // Check if any users exist
    const users = await sequelize.query<CountQueryResult>(
      "SELECT COUNT(*) as count FROM users",
      {
        type: QueryTypes.SELECT,
      }
    )
    const userCount = Number.parseInt(String(users[0].count))

    if (userCount > 0) {
      logger.info(`Found ${userCount} existing users, skipping admin initialization`)
      return
    }

    // Check if admin credentials are provided
    if (!config.adminUser.email || !config.adminUser.password) {
      logger.warn(
        "⚠️  No users found in database and no ADMIN_EMAIL/ADMIN_PASSWORD configured."
      )
      logger.warn(
        "   Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables to auto-create the first admin user."
      )
      return
    }

    logger.info("No users found, creating initial admin user...")

    // Hash the password
    const passwordHash = await bcrypt.hash(config.adminUser.password, 10)

    // Create the admin user
    const adminId = uuidv4()
    await sequelize.query(
      `
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role,
        avatar_seed, is_active, created_at, updated_at
      ) VALUES (
        :id, :email, :password_hash, :first_name, :last_name, :role,
        :avatar_seed, :is_active, NOW(), NOW()
      )
    `,
      {
        replacements: {
          id: adminId,
          email: config.adminUser.email,
          password_hash: passwordHash,
          first_name: config.adminUser.firstName,
          last_name: config.adminUser.lastName,
          role: "super_admin",
          avatar_seed: config.adminUser.email,
          is_active: true,
        },
      }
    )

    logger.info("✅ Initial admin user created successfully")
    logger.info(`   Email: ${config.adminUser.email}`)
    logger.info("   Role: super_admin")
    logger.info("   ⚠️  Please login and change your password immediately!")
  } catch (error) {
    logger.error("❌ Failed to initialize admin user", { error })
    // Don't throw - let the app start even if admin creation fails
  }
}
