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

    // Helper function to check if index exists
    const indexExists = async (tableName, indexName) => {
      try {
        const indexes = await queryInterface.showIndex(tableName)
        return indexes.some((index) => index.name === indexName)
      } catch (error) {
        return false
      }
    }

    // Create notes table if it doesn't exist
    if (!(await tableExists("notes"))) {
      await queryInterface.createTable("notes", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        tags: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false,
          defaultValue: [],
        },
        creator_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        institution_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "medical_institutions",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        is_private: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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

    // Create note_shares table if it doesn't exist
    if (!(await tableExists("note_shares"))) {
      await queryInterface.createTable("note_shares", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        note_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "notes",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        permission: {
          type: Sequelize.ENUM("read", "write"),
          allowNull: false,
          defaultValue: "read",
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

    // Create meetings table if it doesn't exist
    if (!(await tableExists("meetings"))) {
      await queryInterface.createTable("meetings", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        start_date: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        end_date: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        location: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        organizer_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        institution_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "medical_institutions",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        status: {
          type: Sequelize.ENUM("scheduled", "in_progress", "completed", "cancelled"),
          allowNull: false,
          defaultValue: "scheduled",
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

    // Create meeting_participants table if it doesn't exist
    if (!(await tableExists("meeting_participants"))) {
      await queryInterface.createTable("meeting_participants", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        meeting_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "meetings",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        status: {
          type: Sequelize.ENUM("invited", "accepted", "declined", "tentative"),
          allowNull: false,
          defaultValue: "invited",
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

    // Create comments table if it doesn't exist
    if (!(await tableExists("comments"))) {
      await queryInterface.createTable("comments", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        meeting_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "meetings",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
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

    // Create calls table if it doesn't exist
    if (!(await tableExists("calls"))) {
      await queryInterface.createTable("calls", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        phone_number: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        duration: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Duration in seconds",
        },
        summary: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        call_type: {
          type: Sequelize.ENUM("incoming", "outgoing", "missed"),
          allowNull: false,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        institution_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "medical_institutions",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        contact_person_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "contact_persons",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
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

    // Create reminders table if it doesn't exist
    if (!(await tableExists("reminders"))) {
      await queryInterface.createTable("reminders", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        reminder_date: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        is_completed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        institution_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "medical_institutions",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        priority: {
          type: Sequelize.ENUM("low", "medium", "high", "urgent"),
          allowNull: false,
          defaultValue: "medium",
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

    // Add unique constraints if they don't exist
    try {
      await queryInterface.addConstraint("note_shares", {
        fields: ["note_id", "user_id"],
        type: "unique",
        name: "unique_note_share_per_user",
      })
    } catch (error) {
      console.log("Constraint unique_note_share_per_user already exists, skipping...")
    }

    try {
      await queryInterface.addConstraint("meeting_participants", {
        fields: ["meeting_id", "user_id"],
        type: "unique",
        name: "unique_meeting_participant_per_user",
      })
    } catch (error) {
      console.log(
        "Constraint unique_meeting_participant_per_user already exists, skipping..."
      )
    }

    // Add indexes for performance
    const addIndexSafely = async (tableName, fields, options = {}) => {
      try {
        await queryInterface.addIndex(tableName, fields, options)
      } catch (error) {
        console.log(`Index on ${tableName} already exists, skipping...`)
      }
    }

    // Notes indexes
    await addIndexSafely("notes", ["creator_id"])
    await addIndexSafely("notes", ["institution_id"])
    await addIndexSafely("notes", ["created_at"])
    await addIndexSafely("notes", ["is_private"])
    await addIndexSafely("notes", ["tags"], {
      using: "gin",
      name: "idx_notes_tags_gin",
    })

    // Note shares indexes
    await addIndexSafely("note_shares", ["note_id"])
    await addIndexSafely("note_shares", ["user_id"])
    await addIndexSafely("note_shares", ["permission"])

    // Meetings indexes
    await addIndexSafely("meetings", ["organizer_id"])
    await addIndexSafely("meetings", ["institution_id"])
    await addIndexSafely("meetings", ["start_date"])
    await addIndexSafely("meetings", ["end_date"])
    await addIndexSafely("meetings", ["status"])

    // Meeting participants indexes
    await addIndexSafely("meeting_participants", ["meeting_id"])
    await addIndexSafely("meeting_participants", ["user_id"])
    await addIndexSafely("meeting_participants", ["status"])

    // Comments indexes
    await addIndexSafely("comments", ["meeting_id"])
    await addIndexSafely("comments", ["user_id"])
    await addIndexSafely("comments", ["created_at"])

    // Calls indexes
    await addIndexSafely("calls", ["user_id"])
    await addIndexSafely("calls", ["institution_id"])
    await addIndexSafely("calls", ["contact_person_id"])
    await addIndexSafely("calls", ["phone_number"])
    await addIndexSafely("calls", ["call_type"])
    await addIndexSafely("calls", ["created_at"])

    // Reminders indexes
    await addIndexSafely("reminders", ["user_id"])
    await addIndexSafely("reminders", ["institution_id"])
    await addIndexSafely("reminders", ["reminder_date"])
    await addIndexSafely("reminders", ["is_completed"])
    await addIndexSafely("reminders", ["priority"])
    await addIndexSafely("reminders", ["created_at"])
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

    // Drop tables in reverse order to avoid foreign key constraints
    await dropTableSafely("reminders")
    await dropTableSafely("calls")
    await dropTableSafely("comments")
    await dropTableSafely("meeting_participants")
    await dropTableSafely("meetings")
    await dropTableSafely("note_shares")
    await dropTableSafely("notes")

    // Drop enums
    try {
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_note_shares_permission";'
      )
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_meetings_status";')
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_meeting_participants_status";'
      )
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_calls_call_type";')
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_reminders_priority";'
      )
    } catch (error) {
      console.log("Some enum types do not exist, skipping...")
    }
  },
}
