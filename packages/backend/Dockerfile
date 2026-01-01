# ============================================
# Stage 1: Build shared package
# ============================================
FROM node:22-alpine AS shared-builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared package
COPY packages/shared ./packages/shared

# Install all dependencies (including shared)
RUN npm install --include-workspace-root

# Build shared package
RUN npm run build:shared

# ============================================
# Stage 2: Builder (Backend)
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root files
COPY package*.json ./
COPY tsconfig.json ./

# Copy backend source
COPY packages/backend ./packages/backend

# Copy shared from builder
COPY --from=shared-builder --chown=root:root /app/node_modules ./node_modules
COPY --from=shared-builder --chown=root:root /app/packages/shared ./packages/shared

# Install production dependencies
RUN npm install --include-workspace-root

# Build backend
RUN npm run build

# ============================================
# Stage 3: Production runtime
# ============================================
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/node_modules ./packages/backend/node_modules

# Copy shared build
COPY --from=shared-builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=shared-builder --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/

# Copy backend build
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/package.json ./packages/backend/

# Copy migration files (needed for sequelize-cli)
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/.sequelizerc ./packages/backend/
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/src/migrations ./packages/backend/src/migrations
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/src/seeders ./packages/backend/src/seeders
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/src/config/sequelize.cjs ./packages/backend/src/config/sequelize.cjs

# Copy root package.json for workspace resolution
COPY --chown=nodejs:nodejs package.json ./

# Create necessary directories with correct permissions
RUN mkdir -p /app/packages/backend/logs /app/packages/backend/uploads /app/packages/backend/storage && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose backend port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set working directory to backend
WORKDIR /app/packages/backend

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
