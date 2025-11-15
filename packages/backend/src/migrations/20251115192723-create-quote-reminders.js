'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quote_reminders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      quote_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'quotes',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      reminder_type: {
        type: Sequelize.ENUM('7_days_before', '3_days_before', 'day_of', 'after_expiry'),
        allowNull: false,
        comment: 'Type of reminder sent'
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the reminder was sent'
      },
      sent_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'User who triggered the reminder (null for automatic)'
      },
      recipient_email: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Email address where reminder was sent'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Custom message included in the reminder'
      },
      action_taken: {
        type: Sequelize.ENUM('email_sent', 'notification_created', 'task_created', 'no_action'),
        allowNull: false,
        defaultValue: 'notification_created',
        comment: 'What action was taken for this reminder'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata about the reminder (task_id, notification_id, etc.)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Indexes for performance
    await queryInterface.addIndex('quote_reminders', ['quote_id']);
    await queryInterface.addIndex('quote_reminders', ['sent_at']);
    await queryInterface.addIndex('quote_reminders', ['reminder_type']);
    await queryInterface.addIndex('quote_reminders', ['quote_id', 'reminder_type'], {
      unique: false,
      name: 'quote_reminders_quote_type_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('quote_reminders');
  }
};
