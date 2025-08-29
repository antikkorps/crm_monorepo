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

export interface ContactPerson {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  title?: string
  department?: string
  isPrimary: boolean
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
