import { describe, expect, it, vi, beforeEach } from "vitest"
import { MedicalInstitutionController } from "../../controllers/MedicalInstitutionController"
import { Context } from "../../types/koa"
import { User } from "../../models/User"

// Mock all the models and dependencies
vi.mock("../../models/Note")
vi.mock("../../models/Meeting")  
vi.mock("../../models/Call")
vi.mock("../../models/Reminder")
vi.mock("../../models/Task")
vi.mock("../../models/MedicalInstitution")
vi.mock("../../utils/logger")

const mockUser = {
  id: "user-123",
  role: "USER",
  teamId: "team-123"
} as User

const mockContext: Partial<Context> = {
  params: { id: "institution-123" },
  query: {},
  state: { user: mockUser },
  body: undefined,
}

describe("Institution Collaboration Controller Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext.body = undefined
  })

  describe("getCollaborationData", () => {
    it("should return collaboration statistics and data", async () => {
      // Mock the import statements to return mock data
      const mockNote = await import("../../models/Note")
      const mockMeeting = await import("../../models/Meeting")
      const mockCall = await import("../../models/Call")
      const mockReminder = await import("../../models/Reminder")
      const mockTask = await import("../../models/Task")

      vi.mocked(mockNote.Note.findByInstitution).mockResolvedValue([
        { id: "note1", title: "Test Note", content: "Content", tags: [], creatorId: "user-123" },
        { id: "note2", title: "Test Note 2", content: "Content 2", tags: [], creatorId: "user-123" }
      ] as any)

      vi.mocked(mockMeeting.Meeting.findAll).mockResolvedValue([
        { 
          id: "meeting1", 
          title: "Test Meeting", 
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          organizerId: "user-123" 
        }
      ] as any)

      vi.mocked(mockCall.Call.findAll).mockResolvedValue([
        { id: "call1", phoneNumber: "123-456-7890", summary: "Test call", userId: "user-123" }
      ] as any)

      vi.mocked(mockReminder.Reminder.findAll).mockResolvedValue([
        { 
          id: "reminder1", 
          title: "Test Reminder", 
          reminderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isCompleted: false,
          userId: "user-123" 
        }
      ] as any)

      vi.mocked(mockTask.Task.findAll).mockResolvedValue([
        { 
          id: "task1", 
          title: "Test Task", 
          status: "TODO",
          assigneeId: "user-123" 
        }
      ] as any)

      await MedicalInstitutionController.getCollaborationData(mockContext as Context)

      expect(mockContext.body).toBeDefined()
      const body = mockContext.body as any
      
      expect(body).toHaveProperty("stats")
      expect(body).toHaveProperty("recentNotes")
      expect(body).toHaveProperty("upcomingMeetings")
      expect(body).toHaveProperty("recentCalls")
      expect(body).toHaveProperty("pendingReminders")
      expect(body).toHaveProperty("openTasks")

      expect(body.stats.totalNotes).toBe(2)
      expect(body.stats.totalMeetings).toBe(1)
      expect(body.stats.totalCalls).toBe(1)
      expect(body.stats.totalReminders).toBe(1)
      expect(body.stats.totalTasks).toBe(1)
    })
  })

  describe("getTimeline", () => {
    it("should return timeline items sorted by date", async () => {
      // Mock the import statements
      const mockNote = await import("../../models/Note")
      const mockMeeting = await import("../../models/Meeting")
      const mockCall = await import("../../models/Call")
      const mockReminder = await import("../../models/Reminder")
      const mockTask = await import("../../models/Task")

      const baseDate = new Date("2024-01-01T00:00:00Z")
      
      vi.mocked(mockNote.Note.findAll).mockResolvedValue([
        { 
          id: "note1", 
          title: "Test Note", 
          content: "Content",
          creator: { id: "user-123", firstName: "John", lastName: "Doe" },
          createdAt: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000), // Day 3
          tags: [],
          isPrivate: false
        }
      ] as any)

      vi.mocked(mockMeeting.Meeting.findAll).mockResolvedValue([
        { 
          id: "meeting1", 
          title: "Test Meeting",
          description: "Meeting desc",
          organizer: { id: "user-123", firstName: "John", lastName: "Doe" },
          createdAt: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000), // Day 1
          startDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          location: "Room A",
          status: "SCHEDULED"
        }
      ] as any)

      vi.mocked(mockCall.Call.findAll).mockResolvedValue([
        { 
          id: "call1", 
          phoneNumber: "123-456-7890",
          summary: "Test call",
          user: { id: "user-123", firstName: "John", lastName: "Doe" },
          createdAt: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000), // Day 2
          duration: 1800,
          callType: "OUTBOUND"
        }
      ] as any)

      vi.mocked(mockReminder.Reminder.findAll).mockResolvedValue([])
      vi.mocked(mockTask.Task.findAll).mockResolvedValue([])

      mockContext.query = { limit: 50, offset: 0 }

      await MedicalInstitutionController.getTimeline(mockContext as Context)

      expect(mockContext.body).toBeDefined()
      const body = mockContext.body as any
      
      expect(body).toHaveProperty("items")
      expect(body).toHaveProperty("pagination")
      expect(body.items).toHaveLength(3)

      // Verify items are sorted by creation date (most recent first)
      expect(body.items[0].type).toBe("note") // Day 3
      expect(body.items[1].type).toBe("call") // Day 2  
      expect(body.items[2].type).toBe("meeting") // Day 1

      // Verify timeline item structure
      const item = body.items[0]
      expect(item).toHaveProperty("id")
      expect(item).toHaveProperty("type")
      expect(item).toHaveProperty("title")
      expect(item).toHaveProperty("description")
      expect(item).toHaveProperty("user")
      expect(item).toHaveProperty("createdAt")
      expect(item).toHaveProperty("metadata")
    })

    it("should support pagination", async () => {
      mockContext.query = { limit: 2, offset: 1 }

      // Mock returning 3 items total
      const mockNote = await import("../../models/Note")
      const mockMeeting = await import("../../models/Meeting") 
      const mockCall = await import("../../models/Call")
      const mockReminder = await import("../../models/Reminder")
      const mockTask = await import("../../models/Task")

      vi.mocked(mockNote.Note.findAll).mockResolvedValue([
        { id: "note1", title: "Note", content: "Content", creator: {}, createdAt: new Date(), tags: [], isPrivate: false }
      ] as any)

      vi.mocked(mockMeeting.Meeting.findAll).mockResolvedValue([
        { id: "meeting1", title: "Meeting", organizer: {}, createdAt: new Date(), startDate: new Date(), endDate: new Date(), status: "SCHEDULED" }
      ] as any)

      vi.mocked(mockCall.Call.findAll).mockResolvedValue([
        { id: "call1", phoneNumber: "123", user: {}, createdAt: new Date(), summary: "Call", callType: "OUTBOUND" }
      ] as any)

      vi.mocked(mockReminder.Reminder.findAll).mockResolvedValue([])
      vi.mocked(mockTask.Task.findAll).mockResolvedValue([])

      await MedicalInstitutionController.getTimeline(mockContext as Context)

      const body = mockContext.body as any
      expect(body.items).toHaveLength(2) // Limited by pagination
      expect(body.pagination.total).toBe(3)
      expect(body.pagination.limit).toBe(2)
      expect(body.pagination.offset).toBe(1)
      expect(body.pagination.hasMore).toBe(false) // 1 + 2 = 3, no more items
    })
  })

  describe("unifiedSearch", () => {
    it("should require search query", async () => {
      mockContext.query = {}

      await expect(
        MedicalInstitutionController.unifiedSearch(mockContext as Context)
      ).rejects.toThrow("Search query is required")
    })

    it("should return search results across all types", async () => {
      mockContext.query = { q: "test" }
      mockContext.state = { 
        user: mockUser, 
        teamFilter: { userId: "user-123", role: "USER" } 
      }

      // Mock MedicalInstitution.findAll
      const { MedicalInstitution } = await import("../../models/MedicalInstitution")
      vi.mocked(MedicalInstitution.findAll).mockResolvedValue([
        {
          id: "inst1", 
          name: "Test Hospital",
          type: "HOSPITAL",
          getFullAddress: () => "123 Test St",
          assignedUser: { id: "user-123", firstName: "John" },
          createdAt: new Date()
        }
      ] as any)

      // Mock Task findAll
      const mockTask = await import("../../models/Task")
      vi.mocked(mockTask.Task.findAll).mockResolvedValue([
        {
          id: "task1",
          title: "Test Task",
          description: "Task description", 
          assignee: { id: "user-123", firstName: "John" },
          creator: { id: "user-123", firstName: "John" },
          institution: { id: "inst1", name: "Test Hospital" },
          status: "TODO",
          priority: "HIGH",
          dueDate: new Date(),
          createdAt: new Date()
        }
      ] as any)

      // Mock Note searchNotes
      const mockNote = await import("../../models/Note")
      vi.mocked(mockNote.Note.searchNotes).mockResolvedValue([
        {
          id: "note1",
          title: "Test Note",
          content: "Note content about testing",
          creator: { id: "user-123", firstName: "John" },
          institution: { id: "inst1", name: "Test Hospital" },
          tags: ["test"],
          isPrivate: false,
          createdAt: new Date()
        }
      ] as any)

      // Mock other models to return empty arrays
      const mockMeeting = await import("../../models/Meeting")
      const mockCall = await import("../../models/Call")  
      const mockReminder = await import("../../models/Reminder")

      vi.mocked(mockMeeting.Meeting.findAll).mockResolvedValue([])
      vi.mocked(mockCall.Call.findAll).mockResolvedValue([])
      vi.mocked(mockReminder.Reminder.findAll).mockResolvedValue([])

      await MedicalInstitutionController.unifiedSearch(mockContext as Context)

      expect(mockContext.body).toBeDefined()
      const body = mockContext.body as any

      expect(body).toHaveProperty("query", "test")
      expect(body).toHaveProperty("results")
      expect(body).toHaveProperty("totals")
      expect(body).toHaveProperty("totalResults")

      expect(body.results.institutions).toHaveLength(1)
      expect(body.results.tasks).toHaveLength(1)
      expect(body.results.notes).toHaveLength(1)
      expect(body.results.meetings).toHaveLength(0)
      expect(body.results.calls).toHaveLength(0)
      expect(body.results.reminders).toHaveLength(0)

      expect(body.totals.institutions).toBe(1)
      expect(body.totals.tasks).toBe(1)
      expect(body.totals.notes).toBe(1)
      expect(body.totalResults).toBe(3)

      // Verify result structure
      expect(body.results.institutions[0]).toHaveProperty("type", "institution")
      expect(body.results.tasks[0]).toHaveProperty("type", "task")
      expect(body.results.notes[0]).toHaveProperty("type", "note")
    })

    it("should filter by specific type", async () => {
      mockContext.query = { q: "test", type: "notes" }
      mockContext.state = { 
        user: mockUser, 
        teamFilter: { userId: "user-123", role: "USER" } 
      }

      // Mock Note searchNotes
      const mockNote = await import("../../models/Note")
      vi.mocked(mockNote.Note.searchNotes).mockResolvedValue([
        {
          id: "note1",
          title: "Test Note",
          content: "Note content",
          creator: { id: "user-123", firstName: "John" },
          institution: { id: "inst1", name: "Test Hospital" },
          tags: ["test"],
          isPrivate: false,
          createdAt: new Date()
        }
      ] as any)

      await MedicalInstitutionController.unifiedSearch(mockContext as Context)

      const body = mockContext.body as any

      // Should only return notes
      expect(body.results.notes).toHaveLength(1)
      expect(body.results.institutions).toHaveLength(0)
      expect(body.results.tasks).toHaveLength(0)
      expect(body.results.meetings).toHaveLength(0)
      expect(body.results.calls).toHaveLength(0)
      expect(body.results.reminders).toHaveLength(0)

      expect(body.totalResults).toBe(1)
    })
  })
})