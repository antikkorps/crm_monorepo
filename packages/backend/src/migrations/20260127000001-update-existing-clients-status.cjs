"use strict"

/**
 * Data Migration: Update commercial_status for existing clients
 *
 * Purpose: Set commercial_status to 'client' for institutions that already have invoices
 * This fixes the data for institutions that had invoices created before the commercial_status field was added
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update commercial_status to 'client' for institutions that have at least one invoice
    const [results] = await queryInterface.sequelize.query(`
      UPDATE medical_institutions
      SET commercial_status = 'client'
      WHERE id IN (
        SELECT DISTINCT institution_id
        FROM invoices
        WHERE institution_id IS NOT NULL
      )
      AND commercial_status = 'prospect'
    `)

    // Log how many were updated
    const [countResult] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) as count
      FROM medical_institutions
      WHERE commercial_status = 'client'
    `, { type: Sequelize.QueryTypes.SELECT })

    console.log(`✅ Updated institutions with invoices to 'client' status`)
    console.log(`   Total clients: ${countResult.count}`)
  },

  async down(queryInterface, Sequelize) {
    // We don't revert this migration as we can't know which were originally prospects
    console.log('⚠️  Down migration skipped - cannot determine original commercial status')
  }
}
