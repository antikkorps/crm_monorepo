// Medical Institution type definitions

import { Address, BaseEntity, ContactPerson } from "./common"

export enum InstitutionType {
  HOSPITAL = "hospital",
  CLINIC = "clinic",
  MEDICAL_CENTER = "medical_center",
  SPECIALTY_CLINIC = "specialty_clinic",
}

export enum ComplianceStatus {
  COMPLIANT = "compliant",
  NON_COMPLIANT = "non_compliant",
  PENDING_REVIEW = "pending_review",
  EXPIRED = "expired",
}

export interface MedicalProfile {
  id: string
  bedCapacity?: number
  surgicalRooms?: number
  specialties: string[]
  departments: string[]
  equipmentTypes: string[]
  certifications: string[]
  complianceStatus: ComplianceStatus
  lastAuditDate?: Date
  complianceExpirationDate?: Date
  complianceNotes?: string
}

export interface MedicalInstitution extends BaseEntity {
  name: string
  type: InstitutionType
  address: Address
  contactPersons: ContactPerson[]
  medicalProfile: MedicalProfile
  assignedUserId?: string
  tags: string[]
  isActive: boolean
}

export interface MedicalInstitutionCreationAttributes {
  name: string
  type: InstitutionType
  address: Address
  assignedUserId?: string
  tags?: string[]
  isActive?: boolean
  medicalProfile: Omit<MedicalProfile, "id">
  contactPersons?: Omit<ContactPerson, "id">[]
}

export interface MedicalInstitutionSearchFilters {
  name?: string
  type?: InstitutionType
  city?: string
  state?: string
  assignedUserId?: string
  specialties?: string[]
  minBedCapacity?: number
  maxBedCapacity?: number
  minSurgicalRooms?: number
  maxSurgicalRooms?: number
  complianceStatus?: ComplianceStatus
  tags?: string[]
  isActive?: boolean
}
