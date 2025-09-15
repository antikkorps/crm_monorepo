JSONB usage guidelines

- Prefer `Sequelize.where(Sequelize.json('path.to.key'), condition)` for JSONB filtering.
- When filtering inside an include, prefix the JSON path with the include alias (e.g., `institution.address.city`).
- Avoid using string keys like `'address.city'` directly in `where`—this causes incompatibilities during eager loads.
- Keep JSON shape stable and validated at the model level. Required fields: `street`, `city`, `state`, `zipCode`, `country`.
- Indexing: GIN index on the JSONB column benefits containment queries; `ILIKE` on extracted text may not use the index.
- For heavy querying needs, consider migrating to a relational `addresses` table and joining by FK.
