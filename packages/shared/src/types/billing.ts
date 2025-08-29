// Billing-related type definitions

import { BaseEntity } from "./common"

export enum QuoteStatus {
  DRAFT = "draft",
  SENT = "sent",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

export enum InvoiceStatus {
  DRAFT = "draft",
  SENT = "sent",
  PARTIALLY_PAID = "partially_paid",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED_AMOUNT = "fixed_amount",
}

export enum PaymentMethod {
  BANK_TRANSFER = "bank_transfer",
  CHECK = "check",
  CASH = "cash",
  CREDIT_CARD = "credit_card",
  OTHER = "other",
}

export enum PaymentStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface Quote extends BaseEntity {
  quoteNumber: string
  institutionId: string
  assignedUserId: string
  templateId?: string
  title: string
  description?: string
  validUntil: Date
  status: QuoteStatus
  acceptedAt?: Date
  rejectedAt?: Date
  clientComments?: string
  internalNotes?: string

  // Financial totals
  subtotal: number
  totalDiscountAmount: number
  totalTaxAmount: number
  total: number

  // Associated data
  lines?: QuoteLine[]
  institution?: {
    id: string
    name: string
    type: string
  }
  assignedUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface QuoteLine extends BaseEntity {
  quoteId: string
  orderIndex: number

  // Product/Service details
  description: string
  quantity: number
  unitPrice: number

  // Discount per line
  discountType: DiscountType
  discountValue: number
  discountAmount: number

  // Tax per line
  taxRate: number
  taxAmount: number

  // Calculated totals
  subtotal: number // quantity * unitPrice
  totalAfterDiscount: number // subtotal - discountAmount
  total: number // totalAfterDiscount + taxAmount
}

export interface Invoice extends BaseEntity {
  invoiceNumber: string
  institutionId: string
  assignedUserId: string
  quoteId?: string
  templateId?: string

  title: string
  description?: string
  dueDate: Date
  status: InvoiceStatus

  // Payment tracking
  totalPaid: number
  remainingAmount: number
  lastPaymentDate?: Date

  // Financial totals
  subtotal: number
  totalDiscountAmount: number
  totalTaxAmount: number
  total: number

  // Metadata
  sentAt?: Date
  paidAt?: Date

  // Associated data
  lines?: InvoiceLine[]
  payments?: Payment[]
  institution?: {
    id: string
    name: string
    type: string
  }
  assignedUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface InvoiceLine extends BaseEntity {
  invoiceId: string
  orderIndex: number

  // Product/Service details
  description: string
  quantity: number
  unitPrice: number

  // Discount per line
  discountType: DiscountType
  discountValue: number
  discountAmount: number

  // Tax per line
  taxRate: number
  taxAmount: number

  // Calculated totals
  subtotal: number // quantity * unitPrice
  totalAfterDiscount: number // subtotal - discountAmount
  total: number // totalAfterDiscount + taxAmount
}

export interface Payment extends BaseEntity {
  invoiceId: string

  // Payment details
  amount: number
  paymentDate: Date
  paymentMethod: PaymentMethod
  reference?: string

  // Status and notes
  status: PaymentStatus
  notes?: string

  // Metadata
  recordedBy: string
}

// Request/Response types
export interface QuoteCreateRequest {
  institutionId: string
  templateId?: string
  title: string
  description?: string
  validUntil: Date
  internalNotes?: string
  lines: QuoteLineCreateRequest[]
}

export interface QuoteLineCreateRequest {
  description: string
  quantity: number
  unitPrice: number
  discountType?: DiscountType
  discountValue?: number
  taxRate?: number
}

export interface QuoteUpdateRequest {
  title?: string
  description?: string
  validUntil?: Date
  status?: QuoteStatus
  clientComments?: string
  internalNotes?: string
}

export interface QuoteLineUpdateRequest {
  description?: string
  quantity?: number
  unitPrice?: number
  discountType?: DiscountType
  discountValue?: number
  taxRate?: number
  orderIndex?: number
}

export interface InvoiceCreateRequest {
  institutionId: string
  quoteId?: string
  templateId?: string
  title: string
  description?: string
  dueDate: Date
  lines: InvoiceLineCreateRequest[]
}

export interface InvoiceLineCreateRequest {
  description: string
  quantity: number
  unitPrice: number
  discountType?: DiscountType
  discountValue?: number
  taxRate?: number
}

export interface InvoiceLineUpdateRequest {
  description?: string
  quantity?: number
  unitPrice?: number
  discountType?: DiscountType
  discountValue?: number
  taxRate?: number
  orderIndex?: number
}

export interface PaymentCreateRequest {
  invoiceId: string
  amount: number
  paymentDate: Date
  paymentMethod: PaymentMethod
  reference?: string
  notes?: string
}

export interface BillingSearchFilters {
  institutionId?: string
  assignedUserId?: string
  status?: QuoteStatus | InvoiceStatus
  dateFrom?: Date
  dateTo?: Date
  amountMin?: number
  amountMax?: number
  search?: string
}
