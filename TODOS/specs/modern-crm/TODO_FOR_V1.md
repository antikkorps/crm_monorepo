# TODO TO V1.1

## deployment done

- [x] 2026-01-08: v1 is deployed

## date: 2026-01-08

### Context

we are almost done to v1 but still have some elements to prepare

### TODO

- [ ] In institution timeline add lazy-loading of timeline
- [ ] "Se souvenir de moi" on login page (make it useful)
- [ ] correct the tests which are not passing (mock database connexions in order to not have to set up a test database)
- [ ] Search functionnality to set up (meilisearch dockerize? which is best option ?)
- [ ] It seems that there is an issue with socket.io for the notifications (debug => one task with an issue tomorrow not appearing in notification center)
- [x] A validation message for the resetting password is perhaps not the best option. We should validate live during the user typing and live comparing the two inputs...

### Decision

### SQL Error

```bash
original: error: column Invoice.remaining_amount does not exist
      at Parser.parseErrorMessage (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:369:69)
      at Parser.handlePacket (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:187:21)
      at Parser.parse (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:102:30)
      at Socket.<anonymous> (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/index.ts:7:48)
      at Socket.emit (node:events:518:28)
      at addChunk (node:internal/streams/readable:561:12)
      at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
      at Readable.push (node:internal/streams/readable:392:5)
      at TCP.onStreamRead (node:internal/stream_base_commons:189:23) {
    length: 123,
    severity: 'ERROR',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '383',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3822',
    routine: 'errorMissingColumn',
    sql: `SELECT "Invoice"."id", "Invoice"."invoice_number" AS "invoiceNumber", "Invoice"."institution_id" AS "institutionId", "Invoice"."assigned_user_id" AS "assignedUserId", "Invoice"."quote_id" AS "quoteId", "Invoice"."template_id" AS "templateId", "Invoice"."title", "Invoice"."description", "Invoice"."due_date" AS "dueDate", "Invoice"."status", "Invoice"."paid_amount" AS "totalPaid", "Invoice"."remaining_amount" AS "remainingAmount", "Invoice"."last_payment_date" AS "lastPaymentDate", "Invoice"."subtotal", "Invoice"."total_discount_amount" AS "totalDiscountAmount", "Invoice"."total_tax_amount" AS "totalTaxAmount", "Invoice"."total", "Invoice"."sent_at" AS "sentAt", "Invoice"."paid_at" AS "paidAt", "Invoice"."archived", "Invoice"."created_at" AS "createdAt", "Invoice"."updated_at" AS "updatedAt", "institution"."id" AS "institution.id", "institution"."name" AS "institution.name", "institution"."type" AS "institution.type", "institution"."address" AS "institution.address", "institution"."accounting_number" AS "institution.accountingNumber", "institution"."digiforma_id" AS "institution.digiformaId", "institution"."assigned_user_id" AS "institution.assignedUserId", "institution"."tags" AS "institution.tags", "institution"."is_active" AS "institution.isActive", "institution"."data_source" AS "institution.dataSource", "institution"."is_locked" AS "institution.isLocked", "institution"."locked_at" AS "institution.lockedAt", "institution"."locked_reason" AS "institution.lockedReason", "institution"."external_data" AS "institution.externalData", "institution"."last_sync_at" AS "institution.lastSyncAt", "institution"."created_at" AS "institution.createdAt", "institution"."updated_at" AS "institution.updatedAt", "institution->medicalProfile"."id" AS "institution.medicalProfile.id", "institution->medicalProfile"."institution_id" AS "institution.medicalProfile.institutionId", "institution->medicalProfile"."bed_capacity" AS "institution.medicalProfile.bedCapacity", "institution->medicalProfile"."surgical_rooms" AS "institution.medicalProfile.surgicalRooms", "institution->medicalProfile"."specialties" AS "institution.medicalProfile.specialties", "institution->medicalProfile"."departments" AS "institution.medicalProfile.departments", "institution->medicalProfile"."equipment_types" AS "institution.medicalProfile.equipmentTypes", "institution->medicalProfile"."certifications" AS "institution.medicalProfile.certifications", "institution->medicalProfile"."compliance_status" AS "institution.medicalProfile.complianceStatus", "institution->medicalProfile"."last_audit_date" AS "institution.medicalProfile.lastAuditDate", "institution->medicalProfile"."compliance_expiration_date" AS "institution.medicalProfile.complianceExpirationDate", "institution->medicalProfile"."compliance_notes" AS "institution.medicalProfile.complianceNotes", "institution->medicalProfile"."created_at" AS "institution.medicalProfile.createdAt", "institution->medicalProfile"."updated_at" AS "institution.medicalProfile.updatedAt" FROM "invoices" AS "Invoice" LEFT OUTER JOIN "medical_institutions" AS "institution" ON "Invoice"."institution_id" = "institution"."id" LEFT OUTER JOIN "medical_profiles" AS "institution->medicalProfile" ON "institution"."id" = "institution->medicalProfile"."institution_id" WHERE "Invoice"."status" != 'cancelled';`,
    parameters: undefined
  },
  sql: `SELECT "Invoice"."id", "Invoice"."invoice_number" AS "invoiceNumber", "Invoice"."institution_id" AS "institutionId", "Invoice"."assigned_user_id" AS "assignedUserId", "Invoice"."quote_id" AS "quoteId", "Invoice"."template_id" AS "templateId", "Invoice"."title", "Invoice"."description", "Invoice"."due_date" AS "dueDate", "Invoice"."status", "Invoice"."paid_amount" AS "totalPaid", "Invoice"."remaining_amount" AS "remainingAmount", "Invoice"."last_payment_date" AS "lastPaymentDate", "Invoice"."subtotal", "Invoice"."total_discount_amount" AS "totalDiscountAmount", "Invoice"."total_tax_amount" AS "totalTaxAmount", "Invoice"."total", "Invoice"."sent_at" AS "sentAt", "Invoice"."paid_at" AS "paidAt", "Invoice"."archived", "Invoice"."created_at" AS "createdAt", "Invoice"."updated_at" AS "updatedAt", "institution"."id" AS "institution.id", "institution"."name" AS "institution.name", "institution"."type" AS "institution.type", "institution"."address" AS "institution.address", "institution"."accounting_number" AS "institution.accountingNumber", "institution"."digiforma_id" AS "institution.digiformaId", "institution"."assigned_user_id" AS "institution.assignedUserId", "institution"."tags" AS "institution.tags", "institution"."is_active" AS "institution.isActive", "institution"."data_source" AS "institution.dataSource", "institution"."is_locked" AS "institution.isLocked", "institution"."locked_at" AS "institution.lockedAt", "institution"."locked_reason" AS "institution.lockedReason", "institution"."external_data" AS "institution.externalData", "institution"."last_sync_at" AS "institution.lastSyncAt", "institution"."created_at" AS "institution.createdAt", "institution"."updated_at" AS "institution.updatedAt", "institution->medicalProfile"."id" AS "institution.medicalProfile.id", "institution->medicalProfile"."institution_id" AS "institution.medicalProfile.institutionId", "institution->medicalProfile"."bed_capacity" AS "institution.medicalProfile.bedCapacity", "institution->medicalProfile"."surgical_rooms" AS "institution.medicalProfile.surgicalRooms", "institution->medicalProfile"."specialties" AS "institution.medicalProfile.specialties", "institution->medicalProfile"."departments" AS "institution.medicalProfile.departments", "institution->medicalProfile"."equipment_types" AS "institution.medicalProfile.equipmentTypes", "institution->medicalProfile"."certifications" AS "institution.medicalProfile.certifications", "institution->medicalProfile"."compliance_status" AS "institution.medicalProfile.complianceStatus", "institution->medicalProfile"."last_audit_date" AS "institution.medicalProfile.lastAuditDate", "institution->medicalProfile"."compliance_expiration_date" AS "institution.medicalProfile.complianceExpirationDate", "institution->medicalProfile"."compliance_notes" AS "institution.medicalProfile.complianceNotes", "institution->medicalProfile"."created_at" AS "institution.medicalProfile.createdAt", "institution->medicalProfile"."updated_at" AS "institution.medicalProfile.updatedAt" FROM "invoices" AS "Invoice" LEFT OUTER JOIN "medical_institutions" AS "institution" ON "Invoice"."institution_id" = "institution"."id" LEFT OUTER JOIN "medical_profiles" AS "institution->medicalProfile" ON "institution"."id" = "institution->medicalProfile"."institution_id" WHERE "Invoice"."status" != 'cancelled';`,
  parameters: {}
}
Error in getCashFlowProjections: Error
    at Query.run (/home/franck/projects/perso/crm_monorepo/node_modules/sequelize/src/dialects/postgres/query.js:76:25)
    at <anonymous> (/home/franck/projects/perso/crm_monorepo/node_modules/sequelize/src/sequelize.js:650:28)
    at async PostgresQueryInterface.select (/home/franck/projects/perso/crm_monorepo/node_modules/sequelize/src/dialects/abstract/query-interface.js:1001:12)
    at async Function.findAll (/home/franck/projects/perso/crm_monorepo/node_modules/sequelize/src/model.js:1824:21)
    at async Function.getCashFlowProjections (/home/franck/projects/perso/crm_monorepo/packages/backend/src/services/BillingAnalyticsService.ts:494:33)
    at async Promise.allSettled (index 4)
    at async Function.getBillingDashboardData (/home/franck/projects/perso/crm_monorepo/packages/backend/src/services/BillingAnalyticsService.ts:599:23)
    at async getDashboard (/home/franck/projects/perso/crm_monorepo/packages/backend/src/controllers/BillingAnalyticsController.ts:26:29)
    at async <anonymous> (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/permissions.ts:807:5)
    at async authenticate (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/auth.ts:33:5)
    at async securityLoggingMiddleware (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/securityLogging.ts:10:5)
    at async <anonymous> (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/rateLimiting.ts:66:5)
    at async inputValidationMiddleware (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/inputSanitization.ts:102:5)
    at async bodyParser (/home/franck/projects/perso/crm_monorepo/node_modules/koa-bodyparser/index.js:78:5)
    at async cors (/home/franck/projects/perso/crm_monorepo/node_modules/@koa/cors/index.js:109:16)
    at async requestLogger (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/requestLogger.ts:24:3) {
  name: 'SequelizeDatabaseError',
  parent: error: column Invoice.remaining_amount does not exist
      at Parser.parseErrorMessage (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:369:69)
      at Parser.handlePacket (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:187:21)
      at Parser.parse (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:102:30)
      at Socket.<anonymous> (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/index.ts:7:48)
      at Socket.emit (node:events:518:28)
      at addChunk (node:internal/streams/readable:561:12)
      at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
      at Readable.push (node:internal/streams/readable:392:5)
      at TCP.onStreamRead (node:internal/stream_base_commons:189:23) {
    length: 123,
    severity: 'ERROR',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '383',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3822',
    routine: 'errorMissingColumn',
    sql: `SELECT "Invoice"."id", "Invoice"."invoice_number" AS "invoiceNumber", "Invoice"."institution_id" AS "institutionId", "Invoice"."assigned_user_id" AS "assignedUserId", "Invoice"."quote_id" AS "quoteId", "Invoice"."template_id" AS "templateId", "Invoice"."title", "Invoice"."description", "Invoice"."due_date" AS "dueDate", "Invoice"."status", "Invoice"."paid_amount" AS "totalPaid", "Invoice"."remaining_amount" AS "remainingAmount", "Invoice"."last_payment_date" AS "lastPaymentDate", "Invoice"."subtotal", "Invoice"."total_discount_amount" AS "totalDiscountAmount", "Invoice"."total_tax_amount" AS "totalTaxAmount", "Invoice"."total", "Invoice"."sent_at" AS "sentAt", "Invoice"."paid_at" AS "paidAt", "Invoice"."archived", "Invoice"."created_at" AS "createdAt", "Invoice"."updated_at" AS "updatedAt", "institution"."id" AS "institution.id", "institution"."name" AS "institution.name", "payments"."id" AS "payments.id", "payments"."invoice_id" AS "payments.invoiceId", "payments"."amount" AS "payments.amount", "payments"."payment_date" AS "payments.paymentDate", "payments"."payment_method" AS "payments.paymentMethod", "payments"."reference" AS "payments.reference", "payments"."status" AS "payments.status", "payments"."notes" AS "payments.notes", "payments"."recorded_by" AS "payments.recordedBy", "payments"."created_at" AS "payments.createdAt", "payments"."updated_at" AS "payments.updatedAt" FROM "invoices" AS "Invoice" LEFT OUTER JOIN "medical_institutions" AS "institution" ON "Invoice"."institution_id" = "institution"."id" LEFT OUTER JOIN "payments" AS "payments" ON "Invoice"."id" = "payments"."invoice_id" AND "payments"."status" = 'confirmed' WHERE "Invoice"."status" IN ('sent', 'partially_paid', 'overdue');`,
    parameters: undefined
  },
  original: error: column Invoice.remaining_amount does not exist
      at Parser.parseErrorMessage (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:369:69)
      at Parser.handlePacket (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:187:21)
      at Parser.parse (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:102:30)
      at Socket.<anonymous> (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/index.ts:7:48)
      at Socket.emit (node:events:518:28)
      at addChunk (node:internal/streams/readable:561:12)
      at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
      at Readable.push (node:internal/streams/readable:392:5)
      at TCP.onStreamRead (node:internal/stream_base_commons:189:23) {
    length: 123,
    severity: 'ERROR',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '383',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3822',
    routine: 'errorMissingColumn',
    sql: `SELECT "Invoice"."id", "Invoice"."invoice_number" AS "invoiceNumber", "Invoice"."institution_id" AS "institutionId", "Invoice"."assigned_user_id" AS "assignedUserId", "Invoice"."quote_id" AS "quoteId", "Invoice"."template_id" AS "templateId", "Invoice"."title", "Invoice"."description", "Invoice"."due_date" AS "dueDate", "Invoice"."status", "Invoice"."paid_amount" AS "totalPaid", "Invoice"."remaining_amount" AS "remainingAmount", "Invoice"."last_payment_date" AS "lastPaymentDate", "Invoice"."subtotal", "Invoice"."total_discount_amount" AS "totalDiscountAmount", "Invoice"."total_tax_amount" AS "totalTaxAmount", "Invoice"."total", "Invoice"."sent_at" AS "sentAt", "Invoice"."paid_at" AS "paidAt", "Invoice"."archived", "Invoice"."created_at" AS "createdAt", "Invoice"."updated_at" AS "updatedAt", "institution"."id" AS "institution.id", "institution"."name" AS "institution.name", "payments"."id" AS "payments.id", "payments"."invoice_id" AS "payments.invoiceId", "payments"."amount" AS "payments.amount", "payments"."payment_date" AS "payments.paymentDate", "payments"."payment_method" AS "payments.paymentMethod", "payments"."reference" AS "payments.reference", "payments"."status" AS "payments.status", "payments"."notes" AS "payments.notes", "payments"."recorded_by" AS "payments.recordedBy", "payments"."created_at" AS "payments.createdAt", "payments"."updated_at" AS "payments.updatedAt" FROM "invoices" AS "Invoice" LEFT OUTER JOIN "medical_institutions" AS "institution" ON "Invoice"."institution_id" = "institution"."id" LEFT OUTER JOIN "payments" AS "payments" ON "Invoice"."id" = "payments"."invoice_id" AND "payments"."status" = 'confirmed' WHERE "Invoice"."status" IN ('sent', 'partially_paid', 'overdue');`,
    parameters: undefined
  },
  sql: `SELECT "Invoice"."id", "Invoice"."invoice_number" AS "invoiceNumber", "Invoice"."institution_id" AS "institutionId", "Invoice"."assigned_user_id" AS "assignedUserId", "Invoice"."quote_id" AS "quoteId", "Invoice"."template_id" AS "templateId", "Invoice"."title", "Invoice"."description", "Invoice"."due_date" AS "dueDate", "Invoice"."status", "Invoice"."paid_amount" AS "totalPaid", "Invoice"."remaining_amount" AS "remainingAmount", "Invoice"."last_payment_date" AS "lastPaymentDate", "Invoice"."subtotal", "Invoice"."total_discount_amount" AS "totalDiscountAmount", "Invoice"."total_tax_amount" AS "totalTaxAmount", "Invoice"."total", "Invoice"."sent_at" AS "sentAt", "Invoice"."paid_at" AS "paidAt", "Invoice"."archived", "Invoice"."created_at" AS "createdAt", "Invoice"."updated_at" AS "updatedAt", "institution"."id" AS "institution.id", "institution"."name" AS "institution.name", "payments"."id" AS "payments.id", "payments"."invoice_id" AS "payments.invoiceId", "payments"."amount" AS "payments.amount", "payments"."payment_date" AS "payments.paymentDate", "payments"."payment_method" AS "payments.paymentMethod", "payments"."reference" AS "payments.reference", "payments"."status" AS "payments.status", "payments"."notes" AS "payments.notes", "payments"."recorded_by" AS "payments.recordedBy", "payments"."created_at" AS "payments.createdAt", "payments"."updated_at" AS "payments.updatedAt" FROM "invoices" AS "Invoice" LEFT OUTER JOIN "medical_institutions" AS "institution" ON "Invoice"."institution_id" = "institution"."id" LEFT OUTER JOIN "payments" AS "payments" ON "Invoice"."id" = "payments"."invoice_id" AND "payments"."status" = 'confirmed' WHERE "Invoice"."status" IN ('sent', 'partially_paid', 'overdue');`,
  parameters: {}
}
Error in calculateBillingKPIs: Error
    at Query.run (/home/franck/projects/perso/crm_monorepo/node_modules/sequelize/src/dialects/postgres/query.js:76:25)
    at <anonymous> (/home/franck/projects/perso/crm_monorepo/node_modules/sequelize/src/sequelize.js:650:28)
    at async Function.calculateCollectionMetrics (/home/franck/projects/perso/crm_monorepo/packages/backend/src/services/BillingAnalyticsService.ts:1111:21)
    at async Promise.all (index 1)
    at async Function.calculateBillingKPIs (/home/franck/projects/perso/crm_monorepo/packages/backend/src/services/BillingAnalyticsService.ts:1065:7)
    at async Promise.allSettled (index 5)
    at async Function.getBillingDashboardData (/home/franck/projects/perso/crm_monorepo/packages/backend/src/services/BillingAnalyticsService.ts:599:23)
    at async getDashboard (/home/franck/projects/perso/crm_monorepo/packages/backend/src/controllers/BillingAnalyticsController.ts:26:29)
    at async <anonymous> (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/permissions.ts:807:5)
    at async authenticate (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/auth.ts:33:5)
    at async securityLoggingMiddleware (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/securityLogging.ts:10:5)
    at async <anonymous> (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/rateLimiting.ts:66:5)
    at async inputValidationMiddleware (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/inputSanitization.ts:102:5)
    at async bodyParser (/home/franck/projects/perso/crm_monorepo/node_modules/koa-bodyparser/index.js:78:5)
    at async cors (/home/franck/projects/perso/crm_monorepo/node_modules/@koa/cors/index.js:109:16)
    at async requestLogger (/home/franck/projects/perso/crm_monorepo/packages/backend/src/middleware/requestLogger.ts:24:3) {
  name: 'SequelizeDatabaseError',
  parent: error: column i.total_paid does not exist
      at Parser.parseErrorMessage (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:369:69)
      at Parser.handlePacket (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:187:21)
      at Parser.parse (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:102:30)
      at Socket.<anonymous> (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/index.ts:7:48)
      at Socket.emit (node:events:518:28)
      at addChunk (node:internal/streams/readable:561:12)
      at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
      at Readable.push (node:internal/streams/readable:392:5)
      at TCP.onStreamRead (node:internal/stream_base_commons:189:23) {
    length: 111,
    severity: 'ERROR',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '308',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3822',
    routine: 'errorMissingColumn',
    sql: 'SELECT\n' +
      '        AVG(EXTRACT(DAY FROM (p.payment_date - i.created_at))) as avg_collection_time,\n' +
      '        CASE\n' +
      '          WHEN COUNT(DISTINCT i.id) = 0 THEN 0\n' +
      "          ELSE COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END)::float / COUNT(DISTINCT i.id) * 100\n" +
      '        END as collection_rate,\n' +
      '        AVG(i.total_paid / NULLIF(i.total, 0)) * 100 as customer_payment_score\n' +
      '      FROM invoices i\n' +
      "      LEFT JOIN payments p ON p.invoice_id = i.id AND p.status = 'confirmed'\n" +
      "      WHERE i.status != 'cancelled'",
    parameters: undefined
  },
  original: error: column i.total_paid does not exist
      at Parser.parseErrorMessage (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:369:69)
      at Parser.handlePacket (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:187:21)
      at Parser.parse (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/parser.ts:102:30)
      at Socket.<anonymous> (/home/franck/projects/perso/crm_monorepo/node_modules/pg-protocol/src/index.ts:7:48)
      at Socket.emit (node:events:518:28)
      at addChunk (node:internal/streams/readable:561:12)
      at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
      at Readable.push (node:internal/streams/readable:392:5)
      at TCP.onStreamRead (node:internal/stream_base_commons:189:23) {
    length: 111,
    severity: 'ERROR',
    code: '42703',
    detail: undefined,
    hint: undefined,
    position: '308',
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: 'parse_relation.c',
    line: '3822',
    routine: 'errorMissingColumn',
    sql: 'SELECT\n' +
      '        AVG(EXTRACT(DAY FROM (p.payment_date - i.created_at))) as avg_collection_time,\n' +
      '        CASE\n' +
      '          WHEN COUNT(DISTINCT i.id) = 0 THEN 0\n' +
      "          ELSE COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END)::float / COUNT(DISTINCT i.id) * 100\n" +
      '        END as collection_rate,\n' +
      '        AVG(i.total_paid / NULLIF(i.total, 0)) * 100 as customer_payment_score\n' +
      '      FROM invoices i\n' +
      "      LEFT JOIN payments p ON p.invoice_id = i.id AND p.status = 'confirmed'\n" +
      "      WHERE i.status != 'cancelled'",
    parameters: undefined
  },
  sql: 'SELECT\n' +
    '        AVG(EXTRACT(DAY FROM (p.payment_date - i.created_at))) as avg_collection_time,\n' +
    '        CASE\n' +
    '          WHEN COUNT(DISTINCT i.id) = 0 THEN 0\n' +
    "          ELSE COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END)::float / COUNT(DISTINCT i.id) * 100\n" +
    '        END as collection_rate,\n' +
    '        AVG(i.total_paid / NULLIF(i.total, 0)) * 100 as customer_payment_score\n' +
    '      FROM invoices i\n' +
    "      LEFT JOIN payments p ON p.invoice_id = i.id AND p.status = 'confirmed'\n" +
    "      WHERE i.status != 'cancelled'",
  parameters: {}
}
```
