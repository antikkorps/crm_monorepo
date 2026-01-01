# Pre-Deployment Validation

This directory contains scripts to validate your code BEFORE deploying to production.

## Scripts

### validate-deployment.sh (Full Validation)
Comprehensive validation that checks everything, including Docker image builds.

**Run this BEFORE deploying to Hetzner for the first time or after major changes.**

```bash
npm run validate:deploy
# or
bash scripts/validate-deployment.sh
```

**What it checks:**
- ✅ Docker installation
- ✅ docker-compose configuration syntax
- ✅ Node.js version (>= 18)
- ✅ Environment files present
- ✅ TypeScript type checking
- ✅ Linting
- ✅ All tests pass
- ✅ Shared package builds
- ✅ Docker images build successfully

**Time:** ~5-10 minutes (includes Docker builds)

### quick-check.sh (Quick Validation)
Fast validation for daily development. Does NOT build Docker images.

**Run this BEFORE every push to GitHub.**

```bash
npm run validate:quick
# or
bash scripts/quick-check.sh
```

**What it checks:**
- ✅ TypeScript type checking
- ✅ Linting
- ✅ All tests pass
- ✅ Shared package builds

**Time:** ~1-2 minutes

## Usage Workflow

### Daily Development
```bash
# Make your changes...
git add .
npm run validate:quick  # Quick check before push
git commit -m "your changes"
git push
```

### Before Major Deployments
```bash
# Before deploying to Hetzner
npm run validate:deploy  # Full validation including Docker builds
```

### CI/CD Pipeline

The GitHub Actions workflow in `.github/workflows/deploy-production.yml` runs these checks automatically before deploying to Hetzner.

## Troubleshooting

### Docker build fails
- Check Docker logs: `docker compose -f docker-compose.prod.yml build --no-cache`
- Ensure Docker has enough disk space: `docker system df`
- Clean up: `docker system prune -a`

### TypeScript errors
- Fix type errors in your IDE or terminal
- Run `npm run type-check` to see specific errors

### Tests fail
- Run specific test: `npx vitest run <test-file>`
- Check test logs for specific failures

## Pre-Commit Hook (Optional)

To automatically run quick validation before every commit:

```bash
# Create .git/hooks/pre-commit (run this from your project root)
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
bash scripts/quick-check.sh
EOF
chmod +x .git/hooks/pre-commit
```

Now `git commit` will automatically run validation.

## Continuous Integration

GitHub Actions automatically runs:
1. `validate:quick` on every push
2. `validate:deploy` before production deployment

See `.github/workflows/` for details.

## Best Practices

1. **Always validate before pushing** - Use `validate:quick` daily
2. **Full validation before major releases** - Use `validate:deploy` before production deployments
3. **Fix validation errors locally** - Don't push broken code
4. **Check CI logs** - If GitHub Actions fails, read the logs carefully
5. **Test Docker builds locally** - Saves time compared to failing on CI
