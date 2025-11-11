"use strict"

/**
 * Migration to create reminder_notification_logs table for persistent notification tracking.
 *
 * This table replaces the in-memory cache and provides:
 * - Persistent anti-spam protection (survives server restarts)
 * - Complete audit trail of all notifications sent
 * - Analytics data (success/failure rates, volume trends)
 * - Debugging information (error messages, timestamps)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("reminder_notification_logs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      rule_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "reminder_rules",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Reminder rule that triggered this notification",
      },
      entity_type: {
        type: Sequelize.ENUM("task", "quote", "invoice"),
        allowNull: false,
        comment: "Type of entity this notification is about",
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: "ID of the specific task/quote/invoice",
      },
      recipient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "User who received the notification",
      },
      notification_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: "in_app",
        comment: "Type of notification: in_app, email, both",
      },
      status: {
        type: Sequelize.ENUM("sent", "failed", "pending"),
        allowNull: false,
        defaultValue: "sent",
        comment: "Delivery status of the notification",
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Error details if status is 'failed'",
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: "When the notification was sent (or attempted)",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "created_at",
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        field: "updated_at",
      },
    })

    console.log("Creating indexes for reminder_notification_logs...")

    // Primary lookup index for anti-spam checks
    // Used to check if notification was sent recently for a specific rule+entity+recipient
    await queryInterface.addIndex("reminder_notification_logs", {
      name: "idx_reminder_logs_dedup",
      fields: ["rule_id", "entity_type", "entity_id", "recipient_id"],
      comment:
        "Fast lookup for anti-spam check: has this rule+entity+recipient been notified recently?",
    })

    // Index for finding all notifications for a specific entity
    await queryInterface.addIndex("reminder_notification_logs", {
      name: "idx_reminder_logs_entity",
      fields: ["entity_type", "entity_id"],
      comment: "Find all notifications for a specific task/quote/invoice",
    })

    // Index for finding all notifications for a specific user
    await queryInterface.addIndex("reminder_notification_logs", {
      name: "idx_reminder_logs_recipient",
      fields: ["recipient_id", "sent_at"],
      comment: "Find all notifications for a user, ordered by date",
    })

    // Index for finding all notifications for a specific rule
    await queryInterface.addIndex("reminder_notification_logs", {
      name: "idx_reminder_logs_rule",
      fields: ["rule_id", "sent_at"],
      comment: "Analytics: notification volume by rule over time",
    })

    // Index for time-based queries and cleanup
    await queryInterface.addIndex("reminder_notification_logs", {
      name: "idx_reminder_logs_sent_at",
      fields: ["sent_at"],
      comment: "Cleanup old logs, time-series analytics",
    })

    // Index for monitoring failed notifications
    await queryInterface.addIndex("reminder_notification_logs", {
      name: "idx_reminder_logs_status",
      fields: ["status", "sent_at"],
      comment: "Monitor failure rates over time",
    })

    console.log("✓ reminder_notification_logs table created with 6 indexes")
  },

  down: async (queryInterface, Sequelize) => {
    console.log("Dropping reminder_notification_logs table...")
    await queryInterface.dropTable("reminder_notification_logs")
    console.log("✓ reminder_notification_logs table dropped")
  },
}
