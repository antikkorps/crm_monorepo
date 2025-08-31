// Document template type definitions

import { Address, BaseEntity } from "./common"

export enum TemplateType {
  QUOTE = "quote",
  INVOICE = "invoice",
  BOTH = "both",
}

export enum LogoPosition {
  TOP_LEFT = "top_left",
  TOP_CENTER = "top_center",
  TOP_RIGHT = "top_right",
  HEADER_LEFT = "header_left",
  HEADER_RIGHT = "header_right",
}

export interface DocumentTemplate extends BaseEntity {
  name: string
  type: TemplateType
  isDefault: boolean
  isActive: boolean

  // Company Information
  companyName: string
  companyAddress: Address
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string

  // Tax and Legal Information
  taxNumber?: string
  vatNumber?: string
  siretNumber?: string
  registrationNumber?: string

  // Logo and Branding
  logoUrl?: string
  logoPosition: LogoPosition
  primaryColor?: string
  secondaryColor?: string

  // Template Layout Settings
  headerHeight: number
  footerHeight: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number

  // Custom Fields and Text
  customHeader?: string
  customFooter?: string
  termsAndConditions?: string
  paymentInstructions?: string

  // HTML Template Content
  htmlTemplate?: string
  styles?: string

  // Metadata
  createdBy: string
  version: number

  // Associated data
  creator?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

// Request/Response types
export interface DocumentTemplateCreateRequest {
  name: string
  type: TemplateType
  companyName: string
  companyAddress: Address
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  taxNumber?: string
  vatNumber?: string
  siretNumber?: string
  registrationNumber?: string
  logoPosition?: LogoPosition
  primaryColor?: string
  secondaryColor?: string
  headerHeight?: number
  footerHeight?: number
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
  customHeader?: string
  customFooter?: string
  termsAndConditions?: string
  paymentInstructions?: string
  htmlTemplate?: string
  styles?: string
}

export interface DocumentTemplateUpdateRequest {
  name?: string
  type?: TemplateType
  companyName?: string
  companyAddress?: Address
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  taxNumber?: string
  vatNumber?: string
  siretNumber?: string
  registrationNumber?: string
  logoUrl?: string
  logoPosition?: LogoPosition
  primaryColor?: string
  secondaryColor?: string
  headerHeight?: number
  footerHeight?: number
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
  customHeader?: string
  customFooter?: string
  termsAndConditions?: string
  paymentInstructions?: string
  htmlTemplate?: string
  styles?: string
}

export interface LogoUploadResult {
  logoUrl: string
  originalName: string
  size: number
}

export interface TemplatePreviewRequest {
  templateId: string
  sampleData?: any
}

export interface DocumentTemplateFilters {
  type?: TemplateType
  isActive?: boolean
  isDefault?: boolean
  search?: string
}
