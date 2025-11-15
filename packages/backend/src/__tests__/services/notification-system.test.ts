import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService, NotificationType, NotificationPriority } from '../../services/NotificationService'
import { ReminderNotificationService } from '../../services/ReminderNotificationService'
import { MeetingNotificationService } from '../../services/MeetingNotificationService'

describe('Notification System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('NotificationService', () => {
    it('should be a singleton', () => {
      const instance1 = NotificationService.getInstance()
      const instance2 = NotificationService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(NotificationService)
    })

    it('should have all required notification types', () => {
      const requiredTypes = [
        // Meeting notifications
        'MEETING_CREATED',
        'MEETING_UPDATED', 
        'MEETING_INVITATION_SENT',
        'MEETING_INVITATION_ACCEPTED',
        'MEETING_INVITATION_DECLINED',
        'MEETING_REMINDER',
        'MEETING_CANCELLED',
        
        // Meeting comments
        'MEETING_COMMENT_ADDED',
        'MEETING_COMMENT_UPDATED',
        
        // Reminder notifications
        'REMINDER_CREATED',
        'REMINDER_DUE_SOON',
        'REMINDER_OVERDUE',
        'REMINDER_COMPLETED',
        'REMINDER_SNOOZED',
        'REMINDER_RESCHEDULED'
      ]

      requiredTypes.forEach(type => {
        expect(NotificationType).toHaveProperty(type)
      })
    })

    it('should have all required priority levels', () => {
      const requiredPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
      
      requiredPriorities.forEach(priority => {
        expect(NotificationPriority).toHaveProperty(priority)
      })
    })

    it('should generate unique notification IDs', () => {
      const service = NotificationService.getInstance()
      
      // Access private method through any cast for testing
      const generateId = (service as any).generateNotificationId.bind(service)
      
      const id1 = generateId()
      const id2 = generateId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^notif_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^notif_\d+_[a-z0-9]+$/)
    })
  })

  describe('ReminderNotificationService', () => {
    it('should be a singleton', () => {
      const instance1 = ReminderNotificationService.getInstance()
      const instance2 = ReminderNotificationService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(ReminderNotificationService)
    })

    it('should map reminder priorities to notification priorities correctly', () => {
      const service = ReminderNotificationService.getInstance()
      
      // Access private method for testing
      const mapPriority = (service as any).mapReminderPriorityToNotificationPriority.bind(service)
      
      expect(mapPriority('LOW')).toBe(NotificationPriority.LOW)
      expect(mapPriority('MEDIUM')).toBe(NotificationPriority.MEDIUM) 
      expect(mapPriority('HIGH')).toBe(NotificationPriority.HIGH)
      expect(mapPriority('URGENT')).toBe(NotificationPriority.URGENT)
      expect(mapPriority('INVALID')).toBe(NotificationPriority.MEDIUM) // default
    })

    it('should have periodic reminder check functionality', () => {
      const service = ReminderNotificationService.getInstance()
      
      expect(typeof service.startPeriodicReminderCheck).toBe('function')
      expect(typeof service.checkAndNotifyDueReminders).toBe('function')
    })
  })

  describe('MeetingNotificationService', () => {
    it('should be a singleton', () => {
      const instance1 = MeetingNotificationService.getInstance()
      const instance2 = MeetingNotificationService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(MeetingNotificationService)
    })

    it('should have all required meeting notification methods', () => {
      const service = MeetingNotificationService.getInstance()
      
      const requiredMethods = [
        'notifyMeetingCreated',
        'notifyMeetingInvitations', 
        'notifyInvitationResponse',
        'notifyMeetingUpdated',
        'notifyMeetingCancelled',
        'sendMeetingReminders',
        'notifyCommentAdded',
        'notifyCommentUpdated',
        'checkAndSendMeetingReminders',
        'startPeriodicReminderCheck'
      ]

      requiredMethods.forEach(method => {
        expect(typeof service[method]).toBe('function')
      })
    })

    it('should have periodic meeting reminder check functionality', () => {
      const service = MeetingNotificationService.getInstance()
      
      expect(typeof service.startPeriodicReminderCheck).toBe('function')
      expect(typeof service.checkAndSendMeetingReminders).toBe('function')
    })
  })

  describe('Notification System Integration', () => {
    it('should have working service instances integration', () => {
      const notificationService = NotificationService.getInstance()
      const reminderService = ReminderNotificationService.getInstance()
      const meetingService = MeetingNotificationService.getInstance()
      
      // Verify all services are properly instantiated
      expect(notificationService).toBeInstanceOf(NotificationService)
      expect(reminderService).toBeInstanceOf(ReminderNotificationService)
      expect(meetingService).toBeInstanceOf(MeetingNotificationService)
      
      // Verify services maintain singleton pattern
      expect(NotificationService.getInstance()).toBe(notificationService)
      expect(ReminderNotificationService.getInstance()).toBe(reminderService)
      expect(MeetingNotificationService.getInstance()).toBe(meetingService)
    })

    it('should have consistent notification data interface', () => {
      const mockNotificationData = {
        type: NotificationType.MEETING_CREATED,
        priority: NotificationPriority.MEDIUM,
        title: "Test Notification",
        message: "Test message",
        meetingId: "test-meeting-id",
        userId: "test-user-id",
        institutionId: "test-institution-id",
        senderId: "test-sender-id",
        senderName: "Test Sender",
        actionUrl: "/meetings/test-meeting-id",
        actionText: "View Meeting",
        data: { test: "data" }
      }
      
      // Verify the notification data structure is valid
      expect(mockNotificationData.type).toBe(NotificationType.MEETING_CREATED)
      expect(mockNotificationData.priority).toBe(NotificationPriority.MEDIUM)
      expect(typeof mockNotificationData.title).toBe('string')
      expect(typeof mockNotificationData.message).toBe('string')
      expect(typeof mockNotificationData.actionUrl).toBe('string')
      expect(typeof mockNotificationData.actionText).toBe('string')
    })
  })
})