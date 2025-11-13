# Testing Guide

## Overview

This project uses **Vitest** for testing with a target coverage of **70-80%** for services and controllers. All database interactions are mocked to ensure fast, reliable tests.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Structure

```
src/
├── __tests__/
│   ├── setup.ts                    # Test setup and configuration
│   ├── helpers/
│   │   ├── db-mock.ts             # Database mocking utilities
│   │   └── auth-helpers.ts        # Authentication helpers for tests
│   ├── controllers/
│   │   ├── AuthController.test.ts
│   │   └── ...
│   ├── services/
│   │   ├── AuthService.test.ts
│   │   └── ...
│   └── integration/
│       └── ...
```

## Writing Tests

### Unit Tests for Services

```typescript
import { describe, it, expect, beforeEach } from "vitest"
import { YourService } from "../../services/YourService"
import { createMockUser, cleanDatabase } from "../helpers/db-mock"
import { sequelize } from "../../config/database"

describe("YourService", () => {
  beforeEach(async () => {
    await cleanDatabase(sequelize)
  })

  it("should perform expected operation", async () => {
    const user = await createMockUser()
    const result = await YourService.someMethod(user.id)
    expect(result).toBeDefined()
  })
})
```

### Integration Tests for Controllers

```typescript
import { describe, it, expect, beforeEach } from "vitest"
import supertest from "supertest"
import { createAuthenticatedUser } from "../helpers/auth-helpers"
import { cleanDatabase } from "../helpers/db-mock"
import { sequelize } from "../../config/database"
import app from "../../app"

describe("YourController", () => {
  beforeEach(async () => {
    await cleanDatabase(sequelize)
  })

  it("should handle request successfully", async () => {
    const user = await createAuthenticatedUser("USER")

    const response = await supertest(app.callback())
      .get("/api/your-endpoint")
      .set("Authorization", `Bearer ${user.token}`)
      .expect(200)

    expect(response.body).toHaveProperty("data")
  })
})
```

## Test Helpers

### Database Mocks

The `db-mock.ts` helper provides utilities for creating test data:

- `createMockUser(overrides)` - Create a test user
- `createMockTeam(overrides)` - Create a test team
- `createMockMedicalInstitution(overrides)` - Create a test institution
- `createMockTask(userId, institutionId, overrides)` - Create a test task
- `createMockQuote(institutionId, creatorId, overrides)` - Create a test quote
- `createMockInvoice(institutionId, creatorId, overrides)` - Create a test invoice
- `createMockMeeting(institutionId, creatorId, overrides)` - Create a test meeting
- `createMockNote(institutionId, authorId, overrides)` - Create a test note
- `cleanDatabase(sequelize)` - Clean all test data

### Authentication Helpers

The `auth-helpers.ts` helper provides authentication utilities:

- `createAuthenticatedUser(role)` - Create a user with JWT token
- `createTestUsers()` - Create users with different roles
- `authenticatedRequest(app, token)` - Make authenticated HTTP requests

## Coverage Requirements

The project enforces the following coverage thresholds:

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

### Viewing Coverage

After running `npm run test:coverage`, you can view the HTML report:

```bash
# Open coverage report in browser
open coverage/index.html
```

## Best Practices

### 1. Test Isolation

Always clean the database before each test to ensure isolation:

```typescript
beforeEach(async () => {
  await cleanDatabase(sequelize)
})
```

### 2. Mock External Services

Mock external API calls to avoid network dependencies:

```typescript
import { vi } from "vitest"

vi.mock("../../services/EmailService", () => ({
  EmailService: {
    sendEmail: vi.fn().mockResolvedValue(true),
  },
}))
```

### 3. Test Error Cases

Always test both success and error scenarios:

```typescript
it("should handle errors gracefully", async () => {
  await expect(YourService.methodThatFails()).rejects.toThrow()
})
```

### 4. Use Descriptive Test Names

Write clear test descriptions that explain what is being tested:

```typescript
it("should return 401 when user is not authenticated", async () => {
  // Test implementation
})
```

### 5. Test Business Logic, Not Implementation

Focus on testing behavior and outcomes rather than implementation details:

```typescript
// Good
it("should create a user with hashed password", async () => {
  const user = await UserService.createUser({ email: "test@example.com", password: "password123" })
  expect(user.password).not.toBe("password123")
})

// Bad
it("should call bcrypt.hash with correct arguments", async () => {
  // Testing implementation details
})
```

## CI/CD Integration

Tests are automatically run in GitHub Actions on every push and pull request. The CI pipeline:

1. Sets up a PostgreSQL test database
2. Runs type checking
3. Runs linting
4. Executes all tests with coverage
5. Uploads coverage reports to Codecov
6. Fails if coverage is below thresholds

## Troubleshooting

### Tests Timing Out

If tests are timing out, increase the timeout in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    testTimeout: 15000, // Increase from 10000
  },
})
```

### Database Connection Issues

Ensure your `.env.test` file has the correct database configuration:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medical_crm_test
DB_USER=postgres
DB_PASSWORD=postgres
```

### Flaky Tests

If tests are inconsistent:

1. Ensure proper cleanup in `afterEach` hooks
2. Check for race conditions in async code
3. Use `await` for all database operations
4. Verify test isolation

## Adding New Tests

When adding new controllers or services:

1. Create a corresponding test file in the appropriate directory
2. Import necessary helpers and utilities
3. Write tests covering main functionality and edge cases
4. Run `npm run test:coverage` to verify coverage
5. Update this documentation if needed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
