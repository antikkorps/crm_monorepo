# Task 29: Import CSV Amélioré avec Matching Comptable et Intégrations Digiforma/Sage

**Status:** 🆕 NOUVEAU
**Priority:** Haute
**Estimate:** 12-16 heures
**Dependencies:** Task 24 (Digiforma), Task 15 (Sage prep)

## Contexte

Le système d'import CSV existant doit être amélioré pour :
1. **Gérer l'identifiant comptable** (numéro client) comme clé de matching unique
2. **Synchroniser avec Digiforma** : créer les institutions manquantes dans Digiforma
3. **Préparer l'intégration Sage** : structure et TODOs pour sync Sage → CRM
4. **Améliorer le matching** : nom exact + fuzzy + identifiant comptable

### Source de vérité unique
- **Digiforma** sera la source de vérité pour les institutions ET contacts
- **Sage** fournit les données comptables (factures, paiements, numéros clients)
- **Le CRM** consolide et enrichit les données

## Subtasks

### 29.1 - Ajouter champ identifiant comptable (2h) ⭐

**Backend:**
- [ ] Ajouter champ `accountingId` (string, nullable, unique) au modèle `MedicalInstitution`
- [ ] Créer migration Sequelize pour ajouter colonne `accounting_id`
- [ ] Ajouter index unique sur `accounting_id` (si non null)
- [ ] Mettre à jour interfaces TypeScript dans `@medical-crm/shared`

**Frontend:**
- [ ] Ajouter champ "Numéro Client Comptable" dans formulaire institution
- [ ] Afficher `accountingId` dans les détails de l'institution
- [ ] Ajouter filtre de recherche par `accountingId`

**Files to modify:**
```
packages/backend/src/models/MedicalInstitution.ts
packages/backend/migrations/YYYY-MM-DD-add-accounting-id.ts
packages/shared/src/types/institution.ts
packages/frontend/src/components/institutions/InstitutionForm.vue
```

**Testing:**
- [ ] Test unitaire : création institution avec `accountingId`
- [ ] Test unicité : erreur si `accountingId` dupliqué
- [ ] Test recherche par `accountingId`

---

### 29.2 - Améliorer logique de matching CSV (4-5h) ⭐⭐

**Stratégie de matching multi-critères:**

1. **Match par `accountingId`** (priorité haute)
   - Si CSV contient `accountingId` ET institution existe avec ce `accountingId` → UPDATE

2. **Match par nom exact + adresse** (priorité moyenne)
   - Si nom exact ET (street OU city) correspondent → UPDATE

3. **Match fuzzy par nom** (priorité basse)
   - Si similarité nom > 85% ET ville correspond → SUGGEST MERGE
   - Utiliser librairie `fuse.js` ou `string-similarity`

**Backend updates:**

```typescript
// packages/backend/src/services/CsvImportService.ts

interface MatchResult {
  type: 'exact' | 'fuzzy' | 'none'
  confidence: number  // 0-100
  institution?: MedicalInstitution
  suggestions?: MedicalInstitution[]  // For fuzzy matches
}

private static async findDuplicateInstitution(
  data: Record<string, string>
): Promise<MatchResult> {
  // 1. Match by accountingId (100% confidence)
  if (data.accountingId) {
    const byAccounting = await MedicalInstitution.findOne({
      where: { accountingId: data.accountingId }
    })
    if (byAccounting) {
      return { type: 'exact', confidence: 100, institution: byAccounting }
    }
  }

  // 2. Match by exact name + address (95% confidence)
  const byNameAddress = await MedicalInstitution.findOne({
    where: {
      name: data.name,
      [Op.and]: [/* address matching */]
    }
  })
  if (byNameAddress) {
    return { type: 'exact', confidence: 95, institution: byNameAddress }
  }

  // 3. Fuzzy match by name + city (60-85% confidence)
  const allInSameCity = await MedicalInstitution.findAll({
    where: {
      /* JSONB city match */
    },
    limit: 10
  })

  // TODO: Implement fuzzy string matching
  const fuzzyMatches = allInSameCity.filter(inst => {
    const similarity = calculateSimilarity(inst.name, data.name)
    return similarity > 0.85
  })

  if (fuzzyMatches.length > 0) {
    return {
      type: 'fuzzy',
      confidence: 75,
      suggestions: fuzzyMatches
    }
  }

  return { type: 'none', confidence: 0 }
}
```

**Files to modify:**
```
packages/backend/src/services/CsvImportService.ts
packages/backend/package.json (add string-similarity dep)
```

**Testing:**
- [ ] Test matching par `accountingId`
- [ ] Test matching exact name + address
- [ ] Test fuzzy matching avec noms similaires
- [ ] Test aucun match trouvé

---

### 29.3 - Intégration Digiforma : Créer institutions manquantes (4-5h) ⭐⭐

**Workflow:**
1. Import CSV parse les lignes
2. Pour chaque ligne, check si institution existe
3. Si AUCUNE institution trouvée dans CRM :
   - **Check dans Digiforma** par nom/ville
   - Si existe dans Digiforma → Sync vers CRM
   - Si N'EXISTE PAS dans Digiforma → **Créer dans Digiforma** puis sync vers CRM

**Backend updates:**

```typescript
// packages/backend/src/services/CsvImportService.ts

import { DigiformaService } from './DigiformaService'

private static async createInstitutionWithDigiforma(
  data: Record<string, string>,
  assignedUserId?: string
): Promise<MedicalInstitution> {

  // 1. Check if exists in Digiforma
  const digiformaCompany = await DigiformaService.searchCompanyByName(
    data.name,
    data.city
  )

  if (digiformaCompany) {
    // Sync from Digiforma to CRM
    logger.info('Institution found in Digiforma, syncing to CRM', {
      name: data.name,
      digiformaId: digiformaCompany.id
    })

    return await DigiformaService.syncCompanyToCRM(digiformaCompany.id)
  }

  // 2. Create in Digiforma first
  logger.info('Creating new institution in Digiforma', { name: data.name })

  // TODO: Implement createCompany mutation in DigiformaService
  // const newDigiformaCompany = await DigiformaService.createCompany({
  //   name: data.name,
  //   address: { ... },
  //   accountingId: data.accountingId,
  //   // ... other fields
  // })

  // TEMPORARY: Create in CRM only until Digiforma mutation is ready
  const institution = await this.createInstitution(data, assignedUserId)

  // TODO: Once created in Digiforma, sync back to ensure consistency
  // await DigiformaService.syncCompanyToCRM(newDigiformaCompany.id)

  return institution
}
```

**DigiformaService updates:**

```typescript
// packages/backend/src/services/DigiformaService.ts

/**
 * Search for company in Digiforma by name and city
 * @returns Digiforma company or null if not found
 */
public async searchCompanyByName(
  name: string,
  city?: string
): Promise<any | null> {
  // TODO: Implement GraphQL query to search companies
  // Query should filter by name (contains) and optionally city
  logger.warn('searchCompanyByName: Not yet implemented - needs GraphQL query')
  return null
}

/**
 * Create a new company in Digiforma
 * @returns Created company from Digiforma
 */
public async createCompany(data: {
  name: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  accountingId?: string
  // ... other fields
}): Promise<any> {
  // TODO: Implement GraphQL mutation to create company
  // Mutation: createCompany(input: CompanyInput): Company
  logger.warn('createCompany: Not yet implemented - needs GraphQL mutation')
  throw new Error('Digiforma company creation not yet implemented')
}

/**
 * Sync company from Digiforma to CRM
 * Fetches full company details and creates/updates in CRM
 */
public async syncCompanyToCRM(digiformaCompanyId: string): Promise<MedicalInstitution> {
  const company = await this.fetchCompany(digiformaCompanyId)

  // Check if already exists in CRM
  const existing = await MedicalInstitution.findOne({
    where: { digiformaId: digiformaCompanyId }
  })

  if (existing) {
    // Update existing
    return await this.updateInstitutionFromDigiforma(existing, company)
  } else {
    // Create new
    return await this.createInstitutionFromDigiforma(company)
  }
}
```

**Files to modify:**
```
packages/backend/src/services/CsvImportService.ts
packages/backend/src/services/DigiformaService.ts
```

**Testing:**
- [ ] Test: institution existe dans Digiforma → sync to CRM
- [ ] Test: institution n'existe pas → skip creation (TODO not ready)
- [ ] Test: logging des actions Digiforma

---

### 29.4 - Préparation Sage : Structure de base (3-4h) ⭐

**Objectif:** Préparer l'architecture pour sync Sage → CRM (unidirectionnel pour v1)

**SageService skeleton:**

```typescript
// packages/backend/src/services/SageService.ts

import { logger } from '../utils/logger'
import { Invoice, Payment, MedicalInstitution } from '../models'

export interface SageConfig {
  apiUrl: string
  apiKey: string
  companyId: string
  enabled: boolean
}

export interface SageCustomer {
  id: string
  accountingId: string  // Numéro client comptable
  name: string
  address: {
    street: string
    city: string
    zipCode: string
    country: string
  }
  vatNumber?: string
  paymentTerms?: number  // Days
}

export interface SageInvoice {
  id: string
  invoiceNumber: string
  customerId: string
  accountingId: string  // Numéro client
  date: Date
  dueDate: Date
  amount: number
  paidAmount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  items: SageInvoiceItem[]
}

export interface SageInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  totalAmount: number
}

export interface SagePayment {
  id: string
  invoiceId: string
  date: Date
  amount: number
  method: string
  reference?: string
}

export class SageService {
  private config: SageConfig

  constructor(config: SageConfig) {
    this.config = config
  }

  /**
   * Test connection to Sage API
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config.enabled) {
      return { success: false, message: 'Sage integration is not enabled' }
    }

    // TODO: Implement actual API call to Sage
    // const response = await fetch(`${this.config.apiUrl}/test`, {
    //   headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
    // })

    logger.warn('Sage testConnection: Not yet implemented - need API credentials')
    return { success: false, message: 'Sage API integration not yet configured' }
  }

  /**
   * Sync customers from Sage to CRM
   * Match by accountingId, create/update institutions
   */
  public async syncCustomers(): Promise<{
    synced: number
    created: number
    updated: number
    errors: string[]
  }> {
    // TODO: Implement Sage API call to fetch customers
    // const sageCustomers = await this.fetchCustomers()

    logger.warn('Sage syncCustomers: Not yet implemented')
    return { synced: 0, created: 0, updated: 0, errors: [] }
  }

  /**
   * Sync invoices from Sage to CRM
   * Match by accountingId to link to institutions
   */
  public async syncInvoices(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    synced: number
    created: number
    updated: number
    errors: string[]
  }> {
    // TODO: Implement Sage API call to fetch invoices
    // const sageInvoices = await this.fetchInvoices(startDate, endDate)

    logger.warn('Sage syncInvoices: Not yet implemented')
    return { synced: 0, created: 0, updated: 0, errors: [] }
  }

  /**
   * Sync payments from Sage to CRM
   */
  public async syncPayments(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    synced: number
    created: number
    updated: number
    errors: string[]
  }> {
    // TODO: Implement Sage API call to fetch payments
    // const sagePayments = await this.fetchPayments(startDate, endDate)

    logger.warn('Sage syncPayments: Not yet implemented')
    return { synced: 0, created: 0, updated: 0, errors: [] }
  }

  /**
   * Match Sage customer to CRM institution by accountingId
   */
  private async matchOrCreateInstitution(
    sageCustomer: SageCustomer
  ): Promise<MedicalInstitution> {
    // Try to find by accountingId first
    let institution = await MedicalInstitution.findOne({
      where: { accountingId: sageCustomer.accountingId }
    })

    if (institution) {
      logger.info('Matched Sage customer to existing institution', {
        accountingId: sageCustomer.accountingId,
        institutionId: institution.id
      })
      return institution
    }

    // TODO: If not found, should we create a new institution or skip?
    // Decision: Create basic institution with Sage data, mark as needs review
    logger.warn('Sage customer not found in CRM, creating new institution', {
      accountingId: sageCustomer.accountingId,
      name: sageCustomer.name
    })

    institution = await MedicalInstitution.create({
      name: sageCustomer.name,
      type: 'other',  // Default type, needs manual review
      accountingId: sageCustomer.accountingId,
      address: sageCustomer.address,
      tags: ['sage-import', 'needs-review']
    })

    return institution
  }

  // TODO v2: Implement CRM → Sage sync (create invoice in Sage from CRM quote)
  // public async createInvoiceInSage(crmQuote: Quote): Promise<SageInvoice> { }
}

export default SageService
```

**SageSettings model:**

```typescript
// packages/backend/src/models/SageSettings.ts

import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

interface SageSettingsAttributes {
  id: string
  apiUrl: string
  apiKey: string  // Encrypted
  companyId: string
  enabled: boolean
  autoSyncEnabled: boolean
  syncFrequency: 'daily' | 'weekly' | 'monthly'
  lastSyncAt?: Date
  lastSyncStatus?: 'success' | 'failed'
  createdAt?: Date
  updatedAt?: Date
}

interface SageSettingsCreationAttributes
  extends Optional<SageSettingsAttributes, 'id' | 'enabled' | 'autoSyncEnabled' | 'syncFrequency'> {}

class SageSettings extends Model<SageSettingsAttributes, SageSettingsCreationAttributes>
  implements SageSettingsAttributes {
  public id!: string
  public apiUrl!: string
  public apiKey!: string
  public companyId!: string
  public enabled!: boolean
  public autoSyncEnabled!: boolean
  public syncFrequency!: 'daily' | 'weekly' | 'monthly'
  public lastSyncAt?: Date
  public lastSyncStatus?: 'success' | 'failed'

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

SageSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    apiUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    apiKey: {
      type: DataTypes.TEXT,  // Encrypted value
      allowNull: false,
    },
    companyId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    autoSyncEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    syncFrequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      defaultValue: 'weekly',
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastSyncStatus: {
      type: DataTypes.ENUM('success', 'failed'),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'sage_settings',
    timestamps: true,
  }
)

export { SageSettings, SageSettingsAttributes, SageSettingsCreationAttributes }
```

**Files to create:**
```
packages/backend/src/services/SageService.ts
packages/backend/src/models/SageSettings.ts
packages/backend/src/controllers/SageController.ts
packages/backend/src/routes/sage.ts
packages/backend/migrations/YYYY-MM-DD-create-sage-settings.ts
```

**Testing:**
- [ ] Test SageService instantiation
- [ ] Test testConnection (mock API)
- [ ] Test matchOrCreateInstitution with accountingId

---

### 29.5 - Frontend: Améliorer UI import (2-3h) ⭐

**Améliorations ImportInstitutionsDialog.vue:**

1. **Preview amélioré avec statut sync:**
   ```vue
   <v-data-table :items="previewResults">
     <template #item.status="{ item }">
       <v-chip
         :color="getStatusColor(item.matchStatus)"
         size="small"
       >
         {{ item.matchStatus }}
       </v-chip>
     </template>

     <template #item.digiformaStatus="{ item }">
       <v-tooltip location="top">
         <template #activator="{ props }">
           <v-icon
             v-bind="props"
             :icon="item.inDigiforma ? 'mdi-check-circle' : 'mdi-help-circle'"
             :color="item.inDigiforma ? 'success' : 'warning'"
           />
         </template>
         {{ item.inDigiforma ? 'Existe dans Digiforma' : 'Sera créé dans Digiforma' }}
       </v-tooltip>
     </template>

     <template #item.sageStatus="{ item }">
       <v-chip
         v-if="item.accountingId"
         size="small"
         color="info"
         prepend-icon="mdi-calculator"
       >
         {{ item.accountingId }}
       </v-chip>
       <span v-else class="text-caption text-disabled">
         Aucun ID comptable
       </span>
     </template>
   </v-data-table>
   ```

2. **Options de sync:**
   ```vue
   <v-card-text>
     <v-switch
       v-model="syncToDigiforma"
       label="Créer dans Digiforma si manquant"
       hint="Les institutions non trouvées seront créées dans Digiforma"
       persistent-hint
     />

     <v-alert type="info" variant="tonal" class="mt-4">
       Les institutions avec un numéro client comptable seront automatiquement
       liées aux données Sage lors de la prochaine synchronisation.
     </v-alert>
   </v-card-text>
   ```

3. **Rapport d'import détaillé:**
   ```vue
   <v-card v-if="importResult" class="mt-4">
     <v-card-title>Résultat de l'import</v-card-title>
     <v-card-text>
       <v-row>
         <v-col cols="3">
           <v-card color="success" variant="tonal">
             <v-card-text class="text-center">
               <div class="text-h3">{{ importResult.successfulImports }}</div>
               <div class="text-caption">Importées</div>
             </v-card-text>
           </v-card>
         </v-col>
         <v-col cols="3">
           <v-card color="info" variant="tonal">
             <v-card-text class="text-center">
               <div class="text-h3">{{ importResult.duplicatesMerged }}</div>
               <div class="text-caption">Mises à jour</div>
             </v-card-text>
           </v-card>
         </v-col>
         <v-col cols="3">
           <v-card color="warning" variant="tonal">
             <v-card-text class="text-center">
               <div class="text-h3">{{ importResult.digiformaCreated }}</div>
               <div class="text-caption">Créées Digiforma</div>
             </v-card-text>
           </v-card>
         </v-col>
         <v-col cols="3">
           <v-card color="error" variant="tonal">
             <v-card-text class="text-center">
               <div class="text-h3">{{ importResult.failedImports }}</div>
               <div class="text-caption">Erreurs</div>
             </v-card-text>
           </v-card>
         </v-col>
       </v-row>
     </v-card-text>
   </v-card>
   ```

**Files to modify:**
```
packages/frontend/src/components/institutions/ImportInstitutionsDialog.vue
```

---

### 29.6 - Bug fix: URL encoding visuel dans champ API URL Digiforma (15min) 🐛

**Problème:** L'URL de l'API Digiforma dans le champ texte des paramètres affiche des caractères encodés (%) au lieu de l'URL normale.

**Cause probable:** Le v-text-field encode automatiquement l'URL pour l'affichage

**Solution:**
```vue
<!-- packages/frontend/src/views/settings/DigiformaSettingsView.vue -->

<!-- Avant (si problème d'encoding visuel): -->
<v-text-field
  v-model="formData.apiUrl"
  label="URL de l'API Digiforma"
  ...
/>

<!-- Solution potentielle: -->
<v-text-field
  :model-value="decodeURIComponent(formData.apiUrl || '')"
  @update:model-value="formData.apiUrl = $event"
  label="URL de l'API Digiforma"
  ...
/>

<!-- OU simplement forcer type="url" et autocomplete -->
<v-text-field
  v-model="formData.apiUrl"
  type="url"
  label="URL de l'API Digiforma"
  ...
/>
```

**Alternative:** Vérifier si le problème vient du chargement depuis la DB - l'URL est peut-être déjà encodée en base

**Files to check:**
```
packages/frontend/src/views/settings/DigiformaSettingsView.vue (line ~53-62)
packages/backend/src/models/DigiformaSettings.ts (check if URL is encoded when saved)
```

**Testing:**
- [ ] Charger page paramètres Digiforma
- [ ] Vérifier affichage de l'URL dans le champ
- [ ] Sauvegarder et recharger pour vérifier persistence

---

## Files Overview

### New Files to Create:
```
packages/backend/src/services/SageService.ts
packages/backend/src/models/SageSettings.ts
packages/backend/src/controllers/SageController.ts
packages/backend/src/routes/sage.ts
packages/backend/migrations/YYYY-MM-DD-add-accounting-id.ts
packages/backend/migrations/YYYY-MM-DD-create-sage-settings.ts
packages/frontend/src/views/settings/SageSettingsView.vue
packages/frontend/src/components/settings/SageConfigPanel.vue
```

### Files to Modify:
```
packages/backend/src/models/MedicalInstitution.ts
packages/backend/src/services/CsvImportService.ts
packages/backend/src/services/DigiformaService.ts
packages/shared/src/types/institution.ts
packages/frontend/src/components/institutions/InstitutionForm.vue
packages/frontend/src/components/institutions/ImportInstitutionsDialog.vue
```

---

## Testing Strategy

### Unit Tests:
- [ ] Test accountingId unique constraint
- [ ] Test matching logic (exact, fuzzy, accountingId)
- [ ] Test SageService methods (mocked API)

### Integration Tests:
- [ ] Test CSV import with accountingId
- [ ] Test Digiforma search and sync
- [ ] Test duplicate detection with mixed criteria

### Manual Tests:
- [ ] Import CSV avec numéros comptables
- [ ] Vérifier création dans Digiforma (quand mutation ready)
- [ ] Tester interface Sage (quand credentials disponibles)

---

## Deployment Notes

1. **Database migrations:**
   ```bash
   # Add accounting_id column
   npm run migrate
   ```

2. **Environment variables:**
   ```env
   # Sage configuration (optional for v1)
   SAGE_ENABLED=false
   SAGE_API_URL=
   SAGE_API_KEY=
   SAGE_COMPANY_ID=
   ```

3. **Digiforma mutations:**
   - Update queries.md with new mutation definitions
   - Test mutations in Digiforma GraphQL playground first

---

## Success Criteria

✅ Institutions have `accountingId` field
✅ CSV import matches by `accountingId` first
✅ Fuzzy matching works for name variations
✅ Digiforma integration TODOs are in place
✅ Sage service skeleton is ready with TODOs
✅ UI shows sync status for Digiforma/Sage
✅ URL encoding bug is fixed

---

## Notes

- **Digiforma mutations:** Need to identify exact GraphQL mutation names/schemas
- **Sage API:** Need credentials to test actual integration
- **Fuzzy matching:** Consider using `fuse.js` or `string-similarity` npm package
- **V2 features:** CRM → Sage sync (create invoices in Sage from CRM quotes)
