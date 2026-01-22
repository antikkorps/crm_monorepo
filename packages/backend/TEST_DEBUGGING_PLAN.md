# Plan de Débogage des Tests - OPEx_CRM

## 🎯 Objectif

Résoudre les erreurs de tests identifiées dans la section 27 du plan d'implémentation pour atteindre ~500 tests passants.

---

## 📋 Problèmes Identifiés et Solutions

### **1. Erreurs d'Authentification (27.1) - 91 erreurs "User not found" + 43 erreurs "401 Unauthorized"**

#### **Fichier : `src/__tests__/integration/notes.test.ts`**

**Problème** : Génération de tokens avec objet User complet au lieu de l'ID

```typescript
// ❌ Ligne 120-124 (incorrect)
superAdminToken = AuthService.generateAccessToken(superAdminUser.id)

// ✅ Correction
superAdminToken = AuthService.generateAccessToken(superAdminUser)
teamAdminToken = AuthService.generateAccessToken(teamAdminUser)
regularUserToken = AuthService.generateAccessToken(regularUser)
teamMemberToken = AuthService.generateAccessToken(teamMember)
otherUserToken = AuthService.generateAccessToken(otherUser)
```

#### **Fichier : `src/__tests__/integration/institutions.test.ts`**

**Problème 1** : Rôle `UserRole.ADMIN` n'existe pas

```typescript
// ❌ Ligne 30 (incorrect)
role: UserRole.ADMIN,

// ✅ Correction
role: UserRole.SUPER_ADMIN,
```

**Problème 2** : Gestion d'erreur masquée

```typescript
// ❌ Lignes 42-44 (masque les erreurs)
} catch (error) {
  console.warn("Database not available for integration tests:", error)
}

// ✅ Correction - Ajouter un throw si pas d'erreur de connexion
} catch (error) {
  if (error.message?.includes("connect") || error.message?.includes("ECONNREFUSED")) {
    console.warn("Database not available for integration tests:", error.message)
  } else {
    console.error("Unexpected error during test setup:", error)
    throw error
  }
}
```

#### **Fichier : `src/__tests__/helpers/auth-helpers.ts`**

**Problème** : Utilisation directe de `jwt.sign` au lieu de `AuthService`

```typescript
// ❌ Lignes 25-29 (inconsistant)
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET || "test-jwt-secret",
  { expiresIn: "1h" },
)

// ✅ Correction - Utiliser AuthService pour cohérence
const token = AuthService.generateAccessToken(user)
```

---

### **2. Problèmes de Validation Sequelize (27.2) - 28 erreurs "Validation isIn on role failed"**

#### **Cause** : Utilisation de rôles invalides dans les fixtures de tests

**Solution** : Créer une factory standardisée pour les utilisateurs de test

**Nouveau fichier : `src/__tests__/helpers/user-factory.ts`**

```typescript
import { User, UserRole } from "../../models/User"
import { faker } from "@faker-js/faker"

export interface UserFactoryOptions {
  role?: UserRole
  teamId?: string | null
  isActive?: boolean
  overrides?: Partial<User>
}

export const createTestUser = async (options: UserFactoryOptions = {}) => {
  const { role = UserRole.USER, teamId = null, isActive = true, overrides = {} } = options

  return await User.create({
    email: faker.internet.email(),
    passwordHash: await User.hashPassword("password123"),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role, // ✅ Garantit un rôle valide
    teamId,
    avatarSeed: faker.string.uuid(),
    avatarStyle: "initials",
    isActive,
    ...overrides,
  })
}
```

**Mettre à jour tous les tests pour utiliser cette factory**

---

### **3. Erreurs de Timestamps Null (27.3) - 8 erreurs "notNull Violation: NoteShare.createdAt cannot be null"**

#### **Fichier : `src/models/NoteShare.ts`**

**Problème** : Le modèle ne définit pas correctement `timestamps: true`

**Solution** :

```typescript
// ✅ Assurer que le modèle a timestamps automatiques
NoteShare.init(
  {
    // ... champs
  },
  {
    sequelize,
    tableName: "note_shares",
    timestamps: true, // ✅ Important
    createdAt: "createdAt",
    updatedAt: false, // Si pas de updatedAt
  },
)
```

**Alternative dans les tests** : Ne pas passer `createdAt` manuellement

```typescript
// ❌ Ne pas faire ça
await NoteShare.create({
  createdAt: new Date(), // Peut causer des problèmes
  noteId: note.id,
  userId: user.id,
  permission: SharePermission.READ,
})

// ✅ Faire ça
await NoteShare.create({
  noteId: note.id,
  userId: user.id,
  permission: SharePermission.READ,
  // createdAt sera auto-généré par Sequelize
})
```

---

### **4. Tests ReminderService (27.4) - 9 tests échouent**

#### **Problème** : `createDefaultRules` attend 2 règles mais reçoit 0

**Fichier : `src/__tests__/services/ReminderService.test.ts`**

```typescript
// ✅ S'assurer que les règles par défaut sont créées avant les tests
beforeAll(async () => {
  await ReminderRule.destroy({ where: {} })
  await ReminderService.createDefaultRules() // ✅ Créer les règles
})

// ✅ Vérifier que les règles existent
it("should create default reminder rules", async () => {
  const rules = await ReminderRule.findAll()
  expect(rules).toHaveLength(2) // ✅ Ou le nombre attendu
})
```

---

### **5. Imports de Dépendances (27.5) - Erreurs `Failed to load url koa-router` et `@jest/globals`**

#### **Problème** : Utilisation d'imports Jest au lieu de Vitest

**Fichiers concernés** : Tous les fichiers de test

**Solution** : Remplacer tous les imports

```typescript
// ❌ Incorrect
import { describe, it, expect, beforeAll } from "@jest/globals"

// ✅ Correct
import { describe, it, expect, beforeAll } from "vitest"
```

**Recherche et remplacement global** :

```bash
# Rechercher dans tous les fichiers de test
grep -r "from \"@jest/globals\"" src/__tests__/
```

---

## 🚀 **Script de Correction Automatique**

Créer un script pour appliquer les corrections principales :

**Fichier : `scripts/fix-test-issues.js`**

```javascript
const fs = require("fs")
const path = require("path")

// Correction 1 : Remplacer UserRole.ADMIN par UserRole.SUPER_ADMIN
function fixUserRoleAdmin(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const fixed = content.replace(/UserRole\.ADMIN/g, "UserRole.SUPER_ADMIN")
  fs.writeFileSync(filePath, fixed)
  console.log(`✅ Fixed UserRole.ADMIN in ${filePath}`)
}

// Correction 2 : Remplacer jwt.sign par AuthService.generateAccessToken
function fixJwtSign(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  // Simplifié - à adapter selon le contexte
  const fixed = content.replace(
    /jwt\.sign\([^}]+\}/g,
    "AuthService.generateAccessToken(user.id)",
  )
  fs.writeFileSync(filePath, fixed)
  console.log(`✅ Fixed jwt.sign in ${filePath}`)
}

// Correction 3 : Remplacer @jest/globals par vitest
function fixJestImports(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const fixed = content.replace(/from ["']@jest\/globals["']/g, 'from "vitest"')
  fs.writeFileSync(filePath, fixed)
  console.log(`✅ Fixed Jest imports in ${filePath}`)
}

// Appliquer les corrections
const testFiles = [
  "src/__tests__/integration/institutions.test.ts",
  "src/__tests__/helpers/auth-helpers.ts",
]

testFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    fixUserRoleAdmin(file)
    fixJwtSign(file)
    fixJestImports(file)
  }
})
```

---

## 📊 **Plan d'Exécution**

### **Phase 1 : Corrections Critiques (2-3h)**

1. ✅ Corriger `UserRole.ADMIN` → `UserRole.SUPER_ADMIN`
2. ✅ Corriger `AuthService.generateAccessToken(user)` → `AuthService.generateAccessToken(user.id)`
3. ✅ Remplacer `@jest/globals` par `vitest`
4. ✅ Créer la factory `createTestUser`

### **Phase 2 : Corrections Secondaires (1-2h)**

5. ✅ Corriger les timestamps dans `NoteShare`
6. ✅ Améliorer la gestion d'erreurs dans les tests
7. ✅ Déboguer `createDefaultRules` dans ReminderService

### **Phase 3 : Validation (1h)**

8. ✅ Lancer `npm test` pour vérifier
9. ✅ Lancer `npm run test:coverage` pour mesurer le coverage
10. ✅ Vérifier qu'on atteint >70% coverage

---

## 🎯 **Résultat Attendu**

Après ces corrections :

- **~500 tests passants** (vs 325 actuels)
- **Coverage >70%** (seuil requis)
- **0 erreurs d'authentification**
- **0 erreurs de validation Sequelize**
- **Tests cohérents et maintenables**

---

## 🔧 **Commandes de Test**

```bash
# Lancer tous les tests
npm test

# Lancer avec coverage
npm run test:coverage

# Lancer en mode watch pour déboguer
npm run test:watch

# Lancer un fichier spécifique
npx vitest run src/__tests__/integration/notes.test.ts
```

---

## 📌 **Prochaines Étapes**

1. **Appliquer les corrections** ci-dessus
2. **Exécuter les tests** pour valider
3. **Corriger les erreurs restantes** si nécessaire
4. **Atteindre l'objectif de 500 tests passants**

**Estimation totale** : **6-9h** pour compléter le débogage et atteindre les objectifs de qualité.
