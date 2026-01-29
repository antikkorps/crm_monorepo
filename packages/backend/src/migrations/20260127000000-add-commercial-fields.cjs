"use strict"

/**
 * Migration: Add commercial fields for import
 *
 * Purpose: Add new fields for commercial import workflow
 *
 * Tables affected:
 * - medical_institutions: finess, group_name, commercial_status, main_phone
 * - medical_profiles: staff_count, endoscopy_rooms, surgical_interventions, endoscopy_interventions
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      const result = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND column_name = '${columnName}'
        );
      `, { type: Sequelize.QueryTypes.SELECT })
      return result[0]?.exists
    }

    // Helper function to check if index exists
    const indexExists = async (indexName) => {
      const result = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes
          WHERE schemaname = 'public'
          AND indexname = '${indexName}'
        );
      `, { type: Sequelize.QueryTypes.SELECT })
      return result[0]?.exists
    }

    // ============================================
    // MEDICAL_INSTITUTIONS - Commercial fields
    // ============================================

    // FINESS number (unique identifier for French health establishments)
    if (!(await columnExists('medical_institutions', 'finess'))) {
      await queryInterface.addColumn('medical_institutions', 'finess', {
        type: Sequelize.STRING(9),
        allowNull: true,
        unique: true
      })
      console.log('  + Added finess column to medical_institutions')
    }

    // Group name (for filtering by healthcare group)
    if (!(await columnExists('medical_institutions', 'group_name'))) {
      await queryInterface.addColumn('medical_institutions', 'group_name', {
        type: Sequelize.STRING(255),
        allowNull: true
      })
      console.log('  + Added group_name column to medical_institutions')
    }

    // Commercial status (prospect/client)
    if (!(await columnExists('medical_institutions', 'commercial_status'))) {
      await queryInterface.addColumn('medical_institutions', 'commercial_status', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'prospect'
      })
      console.log('  + Added commercial_status column to medical_institutions')
    }

    // Main phone (standard phone number)
    if (!(await columnExists('medical_institutions', 'main_phone'))) {
      await queryInterface.addColumn('medical_institutions', 'main_phone', {
        type: Sequelize.STRING(20),
        allowNull: true
      })
      console.log('  + Added main_phone column to medical_institutions')
    }

    // ============================================
    // MEDICAL_PROFILES - Activity fields
    // ============================================

    // Staff count
    if (!(await columnExists('medical_profiles', 'staff_count'))) {
      await queryInterface.addColumn('medical_profiles', 'staff_count', {
        type: Sequelize.INTEGER,
        allowNull: true
      })
      console.log('  + Added staff_count column to medical_profiles')
    }

    // Endoscopy rooms
    if (!(await columnExists('medical_profiles', 'endoscopy_rooms'))) {
      await queryInterface.addColumn('medical_profiles', 'endoscopy_rooms', {
        type: Sequelize.INTEGER,
        allowNull: true
      })
      console.log('  + Added endoscopy_rooms column to medical_profiles')
    }

    // Surgical interventions per year
    if (!(await columnExists('medical_profiles', 'surgical_interventions'))) {
      await queryInterface.addColumn('medical_profiles', 'surgical_interventions', {
        type: Sequelize.INTEGER,
        allowNull: true
      })
      console.log('  + Added surgical_interventions column to medical_profiles')
    }

    // Endoscopy interventions per year
    if (!(await columnExists('medical_profiles', 'endoscopy_interventions'))) {
      await queryInterface.addColumn('medical_profiles', 'endoscopy_interventions', {
        type: Sequelize.INTEGER,
        allowNull: true
      })
      console.log('  + Added endoscopy_interventions column to medical_profiles')
    }

    // ============================================
    // Add indexes for performance
    // ============================================

    if (!(await indexExists('idx_medical_institutions_finess'))) {
      await queryInterface.addIndex('medical_institutions', ['finess'], {
        name: 'idx_medical_institutions_finess',
        unique: true,
        where: {
          finess: { [Sequelize.Op.ne]: null }
        }
      })
      console.log('  + Added unique index on finess')
    }

    if (!(await indexExists('idx_medical_institutions_group_name'))) {
      await queryInterface.addIndex('medical_institutions', ['group_name'], {
        name: 'idx_medical_institutions_group_name'
      })
      console.log('  + Added index on group_name')
    }

    if (!(await indexExists('idx_medical_institutions_commercial_status'))) {
      await queryInterface.addIndex('medical_institutions', ['commercial_status'], {
        name: 'idx_medical_institutions_commercial_status'
      })
      console.log('  + Added index on commercial_status')
    }

    console.log('✅ Commercial fields migration completed')
  },

  async down(queryInterface, Sequelize) {
    // ============================================
    // Remove indexes
    // ============================================

    try {
      await queryInterface.removeIndex('medical_institutions', 'idx_medical_institutions_finess')
    } catch (e) { /* Index may not exist */ }

    try {
      await queryInterface.removeIndex('medical_institutions', 'idx_medical_institutions_group_name')
    } catch (e) { /* Index may not exist */ }

    try {
      await queryInterface.removeIndex('medical_institutions', 'idx_medical_institutions_commercial_status')
    } catch (e) { /* Index may not exist */ }

    // ============================================
    // Remove columns from medical_institutions
    // ============================================

    try {
      await queryInterface.removeColumn('medical_institutions', 'finess')
    } catch (e) { /* Column may not exist */ }

    try {
      await queryInterface.removeColumn('medical_institutions', 'group_name')
    } catch (e) { /* Column may not exist */ }

    try {
      await queryInterface.removeColumn('medical_institutions', 'commercial_status')
    } catch (e) { /* Column may not exist */ }

    try {
      await queryInterface.removeColumn('medical_institutions', 'main_phone')
    } catch (e) { /* Column may not exist */ }

    // ============================================
    // Remove columns from medical_profiles
    // ============================================

    try {
      await queryInterface.removeColumn('medical_profiles', 'staff_count')
    } catch (e) { /* Column may not exist */ }

    try {
      await queryInterface.removeColumn('medical_profiles', 'endoscopy_rooms')
    } catch (e) { /* Column may not exist */ }

    try {
      await queryInterface.removeColumn('medical_profiles', 'surgical_interventions')
    } catch (e) { /* Column may not exist */ }

    try {
      await queryInterface.removeColumn('medical_profiles', 'endoscopy_interventions')
    } catch (e) { /* Column may not exist */ }

    console.log('✅ Commercial fields migration rolled back')
  }
}
