Address handling refactor (feature-flagged)

Goals
- Stabilize includes/filters on address fields that previously used JSONB dot-paths.
- Allow incremental rollout of a relational address without breaking existing JSONB reads.

Current state
- JSONB filtering uses `Sequelize.where(Sequelize.json('...'))` instead of string keys like `'address.city'`.
- Optional relational model `InstitutionAddress` (1:1 with `MedicalInstitution`) is added and associated as `addressRel`.
- No migration is required in dev; relational includes are only used when the feature flag is enabled.

Feature flag
- Env var: `USE_RELATIONAL_ADDRESSES`
  - `true`: queries that filter by city/state use a nested include on `addressRel`.
  - otherwise: queries continue to use JSONB filters via `Sequelize.json`.

Key touchpoints
- `models/MedicalInstitution.ts`
  - `findByLocation`, `searchInstitutions`: conditional include on `addressRel` vs JSONB filtering.
  - `getFullAddress()`: prefers `addressRel` if loaded, else falls back to JSONB.
- `models/Segment.ts` and `services/SegmentService.ts`
  - When including an `institution` with city/state filters, conditionally include `addressRel`.
- `services/ExportService.ts`
  - Optionally includes `addressRel` and prefers it when present; otherwise uses JSONB.

Testing
- Unit tests mock Sequelize calls (no pg-mem) to assert that the correct includes/where clauses are built under both flag states.
  - `packages/backend/src/__tests__/models/medical-institution-address-relational.test.ts`

Migration plan (for later)
1) Create `institution_addresses` table, backfill from JSONB.
2) Dual-write on create/update (JSONB + relational) during a transition window.
3) Flip reads to relational only; remove JSONB reads.
4) Drop JSONB `address` column and related GIN index.

Rationale for feature flag
- Enables safe adoption without schema changes in development.
- Supports zero-downtime rollout and easy rollback in production.
- Preserves API response shape (`address` object) while allowing internal refactor.

