"use strict"

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

    // Create segments table if it doesn't exist
    if (!(await tableExists("segments"))) {
      await queryInterface.createTable("segments", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          validate: {
            len: [1, 100],
          },
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          validate: {
            len: [0, 500],
          },
        },
        type: {
          type: Sequelize.ENUM("institution", "contact"),
          allowNull: false,
        },
        criteria: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        visibility: {
          type: Sequelize.ENUM("private", "team", "public"),
          allowNull: false,
          defaultValue: "private",
        },
        owner_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        team_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "teams",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
    }

    // Add indexes for performance
    const addIndexSafely = async (tableName, fields, options = {}) => {
      try {
        await queryInterface.addIndex(tableName, fields, options)
      } catch (error) {
        console.log(`Index on ${tableName} already exists, skipping...`)
      }
    }

    // Segments indexes
    await addIndexSafely("segments", ["owner_id"])
    await addIndexSafely("segments", ["team_id"])
    await addIndexSafely("segments", ["type"])
    await addIndexSafely("segments", ["visibility"])
    await addIndexSafely("segments", ["is_active"])
    await addIndexSafely("segments", ["created_at"])
    await addIndexSafely("segments", ["updated_at"])
    await addIndexSafely("segments", ["criteria"], {
      using: "gin",
      name: "idx_segments_criteria_gin",
    })
  },

  async down(queryInterface, Sequelize) {
    // Helper function to safely drop table
    const dropTableSafely = async (tableName) => {
      try {
        await queryInterface.dropTable(tableName)
      } catch (error) {
        console.log(`Table ${tableName} does not exist, skipping...`)
      }
    }

    // Drop segments table
    await dropTableSafely("segments")

    // Drop enum
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_segments_type";')
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_segments_visibility";')
    } catch (error) {
      console.log("Some enum types do not exist, skipping...")
    }
  },
}