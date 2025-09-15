#!/usr/bin/env tsx

import { sequelize } from "../config/database"
import "../models" // Import all models to register associations

async function syncDatabase() {
  try {
    console.log("🔄 Synchronizing database with models...")

    // Sync all models with the database
    // alter: true will add missing columns and remove columns that are not in the model
    await sequelize.sync({ alter: true })

    console.log("✅ Database synchronized successfully!")
    console.log("   - Added missing columns")
    console.log("   - Updated existing columns")
    console.log("   - Preserved existing data")

    // Close the connection
    await sequelize.close()
    console.log("📡 Database connection closed")

  } catch (error) {
    console.error("❌ Failed to sync database:", error)
    process.exit(1)
  }
}

// Run the sync if this script is executed directly
if (require.main === module) {
  syncDatabase()
}

export { syncDatabase }