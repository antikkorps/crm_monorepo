import Joi from "joi"
import { validate } from "./validation"
import { MeetingStatus, ParticipantStatus, ReminderPriority, CallType, SharePermission } from "@medical-crm/shared"

/**
 * Common validation schemas
 */
const uuidSchema = Joi.string().uuid().required().messages({
  "string.guid": "Invalid UUID format",
  "any.required": "Field is required",
})

const optionalUuidSchema = Joi.string().uuid().optional().messages({
  "string.guid": "Invalid UUID format",
})

const dateSchema = Joi.date().iso().required().messages({
  "date.format": "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
  "any.required": "Date is required",
})

const optionalDateSchema = Joi.date().iso().optional().messages({
  "date.format": "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)",
})

/**
 * Note validation schemas
 */
export const validateNoteCreation = validate(
  Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
      "string.empty": "Note title cannot be empty",
      "string.max": "Note title cannot exceed 255 characters",
      "any.required": "Note title is required",
    }),
    content: Joi.string().min(1).max(50000).required().messages({
      "string.empty": "Note content cannot be empty",
      "string.max": "Note content cannot exceed 50,000 characters",
      "any.required": "Note content is required",
    }),
    institutionId: uuidSchema.messages({
      "any.required": "Institution ID is required",
    }),
    // visibility removed; use isPrivate boolean instead
    tags: Joi.array().items(
      Joi.string().min(1).max(50).messages({
        "string.empty": "Tag cannot be empty",
        "string.max": "Tag cannot exceed 50 characters",
      })
    ).max(10).optional().messages({
      "array.max": "Cannot have more than 10 tags",
    }),
    isPrivate: Joi.boolean().default(false),
  }),
  "body"
)

export const validateNoteUpdate = validate(
  Joi.object({
    title: Joi.string().min(1).max(255).optional().messages({
      "string.empty": "Note title cannot be empty",
      "string.max": "Note title cannot exceed 255 characters",
    }),
    content: Joi.string().min(1).max(50000).optional().messages({
      "string.empty": "Note content cannot be empty",
      "string.max": "Note content cannot exceed 50,000 characters",
    }),
    // visibility removed; use isPrivate boolean instead
    tags: Joi.array().items(
      Joi.string().min(1).max(50).messages({
        "string.empty": "Tag cannot be empty",
        "string.max": "Tag cannot exceed 50 characters",
      })
    ).max(10).optional().messages({
      "array.max": "Cannot have more than 10 tags",
    }),
    isPrivate: Joi.boolean().optional(),
  }),
  "body"
)

export const validateNoteShare = validate(
  Joi.object({
    userId: uuidSchema.messages({
      "any.required": "User ID is required for sharing",
    }),
    permission: Joi.string().valid(...Object.values(SharePermission)).required().messages({
      "any.only": `Permission must be one of: ${Object.values(SharePermission).join(", ")}`,
      "any.required": "Permission is required",
    }),
  }),
  "body"
)

export const validateNoteSearch = validate(
  Joi.object({
    search: Joi.string().min(1).max(255).optional().messages({
      "string.empty": "Search term cannot be empty",
      "string.max": "Search term cannot exceed 255 characters",
    }),
    institutionId: optionalUuidSchema,
    creatorId: optionalUuidSchema,
    tags: Joi.array().items(Joi.string().min(1).max(50)).optional(),
    isPrivate: Joi.boolean().optional(),
    // visibility removed
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
  "query"
)

/**
 * Meeting validation schemas
 */
export const validateMeetingCreation = validate(
  Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
      "string.empty": "Meeting title cannot be empty",
      "string.max": "Meeting title cannot exceed 255 characters",
      "any.required": "Meeting title is required",
    }),
    description: Joi.string().max(10000).optional().messages({
      "string.max": "Meeting description cannot exceed 10,000 characters",
    }),
    startDate: dateSchema.messages({
      "any.required": "Meeting start date is required",
    }),
    endDate: dateSchema.greater(Joi.ref('startDate')).required().messages({
      "date.greater": "End date must be after start date",
      "any.required": "Meeting end date is required",
    }),
    location: Joi.string().max(255).optional().messages({
      "string.max": "Location cannot exceed 255 characters",
    }),
    institutionId: optionalUuidSchema,
    status: Joi.string().valid(...Object.values(MeetingStatus)).default(MeetingStatus.SCHEDULED).messages({
      "any.only": `Meeting status must be one of: ${Object.values(MeetingStatus).join(", ")}`,
    }),
    participantIds: Joi.array().items(uuidSchema).min(0).max(50).optional().messages({
      "array.max": "Cannot invite more than 50 participants",
    }),
  }),
  "body"
)

export const validateMeetingUpdate = validate(
  Joi.object({
    title: Joi.string().min(1).max(255).optional().messages({
      "string.empty": "Meeting title cannot be empty",
      "string.max": "Meeting title cannot exceed 255 characters",
    }),
    description: Joi.string().max(10000).optional().allow('').messages({
      "string.max": "Meeting description cannot exceed 10,000 characters",
    }),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    location: Joi.string().max(255).optional().allow('').messages({
      "string.max": "Location cannot exceed 255 characters",
    }),
    status: Joi.string().valid(...Object.values(MeetingStatus)).optional().messages({
      "any.only": `Meeting status must be one of: ${Object.values(MeetingStatus).join(", ")}`,
    }),
  }).custom((obj, helpers) => {
    // Custom validation to ensure endDate is after startDate when both are provided
    if (obj.startDate && obj.endDate && new Date(obj.endDate) <= new Date(obj.startDate)) {
      return helpers.error('custom.dateOrder')
    }
    return obj
  }).messages({
    'custom.dateOrder': 'End date must be after start date'
  }),
  "body"
)

export const validateMeetingParticipant = validate(
  Joi.object({
    userId: uuidSchema.messages({
      "any.required": "User ID is required",
    }),
    status: Joi.string().valid(...Object.values(ParticipantStatus)).default(ParticipantStatus.INVITED).messages({
      "any.only": `Participant status must be one of: ${Object.values(ParticipantStatus).join(", ")}`,
    }),
  }),
  "body"
)

export const validateMeetingSearch = validate(
  Joi.object({
    search: Joi.string().min(1).max(255).optional().messages({
      "string.empty": "Search term cannot be empty",
      "string.max": "Search term cannot exceed 255 characters",
    }),
    institutionId: optionalUuidSchema,
    status: Joi.string().valid(...Object.values(MeetingStatus)).optional(),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    participantId: optionalUuidSchema,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
  "query"
)

/**
 * Comment validation schemas
 */
export const validateCommentCreation = validate(
  Joi.object({
    content: Joi.string().min(1).max(5000).required().messages({
      "string.empty": "Comment content cannot be empty",
      "string.max": "Comment content cannot exceed 5,000 characters",
      "any.required": "Comment content is required",
    }),
    parentId: optionalUuidSchema.messages({
      "string.guid": "Invalid parent comment ID format",
    }),
  }),
  "body"
)

export const validateCommentUpdate = validate(
  Joi.object({
    content: Joi.string().min(1).max(5000).required().messages({
      "string.empty": "Comment content cannot be empty",
      "string.max": "Comment content cannot exceed 5,000 characters",
      "any.required": "Comment content is required",
    }),
  }),
  "body"
)

/**
 * Call validation schemas
 */
export const validateCallCreation = validate(
  Joi.object({
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]{7,20}$/).required().messages({
      "string.pattern.base": "Invalid phone number format",
      "any.required": "Phone number is required",
    }),
    callType: Joi.string().valid(...Object.values(CallType)).required().messages({
      "any.only": `Call type must be one of: ${Object.values(CallType).join(", ")}`,
      "any.required": "Call type is required",
    }),
    duration: Joi.number().integer().min(0).max(86400).optional().messages({
      "number.min": "Duration cannot be negative",
      "number.max": "Duration cannot exceed 24 hours (86400 seconds)",
    }),
    notes: Joi.string().max(10000).optional().messages({
      "string.max": "Call notes cannot exceed 10,000 characters",
    }),
    institutionId: optionalUuidSchema,
    callDate: optionalDateSchema,
  }),
  "body"
)

export const validateCallUpdate = validate(
  Joi.object({
    duration: Joi.number().integer().min(0).max(86400).optional().messages({
      "number.min": "Duration cannot be negative",
      "number.max": "Duration cannot exceed 24 hours (86400 seconds)",
    }),
    notes: Joi.string().max(10000).optional().messages({
      "string.max": "Call notes cannot exceed 10,000 characters",
    }),
    institutionId: optionalUuidSchema,
  }),
  "body"
)

export const validateCallSearch = validate(
  Joi.object({
    phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]{7,20}$/).optional().messages({
      "string.pattern.base": "Invalid phone number format",
    }),
    institutionId: optionalUuidSchema,
    callType: Joi.string().valid(...Object.values(CallType)).optional(),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
  "query"
)

/**
 * Reminder validation schemas
 */
export const validateReminderCreation = validate(
  Joi.object({
    title: Joi.string().min(1).max(255).required().messages({
      "string.empty": "Reminder title cannot be empty",
      "string.max": "Reminder title cannot exceed 255 characters",
      "any.required": "Reminder title is required",
    }),
    description: Joi.string().max(5000).optional().messages({
      "string.max": "Reminder description cannot exceed 5,000 characters",
    }),
    reminderDate: dateSchema.min('now').required().messages({
      "date.min": "Reminder date cannot be in the past",
      "any.required": "Reminder date is required",
    }),
    priority: Joi.string().valid(...Object.values(ReminderPriority)).default(ReminderPriority.MEDIUM).messages({
      "any.only": `Priority must be one of: ${Object.values(ReminderPriority).join(", ")}`,
    }),
    institutionId: optionalUuidSchema,
    // status removed for reminders; use isCompleted boolean in APIs
  }),
  "body"
)

export const validateReminderUpdate = validate(
  Joi.object({
    title: Joi.string().min(1).max(255).optional().messages({
      "string.empty": "Reminder title cannot be empty",
      "string.max": "Reminder title cannot exceed 255 characters",
    }),
    description: Joi.string().max(5000).optional().allow('').messages({
      "string.max": "Reminder description cannot exceed 5,000 characters",
    }),
    reminderDate: optionalDateSchema.min('now').messages({
      "date.min": "Reminder date cannot be in the past",
    }),
    priority: Joi.string().valid(...Object.values(ReminderPriority)).optional().messages({
      "any.only": `Priority must be one of: ${Object.values(ReminderPriority).join(", ")}`,
    }),
    // status removed
  }),
  "body"
)

export const validateReminderSnooze = validate(
  Joi.object({
    snoozeMinutes: Joi.number().integer().min(1).max(10080).required().messages({
      "number.min": "Snooze duration must be at least 1 minute",
      "number.max": "Snooze duration cannot exceed 7 days (10080 minutes)",
      "any.required": "Snooze duration is required",
    }),
  }),
  "body"
)

export const validateReminderReschedule = validate(
  Joi.object({
    newReminderDate: dateSchema.min('now').required().messages({
      "date.min": "New reminder date cannot be in the past",
      "any.required": "New reminder date is required",
    }),
  }),
  "body"
)

export const validateReminderSearch = validate(
  Joi.object({
    search: Joi.string().min(1).max(255).optional().messages({
      "string.empty": "Search term cannot be empty",
      "string.max": "Search term cannot exceed 255 characters",
    }),
    institutionId: optionalUuidSchema,
    priority: Joi.string().valid(...Object.values(ReminderPriority)).optional(),
    // status removed
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    overdue: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
  "query"
)

/**
 * Timeline and search validation schemas
 */
export const validateTimelineQuery = validate(
  Joi.object({
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    types: Joi.array().items(
      Joi.string().valid("note", "meeting", "call", "reminder", "task", "comment")
    ).optional().messages({
      "any.only": "Invalid timeline item type",
    }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
  "query"
)

export const validateUnifiedSearch = validate(
  Joi.object({
    query: Joi.string().min(1).max(255).required().messages({
      "string.empty": "Search query cannot be empty",
      "string.max": "Search query cannot exceed 255 characters",
      "any.required": "Search query is required",
    }),
    type: Joi.string().valid("institutions", "tasks", "notes", "meetings", "calls", "reminders", "all").optional(),
    institutionId: optionalUuidSchema,
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
  "query"
)

/**
 * Batch operation validation schemas
 */
export const validateBatchDelete = validate(
  Joi.object({
    ids: Joi.array().items(uuidSchema).min(1).max(50).required().messages({
      "array.min": "At least one ID is required",
      "array.max": "Cannot delete more than 50 items at once",
      "any.required": "IDs array is required",
    }),
  }),
  "body"
)

export const validateBatchStatusUpdate = validate(
  Joi.object({
    ids: Joi.array().items(uuidSchema).min(1).max(50).required().messages({
      "array.min": "At least one ID is required",
      "array.max": "Cannot update more than 50 items at once",
      "any.required": "IDs array is required",
    }),
    status: Joi.string().required().messages({
      "any.required": "Status is required",
    }),
  }),
  "body"
)
