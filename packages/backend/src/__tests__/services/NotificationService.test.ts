import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { User, UserRole } from "../../models/User"
import {
  NotificationPriority,
  NotificationService,
  NotificationType,
} from "../../services/NotificationService"
import { SocketService } from "../../services/SocketService"
import { logger } from "../../utils/logger"

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock SocketService
vi.mock("../../services/SocketService", () => ({
  SocketService: {
    getInstance: vi.fn(() => ({
      notifyUser: vi.fn(),
      notifyTeam: vi.fn(),
      broadcast: vi.fn(),
      getConnectedUsersCount: vi.fn(() => 5),
    })),
  },
}))

describe("NotificationService", () => {
  let notificationService: NotificationService
  let mockSocketService: any
  let mockUser: User
  let mockAssignee: User

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock users
    mockUser = {
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: UserRole.USER,
      teamId: "team-456",
      isActive: true,
      getFullName: () => "Test User",
    } as User

    mockAssignee = {
      id: "assignee-456",
      email: "assignee@example.com",
      firstName: "Assignee",
      lastName: "User",
      role: UserRole.USER,
      teamId: "team-456",
      isActive: true,
      getFullName: () => "Assignee User",
    } as User

    // Setup mock socket service
    mockSocketService = {
      notifyUser: vi.fn(),
      notifyTeam: vi.fn(),
      broadcast: vi.fn(),
      getConnectedUsersCount: vi.fn(() => 5),
    }

    vi.mocked(SocketService.getInstance).mockReturnValue(mockSocketService)

    // Reset the singleton instance to ensure fresh instance for each test
    // @ts-ignore - accessing private property for testing
    NotificationService.instance = undefined

    // Get notification service instance
    notificationService = NotificationService.getInstance()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Basic Notification Methods", () => {
    it("should send notification to a specific user", async () => {
      const notification = {
        type: NotificationType.USER_MESSAGE,
        priority: NotificationPriority.MEDIUM,
        title: "Test Notification",
        message: "This is a test message",
      }

      await notificationService.notifyUser("user-123", notification)

      expect(mockSocketService.notifyUser).toHaveBeenCalledWith(
        "user-123",
        "notification",
        expect.objectContaining({
          ...notification,
          id: expect.any(String),
          timestamp: expect.any(String),
        })
      )

      expect(logger.info).toHaveBeenCalledWith(
        "User notification sent",
        expect.objectContaining({
          userId: "user-123",
          type: notification.type,
          priority: notification.priority,
          title: notification.title,
        })
      )
    })

    it("should send notification to multiple users", async () => {
      const userIds = ["user-1", "user-2", "user-3"]
      const notification = {
        type: NotificationType.SYSTEM_ALERT,
        priority: NotificationPriority.HIGH,
        title: "System Alert",
        message: "System maintenance scheduled",
      }

      await notificationService.notifyUsers(userIds, notification)

      expect(mockSocketService.notifyUser).toHaveBeenCalledTimes(3)
      userIds.forEach((userId) => {
        expect(mockSocketService.notifyUser).toHaveBeenCalledWith(
          userId,
          "notification",
          expect.objectContaining(notification)
        )
      })

      expect(logger.info).toHaveBeenCalledWith(
        "Multiple user notifications sent",
        expect.objectContaining({
          userCount: 3,
          type: notification.type,
        })
      )
    })

    it("should send notification to a team", async () => {
      const notification = {
        type: NotificationType.TEAM_ACTIVITY,
        priority: NotificationPriority.LOW,
        title: "Team Update",
        message: "Team activity notification",
      }

      await notificationService.notifyTeam("team-456", notification)

      expect(mockSocketService.notifyTeam).toHaveBeenCalledWith(
        "team-456",
        "notification",
        expect.objectContaining(notification)
      )

      expect(logger.info).toHaveBeenCalledWith(
        "Team notification sent",
        expect.objectContaining({
          teamId: "team-456",
          type: notification.type,
        })
      )
    })

    it("should broadcast notification to all users", async () => {
      const notification = {
        type: NotificationType.SYSTEM_MAINTENANCE,
        priority: NotificationPriority.URGENT,
        title: "System Maintenance",
        message: "System will be down for maintenance",
      }

      await notificationService.broadcast(notification)

      expect(mockSocketService.broadcast).toHaveBeenCalledWith(
        "notification",
        expect.objectContaining(notification)
      )

      expect(logger.info).toHaveBeenCalledWith(
        "Broadcast notification sent",
        expect.objectContaining({
          type: notification.type,
        })
      )
    })
  })

  describe("Task Notifications", () => {
    it("should notify user when task is assigned", async () => {
      const taskData = {
        id: "task-123",
        title: "Test Task",
        description: "Task description",
        assigneeId: mockAssignee.id,
      }

      await notificationService.notifyTaskAssigned(mockAssignee.id, taskData, mockUser)

      expect(mockSocketService.notifyUser).toHaveBeenCalledWith(
        mockAssignee.id,
        "notification",
        expect.objectContaining({
          type: NotificationType.TASK_ASSIGNED,
          priority: NotificationPriority.MEDIUM,
          title: "New Task Assigned",
          message: `You have been assigned a new task: "${taskData.title}"`,
          taskId: taskData.id,
          senderId: mockUser.id,
          senderName: mockUser.getFullName(),
          actionUrl: `/tasks/${taskData.id}`,
          actionText: "View Task",
        })
      )

      // Should also notify team
      expect(mockSocketService.notifyTeam).toHaveBeenCalledWith(
        mockUser.teamId,
        "notification",
        expect.objectContaining({
          type: NotificationType.TEAM_ACTIVITY,
          title: "Task Assignment",
        })
      )
    })

    it("should notify when task status changes", async () => {
      const taskData = {
        id: "task-123",
        title: "Test Task",
        assigneeId: mockAssignee.id,
      }

      await notificationService.notifyTaskStatusChanged(
        taskData,
        "in_progress",
        "completed",
        mockUser
      )

      expect(mockSocketService.notifyUser).toHaveBeenCalledWith(
        mockAssignee.id,
        "notification",
        expect.objectContaining({
          type: NotificationType.TASK_STATUS_CHANGED,
          priority: NotificationPriority.MEDIUM,
          title: "Task Status Updated",
          message: `Task "${taskData.title}" status changed from in_progress to completed`,
          taskId: taskData.id,
        })
      )

      // Should notify team about completion
      expect(mockSocketService.notifyTeam).toHaveBeenCalledWith(
        mockUser.teamId,
        "notification",
        expect.objectContaining({
          type: NotificationType.TEAM_ACTIVITY,
          title: "Task Completed",
        })
      )
    })

    it("should not notify assignee if they changed the status themselves", async () => {
      const taskData = {
        id: "task-123",
        title: "Test Task",
        assigneeId: mockUser.id, // Same as the user making the change
      }

      await notificationService.notifyTaskStatusChanged(
        taskData,
        "todo",
        "in_progress",
        mockUser
      )

      // Should not notify the user who made the change
      expect(mockSocketService.notifyUser).not.toHaveBeenCalled()
    })
  })

  describe("Medical Institution Notifications", () => {
    it("should notify when institution is created", async () => {
      const institutionData = {
        id: "inst-123",
        name: "Test Hospital",
        type: "hospital",
      }

      await notificationService.notifyInstitutionCreated(institutionData, mockUser)

      expect(mockSocketService.notifyTeam).toHaveBeenCalledWith(
        mockUser.teamId,
        "notification",
        expect.objectContaining({
          type: NotificationType.INSTITUTION_CREATED,
          priority: NotificationPriority.LOW,
          title: "New Medical Institution Added",
          message: `${mockUser.getFullName()} added a new medical institution: "${
            institutionData.name
          }"`,
          institutionId: institutionData.id,
          senderId: mockUser.id,
          actionUrl: `/institutions/${institutionData.id}`,
        })
      )
    })

    it("should notify when institution is updated", async () => {
      const institutionData = {
        id: "inst-123",
        name: "Test Hospital",
        assignedUserId: mockAssignee.id,
      }
      const changes = ["name", "address"]

      await notificationService.notifyInstitutionUpdated(
        institutionData,
        mockUser,
        changes
      )

      // Should notify assigned user
      expect(mockSocketService.notifyUser).toHaveBeenCalledWith(
        mockAssignee.id,
        "notification",
        expect.objectContaining({
          type: NotificationType.INSTITUTION_UPDATED,
          title: "Medical Institution Updated",
          message: `${mockUser.getFullName()} updated "${
            institutionData.name
          }": name, address`,
        })
      )

      // Should notify team
      expect(mockSocketService.notifyTeam).toHaveBeenCalledWith(
        mockUser.teamId,
        "notification",
        expect.objectContaining({
          type: NotificationType.INSTITUTION_UPDATED,
        })
      )
    })

    it("should notify when institution is assigned", async () => {
      const institutionData = {
        id: "inst-123",
        name: "Test Hospital",
      }

      await notificationService.notifyInstitutionAssigned(
        institutionData,
        mockAssignee.id,
        mockUser
      )

      expect(mockSocketService.notifyUser).toHaveBeenCalledWith(
        mockAssignee.id,
        "notification",
        expect.objectContaining({
          type: NotificationType.INSTITUTION_ASSIGNED,
          priority: NotificationPriority.MEDIUM,
          title: "Medical Institution Assigned",
          message: `You have been assigned to manage "${institutionData.name}"`,
          institutionId: institutionData.id,
          senderId: mockUser.id,
        })
      )
    })
  })

  describe("Team Notifications", () => {
    it("should notify when team member is added", async () => {
      const newMember = {
        id: "new-member-123",
        email: "newmember@example.com",
        firstName: "New",
        lastName: "Member",
        getFullName: () => "New Member",
      } as User

      await notificationService.notifyTeamMemberAdded("team-456", newMember, mockUser)

      expect(mockSocketService.notifyTeam).toHaveBeenCalledWith(
        "team-456",
        "notification",
        expect.objectContaining({
          type: NotificationType.TEAM_MEMBER_ADDED,
          priority: NotificationPriority.LOW,
          title: "New Team Member",
          message: `${newMember.getFullName()} has joined the team`,
          senderId: mockUser.id,
          actionUrl: "/team",
        })
      )
    })
  })

  describe("System Notifications", () => {
    it("should notify about system maintenance", async () => {
      const scheduledTime = new Date("2024-12-01T02:00:00Z")
      const title = "Scheduled Maintenance"
      const message = "System will be unavailable for 2 hours"

      await notificationService.notifySystemMaintenance(title, message, scheduledTime)

      expect(mockSocketService.broadcast).toHaveBeenCalledWith(
        "notification",
        expect.objectContaining({
          type: NotificationType.SYSTEM_MAINTENANCE,
          priority: NotificationPriority.HIGH,
          title,
          message,
          data: {
            scheduledTime: scheduledTime.toISOString(),
          },
          expiresAt: scheduledTime.toISOString(),
        })
      )
    })
  })

  describe("Billing Notifications", () => {
    it("should notify when quote is created", async () => {
      const quoteData = {
        id: "quote-123",
        quoteNumber: "Q-2024-001",
      }
      const institutionData = {
        id: "inst-123",
        name: "Test Hospital",
      }

      await notificationService.notifyQuoteCreated(quoteData, mockUser, institutionData)

      expect(mockSocketService.notifyTeam).toHaveBeenCalledWith(
        mockUser.teamId,
        "notification",
        expect.objectContaining({
          type: NotificationType.QUOTE_CREATED,
          priority: NotificationPriority.MEDIUM,
          title: "New Quote Created",
          message: `Quote #${quoteData.quoteNumber} created for ${institutionData.name}`,
          senderId: mockUser.id,
          actionUrl: `/quotes/${quoteData.id}`,
        })
      )
    })

    it("should notify when payment is received", async () => {
      const paymentData = {
        id: "payment-123",
        amount: 1500.0,
      }
      const invoiceData = {
        id: "invoice-123",
        invoiceNumber: "INV-2024-001",
        assignedUserId: mockAssignee.id,
      }
      const institutionData = {
        id: "inst-123",
        name: "Test Hospital",
      }

      await notificationService.notifyPaymentReceived(
        paymentData,
        invoiceData,
        institutionData
      )

      expect(mockSocketService.notifyUser).toHaveBeenCalledWith(
        mockAssignee.id,
        "notification",
        expect.objectContaining({
          type: NotificationType.PAYMENT_RECEIVED,
          priority: NotificationPriority.MEDIUM,
          title: "Payment Received",
          message: `Payment of $${paymentData.amount} received for invoice #${invoiceData.invoiceNumber}`,
          actionUrl: `/invoices/${invoiceData.id}`,
        })
      )
    })
  })

  describe("Notification Enrichment", () => {
    it("should add ID and timestamp to notifications", async () => {
      const notification = {
        type: NotificationType.USER_MESSAGE,
        priority: NotificationPriority.LOW,
        title: "Test",
        message: "Test message",
      }

      await notificationService.notifyUser("user-123", notification)

      expect(mockSocketService.notifyUser).toHaveBeenCalledWith(
        "user-123",
        "notification",
        expect.objectContaining({
          ...notification,
          id: expect.stringMatching(/^notif_\d+_[a-z0-9]+$/),
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
          ),
        })
      )
    })

    it("should preserve existing ID and timestamp if provided", async () => {
      const notification = {
        type: NotificationType.USER_MESSAGE,
        priority: NotificationPriority.LOW,
        title: "Test",
        message: "Test message",
        id: "custom-id",
        timestamp: "2024-01-01T00:00:00.000Z",
      }

      await notificationService.notifyUser("user-123", notification)

      expect(mockSocketService.notifyUser).toHaveBeenCalledWith(
        "user-123",
        "notification",
        expect.objectContaining({
          id: "custom-id",
          timestamp: "2024-01-01T00:00:00.000Z",
        })
      )
    })
  })

  describe("Statistics", () => {
    it("should return notification statistics", () => {
      const stats = notificationService.getStats()

      expect(stats).toEqual({
        totalSent: 0, // This would be tracked in a real implementation
        connectedUsers: 5,
      })

      expect(mockSocketService.getConnectedUsersCount).toHaveBeenCalled()
    })
  })
})
