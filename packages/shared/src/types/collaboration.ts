// Collaboration features type definitions

// Note-related types
export enum SharePermission {
  READ = "read",
  WRITE = "write",
}

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  creatorId: string
  institutionId?: string
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date

  // Associated data
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
  shares?: NoteShare[]
}

export interface NoteShare {
  id: string
  noteId: string
  userId: string
  permission: SharePermission
  createdAt: Date

  // Associated data
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface NoteCreateRequest {
  title: string
  content: string
  tags?: string[]
  institutionId?: string
  isPrivate?: boolean
  shareWith?: Array<{
    userId: string
    permission: SharePermission
  }>
}

export interface NoteUpdateRequest {
  title?: string
  content?: string
  tags?: string[]
  institutionId?: string
  isPrivate?: boolean
}

// Meeting-related types
export enum MeetingStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum ParticipantStatus {
  INVITED = "invited",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  TENTATIVE = "tentative",
}

export interface Meeting {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  location?: string
  organizerId: string
  institutionId?: string
  status: MeetingStatus
  createdAt: Date
  updatedAt: Date

  // Associated data
  organizer?: {
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
  participants?: MeetingParticipant[]
  comments?: Comment[]
}

export interface MeetingParticipant {
  id: string
  meetingId: string
  userId: string
  status: ParticipantStatus
  createdAt: Date

  // Associated data
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface Comment {
  id: string
  content: string
  meetingId: string
  userId: string
  createdAt: Date
  updatedAt: Date

  // Associated data
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface MeetingCreateRequest {
  title: string
  description?: string
  startDate: Date
  endDate: Date
  location?: string
  institutionId?: string
  participantIds?: string[]
}

export interface MeetingUpdateRequest {
  title?: string
  description?: string
  startDate?: Date
  endDate?: Date
  location?: string
  status?: MeetingStatus
  institutionId?: string
}

// Call-related types
export enum CallType {
  INCOMING = "incoming",
  OUTGOING = "outgoing",
  MISSED = "missed",
}

export interface Call {
  id: string
  phoneNumber: string
  duration?: number
  summary?: string
  callType: CallType
  userId: string
  institutionId?: string
  contactPersonId?: string
  createdAt: Date
  updatedAt: Date

  // Associated data
  user?: {
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
  contactPerson?: {
    id: string
    firstName: string
    lastName: string
    phone?: string
  }
}

export interface CallCreateRequest {
  phoneNumber: string
  duration?: number
  summary?: string
  callType: CallType
  institutionId?: string
  contactPersonId?: string
}

export interface CallUpdateRequest {
  duration?: number
  summary?: string
  institutionId?: string
  contactPersonId?: string
}

// Reminder-related types
export enum ReminderPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface Reminder {
  id: string
  title: string
  description?: string
  reminderDate: Date
  isCompleted: boolean
  userId: string
  institutionId?: string
  priority: ReminderPriority
  createdAt: Date
  updatedAt: Date

  // Computed properties
  isOverdue?: boolean
  daysUntilDue?: number | null

  // Associated data
  user?: {
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
}

export interface ReminderCreateRequest {
  title: string
  description?: string
  reminderDate: Date
  priority?: ReminderPriority
  institutionId?: string
}

export interface ReminderUpdateRequest {
  title?: string
  description?: string
  reminderDate?: Date
  isCompleted?: boolean
  priority?: ReminderPriority
  institutionId?: string
}

// Search and filter interfaces
export interface NoteSearchFilters {
  creatorId?: string
  institutionId?: string
  tags?: string[]
  isPrivate?: boolean
  search?: string
  sharedWithUserId?: string
}

export interface MeetingSearchFilters {
  organizerId?: string
  participantId?: string
  institutionId?: string
  status?: MeetingStatus
  startDateFrom?: Date
  startDateTo?: Date
  search?: string
}

export interface CallSearchFilters {
  userId?: string
  institutionId?: string
  callType?: CallType
  phoneNumber?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
}

export interface ReminderSearchFilters {
  userId?: string
  institutionId?: string
  priority?: ReminderPriority
  isCompleted?: boolean
  reminderDateFrom?: Date
  reminderDateTo?: Date
  overdue?: boolean
  search?: string
}
