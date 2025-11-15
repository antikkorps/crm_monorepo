'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('quotes', 'last_reminder_sent', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of the last reminder sent for this quote'
    });

    // Add index for efficient queries when checking reminders
    await queryInterface.addIndex('quotes', ['last_reminder_sent']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('quotes', ['last_reminder_sent']);
    await queryInterface.removeColumn('quotes', 'last_reminder_sent');
  }
};
