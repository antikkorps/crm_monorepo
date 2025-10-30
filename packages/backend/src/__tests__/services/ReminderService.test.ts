import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReminderService } from "../../services/ReminderService"
import { ReminderRule } from "../../models/ReminderRule"
import { Task, TaskStatus } from "../../models/Task"
import { Quote } from "../../models/Quote"
import { Invoice } from "../../models/Invoice"
import { User, UserRole } from "../../models/User"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { NotificationService } from "../../services/NotificationService"
import { sequelize } from "../../config/database"

// Mock NotificationService
vi.mock("../../services/NotificationService", () => ({
  NotificationService: {
    getInstance: vi.fn(() => ({
      notifyUser: vi.fn().mockResolvedValue(true),
    })),
  },
}))

describe("ReminderService", () => {
  let reminderService: ReminderService
  let adminUser: User
  let regularUser: User
  let testInstitution: MedicalInstitution
  let mockNotificationService: any

  beforeEach(async () => {
    // Clean up data without recreating schema (pg-mem compatible)
    try {
      await ReminderRule.destroy({ where: {}, force: true })
      await Task.destroy({ where: {}, force: true })
      await Quote.destroy({ where: {}, force: true })
      await Invoice.destroy({ where: {}, force: true })
      await MedicalInstitution.destroy({ where: {}, force: true })
      await User.destroy({ where: {}, force: true })
    } catch (error) {
      // Ignore errors if tables don't exist yet
    }

    // Get mock instance
    const { NotificationService: MockedNotificationService } = await import("../../services/NotificationService")
    mockNotificationService = MockedNotificationService.getInstance()

    reminderService = ReminderService.getInstance()

    // Create test users
    adminUser = await User.create({
      email: "admin@test.com",
      passwordHash: "hashed_password_123",
      firstName: "Admin",
      lastName: "User",
      role: UserRole.SUPER_ADMIN,
      avatarSeed: "admin-seed",
      isActive: true,
    })

    regularUser = await User.create({
      email: "user@test.com",
      passwordHash: "hashed_password_123",
      firstName: "Regular",
      lastName: "User",
      role: UserRole.USER,
      avatarSeed: "user-seed",
      isActive: true,
    })

    // Create test institution
    testInstitution = await MedicalInstitution.create({
      name: "Test Hospital",
      type: "hospital",
      address: {
        street: "123 Test St",
        city: "Test City",
        state: "TS",
        zipCode: "12345",
        country: "Test Country",
      },
      isActive: true,
    })
  })

  afterEach(async () => {
    vi.clearAllMocks()
  })

  describe("createDefaultRules", () => {
    it("should create default reminder rules for admin user", async () => {
      await reminderService.createDefaultRules(adminUser.id)

      const rules = await ReminderRule.findAll({
        where: { createdBy: adminUser.id },
      })

      expect(rules.length).toBeGreaterThan(0)
      
      // Check for task rules
      const taskRules = rules.filter(r => r.entityType === "task")
      expect(taskRules.length).toBe(2) // due_soon and overdue
      
      // Check for quote rules
      const quoteRules = rules.filter(r => r.entityType === "quote")
      expect(quoteRules.length).toBe(2) // expired and due_soon
      
      // Check for invoice rules
      const invoiceRules = rules.filter(r => r.entityType === "invoice")
      expect(invoiceRules.length).toBe(2) // unpaid and due_soon
    })

    it("should not create duplicate rules", async () => {
      await reminderService.createDefaultRules(adminUser.id)
      await reminderService.createDefaultRules(adminUser.id)

      const rules = await ReminderRule.findAll({
        where: { createdBy: adminUser.id },
      })

      // Should still have the same number of rules (no duplicates)
      expect(rules.length).toBe(6)
    })
  })

  describe("processAllReminders", () => {
    beforeEach(async () => {
      // Create default rules first
      await reminderService.createDefaultRules(adminUser.id)
    })

    it("should process tasks due soon", async () => {
      // Create a task due in 3 days
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 3)

      await Task.create({
        title: "Test Task Due Soon",
        description: "This task is due soon",
        dueDate,
        status: TaskStatus.TODO,
        assigneeId: regularUser.id,
        institutionId: testInstitution.id,
        creatorId: adminUser.id,
        priority: "medium",
      })

      await reminderService.processAllReminders()

      // Should have sent notification
      expect(mockNotificationService.notifyUser).toHaveBeenCalledWith(
        regularUser.id,
        expect.objectContaining({
          type: expect.any(String),
          title: expect.stringContaining("Task Due Soon"),
          message: expect.stringContaining("Test Task Due Soon"),
        })
      )
    })

    it("should process overdue tasks", async () => {
      // Create an overdue task
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() - 2)

      await Task.create({
        title: "Overdue Task",
        description: "This task is overdue",
        dueDate,
        status: TaskStatus.TODO,
        assigneeId: regularUser.id,
        institutionId: testInstitution.id,
        creatorId: adminUser.id,
        priority: "high",
      })

      await reminderService.processAllReminders()

      // Should have sent notification
      expect(mockNotificationService.notifyUser).toHaveBeenCalledWith(
        regularUser.id,
        expect.objectContaining({
          type: expect.any(String),
          title: expect.stringContaining("Task Overdue"),
          message: expect.stringContaining("Overdue Task"),
        })
      )
    })

    it("should process expired quotes", async () => {
      // Create an expired quote
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() - 5)

      await Quote.create({
        quoteNumber: "QUOTE-001",
        validUntil,
        status: "sent",
        assignedUserId: regularUser.id,
        institutionId: testInstitution.id,
        total: 1000,
        creatorId: adminUser.id,
      })

      await reminderService.processAllReminders()

      // Should have sent notification
      expect(mockNotificationService.notifyUser).toHaveBeenCalledWith(
        regularUser.id,
        expect.objectContaining({
          type: expect.any(String),
          title: expect.stringContaining("Quote Expired"),
          message: expect.stringContaining("QUOTE-001"),
        })
      )
    })

    it("should process unpaid invoices", async () => {
      // Create an unpaid invoice
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() - 10)

      await Invoice.create({
        invoiceNumber: "INV-001",
        dueDate,
        status: "sent",
        assignedUserId: regularUser.id,
        institutionId: testInstitution.id,
        total: 2000,
        creatorId: adminUser.id,
      })

      await reminderService.processAllReminders()

      // Should have sent notification
      expect(mockNotificationService.notifyUser).toHaveBeenCalledWith(
        regularUser.id,
        expect.objectContaining({
          type: expect.any(String),
          title: expect.stringContaining("Invoice Overdue"),
          message: expect.stringContaining("INV-001"),
        })
      )
    })

    it("should create automatic tasks when enabled", async () => {
      // Create a rule with autoCreateTask enabled
      await ReminderRule.update(
        { autoCreateTask: true },
        { where: { entityType: "task", triggerType: "overdue" } }
      )

      // Create an overdue task
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() - 2)

      await Task.create({
        title: "Original Overdue Task",
        description: "This task is overdue",
        dueDate,
        status: TaskStatus.TODO,
        assigneeId: regularUser.id,
        institutionId: testInstitution.id,
        creatorId: adminUser.id,
        priority: "high",
      })

      await reminderService.processAllReminders()

      // Check that a new task was created
      const newTasks = await Task.findAll({
        where: {
          title: expect.stringContaining("Urgent: Overdue task"),
        },
      })

      expect(newTasks.length).toBeGreaterThan(0)
    })

    it("should not send duplicate notifications (anti-spam)", async () => {
      // Create a task due soon
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 3)

      await Task.create({
        title: "Test Task",
        description: "This task is due soon",
        dueDate,
        status: TaskStatus.TODO,
        assigneeId: regularUser.id,
        institutionId: testInstitution.id,
        creatorId: adminUser.id,
        priority: "medium",
      })

      // Process reminders twice
      await reminderService.processAllReminders()
      await reminderService.processAllReminders()

      // Should only send notification once
      expect(mockNotificationService.notifyUser).toHaveBeenCalledTimes(1)
    })

    it("should handle errors gracefully", async () => {
      // Mock NotificationService to throw an error
      mockNotificationService.notifyUser.mockRejectedValue(new Error("Notification failed"))

      // Create a task due soon
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 3)

      await Task.create({
        title: "Test Task",
        description: "This task is due soon",
        dueDate,
        status: TaskStatus.TODO,
        assigneeId: regularUser.id,
        institutionId: testInstitution.id,
        creatorId: adminUser.id,
        priority: "medium",
      })

      // Should not throw an error
      await expect(reminderService.processAllReminders()).resolves.toBeUndefined()
    })
  })

  describe("template formatting", () => {
    it("should format message templates correctly", async () => {
      const rule = await ReminderRule.create({
        entityType: "task",
        triggerType: "due_soon",
        daysBefore: 3,
        daysAfter: 0,
        priority: "medium",
        isActive: true,
        titleTemplate: "Task {title} due soon",
        messageTemplate: 'Task "{title}" is due in {days} days for {institutionName}',
        actionUrlTemplate: "/tasks/{id}",
        actionTextTemplate: "View Task",
        autoCreateTask: false,
        taskPriority: "medium",
        createdBy: adminUser.id,
      })

      const testData = {
        id: "task-123",
        title: "Test Task",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        institution: { name: "Test Hospital" },
      }

      const title = rule.formatTitle(testData)
      const message = rule.formatMessage(testData)

      expect(title).toBe("Task Test Task due soon")
      expect(message).toBe('Task "Test Task" is due in 3 days for Test Hospital')
    })

    it("should handle missing data gracefully", async () => {
      const rule = await ReminderRule.create({
        entityType: "task",
        triggerType: "due_soon",
        daysBefore: 3,
        daysAfter: 0,
        priority: "medium",
        isActive: true,
        titleTemplate: "Task {title} due soon",
        messageTemplate: 'Task "{title}" is due in {days} days',
        actionUrlTemplate: "/tasks/{id}",
        actionTextTemplate: "View Task",
        autoCreateTask: false,
        taskPriority: "medium",
        createdBy: adminUser.id,
      })

      const incompleteData = {
        id: "task-123",
        // Missing title and dueDate
      }

      const title = rule.formatTitle(incompleteData)
      const message = rule.formatMessage(incompleteData)

      expect(title).toBe("Task  due soon")
      expect(message).toBe('Task "" is due in 0 days')
    })
  })
})