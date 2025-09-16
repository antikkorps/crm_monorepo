// Task-related type definitions

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  creatorId: string
  institutionId?: string
  contactId?: string
  dueDate?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date

  // Computed properties
  isOverdue?: boolean
  daysUntilDue?: number | null

  // Associated data
  assignee?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  creator?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  institution?: {
    id: string
    name: string
    type: string
  }
  contact?: {
    id: string
    firstName: string
    lastName: string
    title?: string
  }
}

export interface TaskCreateRequest {
  title: string
  description?: string
  priority?: TaskPriority
  assigneeId: string
  institutionId?: string
  contactId?: string
  dueDate?: Date
}

export interface TaskUpdateRequest {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
  institutionId?: string
  contactId?: string
  dueDate?: Date
}

export interface TaskSearchFilters {
  assigneeId?: string
  creatorId?: string
  institutionId?: string
  status?: TaskStatus
  priority?: TaskPriority
  teamMemberIds?: string[]
  overdue?: boolean
  dueDateFrom?: Date
  dueDateTo?: Date
  search?: string
}
