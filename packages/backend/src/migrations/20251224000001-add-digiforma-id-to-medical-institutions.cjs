"use strict"

/**
 * Migration: Add digiforma_id column to medical_institutions table
 *
 * This migration adds the digiforma_id field to medical institutions
 * to support matching with Digiforma system data
 *
 * Features:
 * - Nullable string field (max 100 characters)
 * - Unique constraint (null values allowed multiple times)
 * - Indexed for fast lookups
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding digiforma_id to medical_institutions...')

    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('medical_institutions')

    if (!tableDescription.digiforma_id) {
      // Add digiforma_id column
      await queryInterface.addColumn('medical_institutions', 'digiforma_id', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Digiforma system ID for matching with external data'
      })
      console.log('✅ Added digiforma_id column to medical_institutions')
    } else {
      console.log('⏭️  digiforma_id column already exists, skipping')
    }

    // Check if index already exists
    const indexes = await queryInterface.showIndex('medical_institutions')
    const indexExists = indexes.some(idx => idx.name === 'medical_institutions_digiforma_id_unique')

    if (!indexExists) {
      // Create unique index on digiforma_id (only for non-null values)
      // This allows multiple NULL values while ensuring uniqueness for actual values
      await queryInterface.addIndex('medical_institutions', ['digiforma_id'], {
        name: 'medical_institutions_digiforma_id_unique',
        unique: true,
        where: Sequelize.literal('digiforma_id IS NOT NULL')
      })
      console.log('✅ Added unique index to digiforma_id')
    } else {
      console.log('⏭️  Index already exists, skipping')
    }

    // Migrate existing external_data.digiforma.id to digiforma_id column
    await queryInterface.sequelize.query(`
      UPDATE medical_institutions
      SET digiforma_id = external_data->'digiforma'->>'id'
      WHERE external_data->'digiforma'->>'id' IS NOT NULL
        AND digiforma_id IS NULL;
    `)
    console.log('✅ Migrated existing Digiforma IDs from external_data')
  },

  async down(queryInterface, Sequelize) {
    console.log('🔧 Removing digiforma_id from medical_institutions...')

    // Check if index exists before removing
    const indexes = await queryInterface.showIndex('medical_institutions')
    const indexExists = indexes.some(idx => idx.name === 'medical_institutions_digiforma_id_unique')

    if (indexExists) {
      // Remove index first
      await queryInterface.removeIndex(
        'medical_institutions',
        'medical_institutions_digiforma_id_unique'
      )
      console.log('✅ Removed index from digiforma_id')
    }

    // Check if column exists before removing
    const tableDescription = await queryInterface.describeTable('medical_institutions')

    if (tableDescription.digiforma_id) {
      // Remove column
      await queryInterface.removeColumn('medical_institutions', 'digiforma_id')
      console.log('✅ Removed digiforma_id column from medical_institutions')
    }
  }
}
