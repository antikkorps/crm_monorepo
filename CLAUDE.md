# CLAUDE.md - Development Guidelines

## 📋 Purpose

This document provides essential guidelines and conventions for Claude AI sessions working on this CRM monorepo. It ensures consistency, maintainability, and quality across all development work.

---

## 🏗️ Architecture Overview

### Monorepo Structure

```
crm_monorepo/
├── packages/
│   ├── backend/          # Node.js/Koa API server
│   ├── frontend/         # Vue 3 + Vuetify SPA
│   └── shared/           # Shared TypeScript types and utilities
└── TODOS/specs/modern-crm/tasks.md  # Central task tracking
```

### Tech Stack

- **Backend**: Node.js, Koa, Sequelize, PostgreSQL, TypeScript
- **Frontend**: Vue 3, Vuetify 3, Pinia, TypeScript, Vite
- **Shared**: TypeScript types, Zod validators
- **Testing**: Vitest (both frontend and backend)
- **Database**: PostgreSQL with Sequelize ORM
- **i18n**: Vue I18n for internationalization

---

## 🎯 Core Development Principles

### 1. DRY (Don't Repeat Yourself)

- **Reuse existing components** before creating new ones
- **Extract common logic** into services or utilities
- **Share types** via the `@medical-crm/shared` package
- **Create composables** for reusable Vue logic

**Example:**

```typescript
// ❌ BAD: Duplicating API call logic
const deleteUser = async (id: string) => {
  await apiClient.delete(`/users/${id}`)
}
const deleteInstitution = async (id: string) => {
  await apiClient.delete(`/institutions/${id}`)
}

// ✅ GOOD: Generic delete function
const deleteEntity = async (endpoint: string, id: string) => {
  await apiClient.delete(`/${endpoint}/${id}`)
}
```

### 2. Comments in English, UI in i18n

- **All code comments MUST be in English**
- **UI labels and user-facing text MUST use i18n** (`t('key')`)
- **Never hardcode user-facing text** in French or any language
- This includes: inline comments, JSDoc, TODO comments, function descriptions

**Example:**

```vue
<template>
  <!-- ✅ GOOD: Using i18n -->
  <v-btn @click="deleteTeam">
    {{ t("teams.delete") }}
  </v-btn>

  <!-- ❌ BAD: Hardcoded French text -->
  <v-btn @click="deleteTeam"> Supprimer l'équipe </v-btn>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"

const { t } = useI18n()

// ✅ GOOD: English comments
/**
 * Lock an institution when a note is created
 * This prevents external systems from overwriting CRM-enriched data
 */
const lockInstitution = async (id: string) => {
  // Lock with appropriate reason
  await institutionsApi.update(id, {
    isLocked: true,
    lockedReason: "note_created",
  })
}

// ❌ BAD: French comments
/**
 * Verrouille une institution quand une note est créée
 */
</script>
```

**Backend error messages:**

```typescript
// ✅ GOOD: User-facing errors in French (they are already localized)
throw createError(
  "Impossible de supprimer définitivement cette institution. Elle contient des données enrichies CRM.",
  403,
  "LOCKED_INSTITUTION_DELETE_FORBIDDEN"
)

// ✅ GOOD: Log messages in English
logger.error("Failed to delete locked institution", {
  institutionId: id,
  isLocked: true,
})
```

### 3. Testing is Mandatory

- **Every new feature MUST have tests**
- **Every bug fix MUST include a regression test**
- Minimum coverage: Unit tests for models/services, integration tests for API endpoints

**Test Structure:**

```typescript
// Unit test example
describe("MedicalInstitution Model", () => {
  describe("Auto-lock mechanism", () => {
    it("should lock institution when manually created", async () => {
      const institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: "hospital",
        // ...
      })

      expect(institution.isLocked).toBe(true)
      expect(institution.lockedReason).toBe("manual_creation")
    })
  })
})
```

---

## 📝 Code Conventions

### TypeScript

- **Strict mode enabled** - No `any` types except for justified cases
- **Explicit return types** for public functions
- **Interface over type** for object shapes (better for extension)
- **Use Zod** for runtime validation

### Vue Components

- **Composition API** (script setup) - No Options API
- **TypeScript** - All new components must use `<script setup lang="ts">`
- **Props & Emits** - Define with TypeScript interfaces
- **i18n** - Use `useI18n()` composable for all user-facing text

```vue
<script setup lang="ts">
import { useI18n } from "vue-i18n"

const { t } = useI18n()

interface Props {
  modelValue: boolean
  team: Team | null
}

interface Emits {
  (e: "update:modelValue", value: boolean): void
  (e: "team-updated", team: Team): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>
```

### Naming Conventions

- **Files**: PascalCase for components (`TeamCard.vue`), kebab-case for utilities (`api-client.ts`)
- **Components**: PascalCase (`DataSourceBadge`)
- **Functions/Methods**: camelCase (`loadInstitutions`, `deleteTeam`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`MedicalInstitution`, `TeamMember`)
- **i18n keys**: dot notation (`teams.delete`, `institutions.confirmDelete`)

---

## 🗄️ Database & ORM

### Migrations

- **Always create migrations** for schema changes
- **Never modify models without a corresponding migration**
- **Use raw SQL** for complex migrations (enum changes, data migrations)
- **Include both up and down migrations**

**Migration naming:**

```
YYYYMMDDHHMMSS-descriptive-name.cjs
Example: 20251224000000-add-multi-source-tracking.cjs
```

### Sequelize Hooks

- **Use hooks for business logic** that should always apply (auto-lock, audit trails)
- **Pass context** to skip hooks when needed (e.g., `{ context: { isSync: true } }`)
- **Document hook behavior** in model files

```typescript
// Example: Auto-lock on manual creation
MedicalInstitution.addHook("afterCreate", async (institution, options) => {
  // Skip auto-lock if this is a sync operation
  if (options.context?.isSync) {
    return
  }

  // Lock the institution as it was manually created
  await institution.update({
    isLocked: true,
    lockedAt: new Date(),
    lockedReason: "manual_creation",
  })
})
```

---

## 🔒 Security & Data Protection

### Multi-Source Data Tracking

The CRM uses a **multi-source tracking system** to protect manually enriched data:

**Key Concepts:**

- `dataSource`: Origin of the data (`crm`, `digiforma`, `sage`, `import`) - NEVER changes
- `isLocked`: Boolean indicating CRM has taken ownership
- `lockedReason`: Why it was locked (`manual_creation`, `manual_edit`, `note_created`, `meeting_created`)
- `externalData`: JSONB field storing raw external data (read-only during syncs)

**Rules:**

1. When `isLocked: true`, external syncs can ONLY update `externalData`, never CRM fields
2. Hooks automatically lock entities on manual creation/edit or when notes/meetings are added
3. Locked entities can be soft-deleted but NOT hard-deleted (data protection)

**Example:**

```typescript
// In sync service
if (institution.isLocked) {
  // Only update metadata, preserve CRM data
  await institution.update(
    {
      externalData: {
        ...institution.externalData,
        digiforma: digiformaData,
      },
      lastSyncAt: { digiforma: new Date() },
    },
    { context: { isSync: true } }
  )
} else {
  // Full update allowed
  await institution.update(
    {
      ...crmFields,
      externalData: { digiforma: digiformaData },
    },
    { context: { isSync: true } }
  )
}
```

### Soft Delete Pattern

- **Prefer soft delete** (`isActive: false`) over hard delete
- **Hard delete only allowed** for non-locked entities
- **Double confirmation** required for permanent deletion

---

## 🎨 UI/UX Guidelines

### Vuetify Components

- **Use Vuetify's built-in components** - Don't reinvent the wheel
- **Consistent spacing**: Use Vuetify's spacing system (`pa-4`, `mb-6`, etc.)
- **Responsive**: Always test mobile views (`d-md-block`, `d-none d-md-flex`)

### User Feedback

- **Loading states** for all async operations
- **Success/Error messages** using Snackbar with i18n
- **Confirmation dialogs** for destructive actions
- **Tooltips** for complex features or icons

### Accessibility

- **Proper ARIA labels** for icon-only buttons
- **Keyboard navigation** support
- **Color contrast** compliance
- **Screen reader** friendly

---

## 🌍 Internationalization (i18n)

### Using i18n in Vue Components

```vue
<template>
  <!-- Simple translation -->
  <h1>{{ t("dashboard.title") }}</h1>

  <!-- Translation with parameters -->
  <p>{{ t("institutions.deleteConfirmMessage", { name: institution.name }) }}</p>

  <!-- Plural forms -->
  <span>{{ t("teams.memberCount", team.members.length) }}</span>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"

const { t } = useI18n()
</script>
```

### Translation File Structure

```
frontend/src/locales/
├── fr.json          # French translations (default)
├── en.json          # English translations
```

### Best Practices

- **Organize keys by feature**: `teams.create`, `teams.edit`, `teams.delete`
- **Use descriptive keys**: `institutions.confirmDelete` not `msg1`
- **Provide context in parameters**: `{ name, count }` not `{ 0, 1 }`
- **Keep translations close to usage**: Group related keys together

---

## 📦 API Design

### RESTful Endpoints

```
GET    /api/resources          - List all
GET    /api/resources/:id      - Get one
POST   /api/resources          - Create
PUT    /api/resources/:id      - Update
DELETE /api/resources/:id      - Delete
```

### Response Format

All API responses follow this structure:

```typescript
{
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
    }
  }
}
```

### Error Handling

- Use **semantic HTTP status codes** (400, 401, 403, 404, 500)
- Include **clear error messages** in French for user-facing errors
- Log **detailed error context** in English for debugging

---

## 🧪 Testing Strategy

### Test Organization

```
src/__tests__/
├── models/              # Unit tests for Sequelize models
├── services/            # Unit tests for business logic
├── controllers/         # Unit tests for API controllers
├── integration/         # Integration tests (API + DB)
└── middleware/          # Middleware tests
```

### What to Test

1. **Models**: Hooks, validations, methods, associations
2. **Services**: Business logic, data transformations, external API calls
3. **Controllers**: Request validation, response formatting, error handling
4. **Integration**: Full request-response cycles, permissions, data flow

### Test Best Practices

- **Use descriptive test names** - `it('should lock institution when note is created')`
- **Arrange-Act-Assert** pattern
- **Mock external dependencies** (APIs, email service, etc.)
- **Clean up after tests** - Reset DB state between tests
- **Test in English** - All test descriptions and assertions in English

---

## 📚 Documentation

### When to Update TODOS/specs/modern-crm/tasks.md

- **After completing a feature** - Mark tasks as done with ✅
- **When discovering new work** - Add new tasks with detailed descriptions
- **After major decisions** - Document architecture choices and reasoning
- **When fixing bugs** - Add section explaining the fix and root cause

### Code Documentation

- **Complex algorithms**: Add block comments explaining the logic
- **Public APIs**: Use JSDoc with parameter descriptions and examples
- **Hooks and lifecycle**: Document when and why they run
- **Business rules**: Explain the "why" not just the "what"
- **Always in English**

---

## 🚀 Deployment

### Railway Configuration

- **Migrations run automatically** on deployment via `nixpacks.toml`
- **Environment variables** must be set in Railway dashboard
- **Database backups** are handled by Railway
- **Logs** available via Railway CLI or dashboard

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Migrations tested locally
- [ ] Environment variables documented
- [ ] Breaking changes communicated
- [ ] CLAUDE.md and tasks.md updated
- [ ] i18n keys added for new features

---

## 🔄 Git Workflow

### Commit Messages

Follow conventional commits format:

```
feat: add team member management UI
fix: correct auto-lock trigger on note creation
docs: update CLAUDE.md with testing guidelines
refactor: extract common dialog logic
test: add integration tests for sync service
i18n: add French translations for team management
```

### Branch Strategy

- `main` - Production-ready code
- Feature branches - `feature/team-member-management`
- Bug fixes - `fix/auto-lock-issue`

---

## 💡 Quick Reference

### Common Tasks

**Create a new API endpoint:**

1. Add route in `src/routes/`
2. Create controller method
3. Add service method if needed
4. Update shared types
5. Write integration test
6. Update tasks.md

**Add a new Vue component:**

1. Create component in appropriate directory
2. Define Props/Emits with TypeScript
3. Use Composition API (script setup)
4. Use i18n for all user-facing text
5. Add to parent component
6. Test in browser
7. Update tasks.md if feature complete

**Modify database schema:**

1. Create migration file with timestamp
2. Update Sequelize model
3. Update shared TypeScript types
4. Test migration up AND down
5. Update tasks.md

**Add new user-facing text:**

1. Add key to `frontend/src/locales/fr.json`
2. Use `t('key')` in component
3. Test that translation displays correctly
4. Add English translation in `en.json` (optional but recommended)

**Fix a bug:**

1. Write failing test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Update tasks.md with root cause explanation
5. Commit with `fix:` prefix

---

## 📞 Getting Help

### Resources

- **Tasks documentation**: `TODOS/specs/modern-crm/tasks.md`
- **Security audit**: `SECURITY_AUDIT.md`
- **Sequelize docs**: https://sequelize.org/
- **Vue 3 docs**: https://vuejs.org/
- **Vuetify 3 docs**: https://vuetifyjs.com/
- **Vue I18n docs**: https://vue-i18n.intlify.dev/

### Common Issues

- **Migration fails**: Check if column/table already exists
- **Hook not firing**: Verify context is not skipping it
- **Type errors**: Ensure shared package is built (`npm run build -w @medical-crm/shared`)
- **Frontend not updating**: Clear vite cache (`rm -rf node_modules/.vite`)
- **i18n key not found**: Check spelling and that key exists in locale file

---

## 🎯 Current Priorities

**Active Work (as of 2025-12-24):**

1. ✅ Multi-source data tracking and auto-lock (COMPLETE)
2. ✅ Team management dialogs (COMPLETE)
3. ✅ Inactive institutions management (COMPLETE)
4. 📋 Team member management UI (TO DO)
5. 📋 Auto-lock protection tests (TO DO)

**See `TODOS/specs/modern-crm/tasks.md` section 31 for detailed status.**

---

_Last updated: 2025-12-24_
_Maintained by: Claude AI sessions_
