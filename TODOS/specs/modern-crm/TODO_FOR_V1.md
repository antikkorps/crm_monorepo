# TODO TO V1.1

## References

```bash
TODOS/specs/modern-crm/tasks.md
```

## deployment done

- [x] 2026-01-08: v1 is deployed

## date: 2026-01-14

### Context

we are almost done to v1 but still have some elements to prepare

### TODO

- [x] In institution timeline add lazy-loading of timeline (+ i18n complet + filtres corrigés + indicateurs de pagination)
- [x] "Se souvenir de moi" on login page (make it useful)
- [ ] correct the tests which are not passing (mock database connexions in order to not have to set up a test database)
- [ ] Search functionnality to set up (meilisearch dockerize? which is best option ?)
- [x] component back to dashboard to implement on all pages (ajouté dans AppLayout.vue - breadcrumb visible quand sidebar fermée, affiche le titre de la page courante)
- [x] missing translation in fr.json for TeamActivityFeed.vue
- [x] It seems that there is an issue with socket.io for the notifications (debug => one task with an issue tomorrow not appearing in notification center)
- [x] While adding a team member to a team, before typing it loads a list with every user... a bit confusing before typing
- [x] Polish some style in creating invoice and quotes => specifically the catalogue background color which is not very beautiful (fixed: gradient background + modern header styling)
- [x] A validation message for the resetting password is perhaps not the best option. We should validate live during the user typing and live comparing the two inputs...
- [x] SQL Error on /billing/analytics (fixed with migration + SQL query correction)
- [ ] Tests: Protection auto-lock (task 31.3 from tasks.md) - Ensure data protection system reliability
- [ ] Test: Import institution via Excel (vérifier le fonctionnement de l'import)
- [x] Fix: Dashboard team card click not working (SCSS build error in AddTeamMemberDialog.vue and TeamMemberCard.vue - converted to CSS)
- [x] Verify production monitoring and logging configuration (from task 19.2) - AlertService créé pour envoyer des emails d'alerte sur les erreurs 5xx à ADMIN_EMAIL (throttling inclus)
- [x] action type verification failed due to missing share folder (fixed: CI now builds shared package before type-check)
- [x] erreur lors de la récupération du catalogue d'articles (fixed with migration + SQL query correction)
- [x] UserProfileForm => integrate i18n and traduction. Ensure that it checks the user's rights to create or update a user + ts_errors. (i18n complet, validation mot de passe réactive, confirmation mot de passe, affichage avatar réel en édition)
- [x] Users management: nouvelle vue /users avec table desktop/cartes mobile, actions (éditer, inviter, reset password, activer/désactiver, supprimer), système d'invitation par email
- [x] Segmentation: polish UX et expérience utilisateur
  - [x] SavedSegmentsManager: fix search field and reload button alignment (desktop + mobile responsive)
  - [x] SavedSegmentsManager: refactor bulk actions bar (floating card instead of bottom sheet, X button clears selection, mobile-first design with icon-only buttons on small screens)
  - [x] SavedSegmentsManager: reduce padding on mobile, shorter button text ("Nouveau segment" on mobile)
  - [x] SegmentAnalyticsDashboard: fix metric cards overflow (1 col mobile, 2 cols tablet/md, 4 on lg), fix time filter visibility on mobile
  - [x] SegmentationView: add margin-top on create button (mobile only)
  - [x] Vérifier le bon fonctionnement général de la segmentation (nettoyage code mort: vennDiagram, attributeChart stub, fix compteur segments)
- [x] in the sell pipeline the dropdown which is supposed to show the medical institutions is not working (no data available) - Fixed: load 20 institutions on focus + hint message
- [x] Export opportunities to CSV/XLSX/JSON + Stats by collaborator display in OpportunitiesView + ExportCenter integration
- [x] Fix: OpportunitiesView responsive layout (mobile-first) - removed min-width constraints causing overflow, fixed pipeline columns (4 cols desktop, 2 tablet, 1 mobile)
- [x] Fix: Export invalid file - generateXLSX was returning empty buffer for empty data, now returns valid empty workbook
- [x] Fix: PDF generation error without template - now returns clear user message instead of crashing (422 status with "Aucun modèle de document n'est configuré...")

### Decision

---

## Feature: Lettres de Mission (Engagement Letters)

### Context

Les audits ne fonctionnent pas toujours avec des devis mais avec des **lettres de mission**.
C'est un document contractuel qui définit le périmètre, les livrables et les conditions d'une mission d'audit/conseil.

### Architecture Decision

**Option retenue : Nouveau modèle séparé (Option B)**

Raisons :
- Plus propre et maintenable
- Évite de polluer le modèle Quote
- Workflow potentiellement différent (pas de conversion directe en facture)
- Champs spécifiques mission (scope, livrables, durée estimée)
- Intégration stats dédiée

### Implementation Plan

#### Phase 1: Backend - Modèle et Migration

- [ ] **1.1 Migration** `YYYYMMDDHHMMSS-create-engagement-letters.cjs`
  ```sql
  -- Table engagement_letters
  id UUID PRIMARY KEY
  letter_number VARCHAR(20) UNIQUE  -- Format: LM202501XXXX
  institution_id UUID FK
  assigned_user_id UUID FK
  template_id UUID FK (nullable)

  -- Mission info
  title VARCHAR(255)
  mission_type ENUM('audit', 'conseil', 'formation', 'autre')
  scope TEXT  -- Description détaillée de la mission
  objectives TEXT[]  -- Liste des objectifs
  deliverables JSONB  -- [{name, description, dueDate}]

  -- Timeline
  start_date DATE
  end_date DATE
  estimated_hours DECIMAL(10,2)

  -- Financial
  billing_type ENUM('fixed', 'hourly', 'daily')
  rate DECIMAL(10,2)  -- Taux horaire/journalier ou montant fixe
  estimated_total DECIMAL(10,2)

  -- Workflow
  status ENUM('draft', 'sent', 'accepted', 'rejected', 'cancelled', 'completed')
  valid_until DATE
  sent_at TIMESTAMP
  accepted_at TIMESTAMP
  rejected_at TIMESTAMP
  completed_at TIMESTAMP

  -- Notes
  terms_and_conditions TEXT
  client_comments TEXT
  internal_notes TEXT

  -- Audit
  created_at, updated_at, deleted_at

  -- Table engagement_letter_members (intervenants sur la mission)
  id UUID PRIMARY KEY
  engagement_letter_id UUID FK
  user_id UUID FK (nullable - peut être intervenant externe)
  name VARCHAR(255)  -- Nom complet (cache du user ou saisi si externe)
  role VARCHAR(100)  -- "Directeur de mission", "Auditeur senior", "Consultant junior"
  qualification VARCHAR(255)  -- "Expert-comptable", "Commissaire aux comptes", etc.
  daily_rate DECIMAL(10,2)  -- Taux journalier
  estimated_days DECIMAL(5,1)  -- Nombre de jours prévus
  is_lead BOOLEAN DEFAULT false  -- Responsable principal de la mission
  order_index INTEGER  -- Ordre d'affichage dans le document
  created_at, updated_at
  ```

- [ ] **1.2 Modèles Sequelize**
  - `packages/backend/src/models/EngagementLetter.ts`
  - `packages/backend/src/models/EngagementLetterMember.ts` (intervenants)
  - Associations: belongsTo Institution, User, DocumentTemplate; hasMany Members
  - Méthodes: `generateLetterNumber()`, `send()`, `accept()`, `reject()`, `complete()`
  - Hooks: auto-génération du numéro, validation dates
  - Scopes: byStatus, byInstitution, byUser, active

- [ ] **1.3 Types partagés** `packages/shared/src/types/engagement-letter.ts`

  ```typescript
  enum EngagementLetterStatus { DRAFT, SENT, ACCEPTED, REJECTED, CANCELLED, COMPLETED }
  enum MissionType { AUDIT, CONSEIL, FORMATION, AUTRE }
  enum BillingType { FIXED, HOURLY, DAILY }
  interface Deliverable { name: string; description?: string; dueDate?: Date }
  interface EngagementLetterMember {
    id?: string
    userId?: string  // Si intervenant interne
    name: string
    role: string  // "Directeur de mission", "Auditeur senior"
    qualification?: string  // "Expert-comptable", "CAC"
    dailyRate: number
    estimatedDays: number
    isLead: boolean
    orderIndex: number
  }
  interface EngagementLetterCreateRequest { ... }
  interface EngagementLetterUpdateRequest { ... }
  interface EngagementLetterMemberRequest { ... }
  ```

- [ ] **1.4 Étendre DocumentVersion**
  - Ajouter `ENGAGEMENT_LETTER_PDF` au type enum
  - Migration pour modifier l'enum

#### Phase 2: Backend - Service et API

- [ ] **2.1 Service** `packages/backend/src/services/EngagementLetterService.ts`
  - CRUD operations
  - Workflow transitions avec validation
  - Génération numéro séquentiel mensuel (LM202501XXXX)
  - Statistiques et métriques

- [ ] **2.2 Routes API** `packages/backend/src/routes/engagement-letters.ts`
  ```
  GET    /api/engagement-letters              - Liste (filtres: status, institution, user, date)
  GET    /api/engagement-letters/statistics   - Stats globales
  GET    /api/engagement-letters/:id          - Détail
  POST   /api/engagement-letters              - Créer
  PUT    /api/engagement-letters/:id          - Modifier
  DELETE /api/engagement-letters/:id          - Supprimer (soft)

  -- Workflow
  PUT    /api/engagement-letters/:id/send     - Envoyer au client
  PUT    /api/engagement-letters/:id/accept   - Accepter
  PUT    /api/engagement-letters/:id/reject   - Refuser
  PUT    /api/engagement-letters/:id/complete - Marquer terminée

  -- Intervenants (members)
  GET    /api/engagement-letters/:id/members           - Liste intervenants
  POST   /api/engagement-letters/:id/members           - Ajouter intervenant
  PUT    /api/engagement-letters/:id/members/:memberId - Modifier intervenant
  DELETE /api/engagement-letters/:id/members/:memberId - Retirer intervenant
  PUT    /api/engagement-letters/:id/members/reorder   - Réordonner

  -- Documents
  GET    /api/engagement-letters/:id/pdf      - Générer PDF
  POST   /api/engagement-letters/:id/email    - Envoyer par email
  GET    /api/engagement-letters/:id/versions - Historique versions
  ```

- [ ] **2.3 Permissions**
  - Ajouter dans le système de permissions: `canViewEngagementLetters`, `canCreateEngagementLetters`, `canEditEngagementLetters`, `canDeleteEngagementLetters`

#### Phase 3: Backend - PDF Generation

- [ ] **3.1 Template par défaut** dans `PdfService.ts`
  - `getDefaultEngagementLetterTemplate()` - Template Handlebars spécifique
  - Sections: En-tête société, Objet de la mission, Périmètre, **Équipe intervenante** (tableau avec noms, rôles, qualifications, jours), Livrables, Planning, Conditions financières, CGV, Signature

- [ ] **3.2 Méthode génération**
  - `generateEngagementLetterPdf(letterId, generatedBy, templateId?, options)`
  - Réutiliser l'infrastructure existante (Puppeteer, versioning, email)

- [ ] **3.3 DocumentTemplate**
  - Étendre l'enum `type` pour inclure `engagement_letter`
  - Permettre création de templates personnalisés

#### Phase 4: Frontend - Composants

- [ ] **4.1 Vue principale** `packages/frontend/src/views/billing/EngagementLettersView.vue`
  - Liste avec filtres (status, institution, période)
  - Vue tableau desktop / cartes mobile
  - Actions rapides (voir, éditer, dupliquer, supprimer)

- [ ] **4.2 Builder** `packages/frontend/src/components/billing/engagement-letters/EngagementLetterBuilder.vue`
  - Formulaire création/édition
  - Sélection institution (autocomplete)
  - Champs mission: titre, type, scope, objectifs
  - **Gestion équipe intervenante** (section dédiée)
  - Gestion livrables (ajouter/supprimer dynamiquement)
  - Planning: dates début/fin, heures estimées
  - Tarification: type (fixe/horaire/journalier), taux, total calculé
  - CGV et notes

- [ ] **4.3 TeamMembersEditor** `packages/frontend/src/components/billing/engagement-letters/TeamMembersEditor.vue`
  - Liste des intervenants avec drag & drop pour réordonner
  - Ajouter intervenant: autocomplete utilisateurs internes OU saisie manuelle (externe)
  - Champs par intervenant: nom, rôle, qualification, taux journalier, jours estimés
  - Checkbox "Responsable de mission" (is_lead)
  - Calcul automatique du sous-total par intervenant
  - Affichage total équipe (somme des jours × taux)

- [ ] **4.4 Preview** `packages/frontend/src/components/billing/engagement-letters/EngagementLetterPreview.vue`
  - Aperçu avant envoi
  - **Tableau équipe intervenante** (comme sur le PDF final)
  - Affichage formaté des livrables
  - Timeline visuelle

- [ ] **4.5 Actions** `packages/frontend/src/components/billing/engagement-letters/EngagementLetterActions.vue`
  - Boutons workflow: Envoyer, Accepter, Refuser, Terminer
  - Télécharger PDF, Envoyer par email
  - Historique versions

- [ ] **4.6 Card** `packages/frontend/src/components/billing/engagement-letters/EngagementLetterCard.vue`
  - Carte pour affichage mobile/grid
  - Badge status coloré
  - Infos clés: client, montant, dates

#### Phase 5: Frontend - Intégration

- [ ] **5.1 Navigation**
  - Ajouter dans sidebar: "Lettres de mission" sous section Facturation
  - Route: `/billing/engagement-letters`

- [ ] **5.2 Dashboard widgets**
  - Compteur lettres en attente de réponse
  - Lettres expirant bientôt

- [ ] **5.3 Timeline Institution**
  - Afficher les lettres de mission dans la timeline
  - Icône et couleur distinctes

- [ ] **5.4 i18n**
  - Ajouter toutes les clés dans `fr.json` et `en.json`
  - Section `engagementLetters.*`

#### Phase 6: Analytics et Stats

- [ ] **6.1 API Stats** `packages/backend/src/routes/engagement-letters.ts`
  ```typescript
  GET /api/engagement-letters/statistics
  {
    total: number
    byStatus: { draft, sent, accepted, rejected, cancelled, completed }
    byMissionType: { audit, conseil, formation, autre }
    acceptanceRate: number  // accepted / (accepted + rejected)
    averageResponseTime: number  // jours entre sent et accepted/rejected
    totalValue: number  // somme des estimatedTotal
    valueByStatus: { ... }
    monthlyTrend: [{ month, count, value }]
  }
  ```

- [ ] **6.2 Intégration BillingAnalyticsView**
  - Nouveau graphique: Lettres de mission par statut
  - KPI: Taux d'acceptation, valeur totale, temps moyen de réponse
  - Comparaison avec devis (conversion rate)

- [ ] **6.3 Dashboard global**
  - Widget récapitulatif lettres de mission
  - Intégrer dans les stats commerciales globales

- [ ] **6.4 Export**
  - Ajouter export CSV/XLSX des lettres de mission
  - Intégrer dans ExportCenter

#### Phase 7: Tests

- [ ] **7.1 Tests unitaires backend**
  - Model: validations, hooks, méthodes
  - Service: CRUD, workflow transitions
  - Génération numéro séquentiel

- [ ] **7.2 Tests intégration API**
  - Tous les endpoints
  - Permissions
  - Workflow complet

- [ ] **7.3 Tests frontend**
  - Composants (rendering, interactions)
  - Formulaire validation

### Files to Create

```text
packages/backend/
├── src/models/EngagementLetter.ts
├── src/models/EngagementLetterMember.ts  # Intervenants
├── src/routes/engagement-letters.ts
├── src/services/EngagementLetterService.ts
├── src/migrations/YYYYMMDDHHMMSS-create-engagement-letters.cjs
└── src/__tests__/engagement-letters/

packages/frontend/
├── src/views/billing/EngagementLettersView.vue
├── src/components/billing/engagement-letters/
│   ├── EngagementLetterBuilder.vue
│   ├── EngagementLetterPreview.vue
│   ├── EngagementLetterActions.vue
│   ├── EngagementLetterCard.vue
│   ├── TeamMembersEditor.vue  # Gestion équipe intervenante
│   └── index.ts
└── src/services/api/engagement-letters.ts

packages/shared/
└── src/types/engagement-letter.ts
```

### Files to Modify

```text
packages/backend/
├── src/models/index.ts (export)
├── src/models/DocumentVersion.ts (enum type)
├── src/services/PdfService.ts (template + génération)
├── src/routes/index.ts (register routes)

packages/frontend/
├── src/router/index.ts (routes)
├── src/components/layout/Sidebar.vue (navigation)
├── src/locales/fr.json (i18n)
├── src/locales/en.json (i18n)
├── src/views/billing/BillingAnalyticsView.vue (stats)
├── src/components/institutions/InstitutionTimeline.vue (affichage)

packages/shared/
└── src/types/index.ts (export)
```

### Estimation

- Phase 1 (Backend Model): 2-3h
- Phase 2 (Backend API): 2-3h
- Phase 3 (PDF): 1-2h
- Phase 4 (Frontend Components): 4-5h
- Phase 5 (Frontend Integration): 2h
- Phase 6 (Analytics): 2-3h
- Phase 7 (Tests): 2-3h

**Total estimé: 15-20h de travail**

### Priority

**Medium** - Feature importante pour les clients audit mais pas bloquante pour v1.1
