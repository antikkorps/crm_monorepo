"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create webhooks table
    await queryInterface.createTable("webhooks", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      events: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "disabled"),
        allowNull: false,
        defaultValue: "active",
      },
      secret: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      headers: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      timeout: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30000,
      },
      max_retries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      retry_delay: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5000,
      },
      last_triggered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_success_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_failure_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failure_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
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

    // Create webhook_logs table
    await queryInterface.createTable("webhook_logs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      webhook_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "webhooks",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      event: {
        type: Sequelize.ENUM(
          "institution.created",
          "institution.updated",
          "institution.deleted",
          "quote.created",
          "quote.updated",
          "quote.accepted",
          "quote.rejected",
          "invoice.created",
          "invoice.updated",
          "invoice.paid",
          "payment.received",
          "task.created",
          "task.updated",
          "task.completed",
          "user.created",
          "user.updated"
        ),
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      status: {
        type: Sequelize.ENUM("pending", "success", "failed", "retrying"),
        allowNull: false,
        defaultValue: "pending",
      },
      http_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      response_body: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      attempt_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      max_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      next_retry_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    // Add basic indexes
    await queryInterface.addIndex("webhooks", ["created_by"])
    await queryInterface.addIndex("webhooks", ["status"])
    await queryInterface.addIndex("webhooks", ["is_active"])

    await queryInterface.addIndex("webhook_logs", ["webhook_id"])
    await queryInterface.addIndex("webhook_logs", ["status"])
    await queryInterface.addIndex("webhook_logs", ["event"])
    await queryInterface.addIndex("webhook_logs", ["next_retry_at"])
    await queryInterface.addIndex("webhook_logs", ["created_at"])
  },

  async down(queryInterface, Sequelize) {
    // Drop tables
    await queryInterface.dropTable("webhook_logs")
    await queryInterface.dropTable("webhooks")
  },
}
