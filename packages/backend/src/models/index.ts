// Model exports and associations setup
import { ContactPerson } from "./ContactPerson"
import { DocumentTemplate } from "./DocumentTemplate"
import { DocumentVersion } from "./DocumentVersion"
import { Invoice } from "./Invoice"
import { InvoiceLine } from "./InvoiceLine"
import { MedicalInstitution } from "./MedicalInstitution"
import { MedicalProfile } from "./MedicalProfile"
import { Payment } from "./Payment"
import { Quote } from "./Quote"
import { QuoteLine } from "./QuoteLine"
import { Task } from "./Task"
import { Team } from "./Team"
import { User } from "./User"
import { Webhook } from "./Webhook"
import { WebhookLog } from "./WebhookLog"

// Define associations
// MedicalInstitution associations
MedicalInstitution.hasOne(MedicalProfile, {
  foreignKey: "institutionId",
  as: "medicalProfile",
  onDelete: "CASCADE",
})

MedicalInstitution.hasMany(ContactPerson, {
  foreignKey: "institutionId",
  as: "contactPersons",
  onDelete: "CASCADE",
})

MedicalInstitution.belongsTo(User, {
  foreignKey: "assignedUserId",
  as: "assignedUser",
  onDelete: "SET NULL",
})

// MedicalProfile associations
MedicalProfile.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
  onDelete: "CASCADE",
})

// ContactPerson associations
ContactPerson.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
  onDelete: "CASCADE",
})

// Team associations
Team.hasMany(User, {
  foreignKey: "teamId",
  as: "members",
  onDelete: "SET NULL",
})

// User associations
User.belongsTo(Team, {
  foreignKey: "teamId",
  as: "team",
  onDelete: "SET NULL",
})

User.hasMany(MedicalInstitution, {
  foreignKey: "assignedUserId",
  as: "assignedInstitutions",
  onDelete: "SET NULL",
})

// Task associations
Task.belongsTo(User, {
  foreignKey: "assigneeId",
  as: "assignee",
  onDelete: "CASCADE",
})

Task.belongsTo(User, {
  foreignKey: "creatorId",
  as: "creator",
  onDelete: "CASCADE",
})

Task.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
  onDelete: "SET NULL",
})

// User task associations
User.hasMany(Task, {
  foreignKey: "assigneeId",
  as: "assignedTasks",
  onDelete: "CASCADE",
})

User.hasMany(Task, {
  foreignKey: "creatorId",
  as: "createdTasks",
  onDelete: "CASCADE",
})

// MedicalInstitution task associations
MedicalInstitution.hasMany(Task, {
  foreignKey: "institutionId",
  as: "tasks",
  onDelete: "SET NULL",
})

// Quote associations
Quote.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
  onDelete: "CASCADE",
})

Quote.belongsTo(User, {
  foreignKey: "assignedUserId",
  as: "assignedUser",
  onDelete: "CASCADE",
})

Quote.hasMany(QuoteLine, {
  foreignKey: "quoteId",
  as: "lines",
  onDelete: "CASCADE",
})

// QuoteLine associations
QuoteLine.belongsTo(Quote, {
  foreignKey: "quoteId",
  as: "quote",
  onDelete: "CASCADE",
})

// User quote associations
User.hasMany(Quote, {
  foreignKey: "assignedUserId",
  as: "assignedQuotes",
  onDelete: "CASCADE",
})

// MedicalInstitution quote associations
MedicalInstitution.hasMany(Quote, {
  foreignKey: "institutionId",
  as: "quotes",
  onDelete: "CASCADE",
})

// Invoice associations
Invoice.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
  onDelete: "CASCADE",
})

Invoice.belongsTo(User, {
  foreignKey: "assignedUserId",
  as: "assignedUser",
  onDelete: "CASCADE",
})

Invoice.belongsTo(Quote, {
  foreignKey: "quoteId",
  as: "quote",
  onDelete: "SET NULL",
})

Invoice.hasMany(InvoiceLine, {
  foreignKey: "invoiceId",
  as: "lines",
  onDelete: "CASCADE",
})

Invoice.hasMany(Payment, {
  foreignKey: "invoiceId",
  as: "payments",
  onDelete: "CASCADE",
})

// InvoiceLine associations
InvoiceLine.belongsTo(Invoice, {
  foreignKey: "invoiceId",
  as: "invoice",
  onDelete: "CASCADE",
})

// Payment associations
Payment.belongsTo(Invoice, {
  foreignKey: "invoiceId",
  as: "invoice",
  onDelete: "CASCADE",
})

Payment.belongsTo(User, {
  foreignKey: "recordedBy",
  as: "recordedByUser",
  onDelete: "CASCADE",
})

// User invoice associations
User.hasMany(Invoice, {
  foreignKey: "assignedUserId",
  as: "assignedInvoices",
  onDelete: "CASCADE",
})

User.hasMany(Payment, {
  foreignKey: "recordedBy",
  as: "recordedPayments",
  onDelete: "CASCADE",
})

// MedicalInstitution invoice associations
MedicalInstitution.hasMany(Invoice, {
  foreignKey: "institutionId",
  as: "invoices",
  onDelete: "CASCADE",
})

// Quote invoice associations
Quote.hasMany(Invoice, {
  foreignKey: "quoteId",
  as: "invoices",
  onDelete: "SET NULL",
})

// DocumentTemplate associations
DocumentTemplate.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
  onDelete: "CASCADE",
})

DocumentTemplate.hasMany(DocumentVersion, {
  foreignKey: "templateId",
  as: "versions",
  onDelete: "SET NULL",
})

DocumentTemplate.hasMany(Quote, {
  foreignKey: "templateId",
  as: "quotes",
  onDelete: "SET NULL",
})

DocumentTemplate.hasMany(Invoice, {
  foreignKey: "templateId",
  as: "invoices",
  onDelete: "SET NULL",
})

// DocumentVersion associations
DocumentVersion.belongsTo(DocumentTemplate, {
  foreignKey: "templateId",
  as: "template",
  onDelete: "SET NULL",
})

DocumentVersion.belongsTo(User, {
  foreignKey: "generatedBy",
  as: "generator",
  onDelete: "CASCADE",
})

// User document associations
User.hasMany(DocumentTemplate, {
  foreignKey: "createdBy",
  as: "createdTemplates",
  onDelete: "CASCADE",
})

User.hasMany(DocumentVersion, {
  foreignKey: "generatedBy",
  as: "generatedDocuments",
  onDelete: "CASCADE",
})

// Quote template associations
Quote.belongsTo(DocumentTemplate, {
  foreignKey: "templateId",
  as: "template",
  onDelete: "SET NULL",
})

// Invoice template associations
Invoice.belongsTo(DocumentTemplate, {
  foreignKey: "templateId",
  as: "template",
  onDelete: "SET NULL",
})

// Webhook associations
Webhook.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
  onDelete: "CASCADE",
})

Webhook.hasMany(WebhookLog, {
  foreignKey: "webhookId",
  as: "logs",
  onDelete: "CASCADE",
})

// WebhookLog associations
WebhookLog.belongsTo(Webhook, {
  foreignKey: "webhookId",
  as: "webhook",
  onDelete: "CASCADE",
})

// User webhook associations
User.hasMany(Webhook, {
  foreignKey: "createdBy",
  as: "createdWebhooks",
  onDelete: "CASCADE",
})

// Export all models
export {
  ContactPerson,
  DocumentTemplate,
  DocumentVersion,
  Invoice,
  InvoiceLine,
  MedicalInstitution,
  MedicalProfile,
  Payment,
  Quote,
  QuoteLine,
  Task,
  Team,
  User,
  Webhook,
  WebhookLog,
}

// Export default for convenience
export default {
  User,
  Team,
  MedicalInstitution,
  MedicalProfile,
  ContactPerson,
  Task,
  Quote,
  QuoteLine,
  Invoice,
  InvoiceLine,
  Payment,
  DocumentTemplate,
  DocumentVersion,
  Webhook,
  WebhookLog,
}
