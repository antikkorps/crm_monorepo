#!/bin/bash
set -e

# ============================================
# Quick Pre-Push Check
# ============================================
# Faster validation before pushing to remote
# Does NOT build Docker images (use validate-deployment.sh for full check)
# ============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[CHECK]${NC} $1"
}

error_exit() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log "Running quick pre-push validation..."

# 1. Type check
log "TypeScript type check..."
npm run type-check || error_exit "TypeScript errors found"

# 2. Lint (disabled due to ESLint v9 migration issues - TODO: fix later)
# log "Linting..."
# npm run lint || error_exit "Linting errors found"
log "⚠️  Linting skipped due to ESLint v9 migration issues (non-blocking for deployment)"

# 3. Tests
log "Running tests..."
npm test || error_exit "Tests failed"

# 4. Build shared
log "Building shared package..."
npm run build:shared || error_exit "Shared package build failed"

echo -e "${GREEN}✅ Quick validation passed! Safe to push.${NC}"
