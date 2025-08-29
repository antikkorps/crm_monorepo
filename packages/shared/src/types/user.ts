// User types for Medical CRM

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  avatarSeed: string
  isActive: boolean
  lastLoginAt?: Date
  teamId?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserCreationAttributes {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: UserRole
  teamId?: string
}

export interface UserUpdateAttributes {
  firstName?: string
  lastName?: string
  email?: string
  role?: UserRole
  teamId?: string
  isActive?: boolean
}

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  TEAM_ADMIN = "team_admin",
  USER = "user",
}

export interface Team {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TeamCreationAttributes {
  name: string
  description?: string
}

export interface TeamUpdateAttributes {
  name?: string
  description?: string
  isActive?: boolean
}
