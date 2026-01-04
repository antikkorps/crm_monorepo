# Server Directory Structure

## Overview

This document describes the directory structure used on the Hetzner server for Medical CRM.

## Conventions

The server follows the **Filesystem Hierarchy Standard (FHS)** for Linux systems.

### Primary Directories

| Directory | Purpose                                 | Usage in Medical CRM                       |
| --------- | --------------------------------------- | ------------------------------------------ |
| `/srv/`   | Services and data served by this system | **Application root** (`/srv/medical-crm/`) |
| `/var/`   | Variable data (logs, cache, temporary)  | Docker volumes, application logs           |
| `/tmp/`   | Temporary files                         | Temporary build artifacts                  |
| `/opt/`   | Optional/additional software packages   | Not used (for third-party binaries only)   |

## Directory Structure

```
/srv/medical-crm/                    # Application root
├── docker-compose.prod.yml            # Production compose file
├── docker-compose.yml                 # Development compose file
├── .env.production                   # Production secrets (gitignored)
├── .env.production.example           # Template for .env.production
├── packages/
│   ├── backend/                      # Backend API (Koa.js + TypeScript)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── dist/                    # Compiled output
│   ├── frontend/                     # Frontend (Vue 3 + Vite)
│   │   ├── Dockerfile
│   │   ├── nginx.conf               # Nginx configuration
│   │   ├── package.json
│   │   └── dist/                   # Built static assets
│   └── shared/                      # Shared types and utilities
│       ├── Dockerfile
│       ├── package.json
│       └── dist/                    # Compiled output
├── backup/
│   ├── Dockerfile
│   └── scripts/
│       ├── backup.sh                 # Main backup script
│       ├── test-restore.sh           # Restore test script
│       └── entrypoint.sh            # Backup service entrypoint
├── postgres/
│   └── init/                       # Database initialization scripts
└── docs/                           # Additional documentation

/var/lib/docker/volumes/              # Docker volumes
├── medical-crm-postgres-data/        # PostgreSQL data
├── medical-crm-backend-uploads/      # User uploads
├── medical-crm-backend-logs/         # Application logs
└── medical-crm-backend-storage/      # Stored documents

/var/log/                             # System logs
└── medical-crm/                      # Application-specific logs (optional)

/tmp/                                 # Temporary files
└── docker-build/                     # Temporary build artifacts (cleaned automatically)
```

## Why `/srv/` instead of `/opt/` or `/var/www/`?

### `/srv/` (Used) ✅

- **Modern FHS convention** for site-specific data/services
- Designed for "data for services provided by this system"
- Standard for Docker-based services
- Clear separation from system software

### `/opt/` (Not Used) ❌

- **Legacy convention** for optional software packages
- Intended for pre-compiled third-party binaries
- Less clear purpose for Docker-based services
- Still valid but outdated for modern deployments

### `/var/www/` (Not Used) ❌

- **Traditional convention** for web applications (Apache/Nginx)
- More old-school, less Docker-friendly
- Confusing mix of static files and dynamic services

## Permissions

```
/srv/medical-crm/                    # deploy:deploy (user:group)
/var/lib/docker/volumes/              # root:root (managed by Docker)
/var/log/medical-crm/                # root:root (or deploy:deploy)
```

## Best Practices

### Creating Directories

```bash
# Application directory
sudo mkdir -p /srv/medical-crm
sudo chown -R deploy:deploy /srv/medical-crm

# Logs directory (if using separate logs)
sudo mkdir -p /var/log/medical-crm
sudo chown -R deploy:deploy /var/log/medical-crm
```

### Accessing Data

```bash
# Application code (read-only for containers)
cd /srv/medical-crm

# Docker volumes (managed by Docker)
docker volume ls
docker volume inspect medical-crm-postgres-data

# System logs
tail -f /var/log/syslog
tail -f /var/log/docker.log
```

## Security Considerations

1. **Application Directory (`/srv/`)**:

   - Owned by `deploy` user (non-root)
   - Permissions: `755` (owner: rwx, group: rx, other: rx)
   - `.env.production`: `600` (owner: rw only)

2. **Docker Volumes**:

   - Managed by Docker (root)
   - Containers run as non-root users
   - Sensitive data in PostgreSQL volume is protected by database authentication

3. **Backup Directory**:
   - Backups uploaded to Cloudflare R2 (encrypted at rest)
   - Local backup directory: `/backup` (in container)

## Backup Strategy

- **Code**: Git repository (`.git` directory in `/srv/medical-crm/`)
- **Database**: PostgreSQL backup to Cloudflare R2
- **Volumes**: Automatic daily backup to Cloudflare R2
- **Configuration**: `.env.production` (manual backup recommended)

## Migration from `/opt/` to `/srv/`

If you're moving from `/opt/` to `/srv/`:

```bash
# Stop all services
cd /opt/medical-crm
docker compose -f docker-compose.prod.yml down

# Copy to new location
sudo cp -r /opt/medical-crm /srv/

# Update ownership
sudo chown -R deploy:deploy /srv/medical-crm

# Update any documentation or scripts with new path
# (already done in the current repository)

# Start services
cd /srv/medical-crm
docker compose -f docker-compose.prod.yml up -d

# Verify
docker compose -f docker-compose.prod.yml ps
```

## References

- [Filesystem Hierarchy Standard - /srv](https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.html#srvServicesForThisSystem)
- [Filesystem Hierarchy Standard - /opt](https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.html#optOptionalSoftwarePackages)
- [Filesystem Hierarchy Standard - /var](https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.html#varVariableData)

**Last Updated:** 2026-01-01
**Version:** 1.0
