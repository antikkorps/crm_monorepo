# Agent Guidelines for Medical CRM Monorepo

## Business Context

### CRM Type: B2B Medical
This is a **B2B CRM** for selling to medical institutions (clinics, hospitals, medical practices), NOT a patient management system.

**Core Entities**:
- Medical Institutions (clients/prospects)
- Contacts (people within institutions)
- Quotes, Invoices, Tasks, Notes, Calls, Meetings, Reminders

**NOT in scope**:
- Individual patient management
- Patient records/prescriptions
- Patient appointments
- Medical histories

### Integration Strategy: Outlook/Teams

**Calendar & Meetings**:
- **Do NOT build** an integrated calendar UI
- Use Outlook/Teams for scheduling (primary enterprise tools)
- CRM exports events as `.ics` files (iCalendar format) for Outlook import
- CRM stores meeting follow-ups, notes, and minutes
- Meetings can be sent by email with .ics attachment

**Email Strategy**:
- Send quotes by email directly from CRM
- Send meeting invites as .ics attachments
- EmailService handles SMTP delivery

**Benefits**:
- Leverage existing enterprise tools (Outlook/Teams)
- No calendar UI duplication
- Focus on CRM value: tracking, notes, follow-ups, sales pipeline

## Development Commands
- **Dev all**: `npm run dev` (runs frontend, backend, shared concurrently)
- **Dev backend**: `npm run dev:back` (tsx watch mode)
- **Dev frontend**: `npm run dev:front` (Vite dev server)

## Build/Test Commands
- **Build all**: `npm run build`
- **Build specific**: `npm run build:backend`, `npm run build:frontend`, `npm run build:shared`
- **Test all**: `npm run test`
- **Test single file**: `npx vitest run <file-path>` (e.g., `npx vitest run packages/backend/src/__tests__/auth.test.ts`)
- **Test watch**: `npm run test:watch` (in specific package)
- **Lint all**: `npm run lint`
- **Type check**: `npm run type-check` (frontend only)

## Database Commands
- **Migrate**: `npm run db:migrate`
- **Seed**: `npm run db:seed`
- **Reset DB**: `npm run db:reset` (drops, creates, migrates, seeds)

## Docker Commands
- **Start services**: `npm run docker:up`
- **Stop services**: `npm run docker:down`

## Code Style Guidelines

### TypeScript
- Strict mode: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`
- Explicit types for parameters/returns, prefer interfaces over types
- Use `readonly` for immutable properties
- **NEVER use `any`**: Create proper type extensions instead
  - ❌ BAD: `context: { isSync: true } } as any)`
  - ✅ GOOD: `interface SyncUpdateOptions<T> extends UpdateOptions<T> { context?: { isSync: boolean } }`
  - For Sequelize options, extend `UpdateOptions<T>` or `CreateOptions<T>`
  - For unknown external data, use `unknown` and type guards

### Imports & Naming
- Group imports: external → internal packages → relative
- Absolute imports with path mapping: `@medical-crm/shared/*`
- Classes: PascalCase, Variables/Functions: camelCase, Constants: UPPER_SNAKE_CASE
- Files: kebab-case (components), camelCase (services)

### Vue.js
- Composition API with `<script setup>`
- Primary UI: Vuetify (Material Design 3), avoid PrimeVue
- Notifications: Vuetify snackbar or Vue Toastification
- Event handlers: `handle*` prefix
- Avatars: DiceBear (@dicebear/core, @dicebear/collection) - generates SVG avatars from user data

### Backend
- Koa.js framework with TypeScript
- Sequelize ORM with transactions
- JWT auth with access/refresh tokens
- Winston logging, Joi validation
- Error handling: custom middleware + try/catch

#### Sequelize & Migrations
- **CRITICAL**: When adding new fields to models (especially ENUMs), ALWAYS use migrations
- **NEVER rely on sync mode** - Sequelize sync generates invalid SQL for ENUMs with syntax errors like:
  ```sql
  DO 'BEGIN CREATE TYPE "enum_..." AS ENUM(...); END';ALTER TABLE...';
  ```
  (note the incorrect quotes causing position errors)
- Workflow for schema changes:
  1. Create migration file (`src/migrations/YYYYMMDDHHMMSS-description.cjs`)
  2. Test migration with `npm run db:migrate`
  3. Update model TypeScript files
  4. NEVER start server before running migrations
- If Sequelize fails to start with "Database synchronization failed" and SQL syntax errors:
  - Stop the server
  - Run `npm run db:migrate` to apply migrations
  - Then start server
- Common error pattern: `SequelizeDatabaseError: syntax error at or near "END"` means sync tried to create ENUMs - use migrations instead

### Testing
- Vitest framework, mock external deps
- Test structure: `describe`/`it` with `beforeAll`/`afterAll`
- Cover success/error scenarios

#### Test vs Code Modification Guidelines

**General Rule**: Tests should document expected behavior - modify tests to match existing code, not the other way around.

**When to modify TESTS (not code):**
- Tests are outdated/obsolete and don't reflect current requirements
- Tests are too brittle and depend on implementation details
- Code behavior is correct but tests expect wrong format/structure

**When to modify CODE (not tests):**
- **Bugs and logical inconsistencies** discovered during testing
- Example: Controller handles `shareWith` but validation rejects it → fix validation
- Features are implemented but inaccessible due to missing validation/routes
- Security vulnerabilities or performance issues
- Code doesn't match documented specifications

**Decision Process:**
1. Test fails → Is the test correct or the code correct?
2. If test is wrong → modify test
3. If code has a bug/inconsistency → modify code
4. If both are valid but incompatible → clarify specifications first

**Key Principle**: Don't work around bugs in tests - fix the actual bugs!

### Security
- Input validation/sanitization, CORS, helmet middleware
- No secrets in code (use environment variables)
