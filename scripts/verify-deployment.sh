#!/bin/bash
set -e

echo "=============================================="
echo "GitHub Actions Deployment Verification"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Check GitHub CLI installation
echo "1. Checking GitHub CLI..."
if command -v gh &> /dev/null; then
    echo -e "${GREEN}✓${NC} GitHub CLI (gh) is installed"
    gh --version
else
    echo -e "${YELLOW}⚠${NC} GitHub CLI not found. Install from: https://cli.github.com/"
    echo "You can also verify secrets manually in GitHub UI"
fi

# 2. Check if authenticated
echo ""
echo "2. Checking GitHub authentication..."
if gh auth status &> /dev/null; then
    echo -e "${GREEN}✓${NC} Authenticated with GitHub"
    gh auth status
else
    echo -e "${YELLOW}⚠${NC} Not authenticated. Run: gh auth login"
fi

# 3. List required secrets
echo ""
echo "3. Required GitHub Secrets for deployment:"
echo ""
echo "   Hetzner Deployment:"
echo "   - ${BLUE}HETZNER_HOST${NC}: Hetzner server IP"
echo "   - ${BLUE}HETZNER_USERNAME${NC}: SSH username (e.g., 'deploy')"
echo "   - ${BLUE}HETZNER_SSH_KEY${NC}: SSH private key for Hetzner"
echo "   - ${BLUE}HETZNER_SSH_PORT${NC}: SSH port (default: 22)"
echo ""
echo "   Health Check:"
echo "   - ${BLUE}BACKEND_DOMAIN${NC}: Backend domain for health checks"
echo "   - ${BLUE}FRONTEND_DOMAIN${NC}: Frontend domain for health checks"
echo ""

# 4. Check if secrets are set (requires auth)
if gh auth status &> /dev/null; then
    echo "4. Checking GitHub Secrets..."
    REPO=$(git remote get-url origin | sed -E 's|.*github.com[/:](.*)|\\1|' | sed 's/.git$//')

    REQUIRED_SECRETS=(
        "HETZNER_HOST"
        "HETZNER_USERNAME"
        "HETZNER_SSH_KEY"
        "BACKEND_DOMAIN"
        "FRONTEND_DOMAIN"
    )

    for secret in "${REQUIRED_SECRETS[@]}"; do
        if gh secret list --repo "$REPO" | grep -q "$secret"; then
            echo -e "${GREEN}✓${NC} $secret is set"
        else
            echo -e "${RED}✗${NC} $secret is NOT set"
        fi
    done

    # Check workflow runs
    echo ""
    echo "5. Recent workflow runs..."
    gh run list --repo "$REPO" --limit 5 --json databaseId,name,status,conclusion,createdAt --template '  {{tablerow .databaseId .name .status .conclusion .createdAt}}'
else
    echo "   (Skipped - not authenticated)"
fi

# 6. Check workflow files
echo ""
echo "6. Checking workflow files..."
if [ -f ".github/workflows/ci.yml" ]; then
    echo -e "${GREEN}✓${NC} CI workflow exists (.github/workflows/ci.yml)"
else
    echo -e "${RED}✗${NC} CI workflow missing"
fi

if [ -f ".github/workflows/deploy-production.yml" ]; then
    echo -e "${GREEN}✓${NC} Production deployment workflow exists (.github/workflows/deploy-production.yml)"
else
    echo -e "${RED}✗${NC} Production deployment workflow missing"
fi

# 7. Test SSH connection to Hetzner (if .env.production exists)
echo ""
echo "7. Testing SSH connection to Hetzner..."
if [ -f ".env.production" ]; then
    source .env.production

    if [ -n "$HETZNER_HOST" ] && [ -n "$HETZNER_USERNAME" ]; then
        echo "Testing connection to $HETZNER_USERNAME@$HETZNER_HOST..."
        if timeout 5 ssh -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=no \
            ${HETZNER_USERNAME}@${HETZNER_HOST} exit 2>/dev/null; then
            echo -e "${GREEN}✓${NC} SSH connection successful"
        else
            echo -e "${YELLOW}⚠${NC} SSH connection failed"
            echo "  This is expected if:"
            echo "  - SSH key is not added to ~/.ssh/ or ssh-agent"
            echo "  - Server is not accessible from this location"
        fi
    else
        echo "   (Skipped - HETZNER_HOST or HETZNER_USERNAME not set in .env.production)"
    fi
else
    echo "   (Skipped - .env.production not found)"
fi

# 8. Summary
echo ""
echo "=============================================="
echo "Summary & Next Steps"
echo "=============================================="
echo ""
echo "To ensure automatic deployment works when merging PRs:"
echo ""
echo "1. ${BLUE}Set GitHub Secrets${NC}:"
echo "   Go to: https://github.com/YOUR_ORG/YOUR_REPO/settings/secrets/actions"
echo "   Add the required secrets listed above"
echo ""
echo "2. ${BLUE}Configure Hetzner SSH Access${NC}:"
echo "   - Generate SSH key: ssh-keygen -t ed25519 -C \"github-actions\""
echo "   - Add public key to Hetzner server: ~/.ssh/authorized_keys"
echo "   - Add private key to GitHub as HETZNER_SSH_KEY secret"
echo ""
echo "3. ${BLUE}Test Deployment${NC}:"
echo "   - Create a test branch: git checkout -b test-deploy"
echo "   - Make a small change and commit"
echo "   - Create PR and merge to main"
echo "   - Monitor workflow: https://github.com/YOUR_ORG/YOUR_REPO/actions"
echo ""
echo "4. ${BLUE}Monitor Deployments${NC}:"
echo "   - Check GitHub Actions logs"
echo "   - Verify services are healthy: docker compose -f docker-compose.prod.yml ps"
echo "   - Check application logs: docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "5. ${BLUE}Deployment Rollback${NC} (if needed):"
echo "   ssh user@hetzner-server"
echo "   cd /srv/medical-crm"
echo "   git log --oneline -10  # Find previous commit"
echo "   git reset --hard <previous-commit>"
echo "   docker compose -f docker-compose.prod.yml up -d --force-recreate"
echo ""
