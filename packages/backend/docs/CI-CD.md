# CI/CD Pipeline Documentation

## Overview

This project uses **GitHub Actions** for Continuous Integration and Continuous Deployment. The pipeline ensures code quality, runs tests, and automates deployments.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Trigger**: On push to `main`, `develop`, or any `claude/**` branch, and on pull requests

**Jobs**:

#### Backend Tests & Coverage
- Sets up Node.js 20
- Installs dependencies
- Runs type checking (`tsc --noEmit`)
- Runs linting (`eslint`)
- Executes tests with coverage
- Uploads coverage to Codecov
- Verifies coverage meets 70% threshold

**Environment Requirements**:
- PostgreSQL 15 database
- Node.js 20
- Environment variables for testing

#### Frontend Tests & Build
- Type checks frontend code
- Runs linting
- Builds production bundle
- Verifies no build errors

#### Security Audit
- Runs `npm audit` on all packages
- Checks for high-severity vulnerabilities
- Reports security issues (non-blocking)

### 2. CD Pipeline (`cd.yml`)

**Trigger**: On push to `main` or manual dispatch

**Jobs**:

#### Deploy to Staging
- Builds backend and frontend
- Runs database migrations
- Deploys to staging environment
- Sends deployment notification

**Environment**: `staging`

#### Deploy to Production
- **Requires**: Successful staging deployment
- **Trigger**: Only on `main` branch
- Builds production bundles
- Runs database migrations
- Performs health checks post-deployment
- Sends success notification

**Environment**: `production`

## Configuration

### Required Secrets

Set these secrets in your GitHub repository settings:

#### Staging Environment
```
STAGING_DB_HOST          # Database host for staging
STAGING_DB_PORT          # Database port (default: 5432)
STAGING_DB_NAME          # Database name
STAGING_DB_USER          # Database user
STAGING_DB_PASSWORD      # Database password
```

#### Production Environment
```
PROD_DB_HOST             # Database host for production
PROD_DB_PORT             # Database port (default: 5432)
PROD_DB_NAME             # Database name
PROD_DB_USER             # Database user
PROD_DB_PASSWORD         # Database password
```

### Environment Variables

The CI pipeline uses the following environment variables:

```yaml
NODE_ENV: test
DB_HOST: localhost
DB_PORT: 5432
DB_NAME: medical_crm_test
DB_USER: postgres
DB_PASSWORD: postgres
JWT_SECRET: test-jwt-secret-for-ci
JWT_REFRESH_SECRET: test-refresh-secret-for-ci
```

## Running Locally

### Prerequisites

```bash
# Install dependencies
npm install

# Set up test database
docker-compose up -d postgres
```

### Run CI Checks Locally

```bash
# Type checking
cd packages/backend
npm run type-check

# Linting
npm run lint:check

# Tests with coverage
npm run test:coverage

# Build
npm run build
```

## Coverage Reports

Coverage reports are uploaded to **Codecov** after each CI run. You can view detailed coverage reports at:

```
https://codecov.io/gh/YOUR_ORG/YOUR_REPO
```

### Coverage Thresholds

The CI will **fail** if coverage drops below:
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

## Deployment Process

### Staging Deployment

1. Push to `main` branch
2. CI tests run automatically
3. If tests pass, deploy to staging
4. Database migrations run automatically
5. Staging environment is updated

### Production Deployment

1. Staging deployment must succeed
2. Manual approval may be required (GitHub Environment protection)
3. Production build is created
4. Database migrations run
5. Health checks verify deployment
6. Traffic is routed to new version

## Health Checks

After deployment, the pipeline runs health checks:

```bash
npm run health-check
```

This verifies:
- Database connectivity
- API responsiveness
- Memory usage
- Disk space

If health checks fail, the deployment is marked as failed.

## Rollback Procedure

If a deployment fails or issues are detected:

1. **Immediate**: Revert to previous deployment
   ```bash
   git revert <commit-sha>
   git push origin main
   ```

2. **Database**: Rollback migrations if needed
   ```bash
   npm run db:migrate:undo
   ```

3. **Verify**: Run health checks
   ```bash
   npm run health-check
   ```

## Branch Protection

### Main Branch
- Requires PR approval
- Requires passing CI checks
- Requires up-to-date branch
- No force push allowed

### Develop Branch
- Requires passing CI checks
- No direct push to main

## Monitoring and Notifications

### Build Notifications

Configure notifications in GitHub:
- Settings → Notifications → Actions
- Set up Slack/Discord webhooks (optional)

### Failed Builds

When a build fails:
1. Check the GitHub Actions logs
2. Review the specific job that failed
3. Fix the issue locally
4. Push the fix
5. CI runs automatically

## Best Practices

### 1. Test Before Push

Always run tests locally before pushing:
```bash
npm run test:coverage
npm run lint:check
npm run type-check
```

### 2. Small, Incremental Changes

- Keep PRs focused and small
- Easier to review and debug
- Faster CI execution

### 3. Write Tests for New Features

- Maintain 70%+ coverage
- Test edge cases
- Include integration tests

### 4. Database Migrations

- Always test migrations locally
- Write both up and down migrations
- Never modify existing migrations in production

### 5. Environment-Specific Config

- Use environment variables
- Never commit secrets
- Test with production-like data

## Troubleshooting

### CI Tests Failing

**Issue**: Tests pass locally but fail in CI

**Solutions**:
1. Check environment variables
2. Verify database setup in workflow
3. Check for timing issues (increase timeouts)
4. Review CI logs carefully

### Coverage Below Threshold

**Issue**: Coverage drops below 70%

**Solutions**:
1. Add tests for new code
2. Improve existing test coverage
3. Remove dead code
4. Test edge cases

### Deployment Fails

**Issue**: Deployment succeeds but app doesn't work

**Solutions**:
1. Check health check endpoint
2. Review application logs
3. Verify database migrations
4. Check environment variables

### Database Migration Errors

**Issue**: Migrations fail during deployment

**Solutions**:
1. Test migrations locally first
2. Check migration dependencies
3. Verify database permissions
4. Review migration logs

## Performance Optimization

### Speeding Up CI

1. **Cache Dependencies**
   - GitHub Actions caches `node_modules`
   - Speeds up subsequent runs

2. **Parallel Jobs**
   - Backend and frontend tests run in parallel
   - Reduces total CI time

3. **Skip Unnecessary Steps**
   - Use conditional job execution
   - Skip tests on documentation-only changes

## Security Considerations

### Secrets Management

- Use GitHub Secrets for sensitive data
- Rotate secrets regularly
- Never log secrets
- Use environment-specific secrets

### Access Control

- Limit who can approve deployments
- Require 2FA for maintainers
- Use branch protection rules
- Audit access logs regularly

## Maintenance

### Regular Tasks

- Update dependencies monthly
- Review and update CI configuration
- Monitor CI performance metrics
- Clean up old workflow runs
- Update documentation

### Yearly Tasks

- Review and update security policies
- Audit deployment processes
- Update Node.js version
- Review coverage thresholds

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Codecov Documentation](https://docs.codecov.io/)
- [Deployment Best Practices](https://www.deployhq.com/blog/deployment-best-practices)
