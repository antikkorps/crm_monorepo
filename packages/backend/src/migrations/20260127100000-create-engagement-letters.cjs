"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create enum types for engagement letters
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE engagement_letter_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'cancelled', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE mission_type AS ENUM ('audit', 'conseil', 'formation', 'autre');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE billing_type AS ENUM ('fixed', 'hourly', 'daily');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // Add 'engagement_letter' to existing template_type enum if not exists
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE template_type ADD VALUE IF NOT EXISTS 'engagement_letter';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // Add 'ENGAGEMENT_LETTER_PDF' to existing document_version_type enum if not exists
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE document_version_type ADD VALUE IF NOT EXISTS 'ENGAGEMENT_LETTER_PDF';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // Create engagement_letters table
    await queryInterface.createTable("engagement_letters", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      letter_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      institution_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "medical_institutions",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      assigned_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "document_templates",
          key: "id",
        },
        onDelete: "SET NULL",
      },

      // Mission details
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mission_type: {
        type: "mission_type",
        allowNull: false,
      },
      scope: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      objectives: {
        type: Sequelize.ARRAY(Sequelize.TEXT),
        allowNull: true,
      },
      deliverables: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      // Timeline
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      estimated_hours: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      // Financial
      billing_type: {
        type: "billing_type",
        allowNull: false,
        defaultValue: "daily",
      },
      rate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      estimated_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },

      // Workflow
      status: {
        type: "engagement_letter_status",
        allowNull: false,
        defaultValue: "draft",
      },
      valid_until: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      accepted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejected_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // Additional info
      terms_and_conditions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      client_comments: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      internal_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    })

    // Create engagement_letter_members table
    await queryInterface.createTable("engagement_letter_members", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      engagement_letter_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "engagement_letters",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true, // Nullable for external team members
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      qualification: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      daily_rate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      estimated_days: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      is_lead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    })

    // Add indexes for engagement_letters
    await queryInterface.addIndex("engagement_letters", ["letter_number"], {
      unique: true,
      name: "engagement_letters_letter_number_unique",
    })
    await queryInterface.addIndex("engagement_letters", ["institution_id"])
    await queryInterface.addIndex("engagement_letters", ["assigned_user_id"])
    await queryInterface.addIndex("engagement_letters", ["status"])
    await queryInterface.addIndex("engagement_letters", ["mission_type"])
    await queryInterface.addIndex("engagement_letters", ["valid_until"])
    await queryInterface.addIndex("engagement_letters", ["created_at"])

    // Add indexes for engagement_letter_members
    await queryInterface.addIndex("engagement_letter_members", ["engagement_letter_id"])
    await queryInterface.addIndex("engagement_letter_members", ["user_id"])
    await queryInterface.addIndex("engagement_letter_members", ["is_lead"])
    await queryInterface.addIndex("engagement_letter_members", ["order_index"])

    // Add engagement_letter_pdf to document_version_type enum
    await queryInterface.sequelize.query(`
      ALTER TYPE document_version_type ADD VALUE IF NOT EXISTS 'engagement_letter_pdf';
    `)
  },

  async down(queryInterface, Sequelize) {
    // Drop tables
    await queryInterface.dropTable("engagement_letter_members")
    await queryInterface.dropTable("engagement_letters")

    // Drop enum types
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS engagement_letter_status;")
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS mission_type;")
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS billing_type;")

    // Note: We cannot remove enum values from document_version_type in PostgreSQL
    // This is safe as the value just won't be used
  },
}
