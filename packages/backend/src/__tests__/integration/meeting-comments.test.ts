import request from "supertest"
import { vi } from "vitest"
import { createApp } from "../../app"
import { AuthService } from "../../services/AuthService"
import { User, UserRole } from "../../models/User"
import { Meeting } from "../../models/Meeting"
import { MeetingParticipant } from "../../models/MeetingParticipant"
import { Comment } from "../../models/Comment"

vi.mock("../../models/User")
vi.mock("../../models/Meeting")
vi.mock("../../models/MeetingParticipant")
vi.mock("../../models/Comment")
vi.mock("../../services/NotificationService", async () => {
  const actual = await vi.importActual<any>("../../services/NotificationService")
  return {
    ...actual,
    NotificationService: {
      getInstance: vi.fn(() => ({
        notifyUsers: vi.fn(),
      })),
    },
  }
})

describe("Meeting Comments API (Mocked)", () => {
  let app: any
  let mockUser: any
  let token: string
  let mockMeeting: any

  beforeAll(() => {
    app = createApp()
  })

  beforeEach(() => {
    mockUser = {
      id: "user-1",
      email: "user@example.com",
      firstName: "Test",
      lastName: "User",
      role: UserRole.USER,
      teamId: "team-1",
      getFullName: () => "Test User",
    }
    token = AuthService.generateAccessToken(mockUser.id)

    mockMeeting = {
      id: "m-1",
      title: "Kickoff",
      organizerId: "org-1",
      canUserAccess: vi.fn().mockResolvedValue(true),
    }

    vi.mocked(User.findByPk).mockResolvedValue(mockUser)
    vi.mocked(Meeting.findByPk).mockResolvedValue(mockMeeting as any)
  })

  afterEach(() => vi.clearAllMocks())

  it("requires auth", async () => {
    await request(app.callback()).get("/api/meetings/m-1/comments").expect(401)
  })

  describe("GET /api/meetings/:meetingId/comments", () => {
    it("lists comments for meeting", async () => {
      vi.mocked(Comment.findByMeeting).mockResolvedValueOnce([
        { id: "c-1", content: "hi", meetingId: "m-1", userId: mockUser.id },
      ] as any)
      const res = await request(app.callback())
        .get("/api/meetings/m-1/comments")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(Comment.findByMeeting).toHaveBeenCalledWith("m-1")
    })
  })

  describe("POST /api/meetings/:meetingId/comments", () => {
    it("creates a comment and notifies attendees", async () => {
      vi.mocked(Comment.createComment).mockResolvedValueOnce({
        id: "c-1",
        content: "hello",
        meetingId: "m-1",
        userId: mockUser.id,
      } as any)
      vi.mocked(MeetingParticipant.findByMeeting).mockResolvedValueOnce([
        { userId: "u2" },
        { userId: "u3" },
      ] as any)

      const res = await request(app.callback())
        .post("/api/meetings/m-1/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "hello" })
        .expect(201)
      expect(res.body.success).toBe(true)
      expect(Comment.createComment).toHaveBeenCalledWith("m-1", mockUser.id, "hello")
    })

    it("validates content", async () => {
      await request(app.callback())
        .post("/api/meetings/m-1/comments")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(400)
    })
  })

  describe("PUT /api/meetings/:meetingId/comments/:commentId", () => {
    it("updates comment when allowed", async () => {
      vi.mocked(Comment.findByPk).mockResolvedValueOnce({ id: "c-1", meetingId: "m-1" } as any)
      vi.mocked(Comment.updateComment).mockResolvedValueOnce({ id: "c-1", content: "edited" } as any)
      const res = await request(app.callback())
        .put("/api/meetings/m-1/comments/c-1")
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "edited" })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(Comment.updateComment).toHaveBeenCalled()
    })

    it("returns 403 when not allowed", async () => {
      vi.mocked(Comment.findByPk).mockResolvedValueOnce({ id: "c-1", meetingId: "m-1" } as any)
      vi.mocked(Comment.updateComment).mockRejectedValueOnce(
        new Error("User does not have permission to edit this comment")
      )
      const res = await request(app.callback())
        .put("/api/meetings/m-1/comments/c-1")
        .set("Authorization", `Bearer ${token}`)
        .send({ content: "edited" })
        .expect(403)
      expect(res.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })
  })

  describe("DELETE /api/meetings/:meetingId/comments/:commentId", () => {
    it("deletes comment when allowed", async () => {
      vi.mocked(Comment.findByPk).mockResolvedValueOnce({ id: "c-1", meetingId: "m-1" } as any)
      vi.mocked(Comment.deleteComment).mockResolvedValueOnce(undefined as any)
      await request(app.callback())
        .delete("/api/meetings/m-1/comments/c-1")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      expect(Comment.deleteComment).toHaveBeenCalledWith("c-1", mockUser.id)
    })
  })
})

