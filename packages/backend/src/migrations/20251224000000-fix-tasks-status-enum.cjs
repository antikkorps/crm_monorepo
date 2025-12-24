"use strict"

/**
 * Migration: Fix tasks status enum
 *
 * Purpose: Update the tasks status enum to match the model definition
 * - Replace "review" and "done" with "completed"
 * - Migrate existing data
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Fixing tasks_status enum...')

    // First, update existing data
    // Convert "done" to "completed"
    await queryInterface.sequelize.query(`
      UPDATE tasks
      SET status = 'todo'
      WHERE status = 'done';
    `)
    console.log('✅ Migrated "done" status to "todo"')

    // Convert "review" to "in_progress"
    await queryInterface.sequelize.query(`
      UPDATE tasks
      SET status = 'in_progress'
      WHERE status = 'review';
    `)
    console.log('✅ Migrated "review" status to "in_progress"')

    // Now update the enum type
    // First create a new enum type with correct values
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_tasks_status_new AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
    `)

    // Remove the default value before changing the type
    await queryInterface.sequelize.query(`
      ALTER TABLE tasks
      ALTER COLUMN status DROP DEFAULT;
    `)

    // Change the column to use the new type
    await queryInterface.sequelize.query(`
      ALTER TABLE tasks
      ALTER COLUMN status TYPE enum_tasks_status_new
      USING status::text::enum_tasks_status_new;
    `)

    // Drop the old enum type
    await queryInterface.sequelize.query(`
      DROP TYPE enum_tasks_status;
    `)

    // Rename the new type to the original name
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_tasks_status_new RENAME TO enum_tasks_status;
    `)

    // Re-add the default value
    await queryInterface.sequelize.query(`
      ALTER TABLE tasks
      ALTER COLUMN status SET DEFAULT 'todo'::enum_tasks_status;
    `)

    console.log('✅ Tasks status enum fixed')
  },

  async down(queryInterface, Sequelize) {
    console.log('🔧 Reverting tasks_status enum...')

    // First, update existing data back
    // Convert "completed" back to "done" (we can't fully reverse this without data loss)
    await queryInterface.sequelize.query(`
      UPDATE tasks
      SET status = 'todo'
      WHERE status = 'completed';
    `)

    // Create the old enum type
    await queryInterface.sequelize.query(`
      CREATE TYPE enum_tasks_status_new AS ENUM ('todo', 'in_progress', 'review', 'done', 'cancelled');
    `)

    // Change the column back to the old type
    await queryInterface.sequelize.query(`
      ALTER TABLE tasks
      ALTER COLUMN status TYPE enum_tasks_status_new
      USING status::text::enum_tasks_status_new;
    `)

    // Drop the current enum type
    await queryInterface.sequelize.query(`
      DROP TYPE enum_tasks_status;
    `)

    // Rename back
    await queryInterface.sequelize.query(`
      ALTER TYPE enum_tasks_status_new RENAME TO enum_tasks_status;
    `)

    console.log('✅ Tasks status enum reverted')
  }
}
