"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("opportunities", {
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
        onUpdate: "CASCADE",
      },
      contact_person_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "contact_persons",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      assigned_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      stage: {
        type: Sequelize.ENUM(
          "prospecting",
          "qualification",
          "proposal",
          "negotiation",
          "closed_won",
          "closed_lost"
        ),
        allowNull: false,
        defaultValue: "prospecting",
      },
      status: {
        type: Sequelize.ENUM("active", "won", "lost", "abandoned"),
        allowNull: false,
        defaultValue: "active",
      },
      value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },
      probability: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 50,
      },
      expected_close_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      actual_close_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      products: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      competitors: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      won_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      lost_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tags: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      source: {
        type: Sequelize.STRING,
        allowNull: true,
      },
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

    // Add indexes for common queries
    await queryInterface.addIndex("opportunities", ["institution_id"], {
      name: "opportunities_institution_id_idx",
    })

    await queryInterface.addIndex("opportunities", ["contact_person_id"], {
      name: "opportunities_contact_person_id_idx",
    })

    await queryInterface.addIndex("opportunities", ["assigned_user_id"], {
      name: "opportunities_assigned_user_id_idx",
    })

    await queryInterface.addIndex("opportunities", ["stage"], {
      name: "opportunities_stage_idx",
    })

    await queryInterface.addIndex("opportunities", ["status"], {
      name: "opportunities_status_idx",
    })

    await queryInterface.addIndex("opportunities", ["expected_close_date"], {
      name: "opportunities_expected_close_date_idx",
    })

    await queryInterface.addIndex("opportunities", ["value"], {
      name: "opportunities_value_idx",
    })

    await queryInterface.addIndex("opportunities", ["probability"], {
      name: "opportunities_probability_idx",
    })

    await queryInterface.addIndex("opportunities", ["created_at"], {
      name: "opportunities_created_at_idx",
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("opportunities")
  },
}
