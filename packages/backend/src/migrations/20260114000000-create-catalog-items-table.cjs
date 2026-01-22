"use strict"

/**
 * Migration to create catalog_items table for product/service catalog management.
 *
 * This table provides:
 * - Product and service catalog with pricing
 * - Category-based organization
 * - SKU tracking for inventory
 * - Unit of measurement for each item
 * - Tax rate management
 * - Active/inactive status for lifecycle management
 * - Audit trail with creator tracking
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("catalog_items", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "Name of the product or service",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Detailed description of the item",
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Category for grouping items (e.g., 'training', 'consulting', 'equipment')",
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: "Unit price in euros (excluding tax)",
      },
      tax_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Tax rate as a percentage (e.g., 20.00 for 20% VAT)",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Whether the item is currently available in the catalog",
      },
      sku: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: "Stock Keeping Unit - unique identifier for the item",
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: "Unit of measurement (e.g., 'hour', 'piece', 'kg', 'day')",
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "User who created this catalog item",
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

    console.log("Creating indexes for catalog_items...")

    // Index for name search
    await queryInterface.addIndex("catalog_items", {
      name: "idx_catalog_items_name",
      fields: ["name"],
      comment: "Quick lookup and sorting by item name",
    })

    // Index for category filtering
    await queryInterface.addIndex("catalog_items", {
      name: "idx_catalog_items_category",
      fields: ["category"],
      comment: "Filter items by category",
    })

    // Index for active/inactive filtering
    await queryInterface.addIndex("catalog_items", {
      name: "idx_catalog_items_is_active",
      fields: ["is_active"],
      comment: "Filter active vs inactive items",
    })

    // Unique index for SKU (only when not null)
    // PostgreSQL allows multiple NULL values in unique constraints
    await queryInterface.addIndex("catalog_items", {
      name: "idx_catalog_items_sku_unique",
      fields: ["sku"],
      unique: true,
      comment: "Ensure SKU uniqueness when provided",
    })

    // Index for creator lookup
    await queryInterface.addIndex("catalog_items", {
      name: "idx_catalog_items_created_by",
      fields: ["created_by"],
      comment: "Find items created by a specific user",
    })

    console.log("✓ catalog_items table created with 5 indexes")
  },

  down: async (queryInterface, Sequelize) => {
    console.log("Dropping catalog_items table...")
    await queryInterface.dropTable("catalog_items")
    console.log("✓ catalog_items table dropped")
  },
}
