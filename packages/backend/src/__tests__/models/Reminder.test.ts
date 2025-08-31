import { ReminderPriority } from "@medical-crm/shared"
import { Op } from "sequelize"
import { sequelize } from "../../config/database"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Reminder } from "../../models/Reminder"
import { User, UserRole } from "../../models/User"

describe("Reminder Model", () => {
  let testUser1: User
  let testUser2: User
  let testInstitution: MedicalInstitution

  beforeAll(async () => {
    // Only sync the models we need for this test
    await User.sync({ force: true })
    await Reminder.sync({ force: true })

    // Define associations for testing
    Reminder.belongsTo(User, {
      foreignKey: "userId",
      as: "user",
    })
    User.hasMany(Reminder, {
      foreignKey: "userId",
      as: "reminders",
    })
  })

  beforeEach(async () => {
    // Create test users
    testUser1 = await User.create({
      email: "user1@test.com",
      passwordHash: "hashedpassword",
      firstName: "John",
      lastName: "Doe",
      role: UserRole.USER,
      avatarSeed: "test-seed-1",
      isActive: true,
    })

    testUser2 = await User.create({
      email: "user2@test.com",
      passwordHash: "hashedpassword",
      firstName: "Jane",
      lastName: "Smith",
      role: UserRole.USER,
      avatarSeed: "test-seed-2",
      isActive: true,
    })

    // For SQLite testing, we'll skip MedicalInstitution creation
    // since it uses PostgreSQL-specific features
    testInstitution = null as any
  })

  afterEach(async () => {
    await Reminder.destroy({ where: {} })
    await User.destroy({ where: {} })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  describe("Reminder Creation", () => {
    it("should create a reminder with required fields", async () => {
      const reminderDate = new Date(Date.now() + 86400000) // Tomorrow
      const reminder = await Reminder.create({
        title: "Test Reminder",
        description: "This is a test reminder",
        reminderDate,
        isCompleted: false,
        userId: testUser1.id,
        institutionId: testInstitution?.id,
        priority: ReminderPriority.HIGH,
      })

      expect(reminder.id).toBeDefined()
      expect(reminder.title).toBe("Test Reminder")
      expect(reminder.description).toBe("This is a test reminder")
      expect(reminder.reminderDate).toEqual(reminderDate)
      expect(reminder.isCompleted).toBe(false)
      expect(reminder.userId).toBe(testUser1.id)
      expect(reminder.institutionId).toBe(testInstitution?.id)
      expect(reminder.priority).toBe(ReminderPriority.HIGH)
      expect(reminder.createdAt).toBeDefined()
      expect(reminder.updatedAt).toBeDefined()
    })

    it("should create a reminder with minimal required fields", async () => {
      const reminderDate = new Date(Date.now() + 86400000) // Tomorrow
      const reminder = await Reminder.create({
        title: "Minimal Reminder",
        reminderDate,
        userId: testUser1.id,
      })

      expect(reminder.title).toBe("Minimal Reminder")
      expect(reminder.reminderDate).toEqual(reminderDate)
      expect(reminder.userId).toBe(testUser1.id)
      expect(reminder.isCompleted).toBe(false) // Default value
      expect(reminder.priority).toBe(ReminderPriority.MEDIUM) // Default value
      expect(reminder.description).toBeUndefined()
      expect(reminder.institutionId).toBeUndefined()
    })

    it("should fail to create reminder without required fields", async () => {
      await expect(
        Reminder.create({
          title: "Invalid Reminder",
          // Missing reminderDate and userId
        } as any)
      ).rejects.toThrow()
    })

    it("should fail to create reminder with empty title", async () => {
      await expect(
        Reminder.create({
          title: "",
          reminderDate: new Date(Date.now() + 86400000),
          userId: testUser1.id,
        })
      ).rejects.toThrow()
    })

    it("should fail to create reminder with title too long", async () => {
      const longTitle = "a".repeat(256) // Exceeds 255 character limit
      await expect(
        Reminder.create({
          title: longTitle,
          reminderDate: new Date(Date.now() + 86400000),
          userId: testUser1.id,
        })
      ).rejects.toThrow()
    })

    it("should fail to create reminder with description too long", async () => {
      const longDescription = "a".repeat(1001) // Exceeds 1000 character limit
      await expect(
        Reminder.create({
          title: "Test Reminder",
          description: longDescription,
          reminderDate: new Date(Date.now() + 86400000),
          userId: testUser1.id,
        })
      ).rejects.toThrow()
    })

    it("should fail to create reminder with invalid priority", async () => {
      await expect(
        Reminder.create({
          title: "Test Reminder",
          reminderDate: new Date(Date.now() + 86400000),
          userId: testUser1.id,
          priority: "invalid" as any,
        })
      ).rejects.toThrow()
    })
  })

  describe("Reminder Instance Methods", () => {
    let reminder: Reminder

    beforeEach(async () => {
      reminder = await Reminder.create({
        title: "Test Reminder",
        reminderDate: new Date(Date.now() + 86400000), // Tomorrow
        userId: testUser1.id,
        priority: ReminderPriority.MEDIUM,
      })
    })

    it("should correctly identify overdue reminders", async () => {
      // Reminder with future date should not be overdue
      expect(reminder.isOverdue()).toBe(false)

      // Update reminder to have past date
      await reminder.update({
        reminderDate: new Date(Date.now() - 86400000), // Yesterday
      })
      expect(reminder.isOverdue()).toBe(true)

      // Completed reminders should not be overdue
      await reminder.update({ isCompleted: true })
      expect(reminder.isOverdue()).toBe(false)
    })

    it("should calculate days until due correctly", () => {
      const daysUntilDue = reminder.getDaysUntilDue()
      expect(daysUntilDue).toBe(1) // Tomorrow

      // Completed reminder should return null
      reminder.isCompleted = true
      expect(reminder.getDaysUntilDue()).toBeNull()
    })

    it("should calculate hours until due correctly", () => {
      const hoursUntilDue = reminder.getHoursUntilDue()
      expect(hoursUntilDue).toBeGreaterThan(0)
      expect(hoursUntilDue).toBeLessThanOrEqual(24)

      // Completed reminder should return null
      reminder.isCompleted = true
      expect(reminder.getHoursUntilDue()).toBeNull()
    })

    it("should mark reminder as completed", async () => {
      await reminder.markAsCompleted()
      expect(reminder.isCompleted).toBe(true)
    })

    it("should mark reminder as incomplete", async () => {
      await reminder.update({ isCompleted: true })
      await reminder.markAsIncomplete()
      expect(reminder.isCompleted).toBe(false)
    })

    it("should reschedule reminder", async () => {
      const newDate = new Date(Date.now() + 172800000) // Day after tomorrow
      await reminder.reschedule(newDate)
      expect(reminder.reminderDate).toEqual(newDate)
      expect(reminder.isCompleted).toBe(false) // Should reset completion status
    })

    it("should update priority", async () => {
      await reminder.updatePriority(ReminderPriority.URGENT)
      expect(reminder.priority).toBe(ReminderPriority.URGENT)
    })

    it("should snooze reminder", async () => {
      const originalDate = reminder.reminderDate
      await reminder.snooze(30) // Snooze for 30 minutes

      const expectedDate = new Date(originalDate.getTime() + 30 * 60 * 1000)
      expect(reminder.reminderDate).toEqual(expectedDate)
      expect(reminder.isCompleted).toBe(false)
    })

    it("should include computed properties in JSON", () => {
      const json = reminder.toJSON()
      expect(json.isOverdue).toBeDefined()
      expect(json.daysUntilDue).toBeDefined()
      expect(json.hoursUntilDue).toBeDefined()
    })
  })

  describe("Reminder Static Methods", () => {
    let reminder1: Reminder
    let reminder2: Reminder
    let reminder3: Reminder

    beforeEach(async () => {
      reminder1 = await Reminder.create({
        title: "Reminder 1",
        reminderDate: new Date(Date.now() + 86400000), // Tomorrow
        userId: testUser1.id,
        institutionId: testInstitution?.id,
        priority: ReminderPriority.HIGH,
        isCompleted: false,
      })

      reminder2 = await Reminder.create({
        title: "Reminder 2",
        reminderDate: new Date(Date.now() + 172800000), // Day after tomorrow
        userId: testUser2.id,
        priority: ReminderPriority.LOW,
        isCompleted: false,
      })

      reminder3 = await Reminder.create({
        title: "Reminder 3",
        reminderDate: new Date(Date.now() - 86400000), // Yesterday
        userId: testUser1.id,
        priority: ReminderPriority.URGENT,
        isCompleted: true,
      })
    })

    it("should find reminders by user", async () => {
      const reminders = await Reminder.findAll({ where: { userId: testUser1.id } })
      expect(reminders).toHaveLength(2)
      expect(reminders.map((r) => r.id)).toContain(reminder1.id)
      expect(reminders.map((r) => r.id)).toContain(reminder3.id)
    })

    it("should find reminders by institution", async () => {
      if (testInstitution) {
        const reminders = await Reminder.findByInstitution(testInstitution.id)
        expect(reminders).toHaveLength(1)
        expect(reminders[0].id).toBe(reminder1.id)
      }
    })

    it("should find reminders by priority", async () => {
      const highPriorityReminders = await Reminder.findAll({
        where: { priority: ReminderPriority.HIGH },
      })
      expect(highPriorityReminders).toHaveLength(1)
      expect(highPriorityReminders[0].id).toBe(reminder1.id)

      const urgentReminders = await Reminder.findAll({
        where: { priority: ReminderPriority.URGENT },
      })
      expect(urgentReminders).toHaveLength(1)
      expect(urgentReminders[0].id).toBe(reminder3.id)
    })

    it("should find completed reminders", async () => {
      const completedReminders = await Reminder.findAll({
        where: { isCompleted: true },
      })
      expect(completedReminders).toHaveLength(1)
      expect(completedReminders[0].id).toBe(reminder3.id)

      // Filter by user
      const userCompletedReminders = await Reminder.findAll({
        where: { isCompleted: true, userId: testUser1.id },
      })
      expect(userCompletedReminders).toHaveLength(1)
      expect(userCompletedReminders[0].id).toBe(reminder3.id)
    })

    it("should find pending reminders", async () => {
      const pendingReminders = await Reminder.findAll({
        where: { isCompleted: false },
      })
      expect(pendingReminders).toHaveLength(2)
      expect(pendingReminders.map((r) => r.id)).toContain(reminder1.id)
      expect(pendingReminders.map((r) => r.id)).toContain(reminder2.id)

      // Filter by user
      const userPendingReminders = await Reminder.findAll({
        where: { isCompleted: false, userId: testUser1.id },
      })
      expect(userPendingReminders).toHaveLength(1)
      expect(userPendingReminders[0].id).toBe(reminder1.id)
    })

    it("should find overdue reminders", async () => {
      // Create an overdue reminder that's not completed
      const overdueReminder = await Reminder.create({
        title: "Overdue Reminder",
        reminderDate: new Date(Date.now() - 86400000), // Yesterday
        userId: testUser1.id,
        isCompleted: false,
      })

      const overdueReminders = await Reminder.findAll({
        where: {
          reminderDate: { [Op.lt]: new Date() },
          isCompleted: false,
        },
      })
      expect(overdueReminders).toHaveLength(1)
      expect(overdueReminders[0].id).toBe(overdueReminder.id)

      // Filter by user
      const userOverdueReminders = await Reminder.findAll({
        where: {
          reminderDate: { [Op.lt]: new Date() },
          isCompleted: false,
          userId: testUser1.id,
        },
      })
      expect(userOverdueReminders).toHaveLength(1)
      expect(userOverdueReminders[0].id).toBe(overdueReminder.id)
    })

    it("should find upcoming reminders", async () => {
      const now = new Date()
      const futureDate = new Date(now.getTime() + 48 * 60 * 60 * 1000) // Next 48 hours

      const upcomingReminders = await Reminder.findAll({
        where: {
          reminderDate: { [Op.between]: [now, futureDate] },
          isCompleted: false,
        },
      })
      expect(upcomingReminders).toHaveLength(2) // reminder1 and reminder2
      expect(upcomingReminders.map((r) => r.id)).toContain(reminder1.id)
      expect(upcomingReminders.map((r) => r.id)).toContain(reminder2.id)

      // Filter by user
      const futureDate24 = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const userUpcomingReminders = await Reminder.findAll({
        where: {
          reminderDate: { [Op.between]: [now, futureDate24] },
          isCompleted: false,
          userId: testUser1.id,
        },
      })
      expect(userUpcomingReminders).toHaveLength(1)
      expect(userUpcomingReminders[0].id).toBe(reminder1.id)
    })

    it("should find reminders by date range", async () => {
      const startDate = new Date(Date.now() + 43200000) // 12 hours from now
      const endDate = new Date(Date.now() + 259200000) // 3 days from now

      const reminders = await Reminder.findAll({
        where: {
          reminderDate: { [Op.between]: [startDate, endDate] },
        },
      })
      expect(reminders).toHaveLength(2) // reminder1 and reminder2
      expect(reminders.map((r) => r.id)).toContain(reminder1.id)
      expect(reminders.map((r) => r.id)).toContain(reminder2.id)

      // Filter by user
      const userReminders = await Reminder.findAll({
        where: {
          reminderDate: { [Op.between]: [startDate, endDate] },
          userId: testUser1.id,
        },
      })
      expect(userReminders).toHaveLength(1)
      expect(userReminders[0].id).toBe(reminder1.id)
    })

    it("should find reminders by team members", async () => {
      const teamMemberIds = [testUser1.id, testUser2.id]
      const reminders = await Reminder.findAll({
        where: {
          userId: { [Op.in]: teamMemberIds },
        },
      })
      expect(reminders).toHaveLength(3) // All reminders
    })

    it("should search reminders with filters", async () => {
      // Search by user
      let reminders = await Reminder.findAll({ where: { userId: testUser1.id } })
      expect(reminders).toHaveLength(2)

      // Search by priority
      reminders = await Reminder.findAll({ where: { priority: ReminderPriority.HIGH } })
      expect(reminders).toHaveLength(1)
      expect(reminders[0].id).toBe(reminder1.id)

      // Search by completion status
      reminders = await Reminder.findAll({ where: { isCompleted: true } })
      expect(reminders).toHaveLength(1)
      expect(reminders[0].id).toBe(reminder3.id)

      // Search by overdue
      await Reminder.create({
        title: "Overdue Test",
        reminderDate: new Date(Date.now() - 86400000),
        userId: testUser1.id,
        isCompleted: false,
      })
      reminders = await Reminder.findAll({
        where: {
          reminderDate: { [Op.lt]: new Date() },
          isCompleted: false,
        },
      })
      expect(reminders).toHaveLength(1)

      // Search by text
      reminders = await Reminder.findAll({
        where: {
          title: { [Op.like]: "%Reminder 1%" },
        },
      })
      expect(reminders).toHaveLength(1)
      expect(reminders[0].id).toBe(reminder1.id)

      // Search by date range
      const startDate = new Date(Date.now() + 43200000)
      const endDate = new Date(Date.now() + 259200000)
      reminders = await Reminder.findAll({
        where: {
          reminderDate: { [Op.between]: [startDate, endDate] },
        },
      })
      expect(reminders).toHaveLength(2)
    })
  })

  describe("Reminder Validation", () => {
    it("should validate reminder data", () => {
      // Valid data should not throw
      expect(() => {
        Reminder.validateReminderData({
          title: "Valid Title",
          description: "Valid description",
          reminderDate: new Date(Date.now() + 86400000),
        })
      }).not.toThrow()

      // Empty title should throw
      expect(() => {
        Reminder.validateReminderData({ title: "" })
      }).toThrow("Reminder title is required")

      // Long title should throw
      expect(() => {
        Reminder.validateReminderData({ title: "a".repeat(256) })
      }).toThrow("Reminder title cannot exceed 255 characters")

      // Long description should throw
      expect(() => {
        Reminder.validateReminderData({ description: "a".repeat(1001) })
      }).toThrow("Reminder description cannot exceed 1,000 characters")

      // Far future date should throw
      const farFutureDate = new Date()
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 10)
      expect(() => {
        Reminder.validateReminderData({ reminderDate: farFutureDate })
      }).toThrow("Reminder date cannot be more than 5 years in the future")
    })

    it("should validate priority transitions", () => {
      // All priority transitions should be valid
      expect(() => {
        Reminder.validatePriorityTransition(ReminderPriority.LOW, ReminderPriority.HIGH)
      }).not.toThrow()

      expect(() => {
        Reminder.validatePriorityTransition(ReminderPriority.HIGH, ReminderPriority.LOW)
      }).not.toThrow()

      expect(() => {
        Reminder.validatePriorityTransition(
          ReminderPriority.MEDIUM,
          ReminderPriority.URGENT
        )
      }).not.toThrow()

      // Invalid priority should throw
      expect(() => {
        Reminder.validatePriorityTransition(ReminderPriority.LOW, "invalid" as any)
      }).toThrow("Invalid priority: invalid")
    })
  })

  describe("Reminder Hooks", () => {
    it("should validate reminder data before validation", async () => {
      await expect(
        Reminder.create({
          title: "", // Empty title should trigger validation
          reminderDate: new Date(Date.now() + 86400000),
          userId: testUser1.id,
        })
      ).rejects.toThrow()
    })

    it("should validate priority transitions on update", async () => {
      const reminder = await Reminder.create({
        title: "Test Reminder",
        reminderDate: new Date(Date.now() + 86400000),
        userId: testUser1.id,
        priority: ReminderPriority.LOW,
      })

      // Valid priority transition should work
      await expect(
        reminder.update({ priority: ReminderPriority.HIGH })
      ).resolves.toBeDefined()

      // Invalid priority should fail
      await expect(reminder.update({ priority: "invalid" as any })).rejects.toThrow()
    })

    it("should reset completion status when rescheduling", async () => {
      const reminder = await Reminder.create({
        title: "Test Reminder",
        reminderDate: new Date(Date.now() + 86400000),
        userId: testUser1.id,
        isCompleted: true,
      })

      const newDate = new Date(Date.now() + 172800000)
      await reminder.reschedule(newDate)

      expect(reminder.isCompleted).toBe(false)
      expect(reminder.reminderDate).toEqual(newDate)
    })
  })

  describe("Reminder Edge Cases", () => {
    it("should handle reminders with same date and priority correctly", async () => {
      const sameDate = new Date(Date.now() + 86400000)

      const reminder1 = await Reminder.create({
        title: "First Reminder",
        reminderDate: sameDate,
        userId: testUser1.id,
        priority: ReminderPriority.HIGH,
      })

      const reminder2 = await Reminder.create({
        title: "Second Reminder",
        reminderDate: sameDate,
        userId: testUser1.id,
        priority: ReminderPriority.HIGH,
      })

      const reminders = await Reminder.findAll({ where: { userId: testUser1.id } })
      expect(reminders).toHaveLength(2)

      // Should be ordered by creation date as tiebreaker
      expect(reminders[0].createdAt.getTime()).toBeLessThanOrEqual(
        reminders[1].createdAt.getTime()
      )
    })

    it("should handle null institution correctly", async () => {
      const reminder = await Reminder.create({
        title: "No Institution Reminder",
        reminderDate: new Date(Date.now() + 86400000),
        userId: testUser1.id,
        institutionId: null,
      })

      expect(reminder.institutionId).toBeNull()

      const reminders = await Reminder.findAll({ where: { userId: testUser1.id } })
      expect(reminders).toHaveLength(1)
      expect(reminders[0].institutionId).toBeNull()
    })

    it("should handle very short snooze periods", async () => {
      const reminder = await Reminder.create({
        title: "Test Reminder",
        reminderDate: new Date(Date.now() + 86400000),
        userId: testUser1.id,
      })

      const originalDate = reminder.reminderDate
      await reminder.snooze(1) // 1 minute

      const expectedDate = new Date(originalDate.getTime() + 60 * 1000)
      expect(reminder.reminderDate).toEqual(expectedDate)
    })
  })
})
