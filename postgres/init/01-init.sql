-- ============================================
-- PostgreSQL Initialization Script
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Europe/Paris';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE medical_crm TO medical_crm_user;

-- Performance settings (can be overridden in postgresql.conf)
-- These are just examples, adjust based on your server resources

-- Logging
-- log_statement = 'all' for debugging (production: 'none' or 'ddl')
-- log_duration = on for debugging

-- Note: This file is executed only on first database creation
-- For schema migrations, use Sequelize migrations in the backend
