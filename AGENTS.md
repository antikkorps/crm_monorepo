# Agent Guidelines for Medical CRM Monorepo

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

### Testing
- Vitest framework, mock external deps
- Test structure: `describe`/`it` with `beforeAll`/`afterAll`
- Cover success/error scenarios

### Security
- Input validation/sanitization, CORS, helmet middleware
- No secrets in code (use environment variables)
