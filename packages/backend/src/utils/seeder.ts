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

      // Create team admin user
      const teamAdminId = uuidv4()
      const teamAdminPasswordHash = await bcrypt.hash("teamadmin123", 10)

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
            id: teamAdminId,
            email: "teamadmin@medical-crm.com",
            password_hash: teamAdminPasswordHash,
            first_name: "Team",
            last_name: "Admin",
            role: "team_admin",
            avatar_seed: "team-admin",
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
            role: "user",
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

  static async seedContactPersons() {
    try {
      const [contacts] = await sequelize.query(
        "SELECT COUNT(*) as count FROM contact_persons"
      )
      const contactCount = parseInt((contacts[0] as any).count)

      if (contactCount > 0) {
        logger.info(`Found ${contactCount} contact persons, skipping seeding`)
        return
      }

      // Get existing institutions to link contacts to
      const [institutions] = await sequelize.query(
        "SELECT id FROM medical_institutions ORDER BY name LIMIT 2"
      )

      if (institutions.length === 0) {
        logger.warn("No medical institutions found, skipping contact seeding")
        return
      }

      const sampleContacts = [
        {
          id: uuidv4(),
          firstName: "Dr. John",
          lastName: "Smith",
          email: "john.smith@generalhospital.com",
          phone: "+1-555-0101",
          position: "Chief Medical Officer",
          institutionId: (institutions[0] as any).id,
        },
        {
          id: uuidv4(),
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@generalhospital.com",
          phone: "+1-555-0102",
          position: "Department Head",
          institutionId: (institutions[0] as any).id,
        },
        {
          id: uuidv4(),
          firstName: "Dr. Michael",
          lastName: "Brown",
          email: "michael.brown@citymedical.com",
          phone: "+1-555-0201",
          position: "Senior Physician",
          institutionId: institutions.length > 1 ? (institutions[1] as any).id : (institutions[0] as any).id,
        },
        {
          id: uuidv4(),
          firstName: "Lisa",
          lastName: "Davis",
          email: "lisa.davis@citymedical.com",
          phone: "+1-555-0202",
          position: "Procurement Manager",
          institutionId: institutions.length > 1 ? (institutions[1] as any).id : (institutions[0] as any).id,
        },
      ]

      for (const contact of sampleContacts) {
        await sequelize.query(
          `
          INSERT INTO contact_persons (
            id, first_name, last_name, email, phone, position, 
            institution_id, is_active, created_at, updated_at
          ) VALUES (
            :id, :firstName, :lastName, :email, :phone, :position,
            :institutionId, :is_active, NOW(), NOW()
          )
        `,
          {
            replacements: {
              ...contact,
              is_active: true,
            },
          }
        )
      }

      logger.info("Demo contact persons seeded successfully")
    } catch (error) {
      logger.error("Error seeding contact persons", { error })
      throw error
    }
  }

  static async seedReminderRules() {
    try {
      const [rules] = await sequelize.query("SELECT COUNT(*) as count FROM reminder_rules")
      const ruleCount = parseInt((rules[0] as any).count)

      if (ruleCount > 0) {
        logger.info("Reminder rules already exist, skipping reminder rule seeding")
        return
      }

      // Get admin user for createdBy field
      const [adminUsers] = await sequelize.query(
        "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
      )
      const adminId = (adminUsers as any)[0]?.id

      if (!adminId) {
        logger.warn("No admin user found, skipping reminder rule seeding")
        return
      }

      // Default reminder rules
      const defaultRules = [
        // Task reminders
        {
          entity_type: "task",
          trigger_type: "due_soon",
          days_before: 3,
          days_after: 0,
          priority: "medium",
          title_template: "Task Due Soon",
          message_template: "Task '{title}' is due in {days} days.",
          action_url_template: "/tasks/{id}",
          action_text_template: "View Task",
          auto_create_task: false,
          task_title_template: null,
          task_priority: "medium",
          created_by: adminId,
        },
        {
          entity_type: "task",
          trigger_type: "overdue",
          days_before: 0,
          days_after: 1,
          priority: "high",
          title_template: "Task Overdue",
          message_template: "Task '{title}' is {days} days overdue.",
          action_url_template: "/tasks/{id}",
          action_text_template: "View Task",
          auto_create_task: false,
          task_title_template: null,
          task_priority: "high",
          created_by: adminId,
        },
        // Quote reminders
        {
          entity_type: "quote",
          trigger_type: "expired",
          days_before: 0,
          days_after: 7,
          priority: "medium",
          title_template: "Quote Expired",
          message_template: "Quote '{quoteNumber}' for {institutionName} expired {days} days ago.",
          action_url_template: "/quotes/{id}",
          action_text_template: "View Quote",
          auto_create_task: true,
          task_title_template: "Follow up on expired quote {quoteNumber}",
          task_priority: "medium",
          created_by: adminId,
        },
        {
          entity_type: "quote",
          trigger_type: "due_soon",
          days_before: 7,
          days_after: 0,
          priority: "low",
          title_template: "Quote Expiring Soon",
          message_template: "Quote '{quoteNumber}' for {institutionName} expires in {days} days.",
          action_url_template: "/quotes/{id}",
          action_text_template: "View Quote",
          auto_create_task: false,
          task_title_template: null,
          task_priority: "low",
          created_by: adminId,
        },
        // Invoice reminders
        {
          entity_type: "invoice",
          trigger_type: "unpaid",
          days_before: 0,
          days_after: 30,
          priority: "high",
          title_template: "Invoice Overdue",
          message_template: "Invoice '{invoiceNumber}' for {amount}€ is {days} days overdue.",
          action_url_template: "/invoices/{id}",
          action_text_template: "View Invoice",
          auto_create_task: true,
          task_title_template: "Follow up on unpaid invoice {invoiceNumber}",
          task_priority: "high",
          created_by: adminId,
        },
        {
          entity_type: "invoice",
          trigger_type: "due_soon",
          days_before: 7,
          days_after: 0,
          priority: "medium",
          title_template: "Invoice Due Soon",
          message_template: "Invoice '{invoiceNumber}' for {amount}€ is due in {days} days.",
          action_url_template: "/invoices/{id}",
          action_text_template: "View Invoice",
          auto_create_task: false,
          task_title_template: null,
          task_priority: "medium",
          created_by: adminId,
        },
      ]

      // Insert default reminder rules
      for (const rule of defaultRules) {
        const ruleWithId = {
          id: uuidv4(),
          ...rule,
        }

        await sequelize.query(
          `
          INSERT INTO reminder_rules (
            id, entity_type, trigger_type, days_before, days_after, priority,
            title_template, message_template, action_url_template, action_text_template,
            auto_create_task, task_title_template, task_priority, created_by,
            created_at, updated_at
          ) VALUES (
            :id, :entity_type, :trigger_type, :days_before, :days_after, :priority,
            :title_template, :message_template, :action_url_template, :action_text_template,
            :auto_create_task, :task_title_template, :task_priority, :created_by,
            NOW(), NOW()
          )
        `,
          {
            replacements: ruleWithId,
          }
        )
      }

      logger.info("Default reminder rules seeded successfully")
    } catch (error) {
      logger.error("Error seeding reminder rules", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }

  static async seedAll() {
    try {
      logger.info("Starting database seeding...")

      await this.seedTeams()
      await this.seedUsers()
      await this.seedMedicalInstitutions()
      await this.seedContactPersons()
      await this.seedReminderRules()

      logger.info("Database seeding completed successfully")
    } catch (error) {
      logger.error("Database seeding failed", { error })
      throw error
    }
  }
}
