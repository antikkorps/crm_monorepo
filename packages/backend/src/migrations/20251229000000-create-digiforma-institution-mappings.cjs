"use strict"

/**
 * Migration: Create digiforma_institution_mappings table
 *
 * This migration creates a mapping table between Digiforma companies and CRM institutions.
 * It enables intelligent matching with multiple strategies:
 * - Auto: Matched by accountingNumber, SIRET, or email (100% confidence)
 * - Fuzzy: Matched by name similarity (< 100% confidence)
 * - Manual: Manually confirmed by admin
 *
 * Features:
 * - Unique constraint on digiforma_company_id (one mapping per company)
 * - Match score tracking (0-100)
 * - Match criteria tracking (what field was used for matching)
 * - Admin confirmation support
 * - Indexes for fast lookups
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Creating digiforma_institution_mappings table...')

    // Check if table already exists
    const tables = await queryInterface.showAllTables()

    if (tables.includes('digiforma_institution_mappings')) {
      console.log('⏭️  Table digiforma_institution_mappings already exists, skipping')
      return
    }

    // Create enum type for match_type
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_digiforma_institution_mappings_match_type AS ENUM ('auto', 'fuzzy', 'manual');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)
    console.log('✅ Created match_type enum')

    // Create table
    await queryInterface.createTable('digiforma_institution_mappings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      digiforma_company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'digiforma_companies',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'Digiforma company linked to this mapping'
      },
      institution_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'medical_institutions',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'CRM institution linked to this mapping'
      },
      match_type: {
        type: Sequelize.ENUM('auto', 'fuzzy', 'manual'),
        allowNull: false,
        defaultValue: 'manual',
        comment: 'How this mapping was created'
      },
      match_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100,
        comment: 'Confidence score 0-100'
      },
      match_criteria: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Criteria used for matching (accountingNumber, siret, email, fuzzy_name_city, manual)'
      },
      confirmed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL',
        comment: 'User who confirmed this mapping'
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this mapping was confirmed'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Admin notes about this mapping'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })
    console.log('✅ Created digiforma_institution_mappings table')

    // Create indexes
    await queryInterface.addIndex('digiforma_institution_mappings', ['digiforma_company_id'], {
      name: 'digiforma_institution_mappings_digiforma_company_id',
      unique: true
    })
    console.log('✅ Created unique index on digiforma_company_id')

    await queryInterface.addIndex('digiforma_institution_mappings', ['institution_id'], {
      name: 'digiforma_institution_mappings_institution_id'
    })
    console.log('✅ Created index on institution_id')

    await queryInterface.addIndex('digiforma_institution_mappings', ['match_type'], {
      name: 'digiforma_institution_mappings_match_type'
    })
    console.log('✅ Created index on match_type')

    await queryInterface.addIndex('digiforma_institution_mappings', ['match_score'], {
      name: 'digiforma_institution_mappings_match_score'
    })
    console.log('✅ Created index on match_score')

    console.log('✅ Migration completed successfully')
  },

  async down(queryInterface, Sequelize) {
    console.log('🔧 Removing digiforma_institution_mappings table...')

    // Check if table exists
    const tables = await queryInterface.showAllTables()

    if (!tables.includes('digiforma_institution_mappings')) {
      console.log('⏭️  Table digiforma_institution_mappings does not exist, skipping')
      return
    }

    // Drop table (indexes will be dropped automatically)
    await queryInterface.dropTable('digiforma_institution_mappings')
    console.log('✅ Dropped digiforma_institution_mappings table')

    // Drop enum type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_digiforma_institution_mappings_match_type;
    `)
    console.log('✅ Dropped match_type enum')

    console.log('✅ Rollback completed successfully')
  }
}
