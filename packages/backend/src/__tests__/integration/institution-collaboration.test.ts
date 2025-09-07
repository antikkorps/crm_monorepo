import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { app } from "../../app"
import { sequelize } from "../../config/database"
import {
  MedicalInstitution,
  User,
  Note,
  Meeting,
  Call,
  Reminder,
  Task,
} from "../../models"
import { InstitutionType } from "@medical-crm/shared"
import { MeetingStatus } from "@medical-crm/shared"
import { CallType } from "@medical-crm/shared"
import { ReminderPriority } from "@medical-crm/shared"
import { TaskStatus, TaskPriority } from "../../models/Task"
import { AuthService } from "../../services/AuthService"

describe("Institution Collaboration Integration Tests", () => {
  let authToken: string
  let testUser: User
  let testInstitution: MedicalInstitution

  beforeEach(async () => {
    // Clean up database
    await sequelize.sync({ force: true })

    // Create test user
    testUser = await User.create({
      email: "test@example.com",
      passwordHash: "hashedpassword",
      firstName: "John",
      lastName: "Doe",
      role: "USER",
      isActive: true,
    })

    // Generate auth token
    authToken = AuthService.generateToken(testUser.id, testUser.email)

    // Create test institution
    testInstitution = await MedicalInstitution.create({
      name: "Test Hospital",
      type: InstitutionType.HOSPITAL,
      address: {
        street: "123 Test St",
        city: "Test City",
        state: "Test State",
        zipCode: "12345",
        country: "Test Country",
      },
      assignedUserId: testUser.id,
      tags: ["test", "hospital"],
    })

    // Create test collaboration data
    await Promise.all([
      // Create test notes
      Note.create({
        title: "Test Note 1",
        content: "This is a test note about the institution",
        tags: ["urgent", "follow-up"],
        creatorId: testUser.id,
        institutionId: testInstitution.id,
        isPrivate: false,
      }),
      Note.create({
        title: "Test Note 2",
        content: "Another test note with different content",
        tags: ["research"],
        creatorId: testUser.id,
        institutionId: testInstitution.id,
        isPrivate: true,
      }),
      
      // Create test meetings
      Meeting.create({
        title: "Test Meeting 1",
        description: "Initial consultation meeting",
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
        organizerId: testUser.id,
        institutionId: testInstitution.id,
        status: MeetingStatus.SCHEDULED,
        location: "Conference Room A",
      }),
      Meeting.create({
        title: "Test Meeting 2",
        description: "Follow-up discussion",
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endDate: new Date(Date.now() - 23 * 60 * 60 * 1000),
        organizerId: testUser.id,
        institutionId: testInstitution.id,
        status: MeetingStatus.COMPLETED,
      }),

      // Create test calls
      Call.create({
        phoneNumber: "+1-555-0123",
        duration: 1800, // 30 minutes
        summary: "Initial contact call to discuss services",
        callType: CallType.OUTBOUND,
        userId: testUser.id,
        institutionId: testInstitution.id,
      }),
      Call.create({
        phoneNumber: "+1-555-0124",
        duration: 900, // 15 minutes
        summary: "Follow-up call regarding pricing",
        callType: CallType.INBOUND,
        userId: testUser.id,
        institutionId: testInstitution.id,
      }),

      // Create test reminders
      Reminder.create({
        title: "Test Reminder 1",
        description: "Follow up on contract terms",
        reminderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        isCompleted: false,
        userId: testUser.id,
        institutionId: testInstitution.id,
        priority: ReminderPriority.HIGH,
      }),
      Reminder.create({
        title: "Test Reminder 2",
        description: "Review compliance documentation",
        reminderDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        isCompleted: true,
        userId: testUser.id,
        institutionId: testInstitution.id,
        priority: ReminderPriority.MEDIUM,
      }),

      // Create test tasks
      Task.create({
        title: "Test Task 1",
        description: "Prepare proposal documentation",
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        assigneeId: testUser.id,
        creatorId: testUser.id,
        institutionId: testInstitution.id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      }),
      Task.create({
        title: "Test Task 2",
        description: "Complete compliance review",
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.MEDIUM,
        assigneeId: testUser.id,
        creatorId: testUser.id,
        institutionId: testInstitution.id,
        completedAt: new Date(),
      }),
    ])
  })

  describe("GET /api/institutions/:id/collaboration", () => {
    it("should return collaboration data for institution", async () => {
      const response = await request(app)
        .get(`/api/institutions/${testInstitution.id}/collaboration`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty("stats")
      expect(response.body).toHaveProperty("recentNotes")
      expect(response.body).toHaveProperty("upcomingMeetings")
      expect(response.body).toHaveProperty("recentCalls")
      expect(response.body).toHaveProperty("pendingReminders")
      expect(response.body).toHaveProperty("openTasks")

      // Verify statistics
      expect(response.body.stats.totalNotes).toBe(2)
      expect(response.body.stats.totalMeetings).toBe(2)
      expect(response.body.stats.totalCalls).toBe(2)
      expect(response.body.stats.totalReminders).toBe(2)
      expect(response.body.stats.totalTasks).toBe(2)
      expect(response.body.stats.upcomingMeetings).toBe(1)
      expect(response.body.stats.pendingReminders).toBe(1)
      expect(response.body.stats.openTasks).toBe(1)

      // Verify data structure
      expect(response.body.recentNotes).toHaveLength(2)
      expect(response.body.recentNotes[0]).toHaveProperty("title")
      expect(response.body.recentNotes[0]).toHaveProperty("creator")

      expect(response.body.upcomingMeetings).toHaveLength(1)
      expect(response.body.upcomingMeetings[0]).toHaveProperty("title", "Test Meeting 1")

      expect(response.body.recentCalls).toHaveLength(2)
      expect(response.body.recentCalls[0]).toHaveProperty("phoneNumber")

      expect(response.body.pendingReminders).toHaveLength(1)
      expect(response.body.pendingReminders[0]).toHaveProperty("title", "Test Reminder 1")

      expect(response.body.openTasks).toHaveLength(1)
      expect(response.body.openTasks[0]).toHaveProperty("title", "Test Task 1")
    })

    it("should require authentication", async () => {
      await request(app)
        .get(`/api/institutions/${testInstitution.id}/collaboration`)
        .expect(401)
    })

    it("should require proper permissions", async () => {
      // Create a different institution not assigned to user
      const otherInstitution = await MedicalInstitution.create({
        name: "Other Hospital",
        type: InstitutionType.CLINIC,
        address: {
          street: "456 Other St",
          city: "Other City",
          state: "Other State",
          zipCode: "67890",
          country: "Other Country",
        },
        tags: [],
      })

      await request(app)
        .get(`/api/institutions/${otherInstitution.id}/collaboration`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(403)
    })
  })

  describe("GET /api/institutions/:id/timeline", () => {
    it("should return timeline of all interactions", async () => {
      const response = await request(app)
        .get(`/api/institutions/${testInstitution.id}/timeline`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty("items")
      expect(response.body).toHaveProperty("pagination")

      // Should include all types of interactions
      expect(response.body.items).toHaveLength(8) // 2 notes + 2 meetings + 2 calls + 2 reminders

      // Verify timeline items structure
      const item = response.body.items[0]
      expect(item).toHaveProperty("id")
      expect(item).toHaveProperty("type")
      expect(item).toHaveProperty("title")
      expect(item).toHaveProperty("description")
      expect(item).toHaveProperty("user")
      expect(item).toHaveProperty("createdAt")
      expect(item).toHaveProperty("metadata")

      // Verify all interaction types are present
      const types = response.body.items.map((item: any) => item.type)
      expect(types).toContain("note")
      expect(types).toContain("meeting")
      expect(types).toContain("call")
      expect(types).toContain("reminder")
      expect(types).toContain("task")

      // Verify items are sorted by creation date (most recent first)
      const dates = response.body.items.map((item: any) => new Date(item.createdAt))
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime())
      }

      // Verify pagination
      expect(response.body.pagination.total).toBe(8)
      expect(response.body.pagination.limit).toBe(50)
      expect(response.body.pagination.offset).toBe(0)
      expect(response.body.pagination.hasMore).toBe(false)
    })

    it("should support pagination", async () => {
      const response = await request(app)
        .get(`/api/institutions/${testInstitution.id}/timeline`)
        .query({ limit: 3, offset: 2 })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.items).toHaveLength(3)
      expect(response.body.pagination.limit).toBe(3)
      expect(response.body.pagination.offset).toBe(2)
      expect(response.body.pagination.total).toBe(8)
      expect(response.body.pagination.hasMore).toBe(true)
    })

    it("should support date filtering", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const response = await request(app)
        .get(`/api/institutions/${testInstitution.id}/timeline`)
        .query({ 
          startDate: yesterday,
          endDate: tomorrow
        })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      // Should filter by creation date within the range
      expect(response.body.items.length).toBeGreaterThan(0)
      
      response.body.items.forEach((item: any) => {
        const itemDate = new Date(item.createdAt)
        expect(itemDate.getTime()).toBeGreaterThanOrEqual(new Date(yesterday).getTime())
        expect(itemDate.getTime()).toBeLessThanOrEqual(new Date(tomorrow).getTime())
      })
    })

    it("should require authentication", async () => {
      await request(app)
        .get(`/api/institutions/${testInstitution.id}/timeline`)
        .expect(401)
    })
  })

  describe("GET /api/institutions/search/unified", () => {
    it("should perform unified search across all collaboration features", async () => {
      const response = await request(app)
        .get("/api/institutions/search/unified")
        .query({ q: "test" })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty("query", "test")
      expect(response.body).toHaveProperty("results")
      expect(response.body).toHaveProperty("totals")
      expect(response.body).toHaveProperty("totalResults")

      // Should have results in multiple categories
      expect(response.body.results.institutions.length).toBeGreaterThan(0)
      expect(response.body.results.notes.length).toBeGreaterThan(0)
      expect(response.body.results.meetings.length).toBeGreaterThan(0)
      expect(response.body.results.tasks.length).toBeGreaterThan(0)

      // Verify result structure
      const noteResult = response.body.results.notes[0]
      expect(noteResult).toHaveProperty("id")
      expect(noteResult).toHaveProperty("type", "note")
      expect(noteResult).toHaveProperty("title")
      expect(noteResult).toHaveProperty("subtitle")
      expect(noteResult).toHaveProperty("creator")
      expect(noteResult).toHaveProperty("institution")

      // Verify totals
      expect(response.body.totals.institutions).toBeGreaterThan(0)
      expect(response.body.totals.notes).toBeGreaterThan(0)
      expect(response.body.totals.meetings).toBeGreaterThan(0)
      expect(response.body.totals.tasks).toBeGreaterThan(0)
      expect(response.body.totalResults).toBeGreaterThan(0)
    })

    it("should filter by specific types", async () => {
      const response = await request(app)
        .get("/api/institutions/search/unified")
        .query({ q: "test", type: "notes" })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      // Should only return notes
      expect(response.body.results.notes.length).toBeGreaterThan(0)
      expect(response.body.results.institutions).toHaveLength(0)
      expect(response.body.results.meetings).toHaveLength(0)
      expect(response.body.results.tasks).toHaveLength(0)
      expect(response.body.results.calls).toHaveLength(0)
      expect(response.body.results.reminders).toHaveLength(0)
    })

    it("should filter by institution", async () => {
      const response = await request(app)
        .get("/api/institutions/search/unified")
        .query({ q: "test", institutionId: testInstitution.id })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      // All results should be related to the specified institution
      response.body.results.notes.forEach((note: any) => {
        expect(note.institution?.id).toBe(testInstitution.id)
      })
      
      response.body.results.meetings.forEach((meeting: any) => {
        expect(meeting.institution?.id).toBe(testInstitution.id)
      })
      
      response.body.results.calls.forEach((call: any) => {
        expect(call.institution?.id).toBe(testInstitution.id)
      })
    })

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/institutions/search/unified")
        .query({ q: "test", limit: 5, offset: 0 })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.pagination.limit).toBe(5)
      expect(response.body.pagination.offset).toBe(0)
    })

    it("should require a search query", async () => {
      await request(app)
        .get("/api/institutions/search/unified")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400)
    })

    it("should require authentication", async () => {
      await request(app)
        .get("/api/institutions/search/unified")
        .query({ q: "test" })
        .expect(401)
    })

    it("should respect access control", async () => {
      // Create another user with different permissions
      const otherUser = await User.create({
        email: "other@example.com",
        passwordHash: "hashedpassword",
        firstName: "Jane",
        lastName: "Smith",
        role: "USER",
        isActive: true,
      })

      const otherUserToken = AuthService.generateToken(otherUser.id, otherUser.email)

      const response = await request(app)
        .get("/api/institutions/search/unified")
        .query({ q: "test" })
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(200)

      // Other user should not see private notes or data not assigned to them
      const noteResults = response.body.results.notes
      noteResults.forEach((note: any) => {
        if (note.isPrivate) {
          expect(note.creator.id).toBe(otherUser.id)
        }
      })
    })
  })

  describe("Edge Cases and Error Handling", () => {
    it("should handle non-existent institution ID", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000"
      
      await request(app)
        .get(`/api/institutions/${nonExistentId}/collaboration`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404)
    })

    it("should handle invalid UUIDs", async () => {
      await request(app)
        .get("/api/institutions/invalid-uuid/collaboration")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400)
    })

    it("should handle empty search results", async () => {
      const response = await request(app)
        .get("/api/institutions/search/unified")
        .query({ q: "nonexistentterm12345" })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.totalResults).toBe(0)
      expect(response.body.results.institutions).toHaveLength(0)
      expect(response.body.results.notes).toHaveLength(0)
      expect(response.body.results.meetings).toHaveLength(0)
    })

    it("should handle large limit values", async () => {
      const response = await request(app)
        .get("/api/institutions/search/unified")
        .query({ q: "test", limit: 1000 })
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      // Should cap at maximum allowed limit (100)
      expect(response.body.pagination.limit).toBe(100)
    })
  })
})