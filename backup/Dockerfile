FROM postgres:18-alpine

# Install AWS CLI v2 (for S3-compatible Cloudflare R2)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    bash \
    curl \
    gzip \
    aws-cli

# Create backup directory
RUN mkdir -p /backup && \
    chown postgres:postgres /backup

# Copy backup scripts
COPY scripts/backup.sh /usr/local/bin/backup.sh
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh

# Make scripts executable
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/entrypoint.sh

# Switch to postgres user
USER postgres

# Health check
HEALTHCHECK --interval=5m --timeout=30s --start-period=30s --retries=3 \
  CMD ps aux | grep -q '[c]rond' || exit 1

# Run entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
