# Backend Documentation

## Overview

This directory contains comprehensive documentation for the OPEx_CRM backend system.

## Documentation Index

### 📖 Core Documentation

- **[TESTING.md](./TESTING.md)** - Complete testing guide
  - Unit and integration testing
  - Test helpers and mocks
  - Coverage requirements and best practices
  - Troubleshooting guide

- **[CI-CD.md](./CI-CD.md)** - CI/CD pipeline documentation
  - GitHub Actions workflows
  - Deployment procedures
  - Environment configuration
  - Security and monitoring

- **[DATABASE-OPTIMIZATION.md](./DATABASE-OPTIMIZATION.md)** - Database performance
  - Indexing strategies
  - Query optimization
  - Monitoring and maintenance
  - Best practices

### 🔧 Existing Documentation

- **[BACKEND_API.md](../BACKEND_API.md)** - API endpoints reference
- **[DIGIFORMA.md](../DIGIFORMA.md)** - Digiforma integration
- **[EMAIL_REMINDERS.md](./EMAIL_REMINDERS.md)** - Email reminder system (if exists)

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Visual UI
npm run test:ui
```

### Database Management

```bash
# Audit indexes
npm run db:audit-indexes

# Run migrations
npm run db:migrate

# Reset database (dev only)
npm run db:reset
```

### Health Checks

```bash
# Run health check
npm run health-check

# Check specific service
npm run health-check -- --skip-api
```

### Code Quality

```bash
# Type check
npm run type-check

# Lint
npm run lint:check

# Fix linting issues
npm run lint
```

## Project Structure

```
packages/backend/
├── src/
│   ├── __tests__/           # Test files
│   │   ├── helpers/         # Test utilities
│   │   ├── controllers/     # Controller tests
│   │   ├── services/        # Service tests
│   │   └── integration/     # Integration tests
│   ├── controllers/         # Request handlers
│   ├── services/            # Business logic
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── middleware/          # Express middleware
│   ├── scripts/             # Utility scripts
│   └── utils/               # Helper functions
├── docs/                    # Documentation (this folder)
├── migrations/              # Database migrations
└── seeders/                 # Database seeds
```

## Testing Strategy

### Coverage Goals

- **Target**: 70-80% code coverage
- **Measured**: Lines, functions, branches, statements
- **Tools**: Vitest with v8 coverage provider

### Test Types

1. **Unit Tests**: Test individual functions and services
2. **Integration Tests**: Test API endpoints and workflows
3. **Database Tests**: Test with real PostgreSQL (test environment)

## CI/CD Pipeline

### Continuous Integration

- **Triggers**: Push to main/develop, PRs
- **Checks**: Type checking, linting, tests, coverage
- **Reports**: Coverage uploaded to Codecov

### Continuous Deployment

- **Staging**: Auto-deploy on main push
- **Production**: Requires staging success + manual approval
- **Post-Deploy**: Health checks verify deployment

## Database Optimization

### Index Strategy

- Primary keys (automatic)
- Foreign keys (critical for JOINs)
- Composite indexes (multi-column queries)
- Partial indexes (filtered queries)
- Text search indexes (GIN)

### Monitoring

```bash
# Audit indexes
npm run db:audit-indexes

# Check for:
# - Missing foreign key indexes
# - Unused indexes
# - Duplicate indexes
# - Query performance issues
```

## Health Monitoring

### Available Endpoints

- `GET /api/health` - Basic health check (fast)
- `GET /api/health/detailed` - Full system status
- `GET /api/health/ready` - Readiness probe (Kubernetes)
- `GET /api/health/live` - Liveness probe (Kubernetes)

### Monitored Services

- Database connectivity and latency
- Memory usage (heap, RSS)
- Disk space (when available)
- API availability

## Best Practices

### Development

1. Write tests for new features
2. Maintain 70%+ coverage
3. Use test helpers for consistency
4. Clean database between tests

### Database

1. Index foreign keys
2. Use EXPLAIN ANALYZE for slow queries
3. Run audit script regularly
4. Monitor index usage

### CI/CD

1. Test locally before pushing
2. Keep PRs small and focused
3. Write meaningful commit messages
4. Review CI logs when tests fail

## Troubleshooting

### Tests Failing

1. Check test environment variables
2. Ensure database is running
3. Review test isolation
4. Check for race conditions

### Coverage Issues

1. Add tests for uncovered code
2. Review coverage report (HTML)
3. Test edge cases
4. Remove dead code

### Performance Problems

1. Run database index audit
2. Use EXPLAIN ANALYZE on slow queries
3. Check for N+1 query problems
4. Review database connection pool

## Resources

### External Documentation

- [Vitest](https://vitest.dev/) - Testing framework
- [Sequelize](https://sequelize.org/) - ORM documentation
- [PostgreSQL](https://www.postgresql.org/docs/) - Database docs
- [Koa.js](https://koajs.com/) - Web framework

### Internal Resources

- [Architecture Documentation](../../../ARCHITECTURE.md)
- [Project README](../../../README.md)
- [Task Tracking](../../../TODOS/specs/modern-crm/tasks.md)

## Contributing

When adding new features:

1. Write tests first (TDD recommended)
2. Update documentation
3. Run full test suite
4. Check coverage
5. Update this README if needed

## Support

For questions or issues:

1. Check relevant documentation
2. Review existing tests for examples
3. Run health checks and audits
4. Check GitHub Actions logs
5. Contact the development team

---

Last Updated: 2025-11-13
Maintained by: Development Team
