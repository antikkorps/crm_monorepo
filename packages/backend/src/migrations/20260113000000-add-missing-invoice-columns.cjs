'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing columns to invoices table

    // 1. Add remaining_amount column
    await queryInterface.addColumn('invoices', 'remaining_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });

    // 2. Add last_payment_date column
    await queryInterface.addColumn('invoices', 'last_payment_date', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 3. Add sent_at column
    await queryInterface.addColumn('invoices', 'sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 4. Add paid_at column
    await queryInterface.addColumn('invoices', 'paid_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // 5. Add archived column
    await queryInterface.addColumn('invoices', 'archived', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // 6. Fix status enum to include 'partially_paid'
    // First, we need to check if the enum exists and add the new value
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        -- Add 'partially_paid' to the enum if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'partially_paid'
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_invoices_status'
          )
        ) THEN
          ALTER TYPE enum_invoices_status ADD VALUE 'partially_paid';
        END IF;
      END$$;
    `);

    // 7. Calculate remaining_amount for existing invoices
    await queryInterface.sequelize.query(`
      UPDATE invoices
      SET remaining_amount = total - paid_amount
      WHERE remaining_amount = 0 OR remaining_amount IS NULL;
    `);

    console.log('✅ Successfully added missing columns to invoices table');
  },

  async down(queryInterface, Sequelize) {
    // Remove columns in reverse order
    await queryInterface.removeColumn('invoices', 'archived');
    await queryInterface.removeColumn('invoices', 'paid_at');
    await queryInterface.removeColumn('invoices', 'sent_at');
    await queryInterface.removeColumn('invoices', 'last_payment_date');
    await queryInterface.removeColumn('invoices', 'remaining_amount');

    // Note: Removing enum value is more complex and not reversible in PostgreSQL
    // We'll leave the enum value in place for safety
    console.log('⚠️  Note: enum value "partially_paid" was not removed (PostgreSQL limitation)');
  }
};
