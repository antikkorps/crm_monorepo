/**
 * Migration: Add accounting_number column to medical_institutions table
 *
 * This migration adds the accounting_number field to medical institutions
 * to support matching with accounting systems (Sage, CSV imports, etc.)
 *
 * Features:
 * - Nullable string field (max 50 characters)
 * - Unique constraint (null values allowed multiple times)
 * - Indexed for fast lookups
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add accounting_number column
    await queryInterface.addColumn('medical_institutions', 'accounting_number', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Accounting system client number for matching with Sage/CSV imports'
    });

    // Create unique index on accounting_number (only for non-null values)
    // This allows multiple NULL values while ensuring uniqueness for actual values
    await queryInterface.addIndex('medical_institutions', ['accounting_number'], {
      name: 'medical_institutions_accounting_number_unique',
      unique: true,
      where: Sequelize.literal('accounting_number IS NOT NULL')
    });

    console.log('✅ Added accounting_number column with unique index to medical_institutions');
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex(
      'medical_institutions',
      'medical_institutions_accounting_number_unique'
    );

    // Remove column
    await queryInterface.removeColumn('medical_institutions', 'accounting_number');

    console.log('✅ Removed accounting_number column from medical_institutions');
  }
};
