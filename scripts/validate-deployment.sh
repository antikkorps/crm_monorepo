#!/bin/bash
set -e

# ============================================
# Pre-Deployment Validation Script
# ============================================
# Run this locally BEFORE deploying to Hetzner
# to ensure everything builds and works
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handler
error_exit() {
    error "$1"
    exit 1
}

log "Starting pre-deployment validation..."
echo ""

# ============================================
# 1. Check Docker is installed
# ============================================
log "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    error_exit "Docker is not installed. Please install Docker first."
fi
log "Docker version: $(docker --version)"
echo ""

# ============================================
# 2. Check docker-compose is installed
# ============================================
log "Checking docker-compose..."
if ! command -v docker compose &> /dev/null; then
    error_exit "docker-compose is not installed. Please install docker-compose first."
fi
log "docker-compose version: $(docker compose version)"
echo ""

# ============================================
# 3. Check if Node.js is installed
# ============================================
log "Checking Node.js..."
if ! command -v node &> /dev/null; then
    error_exit "Node.js is not installed. Please install Node.js first."
fi
NODE_VERSION=$(node --version)
if [ "$(echo "$NODE_VERSION" | cut -d'.' -f1)" -lt 18 ]; then
    error_exit "Node.js version must be 18 or higher (current: $NODE_VERSION)"
fi
log "Node.js version: $NODE_VERSION"
echo ""

# ============================================
# 4. Validate docker-compose.prod.yml syntax
# ============================================
log "Validating docker-compose.prod.yml..."
if ! docker compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    error_exit "docker-compose.prod.yml has syntax errors"
fi
log "docker-compose.prod.yml syntax is valid"
echo ""

# ============================================
# 5. Check required environment files exist
# ============================================
log "Checking environment files..."
REQUIRED_FILES=(".env.production.example")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        error_exit "Required file not found: $file"
    fi
    log "Found: $file"
done

if [ -f ".env.production" ]; then
    warn ".env.production found - this should only exist on the server!"
fi
echo ""

# ============================================
# 6. Run TypeScript type checking
# ============================================
log "Running TypeScript type checking..."
if [ ! -d "node_modules" ]; then
    log "Installing dependencies..."
    npm install
fi

if ! npm run type-check; then
    error_exit "TypeScript type check failed"
fi
log "TypeScript type check passed"
echo ""

# ============================================
# 7. Run linter
# ============================================
log "Running linter..."
if ! npm run lint; then
    error_exit "Linting failed"
fi
log "Linting passed"
echo ""

# ============================================
# 8. Run tests
# ============================================
log "Running tests..."
if ! npm test; then
    error_exit "Tests failed"
fi
log "All tests passed"
echo ""

# ============================================
# 9. Build shared package
# ============================================
log "Building shared package..."
if ! npm run build:shared; then
    error_exit "Failed to build shared package"
fi
log "Shared package built successfully"
echo ""

# ============================================
# 10. Build Docker images (dry-run)
# ============================================
log "Building Docker images for production..."
log "This may take several minutes..."

# Create a temporary .env for building (if needed)
if [ ! -f ".env.production.build" ]; then
    cat > .env.production.build << EOF
DOMAIN=example.com
FRONTEND_DOMAIN=crm.example.com
BACKEND_DOMAIN=api.example.com
TRAEFIK_DOMAIN=traefik.example.com
POSTGRES_DB=medical_crm
POSTGRES_USER=medical_crm_user
POSTGRES_PASSWORD=temp_password
JWT_SECRET=temp_jwt_secret_32_chars_min
JWT_EXPIRES_IN=7d
NODE_ENV=production
TRAEFIK_BASIC_AUTH=admin:\$apr1\$temp\$temp
EOF
    log "Created temporary .env.production.build"
fi

# Build all images
export $(cat .env.production.build | grep -v '^#' | xargs)

if ! docker compose -f docker-compose.prod.yml build; then
    error_exit "Docker build failed"
fi
log "Docker images built successfully"
echo ""

# ============================================
# 11. Verify images were created
# ============================================
log "Verifying Docker images..."
IMAGES=("medical-crm-backend" "medical-crm-frontend")
for image in "${IMAGES[@]}"; do
    if ! docker images | grep -q "$image"; then
        error_exit "Docker image not found: $image"
    fi
    log "Image found: $image"
done
echo ""

# ============================================
# 12. Clean up temporary files
# ============================================
log "Cleaning up..."
rm -f .env.production.build
log "Temporary files removed"
echo ""

# ============================================
# Summary
# ============================================
echo ""
log "=========================================="
log "✅ PRE-DEPLOYMENT VALIDATION PASSED!"
log "=========================================="
echo ""
log "Summary of checks:"
echo "  ✓ Docker installed and configured"
echo "  ✓ docker-compose valid"
echo "  ✓ Node.js version correct"
echo "  ✓ Environment files present"
echo "  ✓ TypeScript type check passed"
echo "  ✓ Linting passed"
echo "  ✓ All tests passed"
echo "  ✓ Shared package built"
echo "  ✓ Docker images built successfully"
echo ""
log "You are ready to deploy to Hetzner!"
echo ""
log "Next steps:"
echo "  1. On Hetzner: git clone <your-repo>"
echo "  2. Create .env.production from .env.production.example"
echo "  3. Run: docker compose -f docker-compose.prod.yml up -d"
echo ""
