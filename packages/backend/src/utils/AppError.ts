export class AppError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly details?: any
  public readonly isOperational: boolean

  constructor(message: string, status: number = 500, code: string = "INTERNAL_SERVER_ERROR", details?: any) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.isOperational = true

    Object.setPrototypeOf(this, new.target.prototype)
    Error.captureStackTrace(this)
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request", details?: any) {
    super(message, 400, "BAD_REQUEST", details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized", details?: any) {
    super(message, 401, "UNAUTHORIZED", details)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden", details?: any) {
    super(message, 403, "FORBIDDEN", details)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details?: any) {
    super(message, 404, "NOT_FOUND", details)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict", details?: any) {
    super(message, 409, "CONFLICT", details)
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details?: any) {
    super(message, 422, "VALIDATION_ERROR", details)
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error", details?: any) {
    super(message, 500, "INTERNAL_SERVER_ERROR", details)
  }
}
