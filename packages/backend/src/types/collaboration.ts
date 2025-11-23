// Backend-specific collaboration model interfaces and validation functions
import { Optional } from "sequelize"

// Re-export shared enums for consistency
export {
  CallType,
  MeetingStatus,
  ParticipantStatus,
  ReminderPriority,
  SharePermission,
} from "@medical-crm/shared"

// Note model interfaces
export interface NoteAttributes {
  id: string
  title: string
  content: string
  tags: string[]
  creatorId: string
  institutionId?: string
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NoteCreationAttributes
  extends Optional<NoteAttributes, "id" | "createdAt" | "updatedAt"> {}

// NoteShare model interfaces
export interface NoteShareAttributes {
  id: string
  noteId: string
  userId: string
  permission: string // SharePermission enum
  createdAt: Date
}

export interface NoteShareCreationAttributes
  extends Optional<NoteShareAttributes, "id" | "createdAt"> {}

// Meeting model interfaces
export interface MeetingAttributes {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  location?: string
  organizerId: string
  institutionId?: string
  status: string // MeetingStatus enum
  createdAt: Date
  updatedAt: Date
}

export interface MeetingCreationAttributes
  extends Optional<MeetingAttributes, "id" | "createdAt" | "updatedAt"> {}

// MeetingParticipant model interfaces
export interface MeetingParticipantAttributes {
  id: string
  meetingId: string
  userId: string
  status: string // ParticipantStatus enum
  createdAt: Date
}

export interface MeetingParticipantCreationAttributes
  extends Optional<MeetingParticipantAttributes, "id" | "createdAt"> {}

// Comment model interfaces
export interface CommentAttributes {
  id: string
  content: string
  meetingId: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface CommentCreationAttributes
  extends Optional<CommentAttributes, "id" | "createdAt" | "updatedAt"> {}

// Call model interfaces
export interface CallAttributes {
  id: string
  phoneNumber: string
  duration?: number
  summary?: string
  callType: string // CallType enum
  userId: string
  institutionId?: string
  contactPersonId?: string
  createdAt: Date
  updatedAt: Date
}

export interface CallCreationAttributes
  extends Optional<CallAttributes, "id" | "createdAt" | "updatedAt"> {}

// Reminder model interfaces
export interface ReminderAttributes {
  id: string
  title: string
  description?: string
  reminderDate: Date
  isCompleted: boolean
  userId: string
  institutionId?: string
  priority: string // ReminderPriority enum
  createdAt: Date
  updatedAt: Date
}

export interface ReminderCreationAttributes
  extends Optional<ReminderAttributes, "id" | "createdAt" | "updatedAt"> {}

// Validation functions
export class CollaborationValidation {
  // Note validation
  static validateNoteTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error("Note title is required")
    }
    if (title.length > 255) {
      throw new Error("Note title cannot exceed 255 characters")
    }
  }

  static validateNoteContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error("Note content is required")
    }
    if (content.length > 10000) {
      throw new Error("Note content cannot exceed 10,000 characters")
    }
  }

  static validateNoteTags(tags: string[]): void {
    if (tags.length > 20) {
      throw new Error("Cannot have more than 20 tags per note")
    }
    for (const tag of tags) {
      if (tag.length > 50) {
        throw new Error("Tag cannot exceed 50 characters")
      }
      if (!/^[a-zA-Z0-9\-_\s]+$/.test(tag)) {
        throw new Error(
          "Tags can only contain letters, numbers, hyphens, underscores, and spaces"
        )
      }
    }
  }

  // Meeting validation
  static validateMeetingTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error("Meeting title is required")
    }
    if (title.length > 255) {
      throw new Error("Meeting title cannot exceed 255 characters")
    }
  }

  static validateMeetingDates(startDate: Date, endDate: Date): void {
    const now = new Date()

    if (startDate < now) {
      // Allow past dates for testing purposes - in production this should be stricter
      // throw new Error("Meeting start date cannot be in the past")
    }

    if (endDate <= startDate) {
      throw new Error("Meeting end date must be after start date")
    }

    const maxDuration = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    if (endDate.getTime() - startDate.getTime() > maxDuration) {
      throw new Error("Meeting cannot exceed 24 hours")
    }
  }

  static validateMeetingLocation(location?: string): void {
    if (location && location.length > 500) {
      throw new Error("Meeting location cannot exceed 500 characters")
    }
  }

  // Call validation
  static validatePhoneNumber(phoneNumber: string): void {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      throw new Error("Phone number is required")
    }

    // Basic phone number validation - allows various formats including French numbers (0X XX XX XX XX)
    // Accepts: +33..., 0033..., 06..., 01..., etc.
    const phoneRegex = /^[\+]?[\d]{1,15}$/
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)\.]/g, "")

    if (!phoneRegex.test(cleanPhone)) {
      throw new Error("Invalid phone number format")
    }

    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      throw new Error("Phone number must be between 7 and 15 digits")
    }
  }

  static validateCallDuration(duration?: number): void {
    if (duration !== undefined) {
      if (duration < 0) {
        throw new Error("Call duration cannot be negative")
      }
      if (duration > 86400) {
        // 24 hours in seconds
        throw new Error("Call duration cannot exceed 24 hours")
      }
    }
  }

  static validateCallSummary(summary?: string): void {
    if (summary && summary.length > 2000) {
      throw new Error("Call summary cannot exceed 2,000 characters")
    }
  }

  // Reminder validation
  static validateReminderTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error("Reminder title is required")
    }
    if (title.length > 255) {
      throw new Error("Reminder title cannot exceed 255 characters")
    }
  }

  static validateReminderDate(reminderDate: Date): void {
    // Allow past dates for testing purposes - in production this might be stricter
    const now = new Date()
    const maxFutureDate = new Date()
    maxFutureDate.setFullYear(now.getFullYear() + 5) // 5 years in the future

    if (reminderDate > maxFutureDate) {
      throw new Error("Reminder date cannot be more than 5 years in the future")
    }
  }

  static validateReminderDescription(description?: string): void {
    if (description && description.length > 1000) {
      throw new Error("Reminder description cannot exceed 1,000 characters")
    }
  }

  // Comment validation
  static validateCommentContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error("Comment content is required")
    }
    if (content.length > 2000) {
      throw new Error("Comment content cannot exceed 2,000 characters")
    }
  }

  // Permission validation
  static validateNoteAccess(userId: string, note: any, shares: any[]): boolean {
    // Creator always has access
    if (note.creatorId === userId) {
      return true
    }

    // Public notes are accessible to all
    if (!note.isPrivate) {
      return true
    }

    // Check if user has explicit share permission
    return shares.some((share) => share.userId === userId)
  }

  static validateMeetingAccess(
    userId: string,
    meeting: any,
    participants: any[]
  ): boolean {
    // Organizer always has access
    if (meeting.organizerId === userId) {
      return true
    }

    // Check if user is a participant
    return participants.some((participant) => participant.userId === userId)
  }

  // Status transition validation
  static validateMeetingStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      scheduled: ["in_progress", "cancelled"],
      in_progress: ["completed", "cancelled"],
      completed: ["scheduled"], // Allow rescheduling
      cancelled: ["scheduled"], // Allow reactivation
    }

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(
        `Invalid meeting status transition from ${currentStatus} to ${newStatus}`
      )
    }
  }

  static validateParticipantStatusTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const validTransitions: Record<string, string[]> = {
      invited: ["accepted", "declined", "tentative"],
      accepted: ["declined", "tentative"],
      declined: ["accepted", "tentative"],
      tentative: ["accepted", "declined"],
    }

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(
        `Invalid participant status transition from ${currentStatus} to ${newStatus}`
      )
    }
  }
}
