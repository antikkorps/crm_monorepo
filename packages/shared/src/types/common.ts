// Common types used across the application

export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

// Multi-source tracking types
export type DataSource = 'crm' | 'digiforma' | 'sage' | 'import'

export interface ExternalData {
  digiforma?: {
    id: string
    [key: string]: any
  }
  sage?: {
    id: string
    [key: string]: any
  }
  import?: {
    source_file: string
    import_date: Date
    import_user_id: string
    original_data: Record<string, any>
  }
}

export interface LastSyncAt {
  digiforma?: Date
  sage?: Date
  import?: Date
}

export interface ContactPerson {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  title?: string
  department?: string
  isPrimary: boolean

  // Multi-source tracking
  dataSource: DataSource
  isLocked: boolean
  lockedAt?: Date
  lockedReason?: string
  externalData: ExternalData
  lastSyncAt: LastSyncAt
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}
