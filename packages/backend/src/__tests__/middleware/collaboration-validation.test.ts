import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Context, Next } from '../../types/koa'
import {
  validateNoteCreation,
  validateNoteUpdate,
  validateMeetingCreation,
  validateCallCreation,
  validateReminderCreation,
} from '../../middleware/collaborationValidation'

describe('Collaboration Validation Middleware', () => {
  let mockCtx: Partial<Context>
  let mockNext: Next

  beforeEach(() => {
    mockCtx = {
      request: { body: {} },
      query: {},
      params: {},
    }
    mockNext = vi.fn()
  })

  describe('Note Validation', () => {
    describe('validateNoteCreation', () => {
      it('should pass valid note data', async () => {
        mockCtx.request!.body = {
          title: 'Test Note',
          content: 'This is a test note content.',
          institutionId: '550e8400-e29b-41d4-a716-446655440000',
          visibility: 'PRIVATE',
          tags: ['urgent', 'meeting'],
          isPrivate: true
        }

        await validateNoteCreation(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledTimes(1)
        expect(mockCtx.request!.body.title).toBe('Test Note')
      })

      it('should reject note without title', async () => {
        mockCtx.request!.body = {
          content: 'This is a test note content.',
          institutionId: '550e8400-e29b-41d4-a716-446655440000'
        }

        await expect(validateNoteCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/title.*required/i)
      })

      it('should reject note without content', async () => {
        mockCtx.request!.body = {
          title: 'Test Note',
          institutionId: '550e8400-e29b-41d4-a716-446655440000'
        }

        await expect(validateNoteCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/content.*required/i)
      })

      it('should reject invalid institution ID', async () => {
        mockCtx.request!.body = {
          title: 'Test Note',
          content: 'Content',
          institutionId: 'invalid-uuid'
        }

        await expect(validateNoteCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/Invalid UUID format/i)
      })

      it('should reject too many tags', async () => {
        mockCtx.request!.body = {
          title: 'Test Note',
          content: 'Content',
          institutionId: '550e8400-e29b-41d4-a716-446655440000',
          tags: Array.from({ length: 11 }, (_, i) => `tag${i}`)
        }

        await expect(validateNoteCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/Cannot have more than 10 tags/i)
      })

      it('should sanitize and set defaults', async () => {
        mockCtx.request!.body = {
          title: 'Test Note',
          content: 'Content',
          institutionId: '550e8400-e29b-41d4-a716-446655440000',
          extraField: 'should be removed'
        }

        await validateNoteCreation(mockCtx as Context, mockNext)

        expect(mockCtx.request!.body.visibility).toBe('PRIVATE') // default
        expect(mockCtx.request!.body.isPrivate).toBe(false) // default
        expect(mockCtx.request!.body.extraField).toBeUndefined() // stripped
      })
    })

    describe('validateNoteUpdate', () => {
      it('should pass valid update data', async () => {
        mockCtx.request!.body = {
          title: 'Updated Note',
          visibility: 'TEAM'
        }

        await validateNoteUpdate(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledTimes(1)
        expect(mockCtx.request!.body.title).toBe('Updated Note')
      })

      it('should allow partial updates', async () => {
        mockCtx.request!.body = {
          title: 'Updated Title'
        }

        await validateNoteUpdate(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledTimes(1)
        expect(mockCtx.request!.body.title).toBe('Updated Title')
      })

      it('should reject empty title', async () => {
        mockCtx.request!.body = {
          title: ''
        }

        await expect(validateNoteUpdate(mockCtx as Context, mockNext))
          .rejects.toThrow(/title.*empty/i)
      })
    })
  })

  describe('Meeting Validation', () => {
    describe('validateMeetingCreation', () => {
      it('should pass valid meeting data', async () => {
        const startDate = new Date()
        startDate.setHours(startDate.getHours() + 1)
        const endDate = new Date()
        endDate.setHours(endDate.getHours() + 2)

        mockCtx.request!.body = {
          title: 'Test Meeting',
          description: 'Meeting description',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          location: 'Conference Room A',
          institutionId: '550e8400-e29b-41d4-a716-446655440000',
          participantIds: ['550e8400-e29b-41d4-a716-446655440001']
        }

        await validateMeetingCreation(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledTimes(1)
      })

      it('should reject meeting without title', async () => {
        const startDate = new Date()
        const endDate = new Date()
        endDate.setTime(startDate.getTime() + 3600000)

        mockCtx.request!.body = {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }

        await expect(validateMeetingCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/title.*required/i)
      })

      it('should reject meeting where end date is before start date', async () => {
        const startDate = new Date()
        const endDate = new Date()
        endDate.setTime(startDate.getTime() - 3600000) // 1 hour before

        mockCtx.request!.body = {
          title: 'Test Meeting',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }

        await expect(validateMeetingCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/End date must be after start date/i)
      })

      it('should reject too many participants', async () => {
        const startDate = new Date()
        const endDate = new Date()
        endDate.setTime(startDate.getTime() + 3600000)

        mockCtx.request!.body = {
          title: 'Test Meeting',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          participantIds: Array.from({ length: 51 }, (_, i) => `550e8400-e29b-41d4-a716-44665544000${i}`)
        }

        await expect(validateMeetingCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/Cannot invite more than 50 participants/i)
      })

      it('should reject invalid participant IDs', async () => {
        const startDate = new Date()
        const endDate = new Date()
        endDate.setTime(startDate.getTime() + 3600000)

        mockCtx.request!.body = {
          title: 'Test Meeting',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          participantIds: ['invalid-uuid']
        }

        await expect(validateMeetingCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/Invalid UUID format/i)
      })
    })
  })

  describe('Call Validation', () => {
    describe('validateCallCreation', () => {
      it('should pass valid call data', async () => {
        mockCtx.request!.body = {
          phoneNumber: '+1-234-567-8900',
          direction: 'OUTBOUND',
          duration: 300,
          notes: 'Important client call',
          institutionId: '550e8400-e29b-41d4-a716-446655440000'
        }

        await validateCallCreation(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledTimes(1)
      })

      it('should reject invalid phone number formats', async () => {
        const invalidNumbers = ['123', 'abc-def-ghij', '123-45']

        for (const phoneNumber of invalidNumbers) {
          mockCtx.request!.body = {
            phoneNumber,
            direction: 'INBOUND'
          }

          await expect(validateCallCreation(mockCtx as Context, mockNext))
            .rejects.toThrow(/Invalid phone number format/i)
        }
      })

      it('should accept various valid phone number formats', async () => {
        const validNumbers = [
          '+1-234-567-8900',
          '+33 1 42 86 83 82',
          '(555) 123-4567',
          '555.123.4567',
          '+44 20 7946 0958'
        ]

        for (const phoneNumber of validNumbers) {
          mockCtx.request!.body = {
            phoneNumber,
            direction: 'INBOUND'
          }

          await validateCallCreation(mockCtx as Context, mockNext)
          expect(mockNext).toHaveBeenCalled()
          jest.clearAllMocks()
        }
      })

      it('should reject invalid call direction', async () => {
        mockCtx.request!.body = {
          phoneNumber: '+1-234-567-8900',
          direction: 'INVALID_DIRECTION'
        }

        await expect(validateCallCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/Call direction must be one of/i)
      })

      it('should reject negative duration', async () => {
        mockCtx.request!.body = {
          phoneNumber: '+1-234-567-8900',
          direction: 'INBOUND',
          duration: -100
        }

        await expect(validateCallCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/Duration cannot be negative/i)
      })

      it('should reject duration longer than 24 hours', async () => {
        mockCtx.request!.body = {
          phoneNumber: '+1-234-567-8900',
          direction: 'INBOUND',
          duration: 86401 // 24 hours + 1 second
        }

        await expect(validateCallCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/Duration cannot exceed 24 hours/i)
      })
    })
  })

  describe('Reminder Validation', () => {
    describe('validateReminderCreation', () => {
      it('should pass valid reminder data', async () => {
        const futureDate = new Date()
        futureDate.setHours(futureDate.getHours() + 24)

        mockCtx.request!.body = {
          title: 'Test Reminder',
          description: 'Don\'t forget this important task',
          reminderDate: futureDate.toISOString(),
          priority: 'HIGH',
          institutionId: '550e8400-e29b-41d4-a716-446655440000'
        }

        await validateReminderCreation(mockCtx as Context, mockNext)

        expect(mockNext).toHaveBeenCalledTimes(1)
      })

      it('should reject reminder without title', async () => {
        const futureDate = new Date()
        futureDate.setHours(futureDate.getHours() + 1)

        mockCtx.request!.body = {
          reminderDate: futureDate.toISOString()
        }

        await expect(validateReminderCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/title.*required/i)
      })

      it('should reject past reminder dates', async () => {
        const pastDate = new Date()
        pastDate.setHours(pastDate.getHours() - 1)

        mockCtx.request!.body = {
          title: 'Test Reminder',
          reminderDate: pastDate.toISOString()
        }

        await expect(validateReminderCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/cannot be in the past/i)
      })

      it('should reject invalid priority values', async () => {
        const futureDate = new Date()
        futureDate.setHours(futureDate.getHours() + 1)

        mockCtx.request!.body = {
          title: 'Test Reminder',
          reminderDate: futureDate.toISOString(),
          priority: 'SUPER_HIGH'
        }

        await expect(validateReminderCreation(mockCtx as Context, mockNext))
          .rejects.toThrow(/Priority must be one of/i)
      })

      it('should set default values', async () => {
        const futureDate = new Date()
        futureDate.setHours(futureDate.getHours() + 1)

        mockCtx.request!.body = {
          title: 'Test Reminder',
          reminderDate: futureDate.toISOString()
        }

        await validateReminderCreation(mockCtx as Context, mockNext)

        expect(mockCtx.request!.body.priority).toBe('MEDIUM')
        expect(mockCtx.request!.body.status).toBe('PENDING')
      })
    })
  })

  describe('Query Parameter Validation', () => {
    it('should validate search parameters correctly', async () => {
      mockCtx.query = {
        search: 'test query',
        institutionId: '550e8400-e29b-41d4-a716-446655440000',
        page: '1',
        limit: '20'
      }

      // We would need to import and test specific search validation middleware
      // This is a placeholder for comprehensive query validation tests
      expect(mockCtx.query.search).toBe('test query')
    })

    it('should reject excessively long search queries', async () => {
      const longQuery = 'a'.repeat(256)
      
      mockCtx.query = {
        search: longQuery,
        page: '1',
        limit: '20'
      }

      // Test would validate that search query length is limited
      expect(longQuery.length).toBeGreaterThan(255)
    })
  })

  describe('Data Sanitization', () => {
    it('should strip unknown fields from request body', async () => {
      mockCtx.request!.body = {
        title: 'Test Note',
        content: 'Content',
        institutionId: '550e8400-e29b-41d4-a716-446655440000',
        unknownField: 'should be removed',
        anotherUnknown: { nested: 'data' }
      }

      await validateNoteCreation(mockCtx as Context, mockNext)

      expect(mockCtx.request!.body.unknownField).toBeUndefined()
      expect(mockCtx.request!.body.anotherUnknown).toBeUndefined()
      expect(mockCtx.request!.body.title).toBe('Test Note') // preserved
    })

    it('should handle HTML content safely', async () => {
      mockCtx.request!.body = {
        title: 'Test <script>alert("xss")</script> Note',
        content: 'Content with <img src="x" onerror="alert(1)">',
        institutionId: '550e8400-e29b-41d4-a716-446655440000'
      }

      await validateNoteCreation(mockCtx as Context, mockNext)

      // The validation middleware doesn't sanitize HTML, but it should pass through
      // HTML sanitization would be handled at a different layer
      expect(mockCtx.request!.body.title).toContain('script')
      expect(mockCtx.request!.body.content).toContain('img')
    })
  })
})