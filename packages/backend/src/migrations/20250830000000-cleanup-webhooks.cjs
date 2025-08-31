"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if webhook tables exist and drop them
    try {
      await queryInterface.dropTable("webhook_logs")
    } catch (error) {
      console.log("webhook_logs table does not exist, skipping...")
    }

    try {
      await queryInterface.dropTable("webhooks")
    } catch (error) {
      console.log("webhooks table does not exist, skipping...")
    }

    // Drop any existing enum types
    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_webhooks_status";')
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_webhook_logs_event";'
      )
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_webhook_logs_status";'
      )
    } catch (error) {
      console.log("Enum types do not exist, skipping...")
    }
  },

  async down(queryInterface, Sequelize) {
    // Nothing to do in down migration
  },
}
