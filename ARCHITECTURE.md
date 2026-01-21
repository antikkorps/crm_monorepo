# OPEx_CRM - Architecture Documentation

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture générale](#architecture-générale)
- [Backend](#backend)
- [Frontend](#frontend)
- [Base de données](#base-de-données)
- [Sécurité](#sécurité)
- [Intégrations](#intégrations)
- [Déploiement](#déploiement)

---

## Vue d'ensemble

OPEx_CRM est une application de gestion de relation client spécialement conçue pour les professionnels de l'audit médical. Le système permet de gérer les institutions médicales (hôpitaux, cliniques), les contacts, la facturation, et intègre des sources de revenus multiples (Audit et Formation via Digiforma).

### Principes architecturaux

- **Monorepo** : Organisation modulaire avec packages séparés
- **TypeScript** : Typage fort sur frontend et backend
- **API REST** : Communication stateless entre frontend et backend
- **RBAC** : Système de permissions basé sur les rôles
- **Scalabilité** : Architecture permettant l'ajout de nouveaux modules

---

## Architecture générale

```
crm_monorepo/
├── packages/
│   ├── backend/          # API Koa.js + Sequelize
│   ├── frontend/         # Vue 3 + Vuetify
│   ├── shared/           # Types et utilitaires partagés
│   └── plugins/          # Système de plugins (futurs)
├── docker-compose.yml    # PostgreSQL containerisé
└── package.json          # Scripts Lerna
```

### Stack technologique

| Couche               | Technologies                              |
| -------------------- | ----------------------------------------- |
| **Frontend**         | Vue 3, Vuetify 3, Pinia, TypeScript, Vite |
| **Backend**          | Koa.js, Sequelize, PostgreSQL, Socket.io  |
| **Base de données**  | PostgreSQL 15                             |
| **Build**            | Lerna (monorepo), TypeScript, ESBuild     |
| **Conteneurisation** | Docker, Docker Compose                    |

---

## Backend

### Structure des dossiers

```
packages/backend/src/
├── config/               # Configuration (DB, logger, etc.)
├── controllers/          # Logique métier des endpoints
├── middleware/           # Middlewares Koa (auth, RBAC, etc.)
├── models/               # Modèles Sequelize
├── routes/               # Définition des routes API
├── services/             # Services métier réutilisables
├── utils/                # Utilitaires (logger, email, etc.)
└── app.ts                # Point d'entrée Koa
```

### Modèles de données

#### Modèles principaux

- **User** : Utilisateurs du système avec rôles
- **MedicalInstitution** : Institutions médicales (hôpitaux, cliniques)
- **ContactPerson** : Contacts au sein des institutions
- **Task** : Tâches et activités
- **Quote** : Devis
- **Invoice** : Factures avec statuts et paiements
- **Payment** : Paiements associés aux factures
- **InvoiceTemplate** : Modèles de factures personnalisables
- **Webhook** : Configuration des webhooks sortants
- **Segment** : Segmentation avancée des institutions

#### Modèles Digiforma (intégration Formation)

- **DigiformaSettings** : Configuration de l'intégration
- **DigiformaSync** : Historique des synchronisations
- **DigiformaCompany** : Entreprises Digiforma liées aux institutions
- **DigiformaContact** : Contacts Digiforma
- **DigiformaQuote** : Devis Formation
- **DigiformaInvoice** : Factures Formation

### Services clés

#### ConsolidatedRevenueService

Calcule le chiffre d'affaires consolidé en agrégeant :

- **Audit** : Factures CRM (Invoice)
- **Formation** : Factures Digiforma (DigiformaInvoice)
- **Autre** : Sources additionnelles (placeholder)

```typescript
// Exemple d'utilisation
const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(
  institutionId,
  startDate,
  endDate
)

// Retourne :
{
  audit: { totalRevenue, paidRevenue, unpaidRevenue, invoiceCount },
  formation: { totalRevenue, paidRevenue, unpaidRevenue, invoiceCount },
  other: { totalRevenue, paidRevenue, unpaidRevenue, invoiceCount },
  total: { totalRevenue, paidRevenue, unpaidRevenue }
}
```

#### DigiformaSyncService

Orchestre la synchronisation avec l'API Digiforma :

1. Récupération des données (companies, contacts, quotes, invoices)
2. Création/mise à jour dans la base locale
3. Merge intelligent avec les institutions CRM (par email)
4. Tracking détaillé (compteurs, erreurs, durée)

#### InvoiceService

Gestion complète du cycle de vie des factures :

- Génération depuis devis ou nouvelle création
- Calculs automatiques (taxes, totaux)
- Mise à jour des statuts selon paiements
- Export PDF avec templates personnalisables

### Authentification & Autorisations

#### JWT Authentication

- Token JWT stocké en cookie HTTP-only
- Refresh token pour renouvellement automatique
- Middleware `authenticate` pour protéger les routes

#### RBAC (Role-Based Access Control)

Permissions granulaires par rôle :

```typescript
enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  AUDITOR = "auditor",
  VIEWER = "viewer",
}

// Exemples de permissions
canCreateInvoice // Créer des factures
canViewAllInstitutions // Voir toutes les institutions
canManageSystemSettings // Gérer les paramètres système
canViewInstitutionAnalytics // Voir les analytics
```

Middleware `requirePermissions` pour contrôler l'accès :

```typescript
router.get(
  "/invoices",
  authenticate,
  requirePermissions("canViewInvoices"),
  InvoiceController.list,
)
```

### API REST

#### Convention de nommage

- **GET** `/api/resource` - Liste
- **GET** `/api/resource/:id` - Détail
- **POST** `/api/resource` - Création
- **PUT** `/api/resource/:id` - Mise à jour complète
- **PATCH** `/api/resource/:id` - Mise à jour partielle
- **DELETE** `/api/resource/:id` - Suppression

#### Groupes de routes

| Préfixe             | Description                               |
| ------------------- | ----------------------------------------- |
| `/api/auth`         | Authentification (login, logout, refresh) |
| `/api/users`        | Gestion utilisateurs                      |
| `/api/institutions` | Institutions médicales                    |
| `/api/contacts`     | Contacts                                  |
| `/api/tasks`        | Tâches                                    |
| `/api/quotes`       | Devis                                     |
| `/api/invoices`     | Factures                                  |
| `/api/payments`     | Paiements                                 |
| `/api/templates`    | Templates de factures                     |
| `/api/webhooks`     | Webhooks                                  |
| `/api/segments`     | Segmentation                              |
| `/api/digiforma`    | Intégration Digiforma                     |
| `/api/revenue`      | Revenus consolidés                        |

#### Réponses standardisées

**Succès :**

```json
{
  "success": true,
  "data": { ... }
}
```

**Erreur :**

```json
{
  "success": false,
  "error": {
    "message": "Description de l'erreur",
    "code": "ERROR_CODE"
  }
}
```

---

## Frontend

### Structure des dossiers

```
packages/frontend/src/
├── assets/              # Images, styles globaux
├── components/          # Composants Vue réutilisables
│   ├── common/          # Composants génériques (boutons, etc.)
│   ├── dashboard/       # Widgets dashboard
│   ├── institutions/    # Composants institutions
│   ├── layout/          # Layout (AppLayout, sidebar)
│   └── ...
├── i18n/                # Traductions (FR/EN)
├── router/              # Configuration Vue Router
├── services/            # Couche API
│   └── api/             # Clients API par domaine
├── stores/              # Stores Pinia
├── views/               # Pages/vues principales
└── App.vue              # Composant racine
```

### Architecture des composants

#### Composants de layout

- **AppLayout.vue** : Layout principal avec sidebar, topbar, navigation
- **Sidebar** : Navigation organisée en dropdowns (Main, Billing, Contacts, Config)

#### Composants métier

**Institutions**

- `InstitutionDetailView.vue` : Vue détaillée avec onglets (Aperçu, Profil Médical, Contacts, Revenus, Digiforma)
- `RevenueTab.vue` : Onglet revenus consolidés (Audit + Formation + Autre)
- `DigiformaTab.vue` : Onglet données Digiforma (CA Formation, devis, factures)

**Dashboard**

- `DashboardView.vue` : Tableau de bord principal
- `ConsolidatedRevenueWidget.vue` : Widget CA consolidé avec graphiques

**Settings**

- `DigiformaSettingsView.vue` : Configuration Digiforma (token, sync, historique)

### State Management (Pinia)

Stores principaux :

- **authStore** : Authentification, utilisateur courant, permissions
- **institutionStore** : Cache des institutions
- **notificationStore** : Notifications temps réel

### Services API

Organisation par domaine fonctionnel :

```typescript
// packages/frontend/src/services/api/
export const institutionsApi = {
  list: (params) => apiRequest("/institutions", { params }),
  get: (id) => apiRequest(`/institutions/${id}`),
  create: (data) => apiRequest("/institutions", { method: "POST", body: data }),
  // ...
}

export const digiformaApi = {
  settings: { getSettings, updateSettings, testConnection },
  sync: { triggerSync, getStatus, getHistory },
  data: { getInstitutionQuotes, getInstitutionInvoices },
  revenue: { getInstitutionRevenue, getGlobalRevenue, getRevenueEvolution },
}
```

### Internationalisation (i18n)

Langues supportées : Français (FR) et Anglais (EN)

```
packages/frontend/src/i18n/locales/
├── fr.json              # Traductions françaises
└── en.json              # Traductions anglaises
```

Utilisation dans les composants :

```vue
<template>
  <h1>{{ $t("navigation.dashboard") }}</h1>
</template>
```

### Routing

Routes organisées par domaine :

```typescript
routes = [
  { path: "/", name: "Landing" },
  { path: "/login", name: "Login" },
  { path: "/dashboard", name: "Dashboard", meta: { requiresAuth: true } },
  { path: "/institutions", name: "MedicalInstitutions" },
  { path: "/institutions/:id", name: "InstitutionDetail" },
  { path: "/quotes", name: "Quotes" },
  { path: "/invoices", name: "Invoices" },
  { path: "/settings/digiforma", name: "DigiformaSettings" },
  // ...
]
```

Navigation guard pour authentification :

```typescript
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: "Login", query: { redirect: to.fullPath } })
  } else {
    next()
  }
})
```

---

## Base de données

### Schéma relationnel

```
┌─────────────┐         ┌──────────────────┐         ┌───────────────┐
│    User     │         │ MedicalInstitution│◄────────│ ContactPerson │
└─────────────┘         └──────────────────┘         └───────────────┘
       │                         │                            │
       │                         │                            │
       │                         ▼                            │
       │                  ┌──────────┐                        │
       └─────────────────►│   Task   │                        │
                          └──────────┘                        │
                                 │                            │
                          ┌──────────┐                        │
                          │  Quote   │                        │
                          └──────────┘                        │
                                 │                            │
                          ┌──────────┐         ┌──────────┐  │
                          │ Invoice  │────────►│ Payment  │  │
                          └──────────┘         └──────────┘  │
                                 │                            │
                          ┌─────────────────┐                │
                          │DigiformaInvoice │                │
                          └─────────────────┘                │
                                 │                            │
                          ┌─────────────────┐                │
                          │DigiformaCompany │────────────────┘
                          └─────────────────┘
                                 │
                          ┌─────────────────┐
                          │DigiformaContact │
                          └─────────────────┘
```

### Conventions de nommage

- **Tables** : snake_case (ex: `medical_institutions`)
- **Colonnes** : snake_case (ex: `institution_id`)
- **Foreign Keys** : `{table}_id` (ex: `user_id`)
- **Timestamps** : `created_at`, `updated_at`

### Index

Index critiques pour performance :

- `medical_institutions(name)` - Recherche par nom
- `contact_persons(email)` - Recherche par email
- `invoices(institution_id, status)` - Liste factures par institution
- `digiforma_companies(digiforma_id)` - UNIQUE, sync
- `digiforma_invoices(institution_id)` - CA Formation

### Migrations

Gestion via Sequelize CLI :

```bash
# Créer une migration
npx sequelize-cli migration:generate --name add-digiforma-tables

# Exécuter les migrations
npm run db:migrate

# Rollback
npm run db:migrate:undo
```

---

## Sécurité

### Authentification

- **JWT** stocké en cookie HTTP-only
- Expiration courte (1h) avec refresh token
- CSRF protection via SameSite cookies

### Autorisations

- **RBAC** granulaire par rôle utilisateur
- Permissions vérifiées côté backend sur chaque endpoint
- Frontend adapte l'UI selon permissions

### Protection des données sensibles

- **Mots de passe** : hashés avec bcrypt (salt rounds: 10)
- **Tokens API** (Digiforma) : encodés en base64, stockés en DB
- **Logs** : informations sensibles masquées

### CORS

Configuration stricte en production :

```typescript
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)
```

### Rate Limiting

À implémenter : limitation des requêtes par IP/utilisateur pour prévenir abus.

---

## Intégrations

### Digiforma (Formation)

**Documentation complète** : voir [DIGIFORMA.md](packages/backend/DIGIFORMA.md)

#### Architecture

- **6 modèles** : Settings, Sync, Company, Contact, Quote, Invoice
- **3 services** : DigiformaService (client GraphQL), DigiformaSyncService (orchestration), ConsolidatedRevenueService (agrégation CA)
- **API GraphQL** : https://app.digiforma.com/api/v1/graphql

#### Flux de synchronisation

1. **Déclenchement** : Manuel ou automatique (hebdomadaire)
2. **Récupération** : Appels GraphQL pour companies, contacts, quotes, invoices
3. **Persistance** : Insertion/update dans tables `digiforma_*`
4. **Merge** : Liaison avec `medical_institutions` par email
5. **Reporting** : Stats détaillées (synced, created, updated, errors)

#### Calcul du CA consolidé

```typescript
ConsolidatedRevenueService.getInstitutionRevenue(institutionId, startDate, endDate)
```

Agrège :

- **Audit** : `invoices` (CRM) → total, paidRevenue, unpaidRevenue
- **Formation** : `digiforma_invoices` → totalAmount, paidAmount
- **Total** : Somme Audit + Formation + Autre

### Webhooks (sortants)

Système de webhooks pour notifier systèmes externes :

**Événements supportés :**

- `invoice.created`
- `invoice.updated`
- `invoice.paid`
- `quote.created`
- `institution.created`

**Configuration :**

- URL cible
- Secret pour signature HMAC
- Filtres d'événements
- Retry automatique sur échec

---

## Déploiement

### Environnements

| Environnement   | Description                          |
| --------------- | ------------------------------------ |
| **Development** | Local, Docker Compose, hot reload    |
| **Staging**     | Environnement de test pré-production |
| **Production**  | Environnement production             |

### Variables d'environnement

#### Backend (.env)

```bash
# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/medical_crm
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=medical_crm
DATABASE_USER=user
DATABASE_PASSWORD=password

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Server
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://localhost:3000

# Digiforma
DIGIFORMA_API_URL=https://app.digiforma.com/api/v1/graphql

# Email (optionnel)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=password
```

#### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3001
VITE_APP_TITLE=OPEx_CRM
```

### Build & Déploiement

#### Build production

```bash
# Build tous les packages
npm run build

# Build backend uniquement
cd packages/backend && npm run build

# Build frontend uniquement
cd packages/frontend && npm run build
```

#### Docker (recommandé)

```bash
# Démarrer PostgreSQL
npm run docker:up

# Démarrer toute la stack (à configurer)
docker-compose up -d
```

#### Déploiement manuel

1. **Backend** : Build + déployer sur serveur Node.js
2. **Frontend** : Build + déployer sur CDN/serveur static
3. **Base de données** : PostgreSQL managé ou self-hosted

---

## Bonnes pratiques

### Code Style

- **TypeScript strict** : `strict: true` dans tsconfig.json
- **ESLint** : Configuration partagée
- **Prettier** : Formatage automatique

### Git Workflow

```bash
main              # Production
├── develop       # Intégration
│   ├── feature/* # Nouvelles fonctionnalités
│   ├── bugfix/*  # Corrections de bugs
│   └── hotfix/*  # Corrections urgentes
```

### Commits

Convention : `type(scope): message`

```
feat(digiforma): add consolidated revenue calculation
fix(invoices): correct payment status update
docs(readme): update installation instructions
refactor(auth): simplify JWT middleware
```

### Code Review

- Revue obligatoire avant merge sur `develop` ou `main`
- Tests unitaires pour nouvelles fonctionnalités
- Documentation mise à jour

---

## Monitoring & Logs

### Logger

Winston configuré avec niveaux :

- **error** : Erreurs critiques
- **warn** : Avertissements
- **info** : Informations générales
- **debug** : Debug détaillé

```typescript
logger.info("Sync completed", {
  syncId: sync.id,
  duration: sync.duration,
  itemsSynced: sync.companiesSynced,
})
```

### Logs structurés

Format JSON pour parsing facile :

```json
{
  "timestamp": "2025-09-30T20:00:00.000Z",
  "level": "info",
  "service": "medical-crm-backend",
  "message": "Sync completed",
  "syncId": "uuid",
  "duration": 12345
}
```

---

## Roadmap & Améliorations futures

### Tests

- [ ] Tests unitaires backend (Jest)
- [ ] Tests unitaires frontend (Vitest)
- [ ] Tests e2e (Playwright/Cypress)
- [ ] Tests d'intégration API

### Performance

- [ ] Cache Redis pour sessions et queries fréquentes
- [ ] Optimisation queries Sequelize (eager loading)
- [ ] Pagination généralisée
- [ ] Compression gzip/brotli

### Fonctionnalités

- [ ] Notifications email automatiques
- [ ] Export Excel avancé
- [ ] Dashboard analytics temps réel
- [ ] Mobile app (React Native/Flutter)

### Infrastructure

- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring (Sentry, DataDog)
- [ ] Backups automatiques DB
- [ ] CDN pour assets frontend

### Documentation

- [ ] Swagger/OpenAPI pour API
- [ ] Storybook pour composants
- [ ] Guides utilisateur
- [ ] Architecture Decision Records (ADR)

---

## Contributeurs

Ce projet est maintenu par l'équipe OPEx_CRM.

Pour toute question : [contact@medical-crm.example.com](mailto:contact@medical-crm.example.com)

---

## Licence

Private - All rights reserved
