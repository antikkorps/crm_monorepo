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
CUTOFF_DATE=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y%m%d 2>/dev/null || date -v-${BACKUP_RETENTION_DAYS}d +%Y%m%d)

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

# Volumes to backup
VOLUMES=(
    "medical-crm-backend-uploads:/app/packages/backend/uploads"
    "medical-crm-backend-logs:/app/packages/backend/logs"
    "medical-crm-backend-storage:/app/packages/backend/storage"
    "medical-crm-traefik-certs:/letsencrypt"
)

for VOLUME_MAPPING in "${VOLUMES[@]}"; do
    VOLUME_NAME=$(echo "$VOLUME_MAPPING" | cut -d: -f1)
    VOLUME_PATH=$(echo "$VOLUME_MAPPING" | cut -d: -f2)
    VOLUME_ARCHIVE="volume_${VOLUME_NAME}_${TIMESTAMP}.tar.gz"

    log "Backing up volume: $VOLUME_NAME"

    # Create temporary backup directory
    TEMP_BACKUP_DIR="/backup/volumes/${VOLUME_NAME}"
    mkdir -p "$TEMP_BACKUP_DIR"

    # Run a temporary container to backup the volume
    docker run --rm \
        -v "$VOLUME_NAME:/volume_data:ro" \
        -v "$TEMP_BACKUP_DIR:/backup" \
        alpine:latest \
        tar czf "/backup/${VOLUME_ARCHIVE}" -C /volume_data . || log "Warning: Failed to backup volume $VOLUME_NAME"

    # Check if backup was created
    if [ -f "$TEMP_BACKUP_DIR/${VOLUME_ARCHIVE}" ]; then
        # Upload to R2
        aws s3 cp "${TEMP_BACKUP_DIR}/${VOLUME_ARCHIVE}" \
            "s3://${S3_BUCKET}/volumes/${VOLUME_ARCHIVE}" \
            --endpoint-url "$AWS_ENDPOINT_URL" \
            --region auto || log "Warning: Failed to upload volume backup $VOLUME_NAME"

        # Get backup size
        VOLUME_SIZE=$(du -h "${TEMP_BACKUP_DIR}/${VOLUME_ARCHIVE}" | cut -f1)
        log "Volume backup uploaded: $VOLUME_NAME (${VOLUME_SIZE})"

        # Clean up local backup
        rm -f "${TEMP_BACKUP_DIR}/${VOLUME_ARCHIVE}"
    else
        log "Warning: Volume backup file not found for $VOLUME_NAME (volume may be empty)"
    fi

    # Clean up temp directory
    rm -rf "$TEMP_BACKUP_DIR"
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
