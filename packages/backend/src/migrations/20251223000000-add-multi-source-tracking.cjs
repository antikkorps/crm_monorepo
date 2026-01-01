"use strict"

/**
 * Migration: Add multi-source tracking and lock mechanism
 *
 * Purpose: Track data source (crm, digiforma, sage, import) and prevent
 * external systems from overwriting CRM-enriched data
 *
 * Tables affected:
 * - contact_persons
 * - medical_institutions
 *
 * Key concepts:
 * - data_source: NEVER changes (historical provenance)
 * - is_locked: Indicates CRM has taken control (manual edit or interaction)
 * - UI: Badge shows current state (CRM if locked, source otherwise)
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
    // CONTACT_PERSONS - Multi-source tracking
    // ============================================

    if (!(await columnExists('contact_persons', 'data_source'))) {
      await queryInterface.addColumn('contact_persons', 'data_source', {
        type: Sequelize.ENUM('crm', 'digiforma', 'sage', 'import'),
        defaultValue: 'crm',
        allowNull: false
      })
    }

    if (!(await columnExists('contact_persons', 'is_locked'))) {
      await queryInterface.addColumn('contact_persons', 'is_locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      })
    }

    if (!(await columnExists('contact_persons', 'locked_at'))) {
      await queryInterface.addColumn('contact_persons', 'locked_at', {
        type: Sequelize.DATE,
        allowNull: true
      })
    }

    if (!(await columnExists('contact_persons', 'locked_reason'))) {
      await queryInterface.addColumn('contact_persons', 'locked_reason', {
        type: Sequelize.STRING,
        allowNull: true
      })
    }

    if (!(await columnExists('contact_persons', 'external_data'))) {
      await queryInterface.addColumn('contact_persons', 'external_data', {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      })
    }

    if (!(await columnExists('contact_persons', 'last_sync_at'))) {
      await queryInterface.addColumn('contact_persons', 'last_sync_at', {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      })
    }

    // ============================================
    // MEDICAL_INSTITUTIONS - Multi-source tracking
    // ============================================

    if (!(await columnExists('medical_institutions', 'data_source'))) {
      await queryInterface.addColumn('medical_institutions', 'data_source', {
        type: Sequelize.ENUM('crm', 'digiforma', 'sage', 'import'),
        defaultValue: 'crm',
        allowNull: false
      })
    }

    if (!(await columnExists('medical_institutions', 'is_locked'))) {
      await queryInterface.addColumn('medical_institutions', 'is_locked', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      })
    }

    if (!(await columnExists('medical_institutions', 'locked_at'))) {
      await queryInterface.addColumn('medical_institutions', 'locked_at', {
        type: Sequelize.DATE,
        allowNull: true
      })
    }

    if (!(await columnExists('medical_institutions', 'locked_reason'))) {
      await queryInterface.addColumn('medical_institutions', 'locked_reason', {
        type: Sequelize.STRING,
        allowNull: true
      })
    }

    if (!(await columnExists('medical_institutions', 'external_data'))) {
      await queryInterface.addColumn('medical_institutions', 'external_data', {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      })
    }

    if (!(await columnExists('medical_institutions', 'last_sync_at'))) {
      await queryInterface.addColumn('medical_institutions', 'last_sync_at', {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      })
    }

    // ============================================
    // Add indexes for performance
    // ============================================

    if (!(await indexExists('idx_contact_persons_is_locked'))) {
      await queryInterface.addIndex('contact_persons', ['is_locked'], {
        name: 'idx_contact_persons_is_locked'
      })
    }

    if (!(await indexExists('idx_contact_persons_data_source'))) {
      await queryInterface.addIndex('contact_persons', ['data_source'], {
        name: 'idx_contact_persons_data_source'
      })
    }

    if (!(await indexExists('idx_medical_institutions_is_locked'))) {
      await queryInterface.addIndex('medical_institutions', ['is_locked'], {
        name: 'idx_medical_institutions_is_locked'
      })
    }

    if (!(await indexExists('idx_medical_institutions_data_source'))) {
      await queryInterface.addIndex('medical_institutions', ['data_source'], {
        name: 'idx_medical_institutions_data_source'
      })
    }

    // ============================================
    // Migrate existing data
    // ============================================

    // Check if digiforma_companies table exists
    const tableExists = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'digiforma_companies'
      );
    `, { type: Sequelize.QueryTypes.SELECT })

    const digiformaTableExists = tableExists[0]?.exists

    if (digiformaTableExists) {
      // Mark contacts from DigiformaCompany as 'digiforma' source
      await queryInterface.sequelize.query(`
        UPDATE contact_persons cp
        SET
          data_source = 'digiforma',
          is_locked = false
        FROM medical_institutions mi
        WHERE cp.institution_id = mi.id
          AND mi.id IN (
            SELECT institution_id
            FROM digiforma_companies
            WHERE institution_id IS NOT NULL
          );
      `)

      // Mark institutions linked to Digiforma as 'digiforma' source
      await queryInterface.sequelize.query(`
        UPDATE medical_institutions mi
        SET
          data_source = 'digiforma',
          is_locked = false
        WHERE mi.id IN (
          SELECT institution_id
          FROM digiforma_companies
          WHERE institution_id IS NOT NULL
        );
      `)

      console.log('✅ Migrated existing Digiforma data')
    } else {
      console.log('⏭️  Skipping Digiforma data migration (table does not exist yet)')
    }

    // Auto-lock will be handled by application hooks going forward
    // Skipping retroactive auto-lock for existing data to avoid schema errors
    console.log('⏭️  Skipping retroactive auto-lock (will be handled by application hooks)')

    console.log('✅ Multi-source tracking migration completed')
    console.log('   - Added data_source, is_locked, locked_at, locked_reason to contact_persons')
    console.log('   - Added data_source, is_locked, locked_at, locked_reason to medical_institutions')
    console.log('   - Added external_data and last_sync_at JSONB fields')
  },

  async down(queryInterface, Sequelize) {
    // ============================================
    // Remove indexes
    // ============================================

    await queryInterface.removeIndex('contact_persons', 'idx_contact_persons_is_locked')
    await queryInterface.removeIndex('contact_persons', 'idx_contact_persons_data_source')
    await queryInterface.removeIndex('medical_institutions', 'idx_medical_institutions_is_locked')
    await queryInterface.removeIndex('medical_institutions', 'idx_medical_institutions_data_source')

    // ============================================
    // Remove columns from contact_persons
    // ============================================

    await queryInterface.removeColumn('contact_persons', 'data_source')
    await queryInterface.removeColumn('contact_persons', 'is_locked')
    await queryInterface.removeColumn('contact_persons', 'locked_at')
    await queryInterface.removeColumn('contact_persons', 'locked_reason')
    await queryInterface.removeColumn('contact_persons', 'external_data')
    await queryInterface.removeColumn('contact_persons', 'last_sync_at')

    // ============================================
    // Remove columns from medical_institutions
    // ============================================

    await queryInterface.removeColumn('medical_institutions', 'data_source')
    await queryInterface.removeColumn('medical_institutions', 'is_locked')
    await queryInterface.removeColumn('medical_institutions', 'locked_at')
    await queryInterface.removeColumn('medical_institutions', 'locked_reason')
    await queryInterface.removeColumn('medical_institutions', 'external_data')
    await queryInterface.removeColumn('medical_institutions', 'last_sync_at')

    // ============================================
    // Drop ENUM type
    // ============================================

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_data_source;')

    console.log('✅ Multi-source tracking migration rolled back')
  }
}
