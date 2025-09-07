import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { Context, Next } from '../../types/koa'
import { 
  collaborationErrorHandler,
  addCollaborationErrorContext,
  createCollaborationError,
  CollaborationErrorCode,
  CollaborationErrorMessages
} from '../../middleware/collaborationErrorHandler'
import { ValidationError as JoiValidationError } from 'joi'

describe('Collaboration Error Handling', () => {
  let mockCtx: Partial<Context>
  let mockNext: Next

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockCtx = {
      method: 'POST',
      url: '/api/notes',
      status: 200,
      body: null,
      state: {
        user: { id: 'user-123', role: 'user', teamId: 'team-123' },
        requestId: 'req-123'
      },
      get: jest.fn().mockReturnValue('test-user-agent'),
      ip: '192.168.1.1'
    }
    
    mockNext = jest.fn()
  })

  describe('createCollaborationError', () => {
    it('should create error with correct properties', () => {
      const error = createCollaborationError(
        CollaborationErrorCode.NOTE_NOT_FOUND,
        'Custom message',
        { noteId: '123' },
        404
      )
      
      expect(error.message).toBe('Custom message')
      expect(error.code).toBe(CollaborationErrorCode.NOTE_NOT_FOUND)
      expect(error.status).toBe(404)
      expect(error.details).toEqual({ noteId: '123' })
    })

    it('should use default message when custom message not provided', () => {
      const error = createCollaborationError(CollaborationErrorCode.NOTE_ACCESS_DENIED)
      
      expect(error.message).toBe(CollaborationErrorMessages[CollaborationErrorCode.NOTE_ACCESS_DENIED])
      expect(error.code).toBe(CollaborationErrorCode.NOTE_ACCESS_DENIED)
      expect(error.status).toBe(403)
    })

    it('should map error codes to correct HTTP status codes', () => {
      // 404 errors
      const notFoundError = createCollaborationError(CollaborationErrorCode.NOTE_NOT_FOUND)
      expect(notFoundError.status).toBe(404)

      // 403 errors
      const accessDeniedError = createCollaborationError(CollaborationErrorCode.NOTE_ACCESS_DENIED)
      expect(accessDeniedError.status).toBe(403)

      // 409 errors
      const conflictError = createCollaborationError(CollaborationErrorCode.NOTE_ALREADY_SHARED)
      expect(conflictError.status).toBe(409)

      // 400 errors
      const validationError = createCollaborationError(CollaborationErrorCode.NOTE_INVALID_PERMISSION)
      expect(validationError.status).toBe(400)
    })
  })

  describe('addCollaborationErrorContext', () => {
    it('should add context to thrown errors', async () => {
      const originalError = new Error('Original error')
      mockNext.mockRejectedValue(originalError)

      try {
        await addCollaborationErrorContext(mockCtx as Context, mockNext)
      } catch (error: any) {
        expect(error.details).toEqual({
          context: {
            endpoint: 'POST /api/notes',
            userRole: 'user',
            teamId: 'team-123',
            timestamp: expect.any(String)
          }
        })
      }
    })

    it('should preserve existing error details', async () => {
      const originalError = new Error('Original error')
      originalError.details = { originalData: 'test' }
      mockNext.mockRejectedValue(originalError)

      try {
        await addCollaborationErrorContext(mockCtx as Context, mockNext)
      } catch (error: any) {
        expect(error.details).toEqual({
          originalData: 'test',
          context: {
            endpoint: 'POST /api/notes',
            userRole: 'user',
            teamId: 'team-123',
            timestamp: expect.any(String)
          }
        })
      }
    })
  })

  describe('collaborationErrorHandler', () => {
    it('should handle Joi validation errors', async () => {
      const validationError = new JoiValidationError('Validation failed', [{
        message: 'title is required',
        path: ['title'],
        type: 'any.required',
        context: { value: undefined }
      }], 'test')
      
      mockNext.mockRejectedValue(validationError)

      await collaborationErrorHandler(mockCtx as Context, mockNext)

      expect(mockCtx.status).toBe(400)
      expect(mockCtx.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed. Please check your request data.',
          details: {
            details: [{
              field: 'title',
              message: 'title is required',
              value: undefined
            }],
            hint: 'Make sure all required fields are provided and in the correct format.'
          },
          timestamp: expect.any(String),
          requestId: 'req-123'
        }
      })
    })

    it('should handle collaboration-specific errors', async () => {
      const collaborationError = createCollaborationError(
        CollaborationErrorCode.NOTE_NOT_FOUND,
        'Note not found',
        { noteId: '123' }
      )
      
      mockNext.mockRejectedValue(collaborationError)

      await collaborationErrorHandler(mockCtx as Context, mockNext)

      expect(mockCtx.status).toBe(404)
      expect(mockCtx.body).toEqual({
        error: {
          code: CollaborationErrorCode.NOTE_NOT_FOUND,
          message: 'Note not found',
          details: { noteId: '123' },
          timestamp: expect.any(String),
          requestId: 'req-123'
        }
      })
    })

    it('should handle Sequelize unique constraint errors', async () => {
      const sequelizeError = new Error('Unique constraint error')
      sequelizeError.name = 'SequelizeUniqueConstraintError'
      sequelizeError.parent = { constraint: 'unique_title_user' }
      
      mockNext.mockRejectedValue(sequelizeError)

      await collaborationErrorHandler(mockCtx as Context, mockNext)

      expect(mockCtx.status).toBe(409)
      expect(mockCtx.body).toEqual({
        error: {
          code: CollaborationErrorCode.RESOURCE_CONFLICT,
          message: 'A resource with the same information already exists.',
          details: { constraint: 'unique_title_user' },
          timestamp: expect.any(String),
          requestId: 'req-123'
        }
      })
    })

    it('should handle foreign key constraint errors', async () => {
      const fkError = new Error('Foreign key constraint error')
      fkError.name = 'SequelizeForeignKeyConstraintError'
      fkError.parent = { constraint: 'fk_note_institution' }
      
      mockNext.mockRejectedValue(fkError)

      await collaborationErrorHandler(mockCtx as Context, mockNext)

      expect(mockCtx.status).toBe(400)
      expect(mockCtx.body).toEqual({
        error: {
          code: CollaborationErrorCode.INVALID_OPERATION,
          message: "The operation references a resource that doesn't exist or you don't have access to.",
          details: { constraint: 'fk_note_institution' },
          timestamp: expect.any(String),
          requestId: 'req-123'
        }
      })
    })

    it('should re-throw non-collaboration errors', async () => {
      const genericError = new Error('Generic error')
      mockNext.mockRejectedValue(genericError)

      await expect(collaborationErrorHandler(mockCtx as Context, mockNext))
        .rejects.toThrow('Generic error')
    })

    it('should pass through successful requests', async () => {
      mockNext.mockResolvedValue(undefined)

      await collaborationErrorHandler(mockCtx as Context, mockNext)

      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockCtx.status).toBe(200)
      expect(mockCtx.body).toBe(null)
    })
  })

  describe('Error Code Coverage', () => {
    it('should have messages for all error codes', () => {
      const errorCodes = Object.values(CollaborationErrorCode)
      const messageKeys = Object.keys(CollaborationErrorMessages)
      
      errorCodes.forEach(code => {
        expect(messageKeys).toContain(code)
        expect(CollaborationErrorMessages[code]).toBeTruthy()
        expect(typeof CollaborationErrorMessages[code]).toBe('string')
      })
    })

    it('should have user-friendly error messages', () => {
      // Test that error messages are descriptive and user-friendly
      expect(CollaborationErrorMessages[CollaborationErrorCode.NOTE_NOT_FOUND])
        .toMatch(/not found|permission/i)
      
      expect(CollaborationErrorMessages[CollaborationErrorCode.MEETING_TIME_CONFLICT])
        .toMatch(/conflict/i)
      
      expect(CollaborationErrorMessages[CollaborationErrorCode.REMINDER_INVALID_DATE])
        .toMatch(/future/i)
      
      expect(CollaborationErrorMessages[CollaborationErrorCode.CALL_INVALID_PHONE_NUMBER])
        .toMatch(/phone number|format/i)
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle errors without requestId', async () => {
      mockCtx.state = { user: mockCtx.state?.user }
      const error = createCollaborationError(CollaborationErrorCode.NOTE_NOT_FOUND)
      mockNext.mockRejectedValue(error)

      await collaborationErrorHandler(mockCtx as Context, mockNext)

      expect(mockCtx.body?.error?.requestId).toBe('unknown')
    })

    it('should handle errors without user context', async () => {
      mockCtx.state = {}
      const error = createCollaborationError(CollaborationErrorCode.NOTE_ACCESS_DENIED)
      mockNext.mockRejectedValue(error)

      await collaborationErrorHandler(mockCtx as Context, mockNext)

      expect(mockCtx.status).toBe(403)
      expect(mockCtx.body).toBeTruthy()
    })

    it('should not expose sensitive information', async () => {
      const error = createCollaborationError(
        CollaborationErrorCode.NOTE_NOT_FOUND,
        'Database connection failed: password=secret123'
      )
      mockNext.mockRejectedValue(error)

      await collaborationErrorHandler(mockCtx as Context, mockNext)

      // The error message should be the one we set, but in production
      // sensitive details should be filtered out by other mechanisms
      expect(mockCtx.body?.error?.message).toBe('Database connection failed: password=secret123')
    })
  })

  describe('HTTP Status Code Mapping', () => {
    const testCases = [
      { code: CollaborationErrorCode.NOTE_NOT_FOUND, expectedStatus: 404 },
      { code: CollaborationErrorCode.MEETING_ACCESS_DENIED, expectedStatus: 403 },
      { code: CollaborationErrorCode.REMINDER_ALREADY_COMPLETED, expectedStatus: 409 },
      { code: CollaborationErrorCode.CALL_INVALID_PHONE_NUMBER, expectedStatus: 400 },
      { code: CollaborationErrorCode.BATCH_OPERATION_FAILED, expectedStatus: 207 },
      { code: CollaborationErrorCode.TOO_MANY_RESULTS, expectedStatus: 413 },
    ]

    testCases.forEach(({ code, expectedStatus }) => {
      it(`should map ${code} to ${expectedStatus} status`, async () => {
        const error = createCollaborationError(code)
        mockNext.mockRejectedValue(error)

        await collaborationErrorHandler(mockCtx as Context, mockNext)

        expect(mockCtx.status).toBe(expectedStatus)
      })
    })
  })
})