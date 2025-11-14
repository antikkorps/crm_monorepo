/**
 * Migration: Create sage_settings table
 *
 * This migration creates the sage_settings table to store Sage accounting
 * API configuration and sync settings.
 *
 * Features:
 * - Singleton pattern (only one settings record)
 * - Encrypted API key storage using AES-256-GCM
 * - Company/organization identifier
 * - Auto-sync configuration
 * - Tracking of last sync dates per entity type
 * - Connection test results
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper function to check if table exists
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName)
        return true
      } catch (error) {
        return false
      }
    }

    // Create sage_settings table if it doesn't exist
    if (!(await tableExists("sage_settings"))) {
      await queryInterface.createTable("sage_settings", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        api_key: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: "",
          comment: "Encrypted API key for Sage accounting API (AES-256-GCM)",
        },
        api_url: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
          comment: "Sage API base URL (e.g., https://api.sage.com)",
        },
        company_id: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "",
          comment: "Sage company/organization identifier",
        },
        is_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        last_test_date: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        last_test_success: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
        },
        last_test_message: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        auto_sync_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        sync_frequency: {
          type: Sequelize.ENUM("hourly", "daily", "weekly"),
          allowNull: false,
          defaultValue: "daily",
        },
        last_sync_date: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Last successful sync of any entity type",
        },
        last_customers_sync: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Last successful sync of customers",
        },
        last_invoices_sync: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Last successful sync of invoices",
        },
        last_payments_sync: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Last successful sync of payments",
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      })

      console.log('✅ Created sage_settings table')
    }

    // Add indexes for performance
    const addIndexSafely = async (tableName, fields, options = {}) => {
      try {
        await queryInterface.addIndex(tableName, fields, options)
      } catch (error) {
        console.log(`Index on ${tableName} already exists, skipping...`)
      }
    }

    await addIndexSafely("sage_settings", ["is_enabled"])
    await addIndexSafely("sage_settings", ["last_sync_date"])

    console.log('✅ Created sage_settings indexes')
  },

  async down(queryInterface, Sequelize) {
    // Helper function to safely drop table
    const dropTableSafely = async (tableName) => {
      try {
        await queryInterface.dropTable(tableName)
        console.log(`✅ Dropped ${tableName} table`)
      } catch (error) {
        console.log(`Table ${tableName} does not exist, skipping...`)
      }
    }

    // Drop sage_settings table
    await dropTableSafely("sage_settings")

    // Drop enum
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sage_settings_sync_frequency";')
      console.log('✅ Dropped sync_frequency enum type')
    } catch (error) {
      console.log("enum_sage_settings_sync_frequency does not exist, skipping...")
    }
  },
}
