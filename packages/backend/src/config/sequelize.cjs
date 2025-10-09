const path = require("path")
require("dotenv").config({
  path:
    process.env.NODE_ENV === "test"
      ? path.resolve(__dirname, "../../../../.env.test")
      : path.resolve(__dirname, "../../../../.env"),
})

module.exports = {
  development: {
    username: process.env.DB_USER || "medical_crm_user",
    password: process.env.DB_PASSWORD || "medical_crm_password",
    database: process.env.DB_NAME || "medical_crm_dev",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
  },
  test: {
    username: process.env.DB_USER || "medical_crm_user",
    password: process.env.DB_PASSWORD || "medical_crm_password",
    database: process.env.DB_NAME || "medical_crm_test",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_TEST_PORT || 5433,
    dialect: "postgres",
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
  },
}
