# Production Runbook - Emergency Procedures

## Table of Contents

1. [Overview](#overview)
2. [Emergency Contacts](#emergency-contacts)
3. [Service Health Status](#service-health-status)
4. [Common Incidents](#common-incidents)
5. [Rollback Procedures](#rollback-procedures)
6. [Backup & Recovery](#backup--recovery)
7. [Post-Incident Review](#post-incident-review)

---

## Overview

This runbook documents emergency procedures for the OPEx_CRM production deployment on Hetzner.

**Environment:**

- Provider: Hetzner
- Location: Nuremberg, Germany
- Architecture: Docker + Caddy + PostgreSQL + Cloudflare R2
- Monitoring: Docker health checks + UptimeRobot (recommended)

**Critical Services:**

1. **Frontend**: `https://crm.fvienot.link` - User interface
2. **Backend API**: `https://crmapi.fvienot.link` - API endpoints
3. **PostgreSQL**: Internal database (port 5432, private network)
4. **Backup Service**: Daily backups to Cloudflare R2

---

## Emergency Contacts

| Role                    | Name            | Contact             | Availability |
| ----------------------- | --------------- | ------------------- | ------------ |
| System Administrator    | [Your Name]     | [email@example.com] | 24/7         |
| Backend Developer       | [Name]          | [email@example.com] | 9am-6pm CET  |
| Frontend Developer      | [Name]          | [email@example.com] | 9am-6pm CET  |
| Infrastructure Provider | Hetzner Support | support@hetzner.com | 24/7         |

---

## Service Health Status

### Quick Health Check

```bash
# On Hetzner server
cd /srv/medical-crm

# Check all services
docker compose -f docker-compose.prod.yml ps

# Check resource usage
docker stats --no-stream

# Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Endpoint Health Checks

```bash
# Backend health
curl -f https://crmapi.fvienot.link/health || echo "❌ Backend DOWN"

# Frontend health
curl -f https://crm.fvienot.link/health || echo "❌ Frontend DOWN"

```

---

## Common Incidents

### 🚨 CRITICAL: Full System Outage

**Symptoms:**

- Frontend and backend both unreachable
- Cannot SSH to Hetzner server
- UptimeRobot alerts for all services

**Actions:**

1. **Check Hetzner Cloud Console**
   - Login: https://console.hetzner.cloud/
   - Verify server status (Running/Stopped)
   - Check console output for errors
   - Verify CPU/RAM/Disk metrics

2. **Attempt Server Restart**

   ```bash
   # In Hetzner console: Actions → Reboot
   # Wait 2-3 minutes
   ```

3. **Check Network Connectivity**

   ```bash
   # From your local machine
   ping <HETZNER_IP>

   # Check firewall rules
   # Hetzner Console → Firewall Rules
   # Ensure ports 22, 80, 443 are allowed
   ```

4. **If Server Won't Start**
   - Check if disk is full (Hetzner metrics)
   - Resize disk if necessary
   - Reboot into Rescue Mode (Hetzner feature)
   - Check system logs: `/var/log/syslog`

5. **Contact Hetzner Support**
   - Ticket: https://console.hetzner.cloud/tickets
   - Priority: Critical
   - Include: Server ID, symptoms, actions taken

---

### 🔴 HIGH: Backend API Down

**Symptoms:**

- Frontend works but API calls fail
- Backend returns 502/503 errors
- `docker ps` shows backend stopped or restarting

**Actions:**

1. **Check Backend Logs**

   ```bash
   docker compose -f docker-compose.prod.yml logs backend --tail=100
   ```

2. **Common Issues & Solutions:**

   **A. Database Connection Failed**

   ```bash
   # Check PostgreSQL
   docker compose -f docker-compose.prod.yml logs postgres

   # Restart PostgreSQL
   docker compose -f docker-compose.prod.yml restart postgres

   # If still failing, restart both
   docker compose -f docker-compose.prod.yml restart backend postgres
   ```

   **B. Out of Memory**

   ```bash
   # Check memory usage
   docker stats --no-stream

   # Increase memory limit in docker-compose.prod.yml
   # backend:
   #   deploy:
   #     resources:
   #       limits:
   #         memory: 2G  # Increase from 1G

   # Apply changes
   docker compose -f docker-compose.prod.yml up -d backend
   ```

   **C. Application Error**

   ```bash
   # Check recent code changes
   git log --oneline -5

   # If issue is recent, rollback (see Rollback Procedures)
   ```

3. **If No Clear Cause**

   ```bash
   # Restart backend
   docker compose -f docker-compose.prod.yml restart backend

   # If still failing, rebuild
   docker compose -f docker-compose.prod.yml up -d --build backend
   ```

---

### 🟡 MEDIUM: PostgreSQL Issues

**Symptoms:**

- Backend cannot connect to database
- Database queries timeout
- `postgres` container restarting

**Actions:**

1. **Check PostgreSQL Status**

   ```bash
   docker compose -f docker-compose.prod.yml logs postgres

   # Check if PostgreSQL is accepting connections
   docker compose -f docker-compose.prod.yml exec postgres pg_isready
   ```

2. **Common Issues:**

   **A. Database Corrupted**

   ```bash
   # Check disk space
   df -h

   # If corrupted, restore from backup (see Backup & Recovery)
   ```

   **B. Too Many Connections**

   ```bash
   # Check connection count
   docker compose -f docker-compose.prod.yml exec postgres psql -U medical_crm_user -d medical_crm -c "SELECT count(*) FROM pg_stat_activity;"

   # Kill idle connections
   docker compose -f docker-compose.prod.yml exec postgres psql -U medical_crm_user -d medical_crm -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '5 minutes';"
   ```

   **C. Storage Full**

   ```bash
   # Check disk space
   df -h

   # If full, cleanup logs
   docker system prune -af
   docker volume prune -f
   ```

3. **Restart PostgreSQL**

   ```bash
   docker compose -f docker-compose.prod.yml restart postgres

   # Wait for startup
   docker compose -f docker-compose.prod.yml logs -f postgres
   ```

---

### 🔴 HIGH: Backup Service Failed

**Symptoms:**

- R2 bucket not receiving daily backups
- `postgres-backup` container restarting
- No new backups in Cloudflare R2

**Actions:**

1. **Check Backup Logs**

   ```bash
   docker compose -f docker-compose.prod.yml logs postgres-backup --tail=100
   ```

2. **Common Issues:**

   **A. R2 Credentials Invalid**

   ```bash
   # Verify credentials in .env.production
   cat .env.production | grep R2_

   # Test connection
   docker compose -f docker-compose.prod.yml exec postgres-backup \
     aws s3 ls s3://medical-crm-backups/ --endpoint-url=$R2_ENDPOINT_URL
   ```

   **B. Cron Job Not Running**

   ```bash
   # Check if cron is running
   docker compose -f docker-compose.prod.yml exec postgres-backup ps aux | grep cron

   # Manual test backup
   docker compose -f docker-compose.prod.yml exec postgres-backup /usr/local/bin/backup.sh
   ```

   **C. Storage Quota Exceeded**
   - Check Cloudflare R2 dashboard
   - Verify bucket exists and is accessible
   - Check usage limits

3. **Restart Backup Service**
   ```bash
   docker compose -f docker-compose.prod.yml restart postgres-backup
   ```

---

### 🔴 HIGH: SSL/TLS Certificate Issues

**Symptoms:**

- Browser warnings for expired certificates
- HTTPS not working

**Actions:**

1. **Check Caddy Logs**

   ```bash
   docker compose -f docker-compose.prod.yml logs caddy
   ```

2. **Check Certificate Status**

   ```bash
   # Check Caddy certificates
   docker compose -f docker-compose.prod.yml exec caddy caddy list-certificates
   ```

   Ou pour voir les fichiers de certificats:

   ```bash
   # List certificate files
   docker compose -f docker-compose.prod.yml exec caddy ls -la /data/caddy/certificates/
   ```

3. **Common Issues:**

**A. Rate Limiting by Let's Encrypt**

- Let's Encrypt has rate limits (5 certificates per domain per week)
- Wait until rate limit expires (check expiration date)

**B. DNS Not Propagated**

```bash
# Check DNS records
dig crm.fvienot.link
dig api.fvienot.link

# Ensure DNS points to Hetzner IP
```

**C. Port 80 Blocked**

```bash
# Check firewall
sudo ufw status

# Ensure HTTP port 80 is allowed
sudo ufw allow 80/tcp
```

---

## Rollback Procedures

### Rollback to Previous Git Commit

**Use When:** Last deployment caused critical bugs

```bash
# On Hetzner server
cd /srv/medical-crm

# View recent commits
git log --oneline -10

# Identify the last known good commit (e.g., a1b2c3d)
git reset --hard a1b2c3d

# Rebuild and restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Verify deployment
docker compose -f docker-compose.prod.yml ps
```

### Rollback Database to Previous Backup

**Use When:** Data corruption or data loss

```bash
# Download the backup from R2
docker compose -f docker-compose.prod.yml exec postgres-backup \
  aws s3 cp s3://medical-crm-backups/postgres/backup_medical_crm_YYYYMMDD_HHMMSS.sql.gz \
  /backup/restore.sql.gz --endpoint-url=$R2_ENDPOINT_URL

# Stop backend to prevent conflicts
docker compose -f docker-compose.prod.yml stop backend

# Restore the backup
docker compose -f docker-compose.prod.yml exec postgres bash -c \
  "gunzip < /backup/restore.sql.gz | psql -U medical_crm_user -d medical_crm"

# Start backend
docker compose -f docker-compose.prod.yml start backend

# Verify data
docker compose -f docker-compose.prod.yml exec backend npm run db:migrate:status
```

**⚠️ WARNING:** This will overwrite current database data! Use only as last resort.

---

## Backup & Recovery

### Manual Backup Creation

```bash
# Backup PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres-backup /usr/local/bin/backup.sh

# Verify in R2
docker compose -f docker-compose.prod.yml exec postgres-backup \
  aws s3 ls s3://medical-crm-backups/postgres/ --endpoint-url=$R2_ENDPOINT_URL
```

### Backup Volumes

Volumes are automatically backed up with the script in `backup/scripts/backup.sh`.

```bash
# Verify volume backups
docker compose -f docker-compose.prod.yml exec postgres-backup \
  aws s3 ls s3://medical-crm-backups/volumes/ --endpoint-url=$R2_ENDPOINT_URL
```

### Restore Test

**Always test backups before trusting them!**

```bash
# Run automated restore test
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh

# The script will:
# - Download latest backup
# - Restore to temporary database
# - Verify tables, rows, integrity
# - Clean up automatically
```

### Disaster Recovery

**If Hetzner server is completely lost:**

1. **New Hetzner Server**
   - Create new server (same specs or better)
   - Same location (Nuremberg)

2. **Recover Data**
   - Clone repository
   - Configure `.env.production`
   - Restore from latest R2 backup
   - Restore volumes from R2

3. **Update DNS**
   - Point `crm.fvienot.link` to new IP
   - Wait for DNS propagation (up to 24h)

4. **Test Everything**
   - Verify frontend, backend, database
   - Check SSL certificates
   - Test backup restoration again

---

## Post-Incident Review

### Incident Report Template

**Incident Summary:**

- Date/Time:
- Duration:
- Severity: Critical / High / Medium / Low

**Impact:**

- Users affected:
- Services affected:
- Data lost:

**Timeline:**

1. [Time] - Incident detected by:
2. [Time] - First response action:
3. [Time] - Root cause identified:
4. [Time] - Service restored:
5. [Time] - Full recovery:

**Root Cause:**

- Primary cause:
- Contributing factors:
- What went well:

**Resolution:**

- Actions taken:
- Services restarted:
- Rollback performed:

**Prevention:**

- What can be improved:
- Monitoring alerts needed:
- Documentation updates needed:
- Training needed:

**Lessons Learned:**

- [ ] Update runbook
- [ ] Add automated monitoring
- [ ] Improve alerting
- [ ] Test backup restoration more frequently

### Communication

**Internal:**

- Notify team immediately (Slack/Discord)
- Post updates every 15 minutes during incident
- Post-incident summary within 24 hours

**External (if applicable):**

- Status page: https://status.fvienot.link (create if needed)
- Email users if outage > 30 minutes
- Postmortem within 48 hours

---

## Prevention & Monitoring

### Daily Checklist

- [ ] Check UptimeRobot alerts
- [ ] Review error logs: `docker compose logs --tail=100`
- [ ] Verify backups completed (check R2)
- [ ] Check disk space: `df -h`
- [ ] Review resource usage: `docker stats --no-stream`

### Weekly Checklist

- [ ] Test backup restoration
- [ ] Review security logs
- [ ] Check SSL certificate expiration
- [ ] Update system packages: `apt update && apt upgrade`

### Monthly Checklist

- [ ] Rotate secrets (JWT, DB password, R2 keys)
- [ ] Review and optimize PostgreSQL performance
- [ ] Audit user access and permissions
- [ ] Test disaster recovery procedures

### Recommended Monitoring Tools

1. **UptimeRobot** - External monitoring (free tier available)
   - Monitor: `https://crm.fvienot.link`
   - Monitor: `https://crmapi.fvienot.link/health`

2. **Docker Health Checks** - Already configured
   - All services have health checks
   - Auto-restart on failure

3. **Log Aggregation** (future improvement)
   - Loki + Grafana (self-hosted)
   - Or cloud-based: Papertrail, Loggly

---

## Quick Reference Commands

```bash
# Service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f [service]

# Restart service
docker compose -f docker-compose.prod.yml restart [service]

# Rebuild service
docker compose -f docker-compose.prod.yml up -d --build [service]

# Stop all
docker compose -f docker-compose.prod.yml down

# Start all
docker compose -f docker-compose.prod.yml up -d

# Check resource usage
docker stats --no-stream

# System resources
htop
df -h
free -m

# Backup manual
docker compose -f docker-compose.prod.yml exec postgres-backup /usr/local/bin/backup.sh

# Restore test
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh
```

---

**Last Updated:** 2026-01-01
**Version:** 1.0
**Maintainer:** System Administrator
