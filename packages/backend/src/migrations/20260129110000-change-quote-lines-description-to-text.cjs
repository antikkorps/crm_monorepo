"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Change description column from VARCHAR(255) to TEXT to support rich text JSON
    await queryInterface.changeColumn("quote_lines", "description", {
      type: Sequelize.TEXT,
      allowNull: false,
    })
  },

  async down(queryInterface, Sequelize) {
    // Revert to VARCHAR(255) - note: this may truncate data
    await queryInterface.changeColumn("quote_lines", "description", {
      type: Sequelize.STRING(255),
      allowNull: false,
    })
  },
}
