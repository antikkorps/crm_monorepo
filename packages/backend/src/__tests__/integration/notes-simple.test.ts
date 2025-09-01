import { SharePermission } from "@medical-crm/shared"
import request from "supertest"
import { vi } from "vitest"
import { createApp } from "../../app"
import { Note } from "../../models/Note"
import { NoteShare } from "../../models/NoteShare"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"

// Mock the models
vi.mock("../../models/Note")
vi.mock("../../models/NoteShare")
vi.mock("../../models/User")
vi.mock("../../models/MedicalInstitution")

describe("Note API Integration Tests (Mocked)", () => {
  let app: any
  let mockUser: any
  let mockNote: any
  let userToken: string

  beforeAll(async () => {
    app = createApp()
  })

  beforeEach(async () => {
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
      toJSON: vi.fn().mockReturnValue({
        id: "note-123",
        title: "Test Note",
        content: "Test content",
        tags: ["test"],
        creatorId: mockUser.id,
        isPrivate: false,
      }),
    }

    // Generate token
    userToken = AuthService.generateAccessToken(mockUser.id)

    // Setup mocks
    vi.mocked(User.findByPk).mockResolvedValue(mockUser)
    vi.mocked(Note.findByPk).mockResolvedValue(mockNote)
    vi.mocked(Note.create).mockResolvedValue(mockNote)
    vi.mocked(Note.searchNotes).mockResolvedValue([mockNote])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /api/notes", () => {
    it("should create a note successfully", async () => {
      const noteData = {
        title: "Test Note",
        content: "This is a test note content",
        tags: ["test", "important"],
        isPrivate: false,
      }

      const response = await request(app.callback())
        .post("/api/notes")
        .set("Authorization", `Bearer ${userToken}`)
        .send(noteData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(Note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: noteData.title,
          content: noteData.content,
          tags: noteData.tags,
          creatorId: mockUser.id,
          isPrivate: noteData.isPrivate,
        })
      )
    })

    it("should fail to create note without required fields", async () => {
      const noteData = {
        content: "Missing title",
      }

      const response = await request(app.callback())
        .post("/api/notes")
        .set("Authorization", `Bearer ${userToken}`)
        .send(noteData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("should require authentication", async () => {
      const noteData = {
        title: "Test Note",
        content: "Test content",
      }

      await request(app.callback()).post("/api/notes").send(noteData).expect(401)
    })
  })

  describe("GET /api/notes", () => {
    it("should get notes successfully", async () => {
      const response = await request(app.callback())
        .get("/api/notes")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.meta).toBeDefined()
      expect(Note.searchNotes).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
        })
      )
    })

    it("should filter notes by tags", async () => {
      const response = await request(app.callback())
        .get("/api/notes?tags=test")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Note.searchNotes).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["test"],
          userId: mockUser.id,
        })
      )
    })

    it("should require authentication", async () => {
      await request(app.callback()).get("/api/notes").expect(401)
    })
  })

  describe("GET /api/notes/:id", () => {
    it("should get a specific note", async () => {
      const response = await request(app.callback())
        .get(`/api/notes/${mockNote.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(Note.findByPk).toHaveBeenCalledWith(mockNote.id, expect.any(Object))
      expect(mockNote.canUserAccess).toHaveBeenCalledWith(mockUser.id)
    })

    it("should return 404 for non-existent note", async () => {
      vi.mocked(Note.findByPk).mockResolvedValue(null)

      const response = await request(app.callback())
        .get("/api/notes/non-existent-id")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should deny access to private note without permission", async () => {
      mockNote.canUserAccess.mockResolvedValue(false)

      const response = await request(app.callback())
        .get(`/api/notes/${mockNote.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should require authentication", async () => {
      await request(app.callback()).get(`/api/notes/${mockNote.id}`).expect(401)
    })
  })

  describe("PUT /api/notes/:id", () => {
    beforeEach(() => {
      mockNote.update = vi.fn().mockResolvedValue(mockNote)
    })

    it("should update a note successfully", async () => {
      const updateData = {
        title: "Updated Note",
        content: "Updated content",
        tags: ["updated", "test"],
      }

      const response = await request(app.callback())
        .put(`/api/notes/${mockNote.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(mockNote.canUserEdit).toHaveBeenCalledWith(mockUser.id)
      expect(mockNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: updateData.title,
          content: updateData.content,
          tags: updateData.tags,
        })
      )
    })

    it("should deny update without permission", async () => {
      mockNote.canUserEdit.mockResolvedValue(false)

      const updateData = {
        title: "Should not update",
      }

      const response = await request(app.callback())
        .put(`/api/notes/${mockNote.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should return 404 for non-existent note", async () => {
      vi.mocked(Note.findByPk).mockResolvedValue(null)

      const response = await request(app.callback())
        .put("/api/notes/non-existent-id")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Updated" })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .put(`/api/notes/${mockNote.id}`)
        .send({ title: "Updated" })
        .expect(401)
    })
  })

  describe("DELETE /api/notes/:id", () => {
    beforeEach(() => {
      mockNote.destroy = vi.fn().mockResolvedValue(undefined)
      vi.mocked(NoteShare.destroy).mockResolvedValue(1)
    })

    it("should delete a note successfully", async () => {
      const response = await request(app.callback())
        .delete(`/api/notes/${mockNote.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe("Note deleted successfully")
      expect(NoteShare.destroy).toHaveBeenCalledWith({ where: { noteId: mockNote.id } })
      expect(mockNote.destroy).toHaveBeenCalled()
    })

    it("should return 404 for non-existent note", async () => {
      vi.mocked(Note.findByPk).mockResolvedValue(null)

      const response = await request(app.callback())
        .delete("/api/notes/non-existent-id")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback()).delete(`/api/notes/${mockNote.id}`).expect(401)
    })
  })

  describe("POST /api/notes/:id/share", () => {
    beforeEach(() => {
      vi.mocked(NoteShare.shareNoteWithUsers).mockResolvedValue([
        {
          id: "share-123",
          noteId: mockNote.id,
          userId: "other-user-123",
          permission: SharePermission.READ,
        } as any,
      ])
    })

    it("should share a note successfully", async () => {
      const shareData = {
        shares: [{ userId: "other-user-123", permission: SharePermission.READ }],
      }

      // Mock the other user exists
      vi.mocked(User.findByPk).mockImplementation((id) => {
        if (id === mockUser.id) return Promise.resolve(mockUser)
        if (id === "other-user-123")
          return Promise.resolve({
            id: "other-user-123",
            email: "other@example.com",
            teamId: mockUser.teamId,
          } as any)
        return Promise.resolve(null)
      })

      const response = await request(app.callback())
        .post(`/api/notes/${mockNote.id}/share`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(shareData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe("Note shared successfully")
      expect(NoteShare.shareNoteWithUsers).toHaveBeenCalledWith(
        mockNote.id,
        shareData.shares
      )
    })

    it("should fail with invalid share recipient", async () => {
      const shareData = {
        shares: [{ userId: "invalid-user-id", permission: SharePermission.READ }],
      }

      // Mock user not found
      vi.mocked(User.findByPk).mockImplementation((id) => {
        if (id === mockUser.id) return Promise.resolve(mockUser)
        return Promise.resolve(null)
      })

      const response = await request(app.callback())
        .post(`/api/notes/${mockNote.id}/share`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(shareData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INVALID_SHARE_RECIPIENT")
    })

    it("should fail with empty shares array", async () => {
      const shareData = { shares: [] }

      const response = await request(app.callback())
        .post(`/api/notes/${mockNote.id}/share`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(shareData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("should require authentication", async () => {
      const shareData = {
        shares: [{ userId: "other-user-123", permission: SharePermission.READ }],
      }

      await request(app.callback())
        .post(`/api/notes/${mockNote.id}/share`)
        .send(shareData)
        .expect(401)
    })
  })

  describe("GET /api/notes/shared-with-me", () => {
    it("should get notes shared with current user", async () => {
      const response = await request(app.callback())
        .get("/api/notes/shared-with-me")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.meta).toBeDefined()
      expect(Note.searchNotes).toHaveBeenCalledWith(
        expect.objectContaining({
          sharedWithUserId: mockUser.id,
        })
      )
    })

    it("should require authentication", async () => {
      await request(app.callback()).get("/api/notes/shared-with-me").expect(401)
    })
  })

  describe("GET /api/notes/by-tags", () => {
    it("should get notes by single tag", async () => {
      const response = await request(app.callback())
        .get("/api/notes/by-tags?tags=important")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(Note.searchNotes).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["important"],
          userId: mockUser.id,
        })
      )
    })

    it("should fail without tags parameter", async () => {
      const response = await request(app.callback())
        .get("/api/notes/by-tags")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("should require authentication", async () => {
      await request(app.callback()).get("/api/notes/by-tags?tags=important").expect(401)
    })
  })
})
