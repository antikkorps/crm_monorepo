"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add VAT rate column to engagement_letters
    await queryInterface.addColumn("engagement_letters", "vat_rate", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 20.0, // Default 20% TVA in France
    })

    // Add show_vat column (whether to display VAT in the document)
    await queryInterface.addColumn("engagement_letters", "show_vat", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true, // Default to showing VAT
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("engagement_letters", "show_vat")
    await queryInterface.removeColumn("engagement_letters", "vat_rate")
  },
}
