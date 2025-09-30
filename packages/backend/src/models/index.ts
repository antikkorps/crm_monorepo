// Model exports and associations setup
import { Call } from "./Call"
import { CatalogItem } from "./CatalogItem"
import { Comment } from "./Comment"
import { ContactPerson } from "./ContactPerson"
import { DocumentTemplate } from "./DocumentTemplate"
import { DocumentVersion } from "./DocumentVersion"
import { Invoice } from "./Invoice"
import { InvoiceLine } from "./InvoiceLine"
import { MedicalInstitution } from "./MedicalInstitution"
import { MedicalProfile } from "./MedicalProfile"
import { InstitutionAddress } from "./InstitutionAddress"
import { Meeting } from "./Meeting"
import { MeetingParticipant } from "./MeetingParticipant"
import { Note } from "./Note"
import { NoteShare } from "./NoteShare"
import { Payment } from "./Payment"
import { Quote } from "./Quote"
import { QuoteLine } from "./QuoteLine"
import { Reminder } from "./Reminder"
import { Segment } from "./Segment"
import { Task } from "./Task"
import { Team } from "./Team"
import { User } from "./User"
import { Webhook } from "./Webhook"
import { WebhookLog } from "./WebhookLog"
import { DigiformaSync } from "./DigiformaSync"
import { DigiformaCompany } from "./DigiformaCompany"
import { DigiformaContact } from "./DigiformaContact"
import { DigiformaQuote } from "./DigiformaQuote"
import { DigiformaInvoice } from "./DigiformaInvoice"
import { DigiformaSettings } from "./DigiformaSettings"

// Define associations
// MedicalInstitution associations
MedicalInstitution.hasOne(MedicalProfile, {
  foreignKey: "institutionId",
  as: "medicalProfile",
  onDelete: "CASCADE",
})

// Optional relational address (1:1)
MedicalInstitution.hasOne(InstitutionAddress, {
  foreignKey: "institutionId",
  as: "addressRel",
  onDelete: "CASCADE",
})
InstitutionAddress.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
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

// Note associations
Note.belongsTo(User, {
  foreignKey: "creatorId",
  as: "creator",
  onDelete: "CASCADE",
})

Note.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
  onDelete: "SET NULL",
})

Note.hasMany(NoteShare, {
  foreignKey: "noteId",
  as: "shares",
  onDelete: "CASCADE",
})

// NoteShare associations
NoteShare.belongsTo(Note, {
  foreignKey: "noteId",
  as: "note",
  onDelete: "CASCADE",
})

NoteShare.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
})

// User note associations
User.hasMany(Note, {
  foreignKey: "creatorId",
  as: "createdNotes",
  onDelete: "CASCADE",
})

User.hasMany(NoteShare, {
  foreignKey: "userId",
  as: "noteShares",
  onDelete: "CASCADE",
})

// MedicalInstitution note associations
MedicalInstitution.hasMany(Note, {
  foreignKey: "institutionId",
  as: "notes",
  onDelete: "SET NULL",
})

// Meeting associations
Meeting.belongsTo(User, {
  foreignKey: "organizerId",
  as: "organizer",
  onDelete: "CASCADE",
})

Meeting.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
  onDelete: "SET NULL",
})

Meeting.hasMany(MeetingParticipant, {
  foreignKey: "meetingId",
  as: "participants",
  onDelete: "CASCADE",
})

Meeting.hasMany(Comment, {
  foreignKey: "meetingId",
  as: "comments",
  onDelete: "CASCADE",
})

// MeetingParticipant associations
MeetingParticipant.belongsTo(Meeting, {
  foreignKey: "meetingId",
  as: "meeting",
  onDelete: "CASCADE",
})

MeetingParticipant.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
})

// User meeting associations
User.hasMany(Meeting, {
  foreignKey: "organizerId",
  as: "organizedMeetings",
  onDelete: "CASCADE",
})

User.hasMany(MeetingParticipant, {
  foreignKey: "userId",
  as: "meetingParticipations",
  onDelete: "CASCADE",
})

// MedicalInstitution meeting associations
MedicalInstitution.hasMany(Meeting, {
  foreignKey: "institutionId",
  as: "meetings",
  onDelete: "SET NULL",
})

// Comment associations
Comment.belongsTo(Meeting, {
  foreignKey: "meetingId",
  as: "meeting",
  onDelete: "CASCADE",
})

Comment.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
})

// User comment associations
User.hasMany(Comment, {
  foreignKey: "userId",
  as: "comments",
  onDelete: "CASCADE",
})

// Call associations
Call.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
})

Call.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
  onDelete: "SET NULL",
})

Call.belongsTo(ContactPerson, {
  foreignKey: "contactPersonId",
  as: "contactPerson",
  onDelete: "SET NULL",
})

// User call associations
User.hasMany(Call, {
  foreignKey: "userId",
  as: "calls",
  onDelete: "CASCADE",
})

// MedicalInstitution call associations
MedicalInstitution.hasMany(Call, {
  foreignKey: "institutionId",
  as: "calls",
  onDelete: "SET NULL",
})

// ContactPerson call associations
ContactPerson.hasMany(Call, {
  foreignKey: "contactPersonId",
  as: "calls",
  onDelete: "SET NULL",
})

// Reminder associations
Reminder.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
})

Reminder.belongsTo(MedicalInstitution, {
  foreignKey: "institutionId",
  as: "institution",
  onDelete: "SET NULL",
})

// User reminder associations
User.hasMany(Reminder, {
  foreignKey: "userId",
  as: "reminders",
  onDelete: "CASCADE",
})

// MedicalInstitution reminder associations
MedicalInstitution.hasMany(Reminder, {
  foreignKey: "institutionId",
  as: "reminders",
  onDelete: "SET NULL",
})

// Segment associations
Segment.belongsTo(User, {
  foreignKey: "ownerId",
  as: "owner",
  onDelete: "CASCADE",
})

Segment.belongsTo(Team, {
  foreignKey: "teamId",
  as: "team",
  onDelete: "SET NULL",
})

// User segment associations
User.hasMany(Segment, {
  foreignKey: "ownerId",
  as: "segments",
  onDelete: "CASCADE",
})

// Team segment associations
Team.hasMany(Segment, {
  foreignKey: "teamId",
  as: "segments",
  onDelete: "SET NULL",
})

// CatalogItem associations
CatalogItem.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
  onDelete: "CASCADE",
})

// User catalog item associations
User.hasMany(CatalogItem, {
  foreignKey: "createdBy",
  as: "createdCatalogItems",
  onDelete: "CASCADE",
})

// Export all models
export {
  Call,
  CatalogItem,
  Comment,
  ContactPerson,
  DocumentTemplate,
  DocumentVersion,
  Invoice,
  InvoiceLine,
  MedicalInstitution,
  MedicalProfile,
  InstitutionAddress,
  Meeting,
  MeetingParticipant,
  Note,
  NoteShare,
  Payment,
  Quote,
  QuoteLine,
  Reminder,
  Segment,
  Task,
  Team,
  User,
  Webhook,
  WebhookLog,
  DigiformaSync,
  DigiformaCompany,
  DigiformaContact,
  DigiformaQuote,
  DigiformaInvoice,
  DigiformaSettings,
}

// Export default for convenience
export default {
  User,
  Team,
  MedicalInstitution,
  MedicalProfile,
  InstitutionAddress,
  ContactPerson,
  Task,
  Quote,
  QuoteLine,
  Invoice,
  InvoiceLine,
  Payment,
  DocumentTemplate,
  DocumentVersion,
  Meeting,
  MeetingParticipant,
  Note,
  NoteShare,
  Comment,
  Call,
  CatalogItem,
  Reminder,
  Segment,
  Webhook,
  WebhookLog,
  DigiformaSync,
  DigiformaCompany,
  DigiformaContact,
  DigiformaQuote,
  DigiformaInvoice,
  DigiformaSettings,
}
