"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add totalDays and travelExpenses to engagement_letters
    await queryInterface.addColumn("engagement_letters", "total_days", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
    })

    await queryInterface.addColumn("engagement_letters", "travel_expenses", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    })

    console.log("Added total_days and travel_expenses columns to engagement_letters")
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("engagement_letters", "total_days")
    await queryInterface.removeColumn("engagement_letters", "travel_expenses")
  },
}
