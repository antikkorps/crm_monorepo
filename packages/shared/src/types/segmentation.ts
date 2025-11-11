// Segmentation type definitions

import { MedicalInstitutionSearchFilters } from "./medical-institution"
import { BaseEntity } from "./common"

export enum SegmentType {
  INSTITUTION = "institution",
  CONTACT = "contact",
}

export enum SegmentVisibility {
  PRIVATE = "private",
  TEAM = "team",
  PUBLIC = "public",
}

export interface ContactFilters {
  title?: string[]
  department?: string[]
  isPrimary?: boolean
  hasPhone?: boolean
  hasEmail?: boolean
  activityLevel?: "high" | "medium" | "low"
  lastContactDate?: {
    from?: Date
    to?: Date
  }
}

export interface CombinedFilters {
  hasActiveContacts?: boolean
  hasMedicalProfile?: boolean
  assignedToTeam?: boolean
  createdDateRange?: {
    from?: Date
    to?: Date
  }
  updatedDateRange?: {
    from?: Date
    to?: Date
  }
}

export interface SegmentCriteria {
  institutionFilters?: MedicalInstitutionSearchFilters
  contactFilters?: ContactFilters
  combinedFilters?: CombinedFilters
}

export interface Segment extends BaseEntity {
  name: string
  description?: string
  type: SegmentType
  criteria: SegmentCriteria
  visibility: SegmentVisibility
  ownerId: string
  teamId?: string
  isActive: boolean
  owner?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  team?: {
    id: string
    name: string
  }
}

export interface SegmentCreationAttributes {
  name: string
  description?: string
  type: SegmentType
  criteria: SegmentCriteria
  visibility?: SegmentVisibility
  teamId?: string
}

export interface SegmentStats {
  totalCount: number
  filterCount: number
  lastUpdated: Date
  createdAt: Date
}

export interface SegmentAnalytics {
  totalCount: number
  filterCount: number
  lastUpdated: Date
  institutionBreakdown?: {
    byType: Record<string, number>
    bySpecialty: Record<string, number>
    byComplianceStatus: Record<string, number>
  }
  contactBreakdown?: {
    byRole: Record<string, number>
    byDepartment: Record<string, number>
    byActivityLevel: Record<string, number>
  }
}

export interface BulkOperationOptions {
  operation: "assign_tasks" | "send_communications" | "update_status" | "export_data"
  taskTemplate?: {
    title: string
    description?: string
    priority: "low" | "medium" | "high"
    dueDate?: Date
  }
  communicationTemplate?: {
    subject: string
    message: string
    type: "email" | "sms"
  }
  statusUpdate?: {
    field: string
    value: any
  }
  exportOptions?: {
    format: "csv" | "excel"
    fields: string[]
    includeContacts: boolean
  }
}

export interface BulkOperationResult {
  success: boolean
  processedCount: number
  failedCount: number
  errors?: string[]
  results?: any[]
}

// Frontend-specific types for segment builder
export interface SegmentBuilderFilter {
  id: string
  type: "institution" | "contact" | "combined"
  field: string
  operator: "equals" | "contains" | "greater_than" | "less_than" | "between" | "in" | "not_in"
  value: any
  label: string
  group: string
}

export interface SegmentBuilderGroup {
  id: string
  name: string
  filters: SegmentBuilderFilter[]
}

export interface SegmentPreviewData {
  count: number
  sampleRecords: any[]
  lastUpdated: Date
}