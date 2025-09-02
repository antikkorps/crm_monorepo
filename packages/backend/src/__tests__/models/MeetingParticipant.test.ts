import { ParticipantStatus } from "@medical-crm/shared"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { Meeting } from "../../models/Meeting"
import { MeetingParticipant } from "../../models/MeetingParticipant"
import { User, UserRole } from "../../models/User"

describe("MeetingParticipant Model - Isolated Test", () => {
  let testUser: User
  let testMeeting: Meeting

  beforeEach(async () => {
    try {
      // Clean up existing data first
      try {
        await MeetingParticipant.destroy({ where: {}, force: true })
        await Meeting.destroy({ where: {}, force: true })
        await User.destroy({ where: {}, force: true })
      } catch (cleanupError) {
        // Tables might not exist yet, that's ok
      }
      
      // Ensure tables exist
      await User.sync({ force: false })
      await Meeting.sync({ force: false })
      await MeetingParticipant.sync({ force: false })

      // Create test user
      testUser = await User.create({
      email: "test@example.com",
      passwordHash: "hashedpassword",
      firstName: "Test",
      lastName: "User",
      role: UserRole.USER,
      avatarSeed: "test-seed",
      isActive: true,
    })

    // Create test meeting
    const startDate = new Date("2025-12-01T10:00:00Z")
    const endDate = new Date("2025-12-01T11:00:00Z")

    testMeeting = await Meeting.create({
      title: "Test Meeting",
      startDate,
      endDate,
      organizerId: testUser.id,
    })
    } catch (error) {
      console.warn("Setup failed:", error.message)
    }
  })

  afterEach(async () => {
    try {
      await MeetingParticipant.destroy({ where: {}, force: true })
      await Meeting.destroy({ where: {}, force: true })
      await User.destroy({ where: {}, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  it("should create a meeting participant", async () => {
    const participant = await MeetingParticipant.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.INVITED,
    })

    expect(participant).toBeDefined()
    expect(participant.meetingId).toBe(testMeeting.id)
    expect(participant.userId).toBe(testUser.id)
    expect(participant.status).toBe(ParticipantStatus.INVITED)
  })

  it("should accept invitation", async () => {
    const participant = await MeetingParticipant.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.INVITED,
    })

    await participant.accept()

    expect(participant.status).toBe(ParticipantStatus.ACCEPTED)
    expect(participant.isAccepted()).toBe(true)
  })

  it("should prevent duplicate participants", async () => {
    await MeetingParticipant.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
    })

    await expect(
      MeetingParticipant.create({
        meetingId: testMeeting.id,
        userId: testUser.id,
      })
    ).rejects.toThrow()
  })
})
