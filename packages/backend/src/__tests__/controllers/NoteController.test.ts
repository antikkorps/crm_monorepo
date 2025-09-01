import { vi } from "vitest"
import { NoteController } from "../../controllers/NoteController"
import { Note } from "../../models/Note"
import { NoteShare } from "../../models/NoteShare"
import { User, UserRole } from "../../models/User"

// Mock the models
vi.mock("../../models/Note")
vi.mock("../../models/NoteShare")
vi.mock("../../models/User")
vi.mock("../../models/MedicalInstitution")

describe("NoteController", () => {
  let mockCtx: any
  let mockUser: any
  let mockNote: any

  beforeEach(() => {
    // Create mock user
    mockUser = {
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: UserRole.USER,
      teamId: "team-123",
    }

    // Create mock note
    mockNote = {
      id: "note-123",
      title: "Test Note",
      content: "Test content",
      tags: ["test"],
      creatorId: mockUser.id,
      isPrivate: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      canUserAccess: vi.fn().mockResolvedValue(true),
      canUserEdit: vi.fn().mockResolvedValue(true),
      getShares: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(mockNote),
      destroy: vi.fn().mockResolvedValue(undefined),
      toJSON: vi.fn().mockReturnValue({
        id: "note-123",
        title: "Test Note",
        content: "Test content",
        tags: ["test"],
        creatorId: mockUser.id,
        isPrivate: false,
      }),
    }

    // Create mock context
    mockCtx = {
      state: { user: mockUser },
      params: {},
      query: {},
      request: { body: {} },
      body: {},
      status: 200,
    }

    // Setup default mocks
    vi.mocked(User.findByPk).mockResolvedValue(mockUser)
    vi.mocked(Note.findByPk).mockResolvedValue(mockNote)
    vi.mocked(Note.create).mockResolvedValue(mockNote)
    vi.mocked(Note.searchNotes).mockResolvedValue([mockNote])
    vi.mocked(NoteShare.destroy).mockResolvedValue(1)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("createNote", () => {
    it("should create a note successfully", async () => {
      mockCtx.request.body = {
        title: "Test Note",
        content: "Test content",
        tags: ["test"],
        isPrivate: false,
      }

      await NoteController.createNote(mockCtx)

      expect(mockCtx.status).toBe(201)
      expect(mockCtx.body.success).toBe(true)
      expect(mockCtx.body.data).toBeDefined()
      expect(Note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Note",
          content: "Test content",
          tags: ["test"],
          creatorId: mockUser.id,
          isPrivate: false,
        })
      )
    })

    it("should fail without required fields", async () => {
      mockCtx.request.body = {
        content: "Missing title",
      }

      await NoteController.createNote(mockCtx)

      expect(mockCtx.status).toBe(400)
      expect(mockCtx.body.success).toBe(false)
      expect(mockCtx.body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("getNotes", () => {
    it("should get notes with filters", async () => {
      mockCtx.query = {
        tags: "test",
        search: "content",
        page: "1",
        limit: "10",
      }

      await NoteController.getNotes(mockCtx)

      expect(mockCtx.status).toBe(200)
      expect(mockCtx.body.success).toBe(true)
      expect(mockCtx.body.data).toBeDefined()
      expect(mockCtx.body.meta).toBeDefined()
      expect(Note.searchNotes).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          tags: ["test"],
          search: "content",
        })
      )
    })
  })

  describe("getNote", () => {
    it("should get a specific note", async () => {
      mockCtx.params = { id: mockNote.id }

      await NoteController.getNote(mockCtx)

      expect(mockCtx.status).toBe(200)
      expect(mockCtx.body.success).toBe(true)
      expect(mockCtx.body.data).toBeDefined()
      expect(Note.findByPk).toHaveBeenCalledWith(mockNote.id, expect.any(Object))
      expect(mockNote.canUserAccess).toHaveBeenCalledWith(mockUser.id)
    })

    it("should return 404 for non-existent note", async () => {
      vi.mocked(Note.findByPk).mockResolvedValue(null)
      mockCtx.params = { id: "non-existent" }

      await NoteController.getNote(mockCtx)

      expect(mockCtx.status).toBe(404)
      expect(mockCtx.body.success).toBe(false)
      expect(mockCtx.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should deny access without permission", async () => {
      mockNote.canUserAccess.mockResolvedValue(false)
      mockCtx.params = { id: mockNote.id }

      await NoteController.getNote(mockCtx)

      expect(mockCtx.status).toBe(403)
      expect(mockCtx.body.success).toBe(false)
      expect(mockCtx.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })
  })

  describe("updateNote", () => {
    it("should update a note successfully", async () => {
      mockCtx.params = { id: mockNote.id }
      mockCtx.request.body = {
        title: "Updated Note",
        content: "Updated content",
        tags: ["updated"],
      }

      await NoteController.updateNote(mockCtx)

      expect(mockCtx.status).toBe(200)
      expect(mockCtx.body.success).toBe(true)
      expect(mockNote.canUserEdit).toHaveBeenCalledWith(mockUser.id)
      expect(mockNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Updated Note",
          content: "Updated content",
          tags: ["updated"],
        })
      )
    })

    it("should deny update without permission", async () => {
      mockNote.canUserEdit.mockResolvedValue(false)
      mockCtx.params = { id: mockNote.id }
      mockCtx.request.body = { title: "Should not update" }

      await NoteController.updateNote(mockCtx)

      expect(mockCtx.status).toBe(403)
      expect(mockCtx.body.success).toBe(false)
      expect(mockCtx.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })
  })

  describe("deleteNote", () => {
    it("should delete a note successfully", async () => {
      mockCtx.params = { id: mockNote.id }

      await NoteController.deleteNote(mockCtx)

      expect(mockCtx.status).toBe(200)
      expect(mockCtx.body.success).toBe(true)
      expect(mockCtx.body.message).toBe("Note deleted successfully")
      expect(NoteShare.destroy).toHaveBeenCalledWith({ where: { noteId: mockNote.id } })
      expect(mockNote.destroy).toHaveBeenCalled()
    })
  })
})
