import { Context, Next } from "../types/koa"
import { logger } from "../utils/logger"
import { createError } from "./errorHandler"
import { AppError } from "../utils/AppError"
import { ValidationError as JoiValidationError } from "joi"

/**
 * Collaboration-specific error codes
 */
export enum CollaborationErrorCode {
  // Note errors
  NOTE_NOT_FOUND = "NOTE_NOT_FOUND",
  NOTE_ACCESS_DENIED = "NOTE_ACCESS_DENIED",
  NOTE_ALREADY_SHARED = "NOTE_ALREADY_SHARED",
  NOTE_SHARE_NOT_FOUND = "NOTE_SHARE_NOT_FOUND",
  NOTE_CANNOT_SHARE_WITH_SELF = "NOTE_CANNOT_SHARE_WITH_SELF",
  NOTE_INVALID_PERMISSION = "NOTE_INVALID_PERMISSION",

  // Meeting errors
  MEETING_NOT_FOUND = "MEETING_NOT_FOUND",
  MEETING_ACCESS_DENIED = "MEETING_ACCESS_DENIED",
  MEETING_ALREADY_STARTED = "MEETING_ALREADY_STARTED",
  MEETING_ALREADY_ENDED = "MEETING_ALREADY_ENDED",
  MEETING_ALREADY_CANCELLED = "MEETING_ALREADY_CANCELLED",
  MEETING_TIME_CONFLICT = "MEETING_TIME_CONFLICT",
  MEETING_PARTICIPANT_NOT_FOUND = "MEETING_PARTICIPANT_NOT_FOUND",
  MEETING_PARTICIPANT_ALREADY_INVITED = "MEETING_PARTICIPANT_ALREADY_INVITED",
  MEETING_CANNOT_INVITE_SELF = "MEETING_CANNOT_INVITE_SELF",
  MEETING_MAX_PARTICIPANTS_REACHED = "MEETING_MAX_PARTICIPANTS_REACHED",
  MEETING_INVALID_DATE_RANGE = "MEETING_INVALID_DATE_RANGE",

  // Comment errors
  COMMENT_NOT_FOUND = "COMMENT_NOT_FOUND",
  COMMENT_ACCESS_DENIED = "COMMENT_ACCESS_DENIED",
  COMMENT_ALREADY_DELETED = "COMMENT_ALREADY_DELETED",
  COMMENT_EDIT_TIME_EXPIRED = "COMMENT_EDIT_TIME_EXPIRED",

  // Call errors
  CALL_NOT_FOUND = "CALL_NOT_FOUND",
  CALL_ACCESS_DENIED = "CALL_ACCESS_DENIED",
  CALL_INVALID_PHONE_NUMBER = "CALL_INVALID_PHONE_NUMBER",
  CALL_DUPLICATE_ENTRY = "CALL_DUPLICATE_ENTRY",

  // Reminder errors
  REMINDER_NOT_FOUND = "REMINDER_NOT_FOUND",
  REMINDER_ACCESS_DENIED = "REMINDER_ACCESS_DENIED",
  REMINDER_ALREADY_COMPLETED = "REMINDER_ALREADY_COMPLETED",
  REMINDER_ALREADY_CANCELLED = "REMINDER_ALREADY_CANCELLED",
  REMINDER_INVALID_DATE = "REMINDER_INVALID_DATE",
  REMINDER_CANNOT_SNOOZE_COMPLETED = "REMINDER_CANNOT_SNOOZE_COMPLETED",

  // General collaboration errors
  INSTITUTION_NOT_FOUND = "INSTITUTION_NOT_FOUND",
  INSTITUTION_ACCESS_DENIED = "INSTITUTION_ACCESS_DENIED",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_NOT_IN_TEAM = "USER_NOT_IN_TEAM",
  TEAM_ACCESS_DENIED = "TEAM_ACCESS_DENIED",
  RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
  INVALID_OPERATION = "INVALID_OPERATION",
  BATCH_OPERATION_FAILED = "BATCH_OPERATION_FAILED",

  // Search and filter errors
  INVALID_SEARCH_PARAMETERS = "INVALID_SEARCH_PARAMETERS",
  SEARCH_QUERY_TOO_SHORT = "SEARCH_QUERY_TOO_SHORT",
  TOO_MANY_RESULTS = "TOO_MANY_RESULTS",
}

/**
 * User-friendly error messages for collaboration errors
 */
export const CollaborationErrorMessages: Record<CollaborationErrorCode, string> = {
  // Note errors
  [CollaborationErrorCode.NOTE_NOT_FOUND]: "The requested note was not found or you don't have permission to access it.",
  [CollaborationErrorCode.NOTE_ACCESS_DENIED]: "You don't have permission to perform this action on this note.",
  [CollaborationErrorCode.NOTE_ALREADY_SHARED]: "This note is already shared with the specified user.",
  [CollaborationErrorCode.NOTE_SHARE_NOT_FOUND]: "The note sharing permission was not found.",
  [CollaborationErrorCode.NOTE_CANNOT_SHARE_WITH_SELF]: "You cannot share a note with yourself.",
  [CollaborationErrorCode.NOTE_INVALID_PERMISSION]: "Invalid sharing permission. Must be either 'READ' or 'WRITE'.",

  // Meeting errors
  [CollaborationErrorCode.MEETING_NOT_FOUND]: "The requested meeting was not found or you don't have permission to access it.",
  [CollaborationErrorCode.MEETING_ACCESS_DENIED]: "You don't have permission to perform this action on this meeting.",
  [CollaborationErrorCode.MEETING_ALREADY_STARTED]: "Cannot modify a meeting that has already started.",
  [CollaborationErrorCode.MEETING_ALREADY_ENDED]: "Cannot modify a meeting that has already ended.",
  [CollaborationErrorCode.MEETING_ALREADY_CANCELLED]: "Cannot modify a meeting that has been cancelled.",
  [CollaborationErrorCode.MEETING_TIME_CONFLICT]: "The meeting time conflicts with another scheduled meeting.",
  [CollaborationErrorCode.MEETING_PARTICIPANT_NOT_FOUND]: "The specified participant was not found in this meeting.",
  [CollaborationErrorCode.MEETING_PARTICIPANT_ALREADY_INVITED]: "This user is already invited to the meeting.",
  [CollaborationErrorCode.MEETING_CANNOT_INVITE_SELF]: "You cannot invite yourself to a meeting you're organizing.",
  [CollaborationErrorCode.MEETING_MAX_PARTICIPANTS_REACHED]: "Maximum number of participants (50) has been reached for this meeting.",
  [CollaborationErrorCode.MEETING_INVALID_DATE_RANGE]: "Meeting end date must be after the start date.",

  // Comment errors
  [CollaborationErrorCode.COMMENT_NOT_FOUND]: "The requested comment was not found or has been deleted.",
  [CollaborationErrorCode.COMMENT_ACCESS_DENIED]: "You don't have permission to perform this action on this comment.",
  [CollaborationErrorCode.COMMENT_ALREADY_DELETED]: "This comment has already been deleted.",
  [CollaborationErrorCode.COMMENT_EDIT_TIME_EXPIRED]: "Comments can only be edited within 30 minutes of posting.",

  // Call errors
  [CollaborationErrorCode.CALL_NOT_FOUND]: "The requested call record was not found or you don't have permission to access it.",
  [CollaborationErrorCode.CALL_ACCESS_DENIED]: "You don't have permission to perform this action on this call record.",
  [CollaborationErrorCode.CALL_INVALID_PHONE_NUMBER]: "Invalid phone number format. Please use a valid international format.",
  [CollaborationErrorCode.CALL_DUPLICATE_ENTRY]: "A call record with the same phone number and timestamp already exists.",

  // Reminder errors
  [CollaborationErrorCode.REMINDER_NOT_FOUND]: "The requested reminder was not found or you don't have permission to access it.",
  [CollaborationErrorCode.REMINDER_ACCESS_DENIED]: "You don't have permission to perform this action on this reminder.",
  [CollaborationErrorCode.REMINDER_ALREADY_COMPLETED]: "This reminder has already been marked as completed.",
  [CollaborationErrorCode.REMINDER_ALREADY_CANCELLED]: "This reminder has already been cancelled.",
  [CollaborationErrorCode.REMINDER_INVALID_DATE]: "Reminder date must be in the future.",
  [CollaborationErrorCode.REMINDER_CANNOT_SNOOZE_COMPLETED]: "Cannot snooze a completed reminder.",

  // General collaboration errors
  [CollaborationErrorCode.INSTITUTION_NOT_FOUND]: "The requested medical institution was not found or you don't have permission to access it.",
  [CollaborationErrorCode.INSTITUTION_ACCESS_DENIED]: "You don't have permission to access this medical institution.",
  [CollaborationErrorCode.USER_NOT_FOUND]: "The specified user was not found.",
  [CollaborationErrorCode.USER_NOT_IN_TEAM]: "The specified user is not a member of your team.",
  [CollaborationErrorCode.TEAM_ACCESS_DENIED]: "You don't have permission to access resources from this team.",
  [CollaborationErrorCode.RESOURCE_CONFLICT]: "The operation cannot be completed due to a conflict with existing data.",
  [CollaborationErrorCode.INVALID_OPERATION]: "The requested operation is not valid for the current resource state.",
  [CollaborationErrorCode.BATCH_OPERATION_FAILED]: "Some items in the batch operation could not be processed.",

  // Search and filter errors
  [CollaborationErrorCode.INVALID_SEARCH_PARAMETERS]: "Invalid search parameters provided.",
  [CollaborationErrorCode.SEARCH_QUERY_TOO_SHORT]: "Search query must be at least 3 characters long.",
  [CollaborationErrorCode.TOO_MANY_RESULTS]: "Search returned too many results. Please refine your search criteria.",
}

/**
 * Helper function to create collaboration-specific errors
 */
export const createCollaborationError = (
  code: CollaborationErrorCode,
  customMessage?: string,
  details?: any,
  status?: number
): AppError => {
  const message = customMessage || CollaborationErrorMessages[code]
  const errorStatus = status || getStatusCodeForError(code)
  
  return createError(message, errorStatus, code, details)
}

/**
 * Map error codes to appropriate HTTP status codes
 */
function getStatusCodeForError(code: CollaborationErrorCode): number {
  switch (code) {
    case CollaborationErrorCode.NOTE_NOT_FOUND:
    case CollaborationErrorCode.MEETING_NOT_FOUND:
    case CollaborationErrorCode.COMMENT_NOT_FOUND:
    case CollaborationErrorCode.CALL_NOT_FOUND:
    case CollaborationErrorCode.REMINDER_NOT_FOUND:
    case CollaborationErrorCode.INSTITUTION_NOT_FOUND:
    case CollaborationErrorCode.USER_NOT_FOUND:
    case CollaborationErrorCode.NOTE_SHARE_NOT_FOUND:
    case CollaborationErrorCode.MEETING_PARTICIPANT_NOT_FOUND:
      return 404

    case CollaborationErrorCode.NOTE_ACCESS_DENIED:
    case CollaborationErrorCode.MEETING_ACCESS_DENIED:
    case CollaborationErrorCode.COMMENT_ACCESS_DENIED:
    case CollaborationErrorCode.CALL_ACCESS_DENIED:
    case CollaborationErrorCode.REMINDER_ACCESS_DENIED:
    case CollaborationErrorCode.INSTITUTION_ACCESS_DENIED:
    case CollaborationErrorCode.TEAM_ACCESS_DENIED:
      return 403

    case CollaborationErrorCode.NOTE_ALREADY_SHARED:
    case CollaborationErrorCode.MEETING_ALREADY_STARTED:
    case CollaborationErrorCode.MEETING_ALREADY_ENDED:
    case CollaborationErrorCode.MEETING_ALREADY_CANCELLED:
    case CollaborationErrorCode.MEETING_TIME_CONFLICT:
    case CollaborationErrorCode.MEETING_PARTICIPANT_ALREADY_INVITED:
    case CollaborationErrorCode.COMMENT_ALREADY_DELETED:
    case CollaborationErrorCode.CALL_DUPLICATE_ENTRY:
    case CollaborationErrorCode.REMINDER_ALREADY_COMPLETED:
    case CollaborationErrorCode.REMINDER_ALREADY_CANCELLED:
    case CollaborationErrorCode.RESOURCE_CONFLICT:
      return 409

    case CollaborationErrorCode.NOTE_CANNOT_SHARE_WITH_SELF:
    case CollaborationErrorCode.NOTE_INVALID_PERMISSION:
    case CollaborationErrorCode.MEETING_CANNOT_INVITE_SELF:
    case CollaborationErrorCode.MEETING_MAX_PARTICIPANTS_REACHED:
    case CollaborationErrorCode.MEETING_INVALID_DATE_RANGE:
    case CollaborationErrorCode.COMMENT_EDIT_TIME_EXPIRED:
    case CollaborationErrorCode.CALL_INVALID_PHONE_NUMBER:
    case CollaborationErrorCode.REMINDER_INVALID_DATE:
    case CollaborationErrorCode.REMINDER_CANNOT_SNOOZE_COMPLETED:
    case CollaborationErrorCode.USER_NOT_IN_TEAM:
    case CollaborationErrorCode.INVALID_OPERATION:
    case CollaborationErrorCode.INVALID_SEARCH_PARAMETERS:
    case CollaborationErrorCode.SEARCH_QUERY_TOO_SHORT:
      return 400

    case CollaborationErrorCode.BATCH_OPERATION_FAILED:
      return 207 // Multi-Status

    case CollaborationErrorCode.TOO_MANY_RESULTS:
      return 413 // Payload Too Large

    default:
      return 500
  }
}

/**
 * Enhanced error handler for collaboration endpoints
 */
export const collaborationErrorHandler = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (err: any) {
    const error = err as AppError

    // Handle Joi validation errors specifically
    if (err instanceof JoiValidationError || err.name === 'ValidationError') {
      const validationDetails = err.details?.map((detail: any) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      })) || []

      const enhancedError = createError(
        "Input validation failed. Please check your request data.",
        400,
        "VALIDATION_ERROR",
        { 
          details: validationDetails,
          hint: "Make sure all required fields are provided and in the correct format."
        }
      )

      logger.warn("Collaboration validation error", {
        error: err.message,
        details: validationDetails,
        method: ctx.method,
        url: ctx.url,
        requestId: ctx.state.requestId,
        userId: ctx.state.user?.id,
      })

      ctx.status = 400
      ctx.body = {
        error: {
          code: enhancedError.code,
          message: enhancedError.message,
          details: enhancedError.details,
          timestamp: new Date().toISOString(),
          requestId: ctx.state.requestId || "unknown",
        },
      }
      return
    }

    // Handle collaboration-specific errors
    if (Object.values(CollaborationErrorCode).includes(error.code as CollaborationErrorCode)) {
      const status = getStatusCodeForError(error.code as CollaborationErrorCode)
      
      ctx.status = status
      ctx.body = {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
          requestId: ctx.state.requestId || "unknown",
        },
      }

      // Log collaboration errors for monitoring
      logger.warn("Collaboration operation error", {
        errorCode: error.code,
        message: error.message,
        status,
        method: ctx.method,
        url: ctx.url,
        requestId: ctx.state.requestId,
        userId: ctx.state.user?.id,
        details: error.details,
      })

      return
    }

    // Handle database constraint violations
    if (err.name === 'SequelizeUniqueConstraintError') {
      const constraintError = createCollaborationError(
        CollaborationErrorCode.RESOURCE_CONFLICT,
        "A resource with the same information already exists.",
        { constraint: err.parent?.constraint }
      )

      ctx.status = 409
      ctx.body = {
        error: {
          code: constraintError.code,
          message: constraintError.message,
          details: constraintError.details,
          timestamp: new Date().toISOString(),
          requestId: ctx.state.requestId || "unknown",
        },
      }

      logger.warn("Database constraint violation in collaboration", {
        constraint: err.parent?.constraint,
        method: ctx.method,
        url: ctx.url,
        requestId: ctx.state.requestId,
        userId: ctx.state.user?.id,
      })

      return
    }

    // Handle foreign key constraint violations
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      const fkError = createCollaborationError(
        CollaborationErrorCode.INVALID_OPERATION,
        "The operation references a resource that doesn't exist or you don't have access to.",
        { constraint: err.parent?.constraint }
      )

      ctx.status = 400
      ctx.body = {
        error: {
          code: fkError.code,
          message: fkError.message,
          details: fkError.details,
          timestamp: new Date().toISOString(),
          requestId: ctx.state.requestId || "unknown",
        },
      }

      logger.warn("Foreign key constraint violation in collaboration", {
        constraint: err.parent?.constraint,
        method: ctx.method,
        url: ctx.url,
        requestId: ctx.state.requestId,
        userId: ctx.state.user?.id,
      })

      return
    }

    // Re-throw other errors to be handled by the general error handler
    throw err
  }
}

/**
 * Middleware to add helpful context to error responses
 */
export const addCollaborationErrorContext = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (err: any) {
    // Add contextual information that might help with debugging
    const contextInfo = {
      endpoint: `${ctx.method} ${ctx.url}`,
      userRole: ctx.state.user?.role,
      teamId: ctx.state.user?.teamId,
      timestamp: new Date().toISOString(),
    }

    // Add context to the error details
    if (err.details) {
      err.details = { ...err.details, context: contextInfo }
    } else {
      err.details = { context: contextInfo }
    }

    throw err
  }
}