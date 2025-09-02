import request from "supertest"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { ReminderPriority } from "@medical-crm/shared"
import { createApp } from "../../app"
import { sequelize } from "../../config/database"
import { Reminder } from "../../models/Reminder"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"

describe("Reminders API", () => {
  let app: any
  let adminUser: User
  let regularUser: User
  let adminToken: string
  let userToken: string
  let testInstitution: MedicalInstitution
  let testReminder: Reminder

  beforeEach(async () => {
    await sequelize.sync({ force: true })
    app = createApp()

    // Create test users
    adminUser = await User.createUser({
      email: "admin@example.com",
      password: "password123",
      firstName: "Admin",
      lastName: "User",
      role: UserRole.SUPER_ADMIN,
    })

    regularUser = await User.createUser({
      email: "user@example.com",
      password: "password123",
      firstName: "Regular",
      lastName: "User",
      role: UserRole.USER,
    })

    // Generate tokens
    adminToken = AuthService.generateAccessToken(adminUser.id, adminUser.role)
    userToken = AuthService.generateAccessToken(regularUser.id, regularUser.role)

    // Create test institution
    testInstitution = await MedicalInstitution.create({
      name: "Test Hospital",
      type: "hospital",
      address: "123 Test St",
      city: "Test City",
      state: "TS",
      zipCode: "12345",
      phone: "+1234567890",
      email: "test@hospital.com",
      isActive: true,
    })

    // Create test reminder
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    testReminder = await Reminder.create({
      title: "Test Reminder",
      description: "This is a test reminder",
      reminderDate: tomorrow,
      userId: regularUser.id,
      institutionId: testInstitution.id,
      priority: ReminderPriority.MEDIUM,
    })
  })

  afterEach(async () => {
    await sequelize.truncate({ cascade: true })
  })

  describe("GET /api/reminders", () => {
    it("should get all reminders for admin", async () => {
      const response = await request(app.callback())
        .get("/api/reminders")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBeGreaterThan(0)
      expect(response.body.pagination).toBeDefined()
    })

    it("should filter reminders by userId", async () => {
      const response = await request(app.callback())
        .get(`/api/reminders?userId=${regularUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.every((reminder: any) => reminder.userId === regularUser.id)).toBe(true)
    })

    it("should filter reminders by priority", async () => {
      const response = await request(app.callback())
        .get(`/api/reminders?priority=${ReminderPriority.MEDIUM}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.every((reminder: any) => reminder.priority === ReminderPriority.MEDIUM)).toBe(true)
    })

    it("should filter reminders by completion status", async () => {
      const response = await request(app.callback())
        .get("/api/reminders?isCompleted=false")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.every((reminder: any) => reminder.isCompleted === false)).toBe(true)
    })

    it("should filter reminders by date range", async () => {
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const response = await request(app.callback())
        .get(`/api/reminders?reminderDateFrom=${today.toISOString()}&reminderDateTo=${nextWeek.toISOString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it("should search reminders by text", async () => {
      const response = await request(app.callback())
        .get("/api/reminders?search=Test")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.some((reminder: any) => 
        reminder.title.includes("Test") || (reminder.description && reminder.description.includes("Test"))
      )).toBe(true)
    })

    it("should support pagination", async () => {
      const response = await request(app.callback())
        .get("/api/reminders?limit=1&offset=0")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeLessThanOrEqual(1)
      expect(response.body.pagination.limit).toBe(1)
      expect(response.body.pagination.offset).toBe(0)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get("/api/reminders")
        .expect(401)
    })
  })

  describe("GET /api/reminders/:id", () => {
    it("should get a specific reminder", async () => {
      const response = await request(app.callback())
        .get(`/api/reminders/${testReminder.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testReminder.id)
      expect(response.body.data.title).toBe(testReminder.title)
      expect(response.body.data.priority).toBe(testReminder.priority)
    })

    it("should return 404 for non-existent reminder", async () => {
      await request(app.callback())
        .get("/api/reminders/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/reminders/${testReminder.id}`)
        .expect(401)
    })
  })

  describe("POST /api/reminders", () => {
    it("should create a new reminder", async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const reminderData = {
        title: "New Test Reminder",
        description: "This is a new test reminder",
        reminderDate: tomorrow.toISOString(),
        userId: regularUser.id,
        institutionId: testInstitution.id,
        priority: ReminderPriority.HIGH,
      }

      const response = await request(app.callback())
        .post("/api/reminders")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(reminderData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(reminderData.title)
      expect(response.body.data.description).toBe(reminderData.description)
      expect(response.body.data.priority).toBe(reminderData.priority)
      expect(response.body.data.userId).toBe(reminderData.userId)
      expect(response.body.data.institutionId).toBe(reminderData.institutionId)
    })

    it("should create reminder with default priority", async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const reminderData = {
        title: "Reminder with default priority",
        reminderDate: tomorrow.toISOString(),
        userId: regularUser.id,
      }

      const response = await request(app.callback())
        .post("/api/reminders")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(reminderData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.priority).toBe(ReminderPriority.MEDIUM)
    })

    it("should validate required fields", async () => {
      const invalidReminderData = {
        description: "Missing required fields",
      }

      await request(app.callback())
        .post("/api/reminders")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidReminderData)
        .expect(400)
    })

    it("should validate priority", async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const invalidReminderData = {
        title: "Invalid Priority Reminder",
        reminderDate: tomorrow.toISOString(),
        userId: regularUser.id,
        priority: "INVALID_PRIORITY",
      }

      await request(app.callback())
        .post("/api/reminders")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidReminderData)
        .expect(400)
    })

    it("should validate reminder date", async () => {
      const invalidReminderData = {
        title: "Invalid Date Reminder",
        reminderDate: "invalid-date",
        userId: regularUser.id,
      }

      await request(app.callback())
        .post("/api/reminders")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidReminderData)
        .expect(400)
    })

    it("should require authentication", async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const reminderData = {
        title: "Unauthenticated Reminder",
        reminderDate: tomorrow.toISOString(),
        userId: regularUser.id,
      }

      await request(app.callback())
        .post("/api/reminders")
        .send(reminderData)
        .expect(401)
    })
  })

  describe("PUT /api/reminders/:id", () => {
    it("should update a reminder", async () => {
      const updateData = {
        title: "Updated Reminder Title",
        description: "Updated description",
        priority: ReminderPriority.HIGH,
      }

      const response = await request(app.callback())
        .put(`/api/reminders/${testReminder.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(updateData.title)
      expect(response.body.data.description).toBe(updateData.description)
      expect(response.body.data.priority).toBe(updateData.priority)
    })

    it("should update reminder date", async () => {
      const newDate = new Date()
      newDate.setDate(newDate.getDate() + 3)

      const updateData = {
        reminderDate: newDate.toISOString(),
      }

      const response = await request(app.callback())
        .put(`/api/reminders/${testReminder.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(new Date(response.body.data.reminderDate).getTime()).toBe(newDate.getTime())
    })

    it("should return 404 for non-existent reminder", async () => {
      const updateData = { title: "Updated Title" }

      await request(app.callback())
        .put("/api/reminders/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404)
    })

    it("should validate reminder date in updates", async () => {
      const updateData = {
        reminderDate: "invalid-date",
      }

      await request(app.callback())
        .put(`/api/reminders/${testReminder.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400)
    })

    it("should require authentication", async () => {
      const updateData = { title: "Updated Title" }

      await request(app.callback())
        .put(`/api/reminders/${testReminder.id}`)
        .send(updateData)
        .expect(401)
    })
  })

  describe("DELETE /api/reminders/:id", () => {
    it("should delete a reminder", async () => {
      await request(app.callback())
        .delete(`/api/reminders/${testReminder.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204)

      // Verify reminder was deleted
      const deletedReminder = await Reminder.findByPk(testReminder.id)
      expect(deletedReminder).toBeNull()
    })

    it("should return 404 for non-existent reminder", async () => {
      await request(app.callback())
        .delete("/api/reminders/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .delete(`/api/reminders/${testReminder.id}`)
        .expect(401)
    })
  })

  describe("PATCH /api/reminders/:id/complete", () => {
    it("should mark reminder as completed", async () => {
      const response = await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/complete`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.isCompleted).toBe(true)
    })

    it("should return 404 for non-existent reminder", async () => {
      await request(app.callback())
        .patch("/api/reminders/00000000-0000-0000-0000-000000000000/complete")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/complete`)
        .expect(401)
    })
  })

  describe("PATCH /api/reminders/:id/incomplete", () => {
    it("should mark reminder as incomplete", async () => {
      // First mark it as completed
      await testReminder.markAsCompleted()

      const response = await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/incomplete`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.isCompleted).toBe(false)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/incomplete`)
        .expect(401)
    })
  })

  describe("PATCH /api/reminders/:id/snooze", () => {
    it("should snooze reminder by specified minutes", async () => {
      const snoozeData = { minutes: 30 }

      const response = await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/snooze`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(snoozeData)
        .expect(200)

      expect(response.body.success).toBe(true)
      // Verify the reminder date was pushed back
      const originalDate = new Date(testReminder.reminderDate)
      const newDate = new Date(response.body.data.reminderDate)
      const diffMinutes = (newDate.getTime() - originalDate.getTime()) / (1000 * 60)
      expect(Math.round(diffMinutes)).toBe(30)
    })

    it("should validate snooze duration", async () => {
      const invalidSnoozeData = { minutes: -10 }

      await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/snooze`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidSnoozeData)
        .expect(400)
    })

    it("should require minutes parameter", async () => {
      await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/snooze`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400)
    })

    it("should require authentication", async () => {
      const snoozeData = { minutes: 30 }

      await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/snooze`)
        .send(snoozeData)
        .expect(401)
    })
  })

  describe("PATCH /api/reminders/:id/reschedule", () => {
    it("should reschedule reminder to new date", async () => {
      const newDate = new Date()
      newDate.setDate(newDate.getDate() + 5)

      const rescheduleData = { reminderDate: newDate.toISOString() }

      const response = await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/reschedule`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(rescheduleData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(new Date(response.body.data.reminderDate).getTime()).toBe(newDate.getTime())
      expect(response.body.data.isCompleted).toBe(false) // Should reset completion status
    })

    it("should validate new reminder date", async () => {
      const rescheduleData = { reminderDate: "invalid-date" }

      await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/reschedule`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(rescheduleData)
        .expect(400)
    })

    it("should require reminderDate parameter", async () => {
      await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/reschedule`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400)
    })

    it("should require authentication", async () => {
      const newDate = new Date()
      const rescheduleData = { reminderDate: newDate.toISOString() }

      await request(app.callback())
        .patch(`/api/reminders/${testReminder.id}/reschedule`)
        .send(rescheduleData)
        .expect(401)
    })
  })

  describe("GET /api/reminders/user/:userId", () => {
    it("should get reminders by user", async () => {
      const response = await request(app.callback())
        .get(`/api/reminders/user/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.every((reminder: any) => reminder.userId === regularUser.id)).toBe(true)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/reminders/user/${regularUser.id}`)
        .expect(401)
    })
  })

  describe("GET /api/reminders/institution/:institutionId", () => {
    it("should get reminders by institution", async () => {
      const response = await request(app.callback())
        .get(`/api/reminders/institution/${testInstitution.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.every((reminder: any) => reminder.institutionId === testInstitution.id)).toBe(true)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/reminders/institution/${testInstitution.id}`)
        .expect(401)
    })
  })

  describe("GET /api/reminders/priority/:priority", () => {
    it("should get reminders by priority", async () => {
      const response = await request(app.callback())
        .get(`/api/reminders/priority/${ReminderPriority.MEDIUM}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.every((reminder: any) => reminder.priority === ReminderPriority.MEDIUM)).toBe(true)
    })

    it("should validate priority", async () => {
      await request(app.callback())
        .get("/api/reminders/priority/INVALID_PRIORITY")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/reminders/priority/${ReminderPriority.MEDIUM}`)
        .expect(401)
    })
  })

  describe("GET /api/reminders/status/*", () => {
    it("should get completed reminders", async () => {
      // Mark test reminder as completed
      await testReminder.markAsCompleted()

      const response = await request(app.callback())
        .get("/api/reminders/status/completed")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.every((reminder: any) => reminder.isCompleted === true)).toBe(true)
    })

    it("should get pending reminders", async () => {
      const response = await request(app.callback())
        .get("/api/reminders/status/pending")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.every((reminder: any) => reminder.isCompleted === false)).toBe(true)
    })

    it("should get overdue reminders", async () => {
      // Create an overdue reminder
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      await Reminder.create({
        title: "Overdue Reminder",
        reminderDate: yesterday,
        userId: regularUser.id,
        priority: ReminderPriority.HIGH,
      })

      const response = await request(app.callback())
        .get("/api/reminders/status/overdue")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
    })

    it("should get upcoming reminders", async () => {
      const response = await request(app.callback())
        .get("/api/reminders/status/upcoming?hoursAhead=48")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
    })

    it("should validate hoursAhead parameter", async () => {
      await request(app.callback())
        .get("/api/reminders/status/upcoming?hoursAhead=-5")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)
    })
  })

  describe("GET /api/reminders/date-range", () => {
    it("should get reminders by date range", async () => {
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      const response = await request(app.callback())
        .get(`/api/reminders/date-range?startDate=${today.toISOString()}&endDate=${nextWeek.toISOString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
    })

    it("should validate date format", async () => {
      await request(app.callback())
        .get("/api/reminders/date-range?startDate=invalid-date&endDate=2024-01-01")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)
    })

    it("should validate date range", async () => {
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      await request(app.callback())
        .get(`/api/reminders/date-range?startDate=${today.toISOString()}&endDate=${yesterday.toISOString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)
    })

    it("should require both dates", async () => {
      await request(app.callback())
        .get("/api/reminders/date-range?startDate=2024-01-01")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)
    })

    it("should require authentication", async () => {
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      await request(app.callback())
        .get(`/api/reminders/date-range?startDate=${today.toISOString()}&endDate=${nextWeek.toISOString()}`)
        .expect(401)
    })
  })

  describe("Reminder Search Functionality", () => {
    beforeEach(async () => {
      // Create additional test reminders with different attributes
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)

      await Reminder.create({
        title: "Important Meeting Reminder",
        description: "Don't forget the quarterly review meeting",
        reminderDate: nextWeek,
        userId: adminUser.id,
        priority: ReminderPriority.HIGH,
      })

      await Reminder.create({
        title: "Low Priority Task",
        description: "Review documentation when possible",
        reminderDate: nextWeek,
        userId: regularUser.id,
        priority: ReminderPriority.LOW,
      })
    })

    it("should search reminders by title text", async () => {
      const response = await request(app.callback())
        .get("/api/reminders?search=Meeting")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.some((reminder: any) => 
        reminder.title.toLowerCase().includes("meeting")
      )).toBe(true)
    })

    it("should search reminders by description text", async () => {
      const response = await request(app.callback())
        .get("/api/reminders?search=documentation")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.some((reminder: any) => 
        reminder.description?.toLowerCase().includes("documentation")
      )).toBe(true)
    })

    it("should combine multiple filters", async () => {
      const response = await request(app.callback())
        .get(`/api/reminders?userId=${adminUser.id}&priority=${ReminderPriority.HIGH}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.every((reminder: any) => 
        reminder.userId === adminUser.id && reminder.priority === ReminderPriority.HIGH
      )).toBe(true)
    })

    it("should filter overdue reminders", async () => {
      // Create an overdue reminder
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 2)
      
      await Reminder.create({
        title: "Very Overdue Reminder",
        reminderDate: yesterday,
        userId: regularUser.id,
        priority: ReminderPriority.URGENT,
      })

      const response = await request(app.callback())
        .get("/api/reminders?overdue=true")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
      expect(response.body.data.every((reminder: any) => reminder.isCompleted === false)).toBe(true)
    })
  })
})