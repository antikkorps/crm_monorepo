#!/bin/bash
set -e

echo "=============================================="
echo "CRM Backup Diagnostic - Cloudflare R2"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
        exit 1
    fi
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check if docker compose is running
echo "1. Checking Docker services..."
if docker compose -f docker-compose.prod.yml ps | grep -q "postgres-backup.*Up"; then
    check "postgres-backup container is running"
else
    warn "postgres-backup container is not running"
fi

# 2. Check environment variables
echo ""
echo "2. Checking R2 environment variables..."

# Read from .env
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}✗${NC} .env file not found"
    exit 1
fi

if [ -n "$R2_ACCESS_KEY_ID" ]; then
    check "R2_ACCESS_KEY_ID is set"
else
    warn "R2_ACCESS_KEY_ID is not set"
fi

if [ -n "$R2_SECRET_ACCESS_KEY" ]; then
    check "R2_SECRET_ACCESS_KEY is set"
else
    warn "R2_SECRET_ACCESS_KEY is not set"
fi

if [ -n "$R2_ENDPOINT_URL" ]; then
    check "R2_ENDPOINT_URL is set: $R2_ENDPOINT_URL"
else
    warn "R2_ENDPOINT_URL is not set"
fi

if [ -n "$R2_BUCKET_NAME" ]; then
    check "R2_BUCKET_NAME is set: $R2_BUCKET_NAME"
else
    warn "R2_BUCKET_NAME is not set"
fi

# 3. Test R2 connection
echo ""
echo "3. Testing Cloudflare R2 connection..."

if docker compose -f docker-compose.prod.yml exec -T postgres-backup \
    aws s3 ls \
    --endpoint-url "$R2_ENDPOINT_URL" \
    --region auto > /dev/null 2>&1; then
    check "R2 connection successful"
else
    echo -e "${RED}✗${NC} Failed to connect to R2"
    echo "Please check your credentials and endpoint URL"
    exit 1
fi

# 4. Check if bucket exists
echo ""
echo "4. Checking bucket: $R2_BUCKET_NAME"

if docker compose -f docker-compose.prod.yml exec -T postgres-backup \
    aws s3 ls "s3://$R2_BUCKET_NAME" \
    --endpoint-url "$R2_ENDPOINT_URL" \
    --region auto > /dev/null 2>&1; then
    check "Bucket '$R2_BUCKET_NAME' exists and is accessible"
else
    echo -e "${RED}✗${NC} Bucket '$R2_BUCKET_NAME' not found or not accessible"
    echo "Please check:"
    echo "  - The bucket name is correct"
    echo "  - The access key has the right permissions"
    echo "  - The bucket exists in your Cloudflare R2 account"
    exit 1
fi

# 5. List backups
echo ""
echo "5. Listing existing backups..."

BACKUPS=$(docker compose -f docker-compose.prod.yml exec -T postgres-backup \
    aws s3 ls "s3://$R2_BUCKET_NAME/postgres/" \
    --endpoint-url "$R2_ENDPOINT_URL" \
    --region auto 2>/dev/null || true)

if [ -n "$BACKUPS" ]; then
    BACKUP_COUNT=$(echo "$BACKUPS" | wc -l)
    check "Found $BACKUP_COUNT backup(s) in R2"
    echo ""
    echo "Recent backups:"
    echo "$BACKUPS" | tail -5
else
    warn "No backups found in R2 yet (expected if this is a new setup)"
fi

# 6. Check latest backup
echo ""
echo "6. Checking for 'latest.sql.gz' marker..."

LATEST=$(docker compose -f docker-compose.prod.yml exec -T postgres-backup \
    aws s3 ls "s3://$R2_BUCKET_NAME/postgres/latest.sql.gz" \
    --endpoint-url "$R2_ENDPOINT_URL" \
    --region auto 2>/dev/null || true)

if [ -n "$LATEST" ]; then
    check "Latest backup marker found"
else
    warn "No latest backup marker (expected if backups haven't run yet)"
fi

# 7. Check backup schedule
echo ""
echo "7. Checking backup schedule..."
BACKUP_SCHEDULE=$(docker compose -f docker-compose.prod.yml config | grep -A 20 "postgres-backup:" | grep "BACKUP_SCHEDULE" | cut -d: -f2 | xargs)
check "Backup schedule: $BACKUP_SCHEDULE"

# 8. Check backup logs
echo ""
echo "8. Checking recent backup logs..."

LOGS=$(docker compose -f docker-compose.prod.yml logs --tail=20 postgres-backup 2>&1 || true)
if [ -n "$LOGS" ]; then
    echo "Recent log entries:"
    echo "$LOGS"
else
    warn "No logs found for postgres-backup container"
fi

# 9. Test manual backup
echo ""
echo "9. Testing manual backup..."
read -p "Do you want to trigger a manual backup now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting manual backup..."
    docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/backup.sh
    check "Manual backup completed successfully"
else
    echo "Skipping manual backup test"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✓ Diagnostic complete!${NC}"
echo ""
echo "Summary:"
echo "  - R2 connection: OK"
echo "  - Bucket '$R2_BUCKET_NAME': Accessible"
echo "  - Backup schedule: $BACKUP_SCHEDULE"
echo "  - Backup service: Configured"
echo ""
echo "Next steps:"
echo "  1. Verify backups appear in your Cloudflare R2 dashboard"
echo "  2. Test restoration: docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh"
echo "  3. Set up monitoring for backup failures"
echo ""
