// Engagement Letter (Lettre de Mission) type definitions

import { BaseEntity } from "./common"

export enum EngagementLetterStatus {
  DRAFT = "draft",
  SENT = "sent",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum MissionType {
  AUDIT = "audit",
  CONSEIL = "conseil",
  FORMATION = "formation",
  AUTRE = "autre",
}

export enum BillingType {
  FIXED = "fixed",
  HOURLY = "hourly",
  DAILY = "daily",
}

export interface Deliverable {
  name: string
  description?: string
  dueDate?: string // ISO date string
}

export interface EngagementLetterMember extends BaseEntity {
  engagementLetterId: string
  userId?: string // Nullable for external team members
  name: string
  role: string
  qualification?: string
  dailyRate: number
  estimatedDays: number
  isLead: boolean
  orderIndex: number
  // Computed field
  subtotal?: number // dailyRate * estimatedDays
  // Association
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface EngagementLetter extends BaseEntity {
  letterNumber: string
  institutionId: string
  assignedUserId: string
  templateId?: string

  // Mission details
  title: string
  missionType: MissionType
  scope?: string // HTML content from rich text editor
  objectives?: string[]
  deliverables?: Deliverable[]

  // Timeline
  startDate?: Date
  endDate?: Date
  estimatedHours?: number

  // Financial
  billingType: BillingType
  rate: number
  totalDays: number
  travelExpenses: number
  estimatedTotal: number
  vatRate?: number
  showVat?: boolean

  // Workflow
  status: EngagementLetterStatus
  validUntil: Date
  sentAt?: Date
  acceptedAt?: Date
  rejectedAt?: Date
  completedAt?: Date

  // Additional info
  termsAndConditions?: string
  clientComments?: string
  internalNotes?: string

  // Associations
  members?: EngagementLetterMember[]
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

  // Computed fields (from toJSON)
  isExpired?: boolean
  canBeModified?: boolean
  canBeSent?: boolean
  canBeAccepted?: boolean
  canBeRejected?: boolean
  daysUntilExpiry?: number | null
}

// Request types
export interface EngagementLetterCreateRequest {
  institutionId: string
  templateId?: string
  title: string
  missionType: MissionType
  scope?: string
  objectives?: string[]
  deliverables?: Deliverable[]
  startDate?: Date
  endDate?: Date
  estimatedHours?: number
  billingType: BillingType
  rate: number
  totalDays?: number
  travelExpenses?: number
  vatRate?: number
  showVat?: boolean
  validUntil: Date
  termsAndConditions?: string
  internalNotes?: string
  members?: EngagementLetterMemberRequest[]
}

export interface EngagementLetterUpdateRequest {
  templateId?: string | null
  title?: string
  missionType?: MissionType
  scope?: string
  objectives?: string[]
  deliverables?: Deliverable[]
  startDate?: Date
  endDate?: Date
  estimatedHours?: number
  billingType?: BillingType
  rate?: number
  totalDays?: number
  travelExpenses?: number
  estimatedTotal?: number
  vatRate?: number
  showVat?: boolean
  validUntil?: Date
  termsAndConditions?: string
  clientComments?: string
  internalNotes?: string
}

export interface EngagementLetterMemberRequest {
  userId?: string
  name: string
  role: string
  qualification?: string
  dailyRate: number
  estimatedDays: number
  isLead?: boolean
  orderIndex?: number
}

export interface EngagementLetterSearchFilters {
  institutionId?: string
  assignedUserId?: string
  status?: EngagementLetterStatus
  missionType?: MissionType
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

export interface EngagementLetterStatistics {
  total: number
  byStatus: Record<EngagementLetterStatus, number>
  byMissionType: Record<MissionType, number>
  totalAcceptedValue: number
  averageResponseTime: number | null // Days from sent to accepted/rejected
  acceptanceRate: number | null // Percentage
}
