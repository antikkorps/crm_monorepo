# Guide d'Exploration des Mutations Digiforma GraphQL

**GraphiQL URL:** https://app.digiforma.com/api/v1/graphiql

## 🎯 Mutations à Identifier

Pour compléter l'implémentation de la Task 29, nous avons besoin d'identifier les mutations GraphQL exactes dans Digiforma pour :

### 1. Créer une entreprise (Company)

**Ce qu'on cherche :**
```graphql
mutation CreateCompany($input: CompanyInput!) {
  createCompany(input: $input) {
    id
    name
    accountingNumber  # ✅ CONFIRMÉ (pas accountingId)
    address {
      street
      city
      zipCode
      country
    }
    # ... autres champs
  }
}
```

**Input probable :**
```graphql
input CompanyInput {
  name: String!
  accountingNumber: String
  address: AddressInput
  # ... autres champs à identifier
}
```

### 2. Rechercher une entreprise par nom et ville

**Ce qu'on cherche :**
```graphql
query SearchCompanies($name: String!, $city: String) {
  companies(where: { name: { contains: $name }, address: { city: { equals: $city } } }) {
    id
    name
    accountingNumber
    address {
      city
      street
    }
  }
}
```

**Alternative possible :**
```graphql
query SearchCompanies($filter: CompanyFilterInput) {
  searchCompanies(filter: $filter) {
    id
    name
    accountingNumber
  }
}
```

### 3. Récupérer les détails complets d'une entreprise

**Ce qu'on cherche :**
```graphql
query GetCompany($id: ID!) {
  company(id: $id) {
    id
    name
    accountingNumber
    address {
      street
      city
      zipCode
      country
      state
    }
    contacts {
      id
      firstName
      lastName
      email
      phone
    }
    # ... tous les champs disponibles
  }
}
```

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
