#!/bin/bash
set -e

# ============================================
# PostgreSQL Backup Restore Test
# ============================================
# This script tests the backup restoration process
# by restoring a backup to a temporary database
# ============================================

# Configuration from environment variables
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-medical_crm_user}"
S3_BUCKET="${S3_BUCKET:-medical-crm-backups}"

# Test database name
TEST_DB_NAME="${TEST_DB_NAME:-medical_crm_test_restore}"

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    cleanup
    exit 1
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Drop test database if it exists
    if PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d postgres \
        -c "\lqt" | cut -d \| -f 1 | grep -qw "$TEST_DB_NAME" > /dev/null 2>&1; then
        
        log "Dropping test database: $TEST_DB_NAME"
        PGPASSWORD="$POSTGRES_PASSWORD" psql \
            -h "$POSTGRES_HOST" \
            -U "$POSTGRES_USER" \
            -d postgres \
            -c "DROP DATABASE $TEST_DB_NAME;" || log "Warning: Failed to drop test database"
    fi
    
    # Clean up local backup file
    rm -f /backup/test_restore.sql.gz || true
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

log "Starting backup restoration test..."

# Check if test backup file is provided or use latest
if [ -z "$1" ]; then
    log "No backup file specified, downloading latest backup from R2..."
    BACKUP_FILE="test_restore.sql.gz"
    
    aws s3 cp "s3://${S3_BUCKET}/postgres/latest.sql.gz" "/backup/${BACKUP_FILE}" \
        --endpoint-url "$AWS_ENDPOINT_URL" \
        --region auto || error_exit "Failed to download latest backup from R2"
else
    BACKUP_FILE="$1"
    log "Using provided backup file: $BACKUP_FILE"
    
    # Download if it's an S3 path
    if [[ "$BACKUP_FILE" == s3://* ]]; then
        aws s3 cp "$BACKUP_FILE" "/backup/test_restore.sql.gz" \
            --endpoint-url "$AWS_ENDPOINT_URL" \
            --region auto || error_exit "Failed to download backup from R2"
        BACKUP_FILE="/backup/test_restore.sql.gz"
    fi
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    error_exit "Backup file not found: $BACKUP_FILE"
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup file size: $BACKUP_SIZE"

# Wait for PostgreSQL to be ready
log "Waiting for PostgreSQL to be ready..."
until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" > /dev/null 2>&1; do
    log "PostgreSQL is unavailable - sleeping"
    sleep 2
done

log "PostgreSQL is ready"

# Check if test database exists and drop it
log "Checking for existing test database..."
if PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "\lqt" | cut -d \| -f 1 | grep -qw "$TEST_DB_NAME" > /dev/null 2>&1; then
    
    log "Test database exists, dropping it first..."
    PGPASSWORD="$POSTGRES_PASSWORD" psql \
        -h "$POSTGRES_HOST" \
        -U "$POSTGRES_USER" \
        -d postgres \
        -c "DROP DATABASE $TEST_DB_NAME;" || error_exit "Failed to drop existing test database"
fi

# Create test database
log "Creating test database: $TEST_DB_NAME"
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "CREATE DATABASE $TEST_DB_NAME;" || error_exit "Failed to create test database"

log "Test database created successfully"

# Restore backup to test database
log "Restoring backup to test database..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -U "$POSTGRES_USER" \
    -d "$TEST_DB_NAME" \
    --quiet || error_exit "Failed to restore backup"

log "Backup restored successfully"

# Verify restoration
log "Verifying restoration..."

# Check if tables exist
TABLE_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -U "$POSTGRES_USER" \
    -d "$TEST_DB_NAME" \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" -eq 0 ]; then
    error_exit "No tables found in restored database"
fi

log "Found $TABLE_COUNT tables in restored database"

# Check row count (optional but recommended)
TOTAL_ROWS=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -U "$POSTGRES_USER" \
    -d "$TEST_DB_NAME" \
    -t -c "SELECT SUM(reltuples::bigint) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r';" | tr -d ' ')

if [ ! -z "$TOTAL_ROWS" ]; then
    log "Total estimated rows in restored database: $TOTAL_ROWS"
fi

# Get database size
DB_SIZE=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -U "$POSTGRES_USER" \
    -d "$TEST_DB_NAME" \
    -t -c "SELECT pg_size_pretty(pg_database_size('$TEST_DB_NAME'));" | tr -d ' ')

log "Test database size: $DB_SIZE"

# List some tables for verification (first 5)
log "Sample tables in restored database:"
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -U "$POSTGRES_USER" \
    -d "$TEST_DB_NAME" \
    -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename LIMIT 5;" || true

# Success!
log "=========================================="
log "Backup restoration test PASSED!"
log "=========================================="
log "Summary:"
log "  - Tables found: $TABLE_COUNT"
log "  - Database size: $DB_SIZE"
log "=========================================="

# Cleanup will be done by trap

exit 0
