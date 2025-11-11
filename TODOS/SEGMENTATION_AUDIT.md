# Audit du Système de Segmentation - Date: 2025-11-11

## Résumé Exécutif

Le système de segmentation présente plusieurs problèmes qui peuvent expliquer les comportements incohérents signalés :

- **Critique** : Désynchronisation entre Sequelize et les champs TypeScript du modèle Segment
- **Critique** : Injection SQL potentielle dans les filtres de recherche
- **Important** : Cache frontend non invalidé lors des modifications
- **Important** : Gestion d'erreur trop permissive masquant les vrais problèmes
- **Moyen** : Problèmes de performance sur le chargement des segments

## Problèmes Identifiés

### 1. 🔴 CRITIQUE : Désynchronisation Sequelize (Bug récurrent)

**Localisation** : `packages/backend/src/controllers/SegmentController.ts`

**Problème** : Les champs `criteria` et `type` du modèle Segment ne sont pas correctement accessibles via les instances Sequelize. Un workaround est appliqué partout :

```typescript
// Workaround appliqué dans getSegments(), getSegment(), getSegmentResults(), getSegmentAnalytics()
const segmentData = segment.toJSON() as any
segment.criteria = segmentData.criteria
segment.type = segmentData.type
```

**Impact** :
- Code fragile et redondant
- Risque de perte de données si le workaround n'est pas appliqué
- Performances dégradées (conversion JSON inutile)

**Cause probable** : Incompatibilité entre les champs publics TypeScript et les getters/setters Sequelize

**Solution recommandée** :
```typescript
// Dans Segment.ts, remplacer les champs publics par des getters/setters
export class Segment extends Model<SegmentAttributes, SegmentCreationAttributes> {
  // Au lieu de: public criteria!: SegmentCriteria
  // Utiliser:
  declare criteria: SegmentCriteria
  declare type: SegmentType
  // etc...
}
```

---

### 2. 🔴 CRITIQUE : Injection SQL potentielle

**Localisation** : `packages/backend/src/services/SegmentService.ts`

**Problème** : Utilisation de Sequelize.literal avec interpolation de chaîne non sécurisée :

```typescript
// Ligne 99, 105, 195, 202, 286, 294
const cityCondition = Sequelize.literal(
  `"institution"."address"->>'city' ILIKE '%${instFilters.city.replace(/'/g, "''")}%'`
)
```

**Impact** :
- Vulnérabilité d'injection SQL
- L'échappement avec `.replace(/'/g, "''")` n'est PAS suffisant contre toutes les attaques

**Solution recommandée** :
```typescript
// Utiliser des placeholders Sequelize
const cityCondition = Sequelize.where(
  Sequelize.fn('LOWER', Sequelize.col('institution.address', 'city')),
  Op.like,
  `%${instFilters.city.toLowerCase()}%`
)

// OU utiliser directement les opérateurs JSONB de Sequelize
// au lieu de Sequelize.literal
```

---

### 3. 🟠 IMPORTANT : Cache frontend non invalidé

**Localisation** : `packages/frontend/src/composables/useSegmentation.ts`

**Problème** : Le cache global `segmentsCache` (TTL 5 minutes) n'est pas invalidé lors des opérations CRUD :

```typescript
// createSegment, updateSegment, deleteSegment ne mettent pas à jour le cache
const createSegment = async (data: SegmentCreationAttributes) => {
  const response = await segmentationApi.createSegment(data)
  segments.value.push(response.data)  // ✅ Met à jour la ref locale
  // ❌ Ne met PAS à jour segmentsCache.value
  return response.data
}
```

**Impact** :
- Après création d'un segment, il peut ne pas apparaître dans la liste pendant 5 minutes
- Les modifications peuvent ne pas être visibles immédiatement
- Incohérences entre différents onglets/fenêtres

**Solution recommandée** :
```typescript
const createSegment = async (data: SegmentCreationAttributes) => {
  loading.value = true
  error.value = null
  try {
    const response = await segmentationApi.createSegment(data)
    segments.value.push(response.data)

    // Invalider le cache
    segmentsCache.value = {
      data: segments.value,
      lastUpdated: Date.now(),
      ttl: 5 * 60 * 1000
    }

    return response.data
  } catch (err) {
    // ... gestion erreur
  }
}
```

---

### 4. 🟠 IMPORTANT : Gestion d'erreur trop permissive

**Localisation** : `packages/backend/src/controllers/SegmentController.ts:75-84`

**Problème** : Toutes les erreurs de `getSegments()` retournent 200 avec des données vides :

```typescript
catch (error) {
  logger.error('getSegmentResults error', { error: (error as Error).message, stack: (error as Error).stack, id: ctx.params.id })
  ctx.status = 200  // ❌ Devrait être 500
  ctx.body = {
    success: true,  // ❌ Devrait être false
    data: [],       // ❌ Masque l'erreur
    meta: { total: 0, limit: 0, offset: 0 },
  }
}
```

**Impact** :
- Les vraies erreurs sont masquées
- Frontend pense que la requête a réussi mais qu'il n'y a juste pas de segments
- Debugging très difficile

**Solution recommandée** :
```typescript
catch (error) {
  logger.error('getSegments error', { error: (error as Error).message })
  ctx.status = 500
  ctx.body = {
    success: false,
    error: (error as Error).message
  }
}
```

---

### 5. 🟡 MOYEN : Performances - Stats calculées pour tous les segments

**Localisation** : `packages/backend/src/controllers/SegmentController.ts:41-69`

**Problème** : Les statistiques sont calculées pour TOUS les segments à chaque appel de `getSegments()` :

```typescript
const segmentsWithStats = await Promise.all(
  filteredSegments.map(async (segment) => {
    const stats = await SegmentService.getSegmentStats(segment)
    return { ...segmentData, stats }
  })
)
```

**Impact** :
- Temps de réponse très lent si beaucoup de segments
- Pas de pagination = tout est chargé en mémoire
- Peut timeout sur gros volumes

**Solution recommandée** :
- Paginer les segments
- Calculer les stats uniquement sur demande (endpoint séparé)
- Ou mettre les stats en cache dans la DB (colonne calculée)

---

### 6. 🟡 MOYEN : Confusion role vs title dans les filtres Contact

**Localisation** : `packages/backend/src/services/SegmentService.ts:49-55`

**Problème** : Les filtres de contact utilisent `role` mais mappent vers `title` :

```typescript
// Dans les types, on a contactFilters.role
if (contactFilters.role && contactFilters.role.length > 0) {
  whereClause.title = { [Op.in]: contactFilters.role }  // ❌ Incohérence
}
```

**Impact** :
- Confusion pour les utilisateurs
- Requêtes qui ne fonctionnent pas comme attendu

**Solution recommandée** :
```typescript
// Soit renommer role → title partout
// Soit renommer title → role dans le modèle ContactPerson
if (contactFilters.title && contactFilters.title.length > 0) {
  whereClause.title = { [Op.in]: contactFilters.title }
}
```

---

### 7. 🟢 MINEUR : Pas de pagination sur getSegments

**Solution recommandée** : Ajouter limit/offset dans la query string

---

## Reproductions et Tests

### Test 1 : Vérifier le bug du cache
```bash
# 1. Créer un segment via l'UI
# 2. Rafraîchir la page
# 3. Le nouveau segment devrait apparaître immédiatement
# RÉSULTAT ACTUEL : Ne apparaît pas jusqu'au prochain reload (5 min)
```

### Test 2 : Vérifier la désynchronisation Sequelize
```bash
# 1. Créer un segment avec des filtres complexes
# 2. Ouvrir les DevTools et voir les logs
# 3. Chercher "Fix Sequelize field access issue"
# RÉSULTAT ACTUEL : Le workaround est appliqué partout
```

### Test 3 : Injection SQL (NE PAS EXÉCUTER EN PRODUCTION)
```bash
# Créer un segment avec city = "'; DROP TABLE segments; --"
# RÉSULTAT ACTUEL : Peut réussir l'injection si pas d'autres protections
```

---

## Plan de Correction Recommandé

### Phase 1 - Critique (URGENT)
1. ✅ Corriger la désynchronisation Sequelize (utiliser `declare`)
2. ✅ Remplacer Sequelize.literal par des queries sécurisées
3. ✅ Invalider le cache lors des modifications

### Phase 2 - Important (1 semaine)
4. ✅ Corriger la gestion d'erreur dans getSegments
5. ✅ Renommer role → title pour cohérence
6. ✅ Ajouter des tests d'intégration

### Phase 3 - Amélioration (2 semaines)
7. ✅ Implémenter la pagination
8. ✅ Optimiser le calcul des stats (cache ou lazy load)
9. ✅ Ajouter des index DB si nécessaire

---

## Métriques Actuelles

- **Nombre de segments testés** : N/A
- **Temps de réponse moyen** : Non mesuré
- **Taux d'erreur** : Masqué par le catch trop permissif
- **Couverture de tests** : À vérifier

---

## Conclusion

Le système de segmentation a une architecture solide mais souffre de plusieurs problèmes d'implémentation qui peuvent causer des comportements incohérents. Les problèmes critiques (Sequelize, SQL injection, cache) doivent être corrigés en priorité.

**Estimation du temps de correction** : 2-3 jours pour les problèmes critiques
