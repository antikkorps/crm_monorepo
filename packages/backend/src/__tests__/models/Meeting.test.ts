import { MeetingStatus } from "@medical-crm/shared"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { Meeting } from "../../models/Meeting"
import { MeetingParticipant } from "../../models/MeetingParticipant"
import { User, UserRole } from "../../models/User"

describe("Meeting Model - Isolated Test", () => {
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

  it("should create a simple meeting", async () => {
    // Create a test user first
    const user = await User.create({
      email: "test@example.com",
      passwordHash: "hashedpassword",
      firstName: "Test",
      lastName: "User",
      role: UserRole.USER,
      avatarSeed: "test-seed",
      isActive: true,
    })

    const startDate = new Date("2025-12-01T10:00:00Z")
    const endDate = new Date("2025-12-01T11:00:00Z")

    const meeting = await Meeting.create({
      title: "Test Meeting",
      startDate,
      endDate,
      organizerId: user.id,
    })

    expect(meeting).toBeDefined()
    expect(meeting.title).toBe("Test Meeting")
    expect(meeting.organizerId).toBe(user.id)
    expect(meeting.status).toBe(MeetingStatus.SCHEDULED)
  })
})
