"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create enum types for simplified transactions
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE simplified_transaction_type AS ENUM ('quote', 'invoice', 'engagement_letter', 'contract');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE simplified_transaction_status AS ENUM (
          'draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled',
          'pending', 'paid', 'partial', 'overdue',
          'active', 'terminated'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE simplified_payment_status AS ENUM ('pending', 'partial', 'paid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE simplified_contract_type AS ENUM ('maintenance', 'support', 'subscription', 'service', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)

    // Create simplified_transactions table
    await queryInterface.createTable("simplified_transactions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      created_by_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      // Type of transaction
      type: {
        type: "simplified_transaction_type",
        allowNull: false,
      },

      // Identification
      reference_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // Date of the document
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },

      // Financial amounts
      amount_ht: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      vat_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 20.0,
      },
      amount_ttc: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },

      // Status
      status: {
        type: "simplified_transaction_status",
        allowNull: false,
      },

      // Invoice-specific fields
      payment_status: {
        type: "simplified_payment_status",
        allowNull: true,
      },
      payment_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      payment_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },

      // Contract-specific fields
      contract_type: {
        type: "simplified_contract_type",
        allowNull: true,
      },
      contract_start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      contract_end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_recurring: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },

      // Notes
      notes: {
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
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    })

    // Add indexes
    await queryInterface.addIndex("simplified_transactions", ["institution_id"], {
      name: "idx_simplified_transactions_institution",
    })
    await queryInterface.addIndex("simplified_transactions", ["created_by_id"], {
      name: "idx_simplified_transactions_created_by",
    })
    await queryInterface.addIndex("simplified_transactions", ["type"], {
      name: "idx_simplified_transactions_type",
    })
    await queryInterface.addIndex("simplified_transactions", ["date"], {
      name: "idx_simplified_transactions_date",
    })
    await queryInterface.addIndex("simplified_transactions", ["status"], {
      name: "idx_simplified_transactions_status",
    })
    await queryInterface.addIndex("simplified_transactions", ["deleted_at"], {
      name: "idx_simplified_transactions_deleted_at",
    })

    // Composite index for common query patterns
    await queryInterface.addIndex("simplified_transactions", ["institution_id", "type", "date"], {
      name: "idx_simplified_transactions_institution_type_date",
    })
  },

  async down(queryInterface, Sequelize) {
    // Drop table
    await queryInterface.dropTable("simplified_transactions")

    // Drop enum types
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS simplified_transaction_type;")
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS simplified_transaction_status;")
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS simplified_payment_status;")
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS simplified_contract_type;")
  },
}
