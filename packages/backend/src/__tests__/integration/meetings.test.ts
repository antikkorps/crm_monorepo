import { MeetingStatus, ParticipantStatus } from "@medical-crm/shared"
import request from "supertest"
import { vi } from "vitest"
import { createApp } from "../../app"
import { Meeting } from "../../models/Meeting"
import { MeetingParticipant } from "../../models/MeetingParticipant"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"

vi.mock("../../models/Meeting")
vi.mock("../../models/MeetingParticipant")
vi.mock("../../models/User")
vi.mock("../../models/MedicalInstitution")

describe("Meetings API (Mocked)", () => {
  let app: any
  let mockUser: any
  let mockMeeting: any
  let userToken: string

  beforeAll(async () => {
    app = createApp()
  })

  beforeEach(() => {
    mockUser = {
      id: "user-1",
      email: "u@example.com",
      firstName: "U",
      lastName: "Ser",
      role: UserRole.USER,
      teamId: "team-1",
    }

    mockMeeting = {
      id: "meeting-1",
      title: "Kickoff",
      description: "Discuss scope",
      startDate: new Date(),
      endDate: new Date(Date.now() + 3600000),
      location: "Room A",
      organizerId: mockUser.id,
      status: MeetingStatus.SCHEDULED,
      canUserAccess: vi.fn().mockResolvedValue(true),
      canUserEdit: vi.fn().mockResolvedValue(true),
      addParticipant: vi.fn(),
      removeParticipant: vi.fn(),
      getParticipants: vi.fn().mockResolvedValue([]),
    }

    userToken = AuthService.generateAccessToken(mockUser.id)

    vi.mocked(User.findByPk).mockResolvedValue(mockUser)
    vi.mocked(Meeting.findByPk).mockResolvedValue(mockMeeting as any)
    vi.mocked(Meeting.create).mockResolvedValue(mockMeeting as any)
    vi.mocked(Meeting.searchMeetings).mockResolvedValue([mockMeeting as any])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /api/meetings", () => {
    it("creates a meeting", async () => {
      const body = {
        title: "Kickoff",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3600000).toISOString(),
        location: "Room A",
      }

      const res = await request(app.callback())
        .post("/api/meetings")
        .set("Authorization", `Bearer ${userToken}`)
        .send(body)
        .expect(201)

      expect(res.body.success).toBe(true)
      expect(Meeting.create).toHaveBeenCalled()
    })

    it("validates required fields", async () => {
      const res = await request(app.callback())
        .post("/api/meetings")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Missing dates" })
        .expect(400)

      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("requires authentication", async () => {
      await request(app.callback()).post("/api/meetings").send({}).expect(401)
    })
  })

  describe("GET /api/meetings", () => {
    it("lists meetings with filters", async () => {
      const res = await request(app.callback())
        .get("/api/meetings?status=scheduled")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(Meeting.searchMeetings).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mockUser.id, status: "scheduled" })
      )
    })

    it("requires authentication", async () => {
      await request(app.callback()).get("/api/meetings").expect(401)
    })
  })

  describe("GET /api/meetings/:id", () => {
    it("returns meeting if accessible", async () => {
      const res = await request(app.callback())
        .get(`/api/meetings/${mockMeeting.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(res.body.success).toBe(true)
      expect(Meeting.findByPk).toHaveBeenCalled()
    })

    it("404 when not found", async () => {
      vi.mocked(Meeting.findByPk).mockResolvedValueOnce(null as any)
      const res = await request(app.callback())
        .get(`/api/meetings/does-not-exist`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404)
      expect(res.body.error.code).toBe("MEETING_NOT_FOUND")
    })

    it("403 when no access", async () => {
      mockMeeting.canUserAccess.mockResolvedValueOnce(false)
      const res = await request(app.callback())
        .get(`/api/meetings/${mockMeeting.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403)
      expect(res.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })
  })

  describe("PUT /api/meetings/:id", () => {
    it("updates meeting when organizer", async () => {
      const res = await request(app.callback())
        .put(`/api/meetings/${mockMeeting.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "New title" })
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it("denies update when not organizer", async () => {
      mockMeeting.canUserEdit.mockResolvedValueOnce(false)
      const res = await request(app.callback())
        .put(`/api/meetings/${mockMeeting.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "New title" })
        .expect(403)
      expect(res.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })
  })

  describe("DELETE /api/meetings/:id", () => {
    it("deletes meeting when organizer", async () => {
      const res = await request(app.callback())
        .delete(`/api/meetings/${mockMeeting.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it("404 when deleting non-existent", async () => {
      vi.mocked(Meeting.findByPk).mockResolvedValueOnce(null as any)
      const res = await request(app.callback())
        .delete(`/api/meetings/none`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(404)
      expect(res.body.error.code).toBe("MEETING_NOT_FOUND")
    })
  })

  describe("Participants", () => {
    beforeEach(() => {
      vi.mocked(MeetingParticipant.bulkInviteUsers).mockResolvedValue([] as any)
      ;(mockMeeting.addParticipant as any) = vi.fn().mockResolvedValue({
        id: "mp-1",
        meetingId: mockMeeting.id,
        userId: "user-2",
        status: ParticipantStatus.INVITED,
      })
      vi.mocked(MeetingParticipant.findByMeetingAndUser).mockResolvedValue({
        id: "mp-1",
        meetingId: mockMeeting.id,
        userId: "user-2",
        status: ParticipantStatus.INVITED,
        updateStatus: vi.fn().mockResolvedValue(undefined),
      } as any)
    })

    it("invites participants (single)", async () => {
      const res = await request(app.callback())
        .post(`/api/meetings/${mockMeeting.id}/participants`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ userId: "user-2" })
        .expect(201)
      expect(res.body.success).toBe(true)
      expect(mockMeeting.addParticipant).toHaveBeenCalledWith("user-2")
    })

    it("lists participants", async () => {
      (mockMeeting.getParticipants as any).mockResolvedValueOnce([
        { id: "mp-1", userId: "user-2", status: ParticipantStatus.INVITED },
      ])
      const res = await request(app.callback())
        .get(`/api/meetings/${mockMeeting.id}/participants`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)
      expect(res.body.success).toBe(true)
    })

    it("updates participant status", async () => {
      const res = await request(app.callback())
        .put(`/api/meetings/${mockMeeting.id}/participants/user-2`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ status: ParticipantStatus.ACCEPTED })
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(MeetingParticipant.findByMeetingAndUser).toHaveBeenCalledWith(
        mockMeeting.id,
        "user-2"
      )
    })

    it("removes participant", async () => {
      const res = await request(app.callback())
        .delete(`/api/meetings/${mockMeeting.id}/participants/${mockUser.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)
      expect(res.body.success).toBe(true)
      expect(mockMeeting.removeParticipant).toHaveBeenCalledWith(mockUser.id)
    })
  })
})

