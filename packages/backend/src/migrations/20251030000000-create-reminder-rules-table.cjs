"use strict"

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("reminder_rules", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      entity_type: {
        type: Sequelize.ENUM("task", "quote", "invoice"),
        allowNull: false,
      },
      trigger_type: {
        type: Sequelize.ENUM("due_soon", "overdue", "expired", "unpaid"),
        allowNull: false,
      },
      days_before: {
        type: Sequelize.INTEGER,
        defaultValue: 7,
        comment: "Days before due date to trigger for 'due_soon' type",
      },
      days_after: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: "Days after due date to trigger for 'overdue' type",
      },
      priority: {
        type: Sequelize.ENUM("low", "medium", "high", "urgent"),
        defaultValue: "medium",
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      title_template: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: "{entityType} Reminder",
      },
      message_template: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: "Your {entityType} '{title}' needs attention.",
      },
      action_url_template: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: "/{entityType}s/{id}",
      },
      action_text_template: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: "View {entityType}",
      },
      auto_create_task: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      task_title_template: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Template for auto-generated task title",
      },
      task_priority: {
        type: Sequelize.ENUM("low", "medium", "high", "urgent"),
        defaultValue: "medium",
        allowNull: false,
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
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    })

    // Create indexes for better performance
    await queryInterface.addIndex("reminder_rules", [
      "entity_type",
      "trigger_type",
      "is_active",
    ])
    await queryInterface.addIndex("reminder_rules", ["team_id"])
    await queryInterface.addIndex("reminder_rules", ["created_by"])
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("reminder_rules")
  },
}
