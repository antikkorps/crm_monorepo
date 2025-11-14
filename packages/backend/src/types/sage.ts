/**
 * Sage Accounting API Types
 *
 * TypeScript interfaces for Sage accounting integration.
 * These types will be refined once the actual Sage API is integrated.
 *
 * TODO: Update these types based on actual Sage API documentation
 * - Sage 50 API: https://developer.sage.com/sage-50/
 * - Sage Business Cloud API: https://developer.sage.com/api/accounting/
 * - Sage Intacct API: https://developer.sage.com/intacct/
 */

/**
 * Sage Customer (client/institution in accounting system)
 *
 * Represents a customer/client from Sage accounting.
 * Maps to MedicalInstitution via accountingNumber.
 */
export interface SageCustomer {
  id: string // Sage customer ID
  accountingNumber: string // Client number (maps to MedicalInstitution.accountingNumber)
  name: string
  legalName?: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  taxId?: string // VAT number, SIRET, etc.
  paymentTerms?: string // e.g., "NET30", "NET60"
  creditLimit?: number
  balance?: number // Current account balance
  currency?: string // e.g., "EUR", "USD"
  isActive?: boolean
  createdAt?: string // ISO 8601 date
  updatedAt?: string // ISO 8601 date

  // TODO: Add more fields based on actual Sage API
  [key: string]: any
}

/**
 * Sage Invoice
 *
 * Represents an invoice from Sage accounting.
 * Can be synced to CRM Invoice model.
 */
export interface SageInvoice {
  id: string // Sage invoice ID
  invoiceNumber: string // Human-readable invoice number
  customerId: string // Sage customer ID
  accountingNumber: string // Client number for matching
  date: string // Invoice date (ISO 8601)
  dueDate: string // Payment due date (ISO 8601)
  totalAmount: number
  taxAmount?: number
  netAmount?: number
  currency?: string // e.g., "EUR", "USD"
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  lines?: SageInvoiceLine[]
  paymentStatus?: 'unpaid' | 'partial' | 'paid'
  paidAmount?: number
  balanceDue?: number
  notes?: string
  createdAt?: string // ISO 8601 date
  updatedAt?: string // ISO 8601 date

  // TODO: Add more fields based on actual Sage API
  [key: string]: any
}

/**
 * Sage Invoice Line
 *
 * Represents a line item on a Sage invoice.
 */
export interface SageInvoiceLine {
  id?: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  taxRate?: number
  taxAmount?: number
  productCode?: string
  accountCode?: string // General ledger account code

  // TODO: Add more fields based on actual Sage API
  [key: string]: any
}

/**
 * Sage Payment
 *
 * Represents a payment record from Sage accounting.
 * Can be synced to CRM Payment model.
 */
export interface SagePayment {
  id: string // Sage payment ID
  invoiceId?: string // Sage invoice ID (if payment is for a specific invoice)
  invoiceNumber?: string // Human-readable invoice number
  customerId: string // Sage customer ID
  accountingNumber: string // Client number for matching
  date: string // Payment date (ISO 8601)
  amount: number
  currency?: string // e.g., "EUR", "USD"
  method: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'other'
  reference?: string // Payment reference number
  bankAccount?: string
  notes?: string
  status?: 'pending' | 'cleared' | 'reconciled' | 'cancelled'
  createdAt?: string // ISO 8601 date
  updatedAt?: string // ISO 8601 date

  // TODO: Add more fields based on actual Sage API
  [key: string]: any
}

/**
 * Sage API Response wrapper
 */
export interface SageApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    page?: number
    pageSize?: number
    totalCount?: number
    totalPages?: number
  }
}

/**
 * Sage Sync Result
 *
 * Result of a sync operation from Sage to CRM.
 */
export interface SageSyncResult {
  success: boolean
  entityType: 'customers' | 'invoices' | 'payments'
  totalFetched: number
  created: number
  updated: number
  skipped: number
  errors: Array<{
    sageId: string
    accountingNumber?: string
    message: string
  }>
  duration?: number // Sync duration in milliseconds
  timestamp: Date
}

/**
 * Sage Match Result
 *
 * Result of matching a Sage entity to a CRM entity.
 */
export interface SageMatchResult {
  matched: boolean
  crmEntityId?: string
  crmEntityType?: 'institution' | 'invoice' | 'payment'
  matchMethod: 'accountingNumber' | 'fuzzy' | 'manual' | 'none'
  confidence: number // 0-100
  suggestions?: Array<{
    id: string
    name: string
    accountingNumber?: string
    confidence: number
  }>
}

/**
 * Sage Connection Test Result
 */
export interface SageConnectionTestResult {
  success: boolean
  message: string
  details?: {
    apiVersion?: string
    companyName?: string
    companyId?: string
    permissions?: string[]
  }
  errorCode?: string
  timestamp: Date
}
