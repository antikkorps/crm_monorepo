#!/bin/bash
set -e

# ============================================
# PostgreSQL & Volumes Backup to Cloudflare R2
# ============================================

# Configuration from environment variables
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-medical_crm}"
POSTGRES_USER="${POSTGRES_USER:-medical_crm_user}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
BACKUP_PATH="/backup/${BACKUP_FILE}"

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    exit 1
}

log "Starting PostgreSQL backup..."

# Wait for PostgreSQL to be ready
log "Waiting for PostgreSQL to be ready..."
until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; do
    log "PostgreSQL is unavailable - sleeping"
    sleep 5
done

log "PostgreSQL is ready. Starting backup..."

# Create backup
log "Creating backup: $BACKUP_FILE"
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$POSTGRES_HOST" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    2>&1 | gzip > "$BACKUP_PATH" || error_exit "Failed to create backup"

# Check backup file size
BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log "Backup created successfully. Size: $BACKUP_SIZE"

# Upload to Cloudflare R2 (S3-compatible)
log "Uploading backup to Cloudflare R2..."

aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/postgres/${BACKUP_FILE}" \
    --endpoint-url "$AWS_ENDPOINT_URL" \
    --region auto || error_exit "Failed to upload backup to R2"

log "Backup uploaded successfully to R2"

# Clean up local backup
rm -f "$BACKUP_PATH"
log "Local backup file removed"

# Clean up old backups from R2 (older than retention period)
log "Cleaning up old backups (retention: ${BACKUP_RETENTION_DAYS} days)..."

# Calculate cutoff date
CUTOFF_DATE=$(date -d "@$(($(date +%s) - (BACKUP_RETENTION_DAYS * 86400)))" +%Y%m%d)
# List and delete old backups
aws s3 ls "s3://${S3_BUCKET}/postgres/" \
    --endpoint-url "$AWS_ENDPOINT_URL" \
    --region auto | while read -r line; do

    # Extract filename
    FILE=$(echo "$line" | awk '{print $4}')

    # Skip if empty
    [ -z "$FILE" ] && continue

    # Extract date from filename (format: backup_dbname_YYYYMMDD_HHMMSS.sql.gz)
    FILE_DATE=$(echo "$FILE" | grep -oP '\d{8}' | head -1)

    # Skip if date not found
    [ -z "$FILE_DATE" ] && continue

    # Delete if older than cutoff date
    if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
        log "Deleting old backup: $FILE"
        aws s3 rm "s3://${S3_BUCKET}/postgres/$FILE" \
            --endpoint-url "$AWS_ENDPOINT_URL" \
            --region auto || log "Warning: Failed to delete $FILE"
    fi
done

log "Backup process completed successfully"

# Optional: Create a "latest" symlink in R2 for easy access
aws s3 cp "s3://${S3_BUCKET}/postgres/${BACKUP_FILE}" \
    "s3://${S3_BUCKET}/postgres/latest.sql.gz" \
    --endpoint-url "$AWS_ENDPOINT_URL" \
    --region auto \
    --metadata-directive REPLACE || log "Warning: Failed to create latest backup link"

log "All done!"

# ============================================
# Docker Volumes Backup
# ============================================

log "Starting Docker volumes backup..."

log "Starting Docker volumes backup..."

# Chemins tels que montés dans le docker-compose ci-dessus
VOLUMES=(
    "uploads:/app/backups/uploads"
    "logs:/app/backups/logs"
    "storage:/app/backups/storage"
)

for VOLUME_MAPPING in "${VOLUMES[@]}"; do
    VOLUME_NAME=$(echo "$VOLUME_MAPPING" | cut -d: -f1)
    SOURCE_PATH=$(echo "$VOLUME_MAPPING" | cut -d: -f2)
    VOLUME_ARCHIVE="volume_${VOLUME_NAME}_${TIMESTAMP}.tar.gz"

    log "Backing up volume: $VOLUME_NAME"

    if [ -d "$SOURCE_PATH" ]; then
        # On compresse directement sans 'docker run'
        tar czf "/backup/${VOLUME_ARCHIVE}" -C "$SOURCE_PATH" . || log "Warning: Failed to compress $VOLUME_NAME"

        # Upload vers R2
        aws s3 cp "/backup/${VOLUME_ARCHIVE}" \
            "s3://${S3_BUCKET}/volumes/${VOLUME_ARCHIVE}" \
            --endpoint-url "$AWS_ENDPOINT_URL" \
            --region auto || log "Warning: Failed to upload $VOLUME_NAME"

        log "Volume backup uploaded: $VOLUME_NAME"
        rm -f "/backup/${VOLUME_ARCHIVE}"
    else
        log "Warning: Source path $SOURCE_PATH not found"
    fi
done

log "Docker volumes backup completed successfully"

# Clean up old volume backups from R2
log "Cleaning up old volume backups (retention: ${BACKUP_RETENTION_DAYS} days)..."

aws s3 ls "s3://${S3_BUCKET}/volumes/" \
    --endpoint-url "$AWS_ENDPOINT_URL" \
    --region auto | while read -r line; do

    FILE=$(echo "$line" | awk '{print $4}')
    [ -z "$FILE" ] && continue

    FILE_DATE=$(echo "$FILE" | grep -oP '\d{8}' | head -1)
    [ -z "$FILE_DATE" ] && continue

    if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
        log "Deleting old volume backup: $FILE"
        aws s3 rm "s3://${S3_BUCKET}/volumes/$FILE" \
            --endpoint-url "$AWS_ENDPOINT_URL" \
            --region auto || log "Warning: Failed to delete $FILE"
    fi
done

log "Volumes cleanup completed"
