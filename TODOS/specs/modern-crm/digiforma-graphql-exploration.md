# Guide d'Exploration des Mutations Digiforma GraphQL

**GraphiQL URL:** https://app.digiforma.com/api/v1/graphiql

## ✅ Structure GraphQL Confirmée

### Types Identifiés

**Company** - Type principal pour les entreprises
**CompanyFilter** - Filtre pour rechercher des entreprises
**CompanyInput** - Input pour créer/modifier des entreprises

### CompanyFilter (CONFIRMÉ)

```graphql
input CompanyFilter {
  accountingNumber: String
  code: String
  email: String
  group: String
  name: String
  siret: String
}
```

## 🎯 Queries Identifiées

### 1. Rechercher des entreprises

**Query confirmée :**
```graphql
query SearchCompany {
  companies(filter: { name: "POLE SANTE" }) {
    id
    name
    city
  }
}
```

**Note :** Requiert un bearer token valide. Sans token, retourne :
```json
{
  "data": { "companies": null },
  "errors": [{
    "message": "Unauthorized, you need an authorization token in your HTTP Header..."
  }]
}
```

**Filtres disponibles :**
- `accountingNumber` - Numéro comptable (notre clé de matching !)
- `code` - Code entreprise
- `email` - Email entreprise
- `group` - Groupe d'entreprises
- `name` - Nom de l'entreprise
- `siret` - Numéro SIRET

**Exemple avec accountingNumber :**
```graphql
query SearchByAccountingNumber {
  companies(filter: { accountingNumber: "CLI001" }) {
    id
    name
    accountingNumber
    city
    siret
  }
}
```

**Exemple avec plusieurs filtres :**
```graphql
query SearchCompanies {
  companies(filter: {
    name: "POLE SANTE",
    city: "Paris"
  }) {
    id
    name
    accountingNumber
    city
    siret
    email
  }
}
```

## 🔍 À Explorer Avec Token

### Query Company (récupérer une entreprise par ID)

```graphql
query GetCompany($id: ID!) {
  company(id: $id) {
    id
    name
    accountingNumber
    code
    siret
    email
    # TODO: Identifier tous les champs disponibles
    # city, street, zipCode, etc.
  }
}
```

### Mutations à Identifier

#### createCompany (ou addCompany)

**À tester :**
```graphql
mutation CreateCompany($input: CompanyInput!) {
  createCompany(input: $input) {
    id
    name
    accountingNumber
  }
}
```

**OU peut-être :**
```graphql
mutation AddCompany($input: CompanyInput!) {
  addCompany(input: $input) {
    id
    name
  }
}
```

**Variables possibles :**
```json
{
  "input": {
    "name": "Test Company",
    "accountingNumber": "TEST001",
    "siret": "12345678900001",
    "email": "contact@test.com"
  }
}
```

#### updateCompany

```graphql
mutation UpdateCompany($id: ID!, $input: CompanyInput!) {
  updateCompany(id: $id, input: $input) {
    id
    name
    accountingNumber
  }
}
```

## 📋 Checklist d'Exploration (avec Token)

### Queries
- [x] Identifier `companies(filter: CompanyFilter)` ✅
- [x] Confirmer champs de `CompanyFilter` ✅
- [ ] Tester `company(id: ID!)` pour récupérer une entreprise
- [ ] Identifier tous les champs retournés par Company (address, contacts, etc.)
- [ ] Tester recherche par `accountingNumber`
- [ ] Tester recherche par `siret`
- [ ] Vérifier si pagination existe (first, after, etc.)

### Mutations
- [ ] Identifier nom exact de création : `createCompany` ou `addCompany` ?
- [ ] Identifier champs requis de `CompanyInput`
- [ ] Identifier champs optionnels de `CompanyInput`
- [ ] Tester création d'une entreprise test
- [ ] Identifier mutation de mise à jour
- [ ] Identifier mutation de suppression (si existe)

### Structure CompanyInput (à documenter)
- [ ] Champs de base (name, email, siret, accountingNumber, code)
- [ ] Champs d'adresse (street, city, zipCode, country, state)
- [ ] Autres champs métier (group, etc.)

## 🔨 Implémentation pour DigiformaService

### searchCompanyByName (Prêt à implémenter)

```typescript
// packages/backend/src/services/DigiformaService.ts

public async searchCompanyByName(
  name: string,
  city?: string
): Promise<any | null> {
  const filter: any = { name }
  if (city) {
    filter.city = city
  }

  const query = `
    query SearchCompanies($filter: CompanyFilter!) {
      companies(filter: $filter) {
        id
        name
        accountingNumber
        siret
        email
        city
      }
    }
  `

  const variables = { filter }

  const response = await this.makeGraphQLRequest(query, variables)
  const companies = response.data?.companies

  if (!companies || companies.length === 0) {
    return null
  }

  // Return first match
  return companies[0]
}
```

### searchCompanyByAccountingNumber (Nouveau - Important!)

```typescript
public async searchCompanyByAccountingNumber(
  accountingNumber: string
): Promise<any | null> {
  const query = `
    query SearchByAccountingNumber($filter: CompanyFilter!) {
      companies(filter: $filter) {
        id
        name
        accountingNumber
        siret
        email
        city
      }
    }
  `

  const variables = {
    filter: { accountingNumber }
  }

  const response = await this.makeGraphQLRequest(query, variables)
  const companies = response.data?.companies

  if (!companies || companies.length === 0) {
    return null
  }

  return companies[0]
}
```

### createCompany (TODO - needs CompanyInput structure)

```typescript
public async createCompany(data: {
  name: string
  accountingNumber?: string
  siret?: string
  email?: string
  code?: string
  // ... other fields to identify
}): Promise<any> {
  // TODO: Identifier le nom exact de la mutation
  const mutation = `
    mutation CreateCompany($input: CompanyInput!) {
      createCompany(input: $input) {
        id
        name
        accountingNumber
        siret
        email
      }
    }
  `

  const variables = { input: data }

  const response = await this.makeGraphQLRequest(mutation, variables)
  return response.data?.createCompany
}
```

## 📄 Tests à Effectuer (avec Token)

### 1. Test de recherche simple
```graphql
query TestSearch {
  companies(filter: { name: "POLE" }) {
    id
    name
    city
  }
}
```

### 2. Test recherche par accountingNumber
```graphql
query TestAccountingSearch {
  companies(filter: { accountingNumber: "CLI001" }) {
    id
    name
    accountingNumber
  }
}
```

### 3. Test récupération complète
```graphql
query TestFullCompany($id: ID!) {
  company(id: $id) {
    id
    name
    accountingNumber
    siret
    code
    email
    # Ajouter tous les champs disponibles
  }
}
```

### 4. Test création (prudence!)
```graphql
mutation TestCreate {
  createCompany(input: {
    name: "TEST COMPANY - DELETE ME"
    accountingNumber: "TEST999"
  }) {
    id
    name
  }
}
```
**⚠️ ATTENTION :** Créer avec un nom clairement identifiable pour suppression facile

## 🚀 Prochaines Étapes

1. **Avec token valide :**
   - [ ] Tester `companies` query avec différents filtres
   - [ ] Tester `company(id)` query
   - [ ] Identifier tous les champs disponibles sur Company
   - [ ] Identifier structure complète de CompanyInput
   - [ ] Identifier nom exact de mutation création
   - [ ] Tester création d'une entreprise test

2. **Mettre à jour le code :**
   - [ ] Implémenter `searchCompanyByAccountingNumber()` dans DigiformaService
   - [ ] Implémenter `searchCompanyByName()` avec nouvelle structure
   - [ ] Implémenter `createCompany()` une fois mutation identifiée
   - [ ] Mettre à jour types TypeScript

3. **Documentation :**
   - [ ] Documenter tous les champs de Company
   - [ ] Documenter tous les champs de CompanyInput
   - [ ] Ajouter exemples de variables GraphQL

---

**Dernière mise à jour :** Structure CompanyFilter confirmée avec 6 champs (accountingNumber, code, email, group, name, siret)

## 📝 Comment Explorer dans GraphiQL

### Étape 1 : Documentation Explorer
1. Ouvrir https://app.digiforma.com/api/v1/graphiql
2. Cliquer sur "Docs" dans le coin supérieur droit
3. Chercher :
   - "Mutation" → regarder toutes les mutations disponibles
   - "Company" ou "Entreprise" → voir les types et inputs
   - "Query" → voir les queries de recherche

### Étape 2 : Autocomplete
1. Dans l'éditeur GraphiQL, taper `mutation {`
2. Appuyer sur `Ctrl+Space` pour voir toutes les mutations disponibles
3. Chercher des mots-clés comme :
   - `create` + `Company`
   - `add` + `Entreprise`
   - `insert` + `Company`

### Étape 3 : Schéma Introspection
1. Dans GraphiQL, exécuter :
```graphql
query IntrospectionQuery {
  __schema {
    mutationType {
      fields {
        name
        description
      }
    }
  }
}
```
2. Lister toutes les mutations disponibles

### Étape 4 : Tester une Mutation
1. Une fois trouvée, tester avec des données factices :
```graphql
mutation TestCreateCompany {
  createCompany(input: {
    name: "Test Company"
    accountingNumber: "TEST001"
    address: {
      street: "123 Test St"
      city: "Paris"
      zipCode: "75001"
      country: "France"
    }
  }) {
    id
    name
  }
}
```

## 📊 Informations Confirmées

### ✅ Champ Comptable
**Nom du champ :** `accountingNumber` (PAS `accountingId`)

**À mettre à jour dans le code :**
```typescript
// Au lieu de:
interface DigiformaCompany {
  accountingId: string  // ❌ INCORRECT
}

// Utiliser:
interface DigiformaCompany {
  accountingNumber: string  // ✅ CORRECT
}
```

## 🔍 Checklist d'Exploration

- [ ] Identifier mutation `createCompany` (ou nom équivalent)
- [ ] Identifier les champs requis de `CompanyInput`
- [ ] Identifier les champs optionnels de `CompanyInput`
- [ ] Tester création d'une entreprise fictive
- [ ] Identifier query de recherche par nom/ville
- [ ] Tester recherche d'entreprises existantes
- [ ] Identifier query `company(id: ID!)`
- [ ] Vérifier si `accountingNumber` est bien le bon nom
- [ ] Vérifier structure de `AddressInput`
- [ ] Noter tous les champs disponibles pour sync complète

## 📄 Documenter les Résultats

Une fois les mutations/queries identifiées, mettre à jour :

1. **DigiformaService.ts** - Remplacer les TODOs par les vraies queries
2. **types/digiforma.ts** - Ajouter les interfaces TypeScript correctes
3. **Task 29 doc** - Mettre à jour avec les noms exacts des mutations

### Template de Documentation

```markdown
## Mutation createCompany (IDENTIFIÉE)

**Nom exact :** `createCompany` ou `addCompany` ou `[nom trouvé]`

**Signature :**
```graphql
[Coller la signature exacte depuis GraphiQL]
```

**Input requis :**
- `name` (String!) - Nom de l'entreprise
- `accountingNumber` (String) - Numéro comptable
- [Autres champs...]

**Exemple d'utilisation :**
```graphql
[Coller un exemple fonctionnel]
```

**Champs retournés :**
- `id` - ID Digiforma
- `name` - Nom
- [Tous les champs disponibles...]
```

## 🚀 Prochaines Étapes

1. **Explorer GraphiQL** avec le bearer token actuel
2. **Documenter les mutations** trouvées dans ce fichier
3. **Mettre à jour le code** avec les bonnes queries/mutations
4. **Tester l'intégration** avec des données réelles

---

**Note :** Ce guide sera mis à jour au fur et à mesure de l'exploration. Ajouter les découvertes ici pour référence future.
