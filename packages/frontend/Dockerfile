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

# Install dependencies (only for shared)
RUN npm install --workspace=@medical-crm/shared --include-workspace-root

# Build shared package
RUN npm run build:shared

# ============================================
# Stage 2: Build frontend
# ============================================
FROM node:22-alpine AS builder

# Accept build arguments
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

# Copy root files
COPY package*.json ./
COPY tsconfig.json ./

# Copy frontend source
COPY packages/frontend ./packages/frontend

# Copy shared from builder
COPY --from=shared-builder /app/packages/shared ./packages/shared

# Install dependencies
RUN npm install --workspace=@medical-crm/frontend --include-workspace-root

# Build frontend with environment variable
WORKDIR /app/packages/frontend
RUN echo "Building frontend with VITE_API_URL=${VITE_API_URL}" && npm run build

# ============================================
# Stage 3: Production nginx
# ============================================
FROM nginx:1.27-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx config
COPY packages/frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 101 -S nginx || true && \
    adduser -S nginx -u 101 -G nginx || true && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
