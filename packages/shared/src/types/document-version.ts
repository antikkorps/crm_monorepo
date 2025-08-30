// Document version and history types

export enum DocumentVersionType {
  QUOTE_PDF = "quote_pdf",
  INVOICE_PDF = "invoice_pdf",
}

export interface DocumentVersion {
  id: string
  documentId: string
  documentType: DocumentVersionType
  templateId?: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  version: number
  isLatest?: boolean

  // Generation info
  generatedBy: string
  generatedAt: Date
  templateSnapshot?: any

  // Email info
  emailedAt?: Date
  emailRecipients?: string[]
  emailSubject?: string

  // Metadata
  createdAt: Date
  updatedAt: Date

  // Relations (populated when needed)
  generatedByUser?: {
    id: string
    firstName: string
    lastName: string
  }
  template?: {
    id: string
    name: string
    type: string
  }
}

export interface DocumentVersionCreateRequest {
  documentId: string
  documentType: DocumentVersionType
  templateId?: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  generatedBy: string
  generatedAt: Date
  templateSnapshot?: any
}
