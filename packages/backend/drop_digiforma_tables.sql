-- Drop Digiforma tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS digiforma_invoices CASCADE;
DROP TABLE IF EXISTS digiforma_quotes CASCADE;
DROP TABLE IF EXISTS digiforma_contacts CASCADE;
DROP TABLE IF EXISTS digiforma_companies CASCADE;
DROP TABLE IF EXISTS digiforma_syncs CASCADE;
DROP TABLE IF EXISTS digiforma_settings CASCADE;
