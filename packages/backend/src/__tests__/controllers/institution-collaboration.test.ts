import { describe, expect, it, vi, beforeEach } from "vitest"
import { Context } from "../../types/koa"

// Mock all dependencies before importing the controller
vi.mock("../../models/Note", () => ({
  Note: {
    findByInstitution: vi.fn(),
    searchNotes: vi.fn(),
    findAll: vi.fn()
  }
}))

vi.mock("../../models/Meeting", () => ({
  Meeting: {
    findAll: vi.fn()
  }
}))

vi.mock("../../models/Call", () => ({
  Call: {
    findAll: vi.fn()
  }
}))

vi.mock("../../models/Reminder", () => ({
  Reminder: {
    findAll: vi.fn()
  }
}))

vi.mock("../../models/Task", () => ({
  Task: {
    findAll: vi.fn()
  }
}))

vi.mock("../../models/MedicalInstitution", () => ({
  MedicalInstitution: {
    findAll: vi.fn()
  }
}))

vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

vi.mock("../../middleware/errorHandler", () => ({
  createError: vi.fn((message, status, code) => {
    const error = new Error(message) as any
    error.status = status
    error.code = code
    return error
  })
}))

describe("Institution Collaboration Controller Unit Tests", () => {
  let mockContext: Partial<Context>

  beforeEach(() => {
    vi.clearAllMocks()
    mockContext = {
      params: { id: "institution-123" },
      query: {},
      state: { 
        user: { 
          id: "user-123", 
          role: "USER", 
          teamId: "team-123" 
        },
        teamFilter: {
          userId: "user-123",
          role: "USER",
          teamId: "team-123"
        }
      },
      body: undefined,
    }
  })

  describe("Collaboration Data Endpoint Logic", () => {
    it("should structure collaboration statistics correctly", async () => {
      // Import the controller after mocks are set up
      const { MedicalInstitutionController } = await import("../../controllers/MedicalInstitutionController")
      const { Note } = await import("../../models/Note")
      const { Meeting } = await import("../../models/Meeting")
      const { Call } = await import("../../models/Call")
      const { Reminder } = await import("../../models/Reminder")
      const { Task } = await import("../../models/Task")

      // Mock data
      const mockNotes = [
        { id: "note1", title: "Test Note", content: "Content", tags: [] },
        { id: "note2", title: "Test Note 2", content: "Content 2", tags: [] }
      ]

      const mockMeetings = [
        { 
          id: "meeting1", 
          title: "Future Meeting", 
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        },
        { 
          id: "meeting2", 
          title: "Past Meeting", 
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        }
      ]

      const mockCalls = [
        { id: "call1", phoneNumber: "123-456-7890", summary: "Test call" }
      ]

      const mockReminders = [
        { 
          id: "reminder1", 
          title: "Active Reminder", 
          reminderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isCompleted: false
        },
        { 
          id: "reminder2", 
          title: "Completed Reminder", 
          reminderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          isCompleted: true
        }
      ]

      const mockTasks = [
        { id: "task1", title: "Open Task", status: "TODO" },
        { id: "task2", title: "Completed Task", status: "COMPLETED" }
      ]

      // Setup mocks
      vi.mocked(Note.findByInstitution).mockResolvedValue(mockNotes as any)
      vi.mocked(Meeting.findAll).mockResolvedValue(mockMeetings as any)
      vi.mocked(Call.findAll).mockResolvedValue(mockCalls as any)
      vi.mocked(Reminder.findAll).mockResolvedValue(mockReminders as any)
      vi.mocked(Task.findAll).mockResolvedValue(mockTasks as any)

      // Execute
      await MedicalInstitutionController.getCollaborationData(mockContext as Context)

      // Verify
      expect(mockContext.body).toBeDefined()
      const body = mockContext.body as any

      expect(body.stats).toEqual({
        totalNotes: 2,
        totalMeetings: 2,
        totalCalls: 1,
        totalReminders: 2,
        totalTasks: 2,
        upcomingMeetings: 1, // Only future meeting
        pendingReminders: 1, // Only incomplete reminder in future
        openTasks: 1 // Only non-completed task
      })

      expect(body.recentNotes).toHaveLength(2)
      expect(body.upcomingMeetings).toHaveLength(1)
      expect(body.recentCalls).toHaveLength(1)
      expect(body.pendingReminders).toHaveLength(1)
      expect(body.openTasks).toHaveLength(1)
    })
  })

  describe("Timeline Endpoint Logic", () => {
    it("should combine and sort timeline items correctly", async () => {
      const { MedicalInstitutionController } = await import("../../controllers/MedicalInstitutionController")
      const { Note } = await import("../../models/Note")
      const { Meeting } = await import("../../models/Meeting")
      const { Call } = await import("../../models/Call")
      const { Reminder } = await import("../../models/Reminder")
      const { Task } = await import("../../models/Task")

      mockContext.query = { limit: "10", offset: "0" }

      const baseDate = new Date("2024-01-01T00:00:00Z")
      
      // Mock data with different creation dates
      const mockNotes = [
        { 
          id: "note1", 
          title: "Note 1", 
          content: "Content for timeline test",
          creator: { id: "user1", firstName: "John", lastName: "Doe", email: "john@test.com" },
          createdAt: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000), // Day 3
          tags: ["urgent"],
          isPrivate: false
        }
      ]

      const mockMeetings = [
        { 
          id: "meeting1", 
          title: "Important Meeting",
          description: "Meeting description",
          organizer: { id: "user1", firstName: "Jane", lastName: "Smith", email: "jane@test.com" },
          createdAt: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000), // Day 1
          startDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
          location: "Conference Room",
          status: "SCHEDULED"
        }
      ]

      const mockCalls = [
        { 
          id: "call1", 
          phoneNumber: "555-0123",
          summary: "Follow-up call",
          user: { id: "user1", firstName: "Bob", lastName: "Johnson", email: "bob@test.com" },
          createdAt: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000), // Day 2
          duration: 1800,
          callType: "OUTBOUND"
        }
      ]

      // Setup mocks
      vi.mocked(Note.findAll).mockResolvedValue(mockNotes as any)
      vi.mocked(Meeting.findAll).mockResolvedValue(mockMeetings as any)
      vi.mocked(Call.findAll).mockResolvedValue(mockCalls as any)
      vi.mocked(Reminder.findAll).mockResolvedValue([] as any)
      vi.mocked(Task.findAll).mockResolvedValue([] as any)

      // Execute
      await MedicalInstitutionController.getTimeline(mockContext as Context)

      // Verify
      expect(mockContext.body).toBeDefined()
      const body = mockContext.body as any

      expect(body.items).toHaveLength(3)
      
      // Verify sorting (most recent first)
      expect(body.items[0].type).toBe("note") // Day 3 (most recent)
      expect(body.items[1].type).toBe("call") // Day 2
      expect(body.items[2].type).toBe("meeting") // Day 1 (oldest)

      // Verify timeline item structure
      const noteItem = body.items[0]
      expect(noteItem).toEqual({
        id: "note1",
        type: "note",
        title: "Note 1",
        description: "Content for timeline test",
        user: mockNotes[0].creator,
        createdAt: mockNotes[0].createdAt,
        metadata: {
          tags: ["urgent"],
          isPrivate: false
        }
      })

      const callItem = body.items[1]
      expect(callItem).toEqual({
        id: "call1",
        type: "call",
        title: "Call to 555-0123",
        description: "Follow-up call",
        user: mockCalls[0].user,
        createdAt: mockCalls[0].createdAt,
        metadata: {
          phoneNumber: "555-0123",
          duration: 1800,
          callType: "OUTBOUND"
        }
      })

      // Verify pagination structure
      expect(body.pagination).toEqual({
        total: 3,
        limit: 10,
        offset: 0,
        hasMore: false
      })
    })

    it("should handle pagination correctly", async () => {
      const { MedicalInstitutionController } = await import("../../controllers/MedicalInstitutionController")

      mockContext.query = { limit: "2", offset: "1" }

      // Mock returning multiple items
      const mockItems = Array.from({ length: 5 }, (_, i) => ({
        id: `item${i}`,
        title: `Item ${i}`,
        content: "Content",
        creator: { id: "user1" },
        createdAt: new Date(Date.now() - i * 60000), // Different times
        tags: [],
        isPrivate: false
      }))

      const { Note } = await import("../../models/Note")
      const { Meeting } = await import("../../models/Meeting")
      const { Call } = await import("../../models/Call")
      const { Reminder } = await import("../../models/Reminder")
      const { Task } = await import("../../models/Task")

      vi.mocked(Note.findAll).mockResolvedValue(mockItems.slice(0, 3) as any)
      vi.mocked(Meeting.findAll).mockResolvedValue(mockItems.slice(3, 5) as any)
      vi.mocked(Call.findAll).mockResolvedValue([] as any)
      vi.mocked(Reminder.findAll).mockResolvedValue([] as any)
      vi.mocked(Task.findAll).mockResolvedValue([] as any)

      await MedicalInstitutionController.getTimeline(mockContext as Context)

      const body = mockContext.body as any

      // Should return 2 items (limit) starting from offset 1
      expect(body.items).toHaveLength(2)
      expect(body.pagination.total).toBe(5)
      expect(body.pagination.limit).toBe(2)
      expect(body.pagination.offset).toBe(1)
      expect(body.pagination.hasMore).toBe(true) // 1 + 2 < 5
    })
  })

  describe("Unified Search Logic", () => {
    it("should require search query", async () => {
      const { MedicalInstitutionController } = await import("../../controllers/MedicalInstitutionController")
      
      mockContext.query = {} // No query parameter

      await expect(
        MedicalInstitutionController.unifiedSearch(mockContext as Context)
      ).rejects.toThrow("Search query is required")
    })

    it("should structure search results correctly", async () => {
      const { MedicalInstitutionController } = await import("../../controllers/MedicalInstitutionController")
      const { MedicalInstitution } = await import("../../models/MedicalInstitution")
      const { Task } = await import("../../models/Task")
      const { Note } = await import("../../models/Note")
      const { Meeting } = await import("../../models/Meeting")
      const { Call } = await import("../../models/Call")
      const { Reminder } = await import("../../models/Reminder")

      mockContext.query = { q: "test", limit: "10", offset: "0" }

      // Mock search results
      const mockInstitutions = [
        {
          id: "inst1",
          name: "Test Hospital",
          type: "HOSPITAL",
          getFullAddress: () => "123 Test St, Test City, ST 12345, USA",
          assignedUser: { id: "user1", firstName: "John", lastName: "Doe", email: "john@test.com" },
          createdAt: new Date()
        }
      ]

      const mockTasks = [
        {
          id: "task1",
          title: "Test Task",
          description: "Task for testing search",
          assignee: { id: "user1", firstName: "Alice", lastName: "Brown", email: "alice@test.com" },
          creator: { id: "user2", firstName: "Bob", lastName: "Smith", email: "bob@test.com" },
          institution: { id: "inst1", name: "Test Hospital" },
          status: "IN_PROGRESS",
          priority: "HIGH",
          dueDate: new Date(),
          createdAt: new Date()
        }
      ]

      const mockNotes = [
        {
          id: "note1",
          title: "Test Note",
          content: "This note contains test information and is quite detailed for comprehensive testing purposes",
          creator: { id: "user1", firstName: "John", lastName: "Doe", email: "john@test.com" },
          institution: { id: "inst1", name: "Test Hospital" },
          tags: ["important", "test"],
          isPrivate: false,
          createdAt: new Date()
        }
      ]

      // Setup mocks
      vi.mocked(MedicalInstitution.findAll).mockResolvedValue(mockInstitutions as any)
      vi.mocked(Task.findAll).mockResolvedValue(mockTasks as any)
      vi.mocked(Note.searchNotes).mockResolvedValue(mockNotes as any)
      vi.mocked(Meeting.findAll).mockResolvedValue([] as any)
      vi.mocked(Call.findAll).mockResolvedValue([] as any)
      vi.mocked(Reminder.findAll).mockResolvedValue([] as any)

      // Execute
      await MedicalInstitutionController.unifiedSearch(mockContext as Context)

      // Verify
      expect(mockContext.body).toBeDefined()
      const body = mockContext.body as any

      expect(body.query).toBe("test")
      expect(body.totalResults).toBe(3)

      // Verify institution results
      expect(body.results.institutions).toHaveLength(1)
      expect(body.results.institutions[0]).toEqual({
        id: "inst1",
        type: "institution",
        title: "Test Hospital",
        subtitle: "HOSPITAL - 123 Test St, Test City, ST 12345, USA",
        assignedUser: mockInstitutions[0].assignedUser,
        createdAt: mockInstitutions[0].createdAt
      })

      // Verify task results
      expect(body.results.tasks).toHaveLength(1)
      expect(body.results.tasks[0]).toEqual({
        id: "task1",
        type: "task",
        title: "Test Task",
        subtitle: "Task for testing search",
        assignee: mockTasks[0].assignee,
        creator: mockTasks[0].creator,
        institution: mockTasks[0].institution,
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: mockTasks[0].dueDate,
        createdAt: mockTasks[0].createdAt
      })

      // Verify note results
      expect(body.results.notes).toHaveLength(1)
      expect(body.results.notes[0]).toEqual({
        id: "note1",
        type: "note",
        title: "Test Note",
        subtitle: "This note contains test information and is quite detailed for comprehensive testing purpos...",
        creator: mockNotes[0].creator,
        institution: mockNotes[0].institution,
        tags: ["important", "test"],
        isPrivate: false,
        createdAt: mockNotes[0].createdAt
      })

      // Verify totals
      expect(body.totals).toEqual({
        institutions: 1,
        tasks: 1,
        notes: 1,
        meetings: 0,
        calls: 0,
        reminders: 0
      })
    })

    it("should filter by specific type", async () => {
      const { MedicalInstitutionController } = await import("../../controllers/MedicalInstitutionController")
      const { Note } = await import("../../models/Note")

      mockContext.query = { q: "test", type: "notes" }

      // Mock only notes
      vi.mocked(Note.searchNotes).mockResolvedValue([
        {
          id: "note1",
          title: "Test Note",
          content: "Content",
          creator: {},
          institution: {},
          tags: [],
          isPrivate: false,
          createdAt: new Date()
        }
      ] as any)

      await MedicalInstitutionController.unifiedSearch(mockContext as Context)

      const body = mockContext.body as any

      // Should only return notes, other arrays should be empty
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