import { newDb, DataType } from "pg-mem"
import { Sequelize } from "sequelize"

// Create an in-memory PostgreSQL database for testing
export const createTestDatabase = () => {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  })

  // Add some PostgreSQL functions that might be used
  db.public.registerFunction({
    name: "version",
    returns: DataType.text,
    implementation: () => "PostgreSQL 13.0 (pg-mem)",
  })

  // Enable uuid generation
  db.public.registerFunction({
    name: "gen_random_uuid",
    returns: DataType.uuid,
    implementation: () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === "x" ? r : (r & 0x3) | 0x8
        return v.toString(16)
      })
    },
  })

  // Create the pg adapter
  const pgAdapter = db.adapters.createPg()

  // Create Sequelize instance with the mock
  const sequelize = new Sequelize("test", "test", "test", {
    dialect: "postgres",
    dialectModule: pgAdapter,
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  })

  return { db, sequelize }
}
