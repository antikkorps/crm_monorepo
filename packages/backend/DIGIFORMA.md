# Intégration Digiforma - Documentation

## 📋 Vue d'ensemble

L'intégration Digiforma permet de synchroniser les données de formation (clients, devis, factures) depuis Digiforma vers le CRM et de calculer un **CA consolidé** entre les activités d'Audit (CRM) et de Formation (Digiforma).

### Caractéristiques principales
- ✅ **Read-only** : Lecture seule depuis Digiforma (conformité Qualiopi)
- ✅ **Synchronisation** : Manuelle ou hebdomadaire automatique
- ✅ **Fusion intelligente** : Matching automatique par email avec les institutions CRM
- ✅ **CA consolidé** : Vue globale Audit + Formation + Autre

---

## 🏗️ Architecture Backend

### Modèles de données

#### 1. `DigiformaSettings` - Configuration
Stocke la configuration de l'API Digiforma (singleton).

```typescript
{
  bearerToken: string        // Token API chiffré (base64)
  apiUrl: string             // URL GraphQL API (depuis .env)
  isEnabled: boolean         // Active/désactive l'intégration
  autoSyncEnabled: boolean   // Synchronisation automatique
  syncFrequency: 'daily' | 'weekly' | 'monthly'
  lastTestDate: Date         // Dernier test de connexion
  lastSyncDate: Date         // Dernière synchronisation
}
```

#### 2. `DigiformaSync` - Historique des synchronisations
Tracking de chaque synchronisation avec statistiques et erreurs.

```typescript
{
  syncType: 'manual' | 'scheduled' | 'auto'
  status: 'pending' | 'in_progress' | 'success' | 'error' | 'partial'
  startedAt: Date
  completedAt: Date
  companiesSynced: number
  contactsSynced: number
  quotesSynced: number
  invoicesSynced: number
  companiesCreated: number
  companiesUpdated: number
  errors: Array<{type: string, message: string, details?: any}>
  triggeredBy: string        // User ID
}
```

#### 3. `DigiformaCompany` - Companies Digiforma
Stockage des companies avec lien vers institutions CRM.

```typescript
{
  digiformaId: string        // ID Digiforma (unique)
  institutionId: string      // → MedicalInstitution (fusionné)
  name: string
  email: string
  city: string
  country: string
  metadata: {opca: string}   // Données supplémentaires
  lastSyncAt: Date
}
```

#### 4. `DigiformaContact` - Contacts/Trainees
Contacts Digiforma liés aux ContactPerson CRM.

```typescript
{
  digiformaId: string
  digiformaCompanyId: string
  contactPersonId: string    // → ContactPerson (fusionné)
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
}
```

#### 5. `DigiformaQuote` - Devis Formation
Devis Digiforma pour tracking des opportunités.

```typescript
{
  digiformaId: string
  digiformaCompanyId: string
  institutionId: string
  quoteNumber: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'
  totalAmount: number
  currency: string
  validUntil: Date
  createdDate: Date
}
```

#### 6. `DigiformaInvoice` - Factures Formation (CA)
**Factures Digiforma = CA Formation**

```typescript
{
  digiformaId: string
  digiformaCompanyId: string
  institutionId: string
  invoiceNumber: string
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled'
  totalAmount: number        // CA Formation
  paidAmount: number
  currency: string
  issueDate: Date
  dueDate: Date
  paidDate: Date
}
```

---

## 🔌 Services Backend

### 1. `DigiformaService` - Client GraphQL API

Client GraphQL pour communiquer avec l'API Digiforma.

**Méthodes principales :**

```typescript
// Test de connexion
testConnection(): Promise<{success: boolean, message: string}>

// Récupération des données
fetchAllCompanies(): Promise<Company[]>
fetchTrainees(): Promise<Trainee[]>
fetchCustomers(): Promise<Customer[]>
fetchQuotations(): Promise<Quotation[]>
fetchInvoices(): Promise<Invoice[]>

// Revenue
getTotalRevenue(): Promise<{total, paid, unpaid}>
```

**Queries GraphQL utilisées :**

```graphql
# Companies
query {
  companies {
    id
    name
    country
    city
    email
    opca
  }
}

# Trainees (Contacts)
query {
  trainees {
    id
    firstname
    lastname
    email
    phone
    company {
      id
      name
    }
  }
}

# Quotations
query {
  quotations {
    id
    reference
    date
    status
    total_amount
    customer { id name }
  }
}

# Invoices
query {
  invoices {
    id
    reference
    date
    status
    total_amount
    paid_amount
    customer { id name }
  }
}
```

---

### 2. `DigiformaSyncService` - Synchronisation

Orchestre la synchronisation complète Digiforma → CRM.

**Processus de synchronisation :**

```typescript
1. startFullSync(userId)
   ├─ syncCompanies()        // Récupère et stocke companies
   ├─ syncContacts()         // Récupère et stocke trainees
   ├─ syncQuotes()           // Récupère et stocke quotations
   ├─ syncInvoices()         // Récupère et stocke invoices
   └─ mergeWithCRM()         // Fusion avec institutions CRM
```

**Logique de fusion (mergeWithCRM) :**

1. **Matching par email** : Recherche ContactPerson avec même email → institution
2. **Matching par nom + ville** : Si pas de match email
3. **Création automatique** : Si aucun match, crée nouvelle institution
   - Type : `CLINIC` (formation)
   - Tags : `['digiforma', 'formation']`
   - Crée contact primaire si email disponible

**Méthodes utiles :**

```typescript
// Status de la synchronisation
getSyncStatus(): Promise<{
  lastSync: DigiformaSync,
  isRunning: boolean,
  stats: {
    totalCompanies: number,
    linkedCompanies: number,
    unlinkedCompanies: number
  }
}>

// Historique
getSyncHistory(limit, offset): Promise<{rows, count}>
```

---

### 3. `ConsolidatedRevenueService` - CA Consolidé

Calcule le chiffre d'affaires consolidé toutes sources.

**Sources de CA :**
- **Audit** : Factures CRM (Invoice → totalWithTax + payments)
- **Formation** : Factures Digiforma (DigiformaInvoice → totalAmount/paidAmount)
- **Autre** : Placeholder pour futures sources

**Méthodes principales :**

```typescript
// CA consolidé par institution
getInstitutionRevenue(institutionId, startDate?, endDate?): Promise<ConsolidatedRevenueData>

// CA consolidé global
getGlobalRevenue(startDate?, endDate?): Promise<ConsolidatedRevenueData>

// Évolution mensuelle
getRevenueEvolution(months = 12, institutionId?): Promise<Array<{
  month: string,      // 'YYYY-MM'
  audit: number,
  formation: number,
  other: number,
  total: number
}>>

// Top institutions par CA
getTopInstitutionsByRevenue(limit = 10, startDate?, endDate?): Promise<Array<{
  institution: MedicalInstitution,
  revenue: ConsolidatedRevenueData
}>>
```

**Structure `ConsolidatedRevenueData` :**

```typescript
{
  audit: {
    totalRevenue: number,
    paidRevenue: number,
    unpaidRevenue: number,
    invoiceCount: number
  },
  formation: {
    totalRevenue: number,
    paidRevenue: number,
    unpaidRevenue: number,
    invoiceCount: number
  },
  other: {
    totalRevenue: number,
    paidRevenue: number,
    unpaidRevenue: number,
    invoiceCount: number
  },
  total: {
    totalRevenue: number,
    paidRevenue: number,
    unpaidRevenue: number
  }
}
```

---

## 🚀 API Endpoints

### Configuration & Test

#### `GET /api/digiforma/settings`
Récupère la configuration Digiforma (sans le token).

**Permission** : `canManageSystemSettings`

**Response :**
```json
{
  "success": true,
  "data": {
    "isConfigured": true,
    "isEnabled": true,
    "apiUrl": "https://app.digiforma.com/api/v1/graphql",
    "autoSyncEnabled": false,
    "syncFrequency": "weekly",
    "lastTestDate": "2025-09-30T12:00:00Z",
    "lastTestSuccess": true,
    "lastSyncDate": "2025-09-30T10:00:00Z"
  }
}
```

---

#### `POST /api/digiforma/settings`
Met à jour la configuration Digiforma.

**Permission** : `canManageSystemSettings`

**Body :**
```json
{
  "bearerToken": "your-digiforma-bearer-token",
  "apiUrl": "https://app.digiforma.com/api/v1/graphql",
  "isEnabled": true,
  "autoSyncEnabled": true,
  "syncFrequency": "weekly"
}
```

---

#### `POST /api/digiforma/test-connection`
Teste la connexion à l'API Digiforma.

**Permission** : `canManageSystemSettings`

**Response :**
```json
{
  "success": true,
  "message": "Connection successful"
}
```

---

### Synchronisation

#### `POST /api/digiforma/sync`
Déclenche une synchronisation manuelle.

**Permission** : `canManageSystemSettings`

**Response :**
```json
{
  "success": true,
  "message": "Synchronization started",
  "data": {
    "syncId": "uuid",
    "status": "in_progress"
  }
}
```

---

#### `GET /api/digiforma/sync/status`
Récupère le status de synchronisation actuel.

**Permission** : `canViewInstitutionAnalytics`

**Response :**
```json
{
  "success": true,
  "data": {
    "lastSync": {
      "id": "uuid",
      "status": "success",
      "startedAt": "2025-09-30T10:00:00Z",
      "completedAt": "2025-09-30T10:05:00Z",
      "companiesSynced": 150,
      "invoicesSynced": 450
    },
    "isRunning": false,
    "stats": {
      "totalCompanies": 150,
      "linkedCompanies": 120,
      "unlinkedCompanies": 30
    }
  }
}
```

---

#### `GET /api/digiforma/sync/history`
Récupère l'historique des synchronisations.

**Permission** : `canViewInstitutionAnalytics`

**Query params :** `limit` (default: 50), `offset` (default: 0)

**Response :**
```json
{
  "success": true,
  "data": {
    "syncs": [...],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 120
    }
  }
}
```

---

### Données Digiforma par institution

#### `GET /api/digiforma/institutions/:id/quotes`
Récupère les devis Digiforma pour une institution.

**Permission** : `canViewAllInstitutions`

**Response :**
```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "id": "uuid",
        "digiformaId": "12345",
        "quoteNumber": "DG-2025-001",
        "status": "accepted",
        "totalAmount": 5000.00,
        "currency": "EUR",
        "createdDate": "2025-09-01"
      }
    ]
  }
}
```

---

#### `GET /api/digiforma/institutions/:id/invoices`
Récupère les factures Digiforma (CA Formation) pour une institution.

**Permission** : `canViewAllInstitutions`

**Response :**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "uuid",
        "digiformaId": "67890",
        "invoiceNumber": "FACT-2025-001",
        "status": "paid",
        "totalAmount": 5000.00,
        "paidAmount": 5000.00,
        "currency": "EUR",
        "issueDate": "2025-09-15"
      }
    ]
  }
}
```

---

### CA Consolidé

#### `GET /api/institutions/:id/revenue/consolidated`
CA consolidé pour une institution spécifique.

**Permission** : `canViewAllInstitutions`

**Query params :** `startDate` (ISO), `endDate` (ISO)

**Response :**
```json
{
  "success": true,
  "data": {
    "audit": {
      "totalRevenue": 50000,
      "paidRevenue": 45000,
      "unpaidRevenue": 5000,
      "invoiceCount": 10
    },
    "formation": {
      "totalRevenue": 30000,
      "paidRevenue": 28000,
      "unpaidRevenue": 2000,
      "invoiceCount": 6
    },
    "other": {
      "totalRevenue": 0,
      "paidRevenue": 0,
      "unpaidRevenue": 0,
      "invoiceCount": 0
    },
    "total": {
      "totalRevenue": 80000,
      "paidRevenue": 73000,
      "unpaidRevenue": 7000
    }
  }
}
```

---

#### `GET /api/dashboard/revenue/consolidated`
CA consolidé global (toutes institutions).

**Permission** : `canViewInstitutionAnalytics`

**Query params :** `startDate` (ISO), `endDate` (ISO)

**Response :** _Même structure que ci-dessus_

---

#### `GET /api/dashboard/revenue/evolution`
Évolution mensuelle du CA consolidé.

**Permission** : `canViewInstitutionAnalytics`

**Query params :** `months` (default: 12), `institutionId` (optional)

**Response :**
```json
{
  "success": true,
  "data": {
    "evolution": [
      {
        "month": "2025-01",
        "audit": 45000,
        "formation": 25000,
        "other": 0,
        "total": 70000
      },
      {
        "month": "2025-02",
        "audit": 50000,
        "formation": 30000,
        "other": 0,
        "total": 80000
      }
    ]
  }
}
```

---

## ⚙️ Configuration

### 1. Variables d'environnement (.env)

```bash
# Digiforma Integration
DIGIFORMA_API_URL=https://app.digiforma.com/api/v1/graphql
# Optional: encryption key for storing Bearer token
# DIGIFORMA_ENCRYPTION_KEY=your-32-char-encryption-key-here
```

### 2. Configuration via API

1. **Obtenir un Bearer token depuis Digiforma** :
   - Connexion à Digiforma → Paramètres compte → API → Générer token

2. **Configurer dans le CRM** :
   ```bash
   POST /api/digiforma/settings
   {
     "bearerToken": "votre-token-digiforma",
     "isEnabled": true,
     "autoSyncEnabled": true,
     "syncFrequency": "weekly"
   }
   ```

3. **Tester la connexion** :
   ```bash
   POST /api/digiforma/test-connection
   ```

4. **Lancer la première synchronisation** :
   ```bash
   POST /api/digiforma/sync
   ```

---

## 🔐 Sécurité

### Stockage du Bearer Token
- Token chiffré en **base64** (simple, amélioration possible avec AES-256)
- Variable `DIGIFORMA_ENCRYPTION_KEY` pour clé personnalisée
- Token JAMAIS retourné dans les API responses

### Permissions RBAC
- **Configuration** : `canManageSystemSettings` (SUPER_ADMIN, TEAM_ADMIN)
- **Consultation sync** : `canViewInstitutionAnalytics`
- **Consultation données** : `canViewAllInstitutions`

---

## 📊 Utilisation Frontend (à venir)

### 1. Page de configuration
- `/settings/digiforma`
- Formulaire token Bearer + test connexion
- Déclenchement manuel sync

### 2. Widget Dashboard
- CA consolidé global (Audit + Formation)
- Graphique évolution mensuelle
- Top 5 institutions par CA

### 3. Onglet institution
- `/institutions/:id` → Onglet "Digiforma"
- CA Formation pour cette institution
- Liste devis Digiforma
- Liste factures Digiforma
- Comparaison Audit vs Formation

---

## 🐛 Dépannage

### Erreur de connexion
```
"message": "Connection failed: 401 Unauthorized"
```
→ Vérifier que le Bearer token est valide dans Digiforma

### Sync bloquée
```
"isRunning": true
```
→ Une sync est en cours. Attendre la fin ou vérifier les logs pour erreurs.

### Companies non fusionnées
→ Vérifier que les emails sont cohérents entre Digiforma et CRM
→ Faire un matching manuel si nécessaire via les vues d'administration

---

## 📈 Métriques & Monitoring

### Logs à surveiller
- `Digiforma sync triggered`
- `Digiforma sync completed`
- `Failed to sync Digiforma companies`
- `Linked Digiforma company to institution`

### Métriques clés
- Nombre de companies synchronisées vs liées
- Taux de fusion automatique (linkedCompanies / totalCompanies)
- CA Formation total vs CA Audit
- Durée moyenne de synchronisation

---

## 🔄 Roadmap & Améliorations futures

### Phase 2 (optionnel)
- [ ] Synchronisation incrémentale (delta sync)
- [ ] Webhooks Digiforma (si disponibles)
- [ ] Chiffrement AES-256 pour le token
- [ ] Notifications sync terminée
- [ ] Export CA consolidé Excel/PDF
- [ ] Reconciliation manuelle des duplicates

### Phase 3 (avancé)
- [ ] Machine learning pour améliorer le matching
- [ ] Prédictions CA Formation
- [ ] Alertes anomalies CA
- [ ] Dashboard BI avancé

---

**Auteur** : Claude AI
**Date** : 30/09/2025
**Version** : 1.0.0
