// Simplified Transaction type definitions
// External reference documents for unified financial tracking

import { BaseEntity } from "./common"

/**
 * Type of simplified transaction
 * Maps to document types that can be created externally (Sage, Digiforma, etc.)
 */
export enum SimplifiedTransactionType {
  QUOTE = "quote",
  INVOICE = "invoice",
  ENGAGEMENT_LETTER = "engagement_letter",
  CONTRACT = "contract",
}

/**
 * Status values depend on transaction type:
 * - Quotes & Engagement Letters: draft, sent, accepted, rejected, expired
 * - Invoices: pending, paid, partial, overdue, cancelled
 * - Contracts: active, expired, terminated
 */
export enum SimplifiedTransactionStatus {
  // Common statuses
  DRAFT = "draft",
  SENT = "sent",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
  CANCELLED = "cancelled",

  // Invoice-specific statuses
  PENDING = "pending",
  PAID = "paid",
  PARTIAL = "partial",
  OVERDUE = "overdue",

  // Contract-specific statuses
  ACTIVE = "active",
  TERMINATED = "terminated",
}

/**
 * Payment status for invoice-type transactions
 */
export enum SimplifiedPaymentStatus {
  PENDING = "pending",
  PARTIAL = "partial",
  PAID = "paid",
}

/**
 * Contract types for contract-type transactions
 */
export enum SimplifiedContractType {
  MAINTENANCE = "maintenance",
  SUPPORT = "support",
  SUBSCRIPTION = "subscription",
  SERVICE = "service",
  OTHER = "other",
}

/**
 * Simplified Transaction entity
 * Represents an external reference to a document created outside the CRM
 */
export interface SimplifiedTransaction extends BaseEntity {
  institutionId: string
  createdById: string

  // Type of transaction
  type: SimplifiedTransactionType

  // Identification
  referenceNumber?: string // External reference (e.g., "Devis Sage #123")
  title: string
  description?: string

  // Date of the document
  date: Date

  // Financial amounts
  amountHt: number
  vatRate: number
  amountTtc: number

  // Status (varies by type)
  status: SimplifiedTransactionStatus

  // Invoice-specific fields
  paymentStatus?: SimplifiedPaymentStatus
  paymentDate?: Date
  paymentAmount?: number
  dueDate?: Date

  // Contract-specific fields
  contractType?: SimplifiedContractType
  contractStartDate?: Date
  contractEndDate?: Date
  isRecurring?: boolean

  // Notes
  notes?: string

  // Associated data (populated on response)
  institution?: {
    id: string
    name: string
    type: string
  }
  createdBy?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

/**
 * Request type for creating a simplified transaction
 */
export interface SimplifiedTransactionCreateRequest {
  institutionId: string
  type: SimplifiedTransactionType
  referenceNumber?: string
  title: string
  description?: string
  date: Date
  amountHt: number
  vatRate?: number // Defaults to 20%
  amountTtc?: number // Auto-calculated if not provided
  status: SimplifiedTransactionStatus

  // Invoice-specific fields
  paymentStatus?: SimplifiedPaymentStatus
  paymentDate?: Date
  paymentAmount?: number
  dueDate?: Date

  // Contract-specific fields
  contractType?: SimplifiedContractType
  contractStartDate?: Date
  contractEndDate?: Date
  isRecurring?: boolean

  notes?: string
}

/**
 * Request type for updating a simplified transaction
 */
export interface SimplifiedTransactionUpdateRequest {
  referenceNumber?: string
  title?: string
  description?: string
  date?: Date
  amountHt?: number
  vatRate?: number
  amountTtc?: number
  status?: SimplifiedTransactionStatus

  // Invoice-specific fields
  paymentStatus?: SimplifiedPaymentStatus
  paymentDate?: Date
  paymentAmount?: number
  dueDate?: Date

  // Contract-specific fields
  contractType?: SimplifiedContractType
  contractStartDate?: Date
  contractEndDate?: Date
  isRecurring?: boolean

  notes?: string
}

/**
 * Search filters for simplified transactions
 */
export interface SimplifiedTransactionSearchFilters {
  institutionId?: string
  createdById?: string
  type?: SimplifiedTransactionType
  status?: SimplifiedTransactionStatus
  dateFrom?: Date
  dateTo?: Date
  amountMin?: number
  amountMax?: number
  search?: string
}

/**
 * Helper function to get valid statuses for a transaction type
 */
export function getValidStatusesForType(
  type: SimplifiedTransactionType
): SimplifiedTransactionStatus[] {
  switch (type) {
    case SimplifiedTransactionType.QUOTE:
    case SimplifiedTransactionType.ENGAGEMENT_LETTER:
      return [
        SimplifiedTransactionStatus.DRAFT,
        SimplifiedTransactionStatus.SENT,
        SimplifiedTransactionStatus.ACCEPTED,
        SimplifiedTransactionStatus.REJECTED,
        SimplifiedTransactionStatus.EXPIRED,
        SimplifiedTransactionStatus.CANCELLED,
      ]
    case SimplifiedTransactionType.INVOICE:
      return [
        SimplifiedTransactionStatus.PENDING,
        SimplifiedTransactionStatus.SENT,
        SimplifiedTransactionStatus.PAID,
        SimplifiedTransactionStatus.PARTIAL,
        SimplifiedTransactionStatus.OVERDUE,
        SimplifiedTransactionStatus.CANCELLED,
      ]
    case SimplifiedTransactionType.CONTRACT:
      return [
        SimplifiedTransactionStatus.DRAFT,
        SimplifiedTransactionStatus.ACTIVE,
        SimplifiedTransactionStatus.EXPIRED,
        SimplifiedTransactionStatus.TERMINATED,
        SimplifiedTransactionStatus.CANCELLED,
      ]
  }
}

/**
 * Helper function to get default status for a transaction type
 */
export function getDefaultStatusForType(
  type: SimplifiedTransactionType
): SimplifiedTransactionStatus {
  switch (type) {
    case SimplifiedTransactionType.QUOTE:
    case SimplifiedTransactionType.ENGAGEMENT_LETTER:
    case SimplifiedTransactionType.CONTRACT:
      return SimplifiedTransactionStatus.DRAFT
    case SimplifiedTransactionType.INVOICE:
      return SimplifiedTransactionStatus.PENDING
  }
}
