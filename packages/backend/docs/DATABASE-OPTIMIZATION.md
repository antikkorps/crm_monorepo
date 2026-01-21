# Database Optimization Guide

## Overview

This guide covers database indexing strategies, optimization techniques, and best practices for the OPEx_CRM PostgreSQL database.

## Index Audit Script

Run the index audit script to analyze your database:

```bash
npm run db:audit-indexes
```

This script provides:

- Table size statistics
- Missing foreign key indexes
- Unused indexes
- Duplicate indexes
- Optimization recommendations

## Index Strategy

### 1. Primary Keys

All tables have primary key indexes (automatically created):

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  -- ...
);
```

### 2. Foreign Key Indexes

**Critical**: Always index foreign keys to improve JOIN performance:

```sql
-- Medical Institution foreign keys
CREATE INDEX idx_medical_institutions_created_by
  ON medical_institutions(created_by_id);

-- Task foreign keys
CREATE INDEX idx_tasks_assigned_to
  ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_institution
  ON tasks(medical_institution_id);

-- Quote foreign keys
CREATE INDEX idx_quotes_institution
  ON quotes(medical_institution_id);
CREATE INDEX idx_quotes_created_by
  ON quotes(created_by_id);
```

### 3. Unique Constraints

Use unique indexes for fields that must be unique:

```sql
CREATE UNIQUE INDEX idx_users_email
  ON users(email);

CREATE UNIQUE INDEX idx_medical_institutions_siret
  ON medical_institutions(siret)
  WHERE siret IS NOT NULL;
```

### 4. Composite Indexes

For queries with multiple WHERE conditions:

```sql
-- Frequently queried together
CREATE INDEX idx_tasks_status_assigned
  ON tasks(status, assigned_to_id);

CREATE INDEX idx_tasks_institution_status
  ON tasks(medical_institution_id, status);

-- Date range queries
CREATE INDEX idx_meetings_institution_date
  ON meetings(medical_institution_id, start_time);
```

### 5. Partial Indexes

For queries that filter on specific values:

```sql
-- Only index active users
CREATE INDEX idx_active_users
  ON users(email)
  WHERE is_active = true;

-- Only index pending tasks
CREATE INDEX idx_pending_tasks
  ON tasks(assigned_to_id)
  WHERE status = 'pending';

-- Only index unpaid invoices
CREATE INDEX idx_unpaid_invoices
  ON invoices(medical_institution_id, due_date)
  WHERE status != 'paid';
```

### 6. Text Search Indexes

For full-text search capabilities:

```sql
-- GIN index for text search on institution names
CREATE INDEX idx_institutions_name_gin
  ON medical_institutions
  USING gin(to_tsvector('french', name));

-- GIN index for searching notes
CREATE INDEX idx_notes_content_gin
  ON notes
  USING gin(to_tsvector('french', content));
```

### 7. JSON Indexes

For JSONB columns:

```sql
-- Index JSONB data
CREATE INDEX idx_settings_config
  ON system_settings
  USING gin(config);

-- Index specific JSON path
CREATE INDEX idx_medical_profile_specialties
  ON medical_profiles
  USING gin((specialties));
```

## Common Query Patterns

### 1. Dashboard Queries

```sql
-- Get user's pending tasks (needs composite index)
SELECT * FROM tasks
WHERE assigned_to_id = $1
  AND status = 'pending'
ORDER BY due_date;

-- Index:
CREATE INDEX idx_tasks_assigned_status_due
  ON tasks(assigned_to_id, status, due_date);
```

### 2. Institution Lookup

```sql
-- Search institutions by name and city
SELECT * FROM medical_institutions
WHERE name ILIKE '%hospital%'
  AND city = 'Paris';

-- Index:
CREATE INDEX idx_institutions_city
  ON medical_institutions(city);
CREATE INDEX idx_institutions_name_trgm
  ON medical_institutions
  USING gin(name gin_trgm_ops);
```

### 3. Recent Activity

```sql
-- Get recent activity for an institution
SELECT * FROM activities
WHERE medical_institution_id = $1
ORDER BY created_at DESC
LIMIT 20;

-- Index:
CREATE INDEX idx_activities_institution_created
  ON activities(medical_institution_id, created_at DESC);
```

## Index Maintenance

### Monitoring Index Usage

Check index usage statistics:

```sql
-- Find unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Analyzing Query Performance

Use EXPLAIN ANALYZE to identify missing indexes:

```sql
EXPLAIN ANALYZE
SELECT * FROM tasks
WHERE assigned_to_id = '123'
  AND status = 'pending';
```

Look for:

- `Seq Scan` - May need an index
- `Index Scan` - Good, using index
- High `cost` values - Potential optimization opportunity

### Reindexing

Rebuild indexes to reduce bloat:

```sql
-- Reindex a specific index
REINDEX INDEX idx_tasks_assigned_to;

-- Reindex all indexes on a table
REINDEX TABLE tasks;

-- Reindex entire database (use with caution)
REINDEX DATABASE medical_crm;
```

### Vacuum and Analyze

Regular maintenance to update statistics:

```sql
-- Vacuum a table
VACUUM ANALYZE tasks;

-- Vacuum entire database
VACUUM ANALYZE;
```

## Performance Best Practices

### 1. Use EXPLAIN ANALYZE

Always test query performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM medical_institutions
WHERE city = 'Paris'
  AND type = 'hospital';
```

### 2. Avoid SELECT \*

Fetch only needed columns:

```sql
-- Bad
SELECT * FROM users WHERE id = $1;

-- Good
SELECT id, email, first_name, last_name FROM users WHERE id = $1;
```

### 3. Use Limit for Pagination

```sql
-- Efficient pagination
SELECT * FROM tasks
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

### 4. Batch Operations

Use bulk inserts instead of individual inserts:

```sql
-- Efficient
INSERT INTO tasks (title, status, assigned_to_id) VALUES
  ('Task 1', 'pending', 'user1'),
  ('Task 2', 'pending', 'user2'),
  ('Task 3', 'pending', 'user3');
```

### 5. Connection Pooling

Configure Sequelize connection pool:

```typescript
const sequelize = new Sequelize({
  pool: {
    max: 20,
    min: 5,
    acquire: 60000,
    idle: 10000,
  },
})
```

## Monitoring Tools

### 1. pg_stat_statements

Enable query statistics:

```sql
-- Enable extension
CREATE EXTENSION pg_stat_statements;

-- View slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 2. PostgreSQL Logs

Configure logging in `postgresql.conf`:

```conf
log_min_duration_statement = 100  # Log queries > 100ms
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d '
log_statement = 'all'  # Or 'ddl', 'mod'
```

### 3. Monitoring Queries

Check for long-running queries:

```sql
SELECT
  pid,
  now() - query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY duration DESC;
```

## Index Recommendations by Table

### Users Table

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
```

### Medical Institutions Table

```sql
CREATE INDEX idx_institutions_type ON medical_institutions(type);
CREATE INDEX idx_institutions_city ON medical_institutions(city);
CREATE INDEX idx_institutions_postal ON medical_institutions(postal_code);
CREATE INDEX idx_institutions_name_trgm ON medical_institutions USING gin(name gin_trgm_ops);
CREATE INDEX idx_institutions_siret ON medical_institutions(siret) WHERE siret IS NOT NULL;
```

### Tasks Table

```sql
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_institution ON tasks(medical_institution_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to_id, status);
CREATE INDEX idx_tasks_institution_status ON tasks(medical_institution_id, status);
```

### Quotes Table

```sql
CREATE INDEX idx_quotes_institution ON quotes(medical_institution_id);
CREATE INDEX idx_quotes_created_by ON quotes(created_by_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_number ON quotes(quote_number);
CREATE INDEX idx_quotes_valid_until ON quotes(valid_until);
```

### Invoices Table

```sql
CREATE INDEX idx_invoices_institution ON invoices(medical_institution_id);
CREATE INDEX idx_invoices_created_by ON invoices(created_by_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_unpaid ON invoices(medical_institution_id, due_date)
  WHERE status != 'paid';
```

## Troubleshooting

### Slow Queries

1. Use EXPLAIN ANALYZE
2. Check for missing indexes
3. Review query structure
4. Consider query optimization

### Index Bloat

1. Run REINDEX periodically
2. Set up autovacuum
3. Monitor table bloat
4. Consider partitioning for large tables

### Lock Contention

1. Keep transactions short
2. Use appropriate isolation levels
3. Avoid long-running queries
4. Monitor pg_locks table

## Resources

- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [Use The Index, Luke!](https://use-the-index-luke.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Sequelize Indexes](https://sequelize.org/docs/v6/core-concepts/model-basics/#indexes)
