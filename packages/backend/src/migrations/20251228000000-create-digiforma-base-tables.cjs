"use strict"

/**
 * Migration: Create Digiforma base tables
 *
 * This migration creates all the base tables needed for Digiforma integration:
 * - digiforma_settings: Configuration and API credentials
 * - digiforma_syncs: Sync history and status tracking
 * - digiforma_companies: Companies from Digiforma
 * - digiforma_contacts: Contacts from Digiforma
 * - digiforma_quotes: Quotes from Digiforma
 * - digiforma_invoices: Invoices from Digiforma
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Creating Digiforma base tables...')

    // Check if tables already exist
    const tables = await queryInterface.showAllTables()

    // 1. Create digiforma_settings table
    if (!tables.includes('digiforma_settings')) {
      await queryInterface.createTable('digiforma_settings', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        bearer_token_encrypted: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Encrypted bearer token for Digiforma API'
        },
        api_url: {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'https://api.digiforma.com/graphql'
        },
        is_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        auto_sync_enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        sync_frequency: {
          type: Sequelize.ENUM('daily', 'weekly', 'monthly'),
          allowNull: false,
          defaultValue: 'weekly'
        },
        last_test_date: {
          type: Sequelize.DATE,
          allowNull: true
        },
        last_test_success: {
          type: Sequelize.BOOLEAN,
          allowNull: true
        },
        last_test_message: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        last_sync_date: {
          type: Sequelize.DATE,
          allowNull: true
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
      console.log('✅ Created digiforma_settings table')
    }

    // 2. Create digiforma_syncs table
    if (!tables.includes('digiforma_syncs')) {
      // Create enum types first
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_digiforma_syncs_type AS ENUM ('manual', 'scheduled', 'automatic');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)

      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_digiforma_syncs_status AS ENUM ('pending', 'in_progress', 'success', 'partial', 'error');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)

      await queryInterface.createTable('digiforma_syncs', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        type: {
          type: Sequelize.ENUM('manual', 'scheduled', 'automatic'),
          allowNull: false,
          defaultValue: 'manual'
        },
        status: {
          type: Sequelize.ENUM('pending', 'in_progress', 'success', 'partial', 'error'),
          allowNull: false,
          defaultValue: 'pending'
        },
        triggered_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        companies_synced: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        contacts_synced: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        quotes_synced: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        invoices_synced: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        errors: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: []
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true
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

      await queryInterface.addIndex('digiforma_syncs', ['status'])
      await queryInterface.addIndex('digiforma_syncs', ['created_at'])

      console.log('✅ Created digiforma_syncs table')
    }

    // 3. Create digiforma_companies table
    if (!tables.includes('digiforma_companies')) {
      await queryInterface.createTable('digiforma_companies', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        digiforma_id: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
          comment: 'Digiforma company ID'
        },
        institution_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'medical_institutions',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING,
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        address: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        siret: {
          type: Sequelize.STRING,
          allowNull: true
        },
        website: {
          type: Sequelize.STRING,
          allowNull: true
        },
        last_sync_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Additional Digiforma data'
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

      await queryInterface.addIndex('digiforma_companies', ['digiforma_id'], { unique: true })
      await queryInterface.addIndex('digiforma_companies', ['institution_id'])
      await queryInterface.addIndex('digiforma_companies', ['email'])

      console.log('✅ Created digiforma_companies table')
    }

    // 4. Create digiforma_contacts table
    if (!tables.includes('digiforma_contacts')) {
      await queryInterface.createTable('digiforma_contacts', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        digiforma_id: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        digiforma_company_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'digiforma_companies',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        contact_person_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'contact_persons',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        first_name: {
          type: Sequelize.STRING,
          allowNull: true
        },
        last_name: {
          type: Sequelize.STRING,
          allowNull: true
        },
        email: {
          type: Sequelize.STRING,
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        title: {
          type: Sequelize.STRING,
          allowNull: true
        },
        last_sync_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true
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

      await queryInterface.addIndex('digiforma_contacts', ['digiforma_id'], { unique: true })
      await queryInterface.addIndex('digiforma_contacts', ['digiforma_company_id'])
      await queryInterface.addIndex('digiforma_contacts', ['contact_person_id'])

      console.log('✅ Created digiforma_contacts table')
    }

    // 5. Create digiforma_quotes table
    if (!tables.includes('digiforma_quotes')) {
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_digiforma_quotes_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)

      await queryInterface.createTable('digiforma_quotes', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        digiforma_id: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        digiforma_company_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'digiforma_companies',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        institution_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'medical_institutions',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        quote_number: {
          type: Sequelize.STRING,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('draft', 'sent', 'accepted', 'rejected', 'expired'),
          allowNull: false,
          defaultValue: 'draft'
        },
        total_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        currency: {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: 'EUR'
        },
        created_date: {
          type: Sequelize.DATE,
          allowNull: true
        },
        accepted_date: {
          type: Sequelize.DATE,
          allowNull: true
        },
        last_sync_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true
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

      await queryInterface.addIndex('digiforma_quotes', ['digiforma_id'], { unique: true })
      await queryInterface.addIndex('digiforma_quotes', ['digiforma_company_id'])
      await queryInterface.addIndex('digiforma_quotes', ['institution_id'])
      await queryInterface.addIndex('digiforma_quotes', ['status'])

      console.log('✅ Created digiforma_quotes table')
    }

    // 6. Create digiforma_invoices table
    if (!tables.includes('digiforma_invoices')) {
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE enum_digiforma_invoices_status AS ENUM ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)

      await queryInterface.createTable('digiforma_invoices', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        digiforma_id: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        digiforma_company_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'digiforma_companies',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        digiforma_quote_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'digiforma_quotes',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        institution_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'medical_institutions',
            key: 'id'
          },
          onDelete: 'SET NULL'
        },
        invoice_number: {
          type: Sequelize.STRING,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'),
          allowNull: false,
          defaultValue: 'draft'
        },
        total_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        paid_amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        currency: {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: 'EUR'
        },
        issue_date: {
          type: Sequelize.DATE,
          allowNull: true
        },
        paid_date: {
          type: Sequelize.DATE,
          allowNull: true
        },
        last_sync_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true
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

      await queryInterface.addIndex('digiforma_invoices', ['digiforma_id'], { unique: true })
      await queryInterface.addIndex('digiforma_invoices', ['digiforma_company_id'])
      await queryInterface.addIndex('digiforma_invoices', ['digiforma_quote_id'])
      await queryInterface.addIndex('digiforma_invoices', ['institution_id'])
      await queryInterface.addIndex('digiforma_invoices', ['status'])

      console.log('✅ Created digiforma_invoices table')
    }

    console.log('✅ All Digiforma base tables created successfully')
  },

  async down(queryInterface, Sequelize) {
    console.log('🔧 Dropping Digiforma base tables...')

    const tables = await queryInterface.showAllTables()

    // Drop tables in reverse order (respecting foreign keys)
    if (tables.includes('digiforma_invoices')) {
      await queryInterface.dropTable('digiforma_invoices')
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_digiforma_invoices_status;')
      console.log('✅ Dropped digiforma_invoices table')
    }

    if (tables.includes('digiforma_quotes')) {
      await queryInterface.dropTable('digiforma_quotes')
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_digiforma_quotes_status;')
      console.log('✅ Dropped digiforma_quotes table')
    }

    if (tables.includes('digiforma_contacts')) {
      await queryInterface.dropTable('digiforma_contacts')
      console.log('✅ Dropped digiforma_contacts table')
    }

    if (tables.includes('digiforma_companies')) {
      await queryInterface.dropTable('digiforma_companies')
      console.log('✅ Dropped digiforma_companies table')
    }

    if (tables.includes('digiforma_syncs')) {
      await queryInterface.dropTable('digiforma_syncs')
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_digiforma_syncs_type;')
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_digiforma_syncs_status;')
      console.log('✅ Dropped digiforma_syncs table')
    }

    if (tables.includes('digiforma_settings')) {
      await queryInterface.dropTable('digiforma_settings')
      console.log('✅ Dropped digiforma_settings table')
    }

    console.log('✅ All Digiforma base tables dropped successfully')
  }
}
