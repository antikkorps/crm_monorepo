"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Use raw SQL to ensure user_id becomes nullable
    await queryInterface.sequelize.query(`
      ALTER TABLE meeting_participants
      ALTER COLUMN user_id DROP NOT NULL;
    `)
    console.log("Successfully made user_id nullable in meeting_participants")
  },

  async down(queryInterface, Sequelize) {
    // Revert: make user_id NOT NULL again
    await queryInterface.sequelize.query(`
      ALTER TABLE meeting_participants
      ALTER COLUMN user_id SET NOT NULL;
    `)
  },
}
