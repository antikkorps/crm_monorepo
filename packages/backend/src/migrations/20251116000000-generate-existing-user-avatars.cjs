'use strict'

/**
 * Migration: Generate avatars for existing users
 *
 * This migration generates and stores local avatar SVG files for all existing users.
 * It creates the uploads/avatars directory if it doesn't exist and downloads
 * avatar SVGs from DiceBear API for each user.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const fs = require('fs/promises')
    const path = require('path')

    // Directory for storing avatars
    const avatarsDir = process.env.AVATARS_DIR || path.join(__dirname, '../../uploads/avatars')

    // Ensure directory exists
    try {
      await fs.access(avatarsDir)
    } catch {
      await fs.mkdir(avatarsDir, { recursive: true })
      console.log(`Created avatars directory: ${avatarsDir}`)
    }

    // Get all users
    const users = await queryInterface.sequelize.query(
      'SELECT id, avatar_seed, avatar_style FROM users',
      {
        type: Sequelize.QueryTypes.SELECT
      }
    )

    console.log(`Found ${users.length} users to generate avatars for`)

    // Generate avatar for each user
    let successCount = 0
    let errorCount = 0

    for (const user of users) {
      try {
        const { id, avatar_seed, avatar_style } = user
        const style = avatar_style || 'avataaars'

        // Build DiceBear URL
        const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(avatar_seed)}&size=200`

        // Download SVG
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch avatar: ${response.statusText}`)
        }
        const svgContent = await response.text()

        // Save to file
        const filePath = path.join(avatarsDir, `${id}-${style}.svg`)
        await fs.writeFile(filePath, svgContent, 'utf-8')

        successCount++

        if (successCount % 10 === 0) {
          console.log(`Generated ${successCount}/${users.length} avatars...`)
        }
      } catch (error) {
        errorCount++
        console.error(`Failed to generate avatar for user ${user.id}:`, error.message)
      }
    }

    console.log(`Avatar generation complete:`)
    console.log(`  ✓ Success: ${successCount}`)
    if (errorCount > 0) {
      console.log(`  ✗ Errors: ${errorCount}`)
    }
  },

  async down(queryInterface, Sequelize) {
    // Optional: Clean up generated avatars
    const fs = require('fs/promises')
    const path = require('path')

    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars')

    try {
      // Get all users to know which avatars to delete
      const users = await queryInterface.sequelize.query(
        'SELECT id, avatar_style FROM users',
        {
          type: Sequelize.QueryTypes.SELECT
        }
      )

      let deletedCount = 0

      for (const user of users) {
        try {
          const { id, avatar_style } = user
          const style = avatar_style || 'avataaars'
          const filePath = path.join(avatarsDir, `${id}-${style}.svg`)

          await fs.unlink(filePath)
          deletedCount++
        } catch (error) {
          // Ignore errors (file might not exist)
        }
      }

      console.log(`Deleted ${deletedCount} avatar files`)
    } catch (error) {
      console.error('Failed to clean up avatars:', error.message)
    }
  }
}
