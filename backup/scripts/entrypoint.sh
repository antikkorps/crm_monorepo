#!/bin/bash
set -e

# ============================================
# Backup Service Entrypoint
# Uploads to Cloudflare R2 (S3-compatible storage)
# ============================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting backup service..."

# Validate required environment variables
required_vars=(
    "POSTGRES_HOST"
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_ENDPOINT_URL"
    "S3_BUCKET"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log "ERROR: Required environment variable $var is not set"
        exit 1
    fi
done

log "All required environment variables are set"

# Test Cloudflare R2 connectivity (using AWS CLI since R2 is S3-compatible)
log "Testing Cloudflare R2 connectivity..."
if aws s3 ls "s3://${S3_BUCKET}" --endpoint-url "$AWS_ENDPOINT_URL" --region auto > /dev/null 2>&1; then
    log "Successfully connected to Cloudflare R2 bucket: $S3_BUCKET"
else
    log "WARNING: Failed to connect to Cloudflare R2 bucket. Please check your credentials."
fi

# Backup schedule (default: daily at midnight)
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 0 * * *}"
log "Backup schedule: $BACKUP_SCHEDULE"

# Create crontab
log "Setting up cron job..."
echo "$BACKUP_SCHEDULE /usr/local/bin/backup.sh >> /proc/1/fd/1 2>&1" | crontab -

# Run initial backup if requested
if [ "${RUN_ON_STARTUP:-true}" = "true" ]; then
    log "Running initial backup..."
    /usr/local/bin/backup.sh
fi

# Start cron in foreground
log "Starting cron daemon..."
exec crond -f -l 2
