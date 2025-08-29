import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"
import { logger } from "./logger"

export class DatabaseSeeder {
  static async seedUsers() {
    try {
      const [users] = await sequelize.query("SELECT COUNT(*) as count FROM users")
      const userCount = parseInt((users[0] as any).count)

      if (userCount > 0) {
        logger.info("Users already exist, skipping user seeding")
        return
      }

      // Create admin user
      const adminId = uuidv4()
      const adminPasswordHash = await bcrypt.hash("admin123", 10)

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
            email: "admin@medical-crm.com",
            password_hash: adminPasswordHash,
            first_name: "Admin",
            last_name: "User",
            role: "admin",
            avatar_seed: "admin-user",
            is_active: true,
          },
        }
      )

      // Create demo sales rep
      const salesRepId = uuidv4()
      const salesRepPasswordHash = await bcrypt.hash("demo123", 10)

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
            id: salesRepId,
            email: "demo@medical-crm.com",
            password_hash: salesRepPasswordHash,
            first_name: "Demo",
            last_name: "Sales Rep",
            role: "sales_rep",
            avatar_seed: "demo-sales",
            is_active: true,
          },
        }
      )

      logger.info("Demo users seeded successfully")
    } catch (error) {
      logger.error("Error seeding users", { error })
      throw error
    }
  }

  static async seedTeams() {
    try {
      const [teams] = await sequelize.query("SELECT COUNT(*) as count FROM teams")
      const teamCount = parseInt((teams[0] as any).count)

      if (teamCount > 0) {
        logger.info("Teams already exist, skipping team seeding")
        return
      }

      // Create default team
      const teamId = uuidv4()
      await sequelize.query(
        `
        INSERT INTO teams (
          id, name, description, created_at, updated_at
        ) VALUES (
          :id, :name, :description, NOW(), NOW()
        )
      `,
        {
          replacements: {
            id: teamId,
            name: "Medical Sales Team",
            description: "Default team for medical institution sales representatives",
          },
        }
      )

      logger.info("Demo teams seeded successfully")
    } catch (error) {
      logger.error("Error seeding teams", { error })
      throw error
    }
  }

  static async seedMedicalInstitutions() {
    try {
      const [institutions] = await sequelize.query(
        "SELECT COUNT(*) as count FROM medical_institutions"
      )
      const institutionCount = parseInt((institutions[0] as any).count)

      if (institutionCount > 0) {
        logger.info("Medical institutions already exist, skipping seeding")
        return
      }

      // Get a demo user to assign institutions to
      const [users] = await sequelize.query("SELECT id FROM users LIMIT 1")
      const demoUserId = users.length > 0 ? (users[0] as any).id : null

      // Sample medical institutions
      const sampleInstitutions = [
        {
          id: uuidv4(),
          name: "General Hospital",
          type: "hospital",
          address: JSON.stringify({
            street: "123 Medical Center Dr",
            city: "New York",
            state: "NY",
            zipCode: "10001",
            country: "US",
          }),
          assigned_user_id: demoUserId,
          tags: ["major_hospital", "teaching_hospital"],
        },
        {
          id: uuidv4(),
          name: "City Medical Clinic",
          type: "clinic",
          address: JSON.stringify({
            street: "456 Health St",
            city: "Los Angeles",
            state: "CA",
            zipCode: "90210",
            country: "US",
          }),
          assigned_user_id: demoUserId,
          tags: ["outpatient_clinic"],
        },
      ]

      for (const institution of sampleInstitutions) {
        await sequelize.query(
          `
          INSERT INTO medical_institutions (
            id, name, type, address, assigned_user_id, tags, is_active, created_at, updated_at
          ) VALUES (
            :id, :name, :type, :address::jsonb, :assigned_user_id, :tags::text[], :is_active, NOW(), NOW()
          )
        `,
          {
            replacements: {
              ...institution,
              tags: `{${institution.tags.map((tag) => `"${tag}"`).join(",")}}`,
              is_active: true,
            },
          }
        )
      }

      logger.info("Demo medical institutions seeded successfully")
    } catch (error) {
      logger.error("Error seeding medical institutions", { error })
      throw error
    }
  }

  static async seedAll() {
    try {
      logger.info("Starting database seeding...")

      await this.seedTeams()
      await this.seedUsers()
      await this.seedMedicalInstitutions()

      logger.info("Database seeding completed successfully")
    } catch (error) {
      logger.error("Database seeding failed", { error })
      throw error
    }
  }
}
