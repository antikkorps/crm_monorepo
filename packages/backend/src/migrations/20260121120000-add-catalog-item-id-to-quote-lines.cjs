"use strict"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add catalog_item_id column to quote_lines table
    await queryInterface.addColumn("quote_lines", "catalog_item_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "catalog_items",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    })

    // Add index for faster lookups
    await queryInterface.addIndex("quote_lines", ["catalog_item_id"], {
      name: "quote_lines_catalog_item_id_idx",
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("quote_lines", "quote_lines_catalog_item_id_idx")
    await queryInterface.removeColumn("quote_lines", "catalog_item_id")
  },
}
