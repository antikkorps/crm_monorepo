# Production Environment Variables Structure

## Overview

`.env.production.example` contains all environment variables needed for production deployment on Hetzner.

## File Location

- **Template**: `.env.production.example` (in git)
- **Actual secrets**: `.env.production` (on Hetzner server only, **NEVER commit**)

## Sections

### 1. DOMAINS

- `DOMAIN` - Main domain
- `FRONTEND_DOMAIN` - Frontend URL (CRM UI)
- `BACKEND_DOMAIN` - Backend API URL

### 2. DATABASE

- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password (strong, min 24 chars)
- `DB_SYNC_ON_START` - **MUST be false in production** (security)

### 3. BACKEND

- `JWT_SECRET` - JWT token secret (min 32 chars)
  - Generate: `openssl rand -base64 32`
- `JWT_EXPIRES_IN` - Access token expiration (default: 15m)
- `JWT_REFRESH_SECRET` - Refresh token secret (min 32 chars)
  - Generate: `openssl rand -base64 32`
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: 7d)
- `NODE_ENV` - Must be "production"
- `LOG_LEVEL` - Logging level: error, warn, info, debug (warn recommended for prod)

### 4. ADMIN USER (After Branch Merge)

- **Currently commented out** - Uncomment after merging admin initialization branch
- `ADMIN_EMAIL` - Admin email for first deployment
- `ADMIN_FIRST_NAME` - Admin first name
- `ADMIN_LAST_NAME` - Admin last name
- `ADMIN_PASSWORD` - Admin password (strong)

### 5. EMAIL & SMTP

- `EMAIL_ENABLED` - Enable email functionality
- `EMAIL_FROM_ADDRESS` - Default sender email
- `EMAIL_FROM_NAME` - Default sender name
- `SMTP_HOST` - SMTP server host
- `SMTP_PORT` - SMTP server port (usually 587 for TLS, 465 for SSL)
- `SMTP_SECURE` - Use SSL (true) or TLS (false)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password or app password

### 6. FRONTEND

- `FRONTEND_URL` - Frontend URL used in email links
- `DICEBEAR_API_URL` - DiceBear API for avatar generation

### 7. REMINDER SYSTEM

- `ENABLE_EMAIL_REMINDERS` - Enable automatic email reminders
- `REMINDER_TIMEZONE` - Timezone for reminder scheduling
- `REMINDER_BATCH_SIZE` - Number of reminders processed per run (default: 100)
- `REMINDER_CRON_SCHEDULE` - Cron schedule for reminder processing (default: "0 9 \* \* \*")
- `REMINDER_CACHE_CLEANUP_DAYS` - Days to keep anti-spam cache (default: 7)

### 8. CLOUDFLARE R2 BACKUP

- `R2_ACCESS_KEY_ID` - Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret key
- `R2_ENDPOINT_URL` - R2 endpoint URL
- `R2_BUCKET_NAME` - R2 bucket name
- `TEST_DB_NAME` - Test database name for restore tests

### 9. INTEGRATIONS

- `DIGIFORMA_ENCRYPTION_KEY` - Encryption key for Digiforma (min 32 chars)
  - Generate: `openssl rand -base64 32`
- `DIGIFORMA_API_URL` - Digiforma GraphQL API URL
- `SAGE_API_URL` - Sage API URL (optional)
- `SAGE_CLIENT_ID` - Sage client ID (optional)
- `SAGE_CLIENT_SECRET` - Sage client secret (optional)

### 10. HETZNER (for GitHub Actions)

- `HETZNER_HOST` - Hetzner server IP
- `HETZNER_USERNAME` - SSH username
- `HETZNER_SSH_PORT` - SSH port (default: 22)

### 11. GENERATE SECRETS WITH

Quick reference for generating all secrets:

```bash
# JWT Secret
openssl rand -base64 32

# JWT Refresh Secret
openssl rand -base64 32

# DB Password
openssl rand -base64 24

# Digiforma Encryption Key
openssl rand -base64 32

```

## How to Use

### First Deployment on Hetzner

```bash
# On Hetzner server
cd /srv/medical-crm
cp .env.production.example .env.production

# Generate all secrets
# (see GENERATE SECRETS WITH section)

# Edit and fill in all values
vim .env.production

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

### After Merging Admin Initialization Branch

```bash
# Uncomment and configure ADMIN_* variables in .env.production
vim .env.production

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

## Security Notes

- ⚠️ **NEVER commit** `.env.production` to git (it's in `.gitignore`)
- Use strong, randomly generated secrets (never reuse passwords)
- Rotate secrets regularly (every 90 days recommended)
- Ensure `DB_SYNC_ON_START=false` in production
- Use `LOG_LEVEL=warn` in production (less verbose)
- Keep R2 and API keys secure and rotate if compromised

## Validation

Before deploying, ensure:

- ✅ All secrets are generated with proper length
- ✅ All URLs are correct (domains, APIs)
- ✅ Email configuration is tested (send test email)
- ✅ Database credentials are not defaults
- ✅ DB_SYNC_ON_START is false
- ✅ LOG_LEVEL is set to warn or error

## Variables Not Used (Deprecated)

- `PORT` - Set in docker-compose, not needed in env
- `DB_HOST` - Set in docker-compose (postgres)
- `DB_PORT` - Set in docker-compose (5432)
- `CORS_ORIGIN` - Automatically set from FRONTEND_DOMAIN in docker-compose

## Troubleshooting

### Email not working

- Verify SMTP credentials (check if app password required for Gmail)
- Test SMTP connectivity: `telnet smtp.gmail.com 587`
- Check logs: `docker compose -f docker-compose.prod.yml logs backend`

### JWT tokens invalid

- Ensure secrets are min 32 characters
- Verify same secrets used across all containers
- Restart backend after changing JWT secrets

### Backup failing

- Verify R2 credentials and endpoint URL
- Check bucket exists in Cloudflare
- Test manually: `docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/backup.sh`

## Related Documentation

- [DEPLOYMENT_HETZNER.md](../DEPLOYMENT_HETZNER.md) - Full deployment guide
- [backup/README.md](../backup/README.md) - Backup and restore scripts
- [scripts/README.md](../scripts/README.md) - Validation scripts
