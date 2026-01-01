# PostgreSQL Backup & Restore Scripts

This directory contains scripts for backing up and restoring the PostgreSQL database to Cloudflare R2.

## Scripts

### backup.sh
Main backup script that:
- Dumps the PostgreSQL database
- Uploads the backup to Cloudflare R2
- Maintains a `latest.sql.gz` symlink for easy access
- Cleans up old backups based on retention period

**Usage:**
```bash
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/backup.sh
```

**Environment Variables:**
- `POSTGRES_HOST`: PostgreSQL host (default: `postgres`)
- `POSTGRES_DB`: Database name (default: `medical_crm`)
- `POSTGRES_USER`: Database user (default: `medical_crm_user`)
- `POSTGRES_PASSWORD`: Database password (required)
- `BACKUP_RETENTION_DAYS`: Number of days to keep backups (default: `30`)
- `AWS_ACCESS_KEY_ID`: R2 access key ID (required)
- `AWS_SECRET_ACCESS_KEY`: R2 secret access key (required)
- `AWS_ENDPOINT_URL`: R2 endpoint URL (required)
- `S3_BUCKET`: R2 bucket name (required)

### test-restore.sh
Test script that:
- Downloads the latest backup (or a specified backup)
- Creates a temporary test database
- Restores the backup to the test database
- Verifies the restoration (tables, rows, size)
- Cleans up the test database

**Usage:**
```bash
# Test with latest backup
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh

# Test with a specific backup file (local or S3)
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh backup_medical_crm_20260101_000000.sql.gz
```

**Environment Variables:**
- `POSTGRES_HOST`: PostgreSQL host (default: `postgres`)
- `POSTGRES_USER`: Database user (default: `medical_crm_user`)
- `POSTGRES_PASSWORD`: Database password (required)
- `TEST_DB_NAME`: Test database name (default: `medical_crm_test_restore`)
- `AWS_ACCESS_KEY_ID`: R2 access key ID (required)
- `AWS_SECRET_ACCESS_KEY`: R2 secret access key (required)
- `AWS_ENDPOINT_URL`: R2 endpoint URL (required)
- `S3_BUCKET`: R2 bucket name (required)

## Schedule

Backups are automatically scheduled via cron in the `postgres-backup` container:

```bash
BACKUP_SCHEDULE: "0 0 * * *"  # Daily at midnight
```

You can change this in `docker-compose.prod.yml`.

## Backup Rotation

Old backups are automatically deleted after the retention period (default: 30 days).

## Testing Restoration

It's recommended to test your backups regularly to ensure they can be restored successfully:

```bash
# Manual test
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh

# Automated test (via cron)
# Add to your backup container's crontab:
0 2 * * 1 /scripts/test-restore.sh >> /var/log/restore-test.log 2>&1
```

## Manual Restoration

If you need to restore a backup to the production database:

⚠️ **WARNING:** This will overwrite your production database!

```bash
# 1. Download the backup from R2
docker compose -f docker-compose.prod.yml exec postgres-backup \
  aws s3 cp s3://medical-crm-backups/postgres/backup_medical_crm_20260101_000000.sql.gz \
  /backup/restore.sql.gz --endpoint-url=$R2_ENDPOINT_URL

# 2. Stop the backend to prevent conflicts
docker compose -f docker-compose.prod.yml stop backend

# 3. Drop and recreate the database
docker compose -f docker-compose.prod.yml exec postgres psql -U medical_crm_user -d postgres \
  -c "DROP DATABASE medical_crm;"
docker compose -f docker-compose.prod.yml exec postgres psql -U medical_crm_user -d postgres \
  -c "CREATE DATABASE medical_crm OWNER medical_crm_user;"

# 4. Restore the backup
docker compose -f docker-compose.prod.yml exec postgres bash -c \
  "gunzip < /var/lib/postgresql/data/restore.sql.gz | psql -U medical_crm_user -d medical_crm"

# 5. Start the backend
docker compose -f docker-compose.prod.yml start backend
```

## Troubleshooting

### Backup fails with "Failed to upload backup to R2"
- Check your R2 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
- Verify the bucket exists and has the correct name
- Check the `AWS_ENDPOINT_URL` is correct

### Test restore fails with "No tables found"
- Verify the backup file is not corrupted
- Check that the database dump was successful
- Ensure `pg_dump` included all tables (check `--no-owner`, `--no-acl` options)

### Connection errors
- Ensure PostgreSQL is running: `docker compose -f docker-compose.prod.yml ps postgres`
- Check network connectivity between containers
- Verify environment variables are set correctly

## Security Notes

- Never commit actual credentials to version control
- Use strong passwords for database access
- Rotate R2 access keys regularly
- Restrict bucket permissions to necessary operations only
- Enable logging for R2 bucket access

## Backup Best Practices

1. **Test regularly**: Use `test-restore.sh` to verify backups can be restored
2. **Monitor**: Check logs for backup failures
3. **Retention**: Keep enough backups for disaster recovery
4. **Off-site**: R2 provides off-site backup (recommended)
5. **Encrypt**: Consider encrypting sensitive data in backups
6. **Document**: Keep a runbook for disaster recovery
