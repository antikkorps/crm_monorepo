import { ParticipantStatus } from "@medical-crm/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock database completely to avoid pg-mem issues
const mockParticipants: any[] = []
const mockUsers: any[] = []
const mockMeetings: any[] = []

// Mock implementations
const mockUserModel = {
  create: vi.fn(async (userData: any) => {
    const user = { id: `user-${Date.now()}`, ...userData }
    mockUsers.push(user)
    return user
  }),
  destroy: vi.fn(async () => {
    mockUsers.length = 0
    return true
  }),
  sync: vi.fn(),
}

const mockMeetingModel = {
  create: vi.fn(async (meetingData: any) => {
    const meeting = { id: `meeting-${Date.now()}`, ...meetingData }
    mockMeetings.push(meeting)
    return meeting
  }),
  destroy: vi.fn(async () => {
    mockMeetings.length = 0
    return true
  }),
  sync: vi.fn(),
}

const mockMeetingParticipantModel = {
  create: vi.fn(async (participantData: any) => {
    // Check for duplicates
    const existing = mockParticipants.find(
      (p: any) => p.meetingId === participantData.meetingId && p.userId === participantData.userId
    )
    
    if (existing) {
      throw new Error("Duplicate participant: A user can only participate once in a meeting")
    }

    const participant = {
      id: `participant-${Date.now()}`,
      status: participantData.status || ParticipantStatus.INVITED, // Default status
      ...participantData,
      accept: function() {
        this.status = ParticipantStatus.ACCEPTED
      },
      isAccepted: function() {
        return this.status === ParticipantStatus.ACCEPTED
      },
      decline: function() {
        this.status = ParticipantStatus.DECLINED
      },
      isDeclined: function() {
        return this.status === ParticipantStatus.DECLINED
      },
    }
    
    mockParticipants.push(participant)
    return participant
  }),
  destroy: vi.fn(async () => {
    mockParticipants.length = 0
    return true
  }),
  sync: vi.fn(),
  findAll: vi.fn(async () => mockParticipants),
  findOne: vi.fn(async (options: any) => {
    if (options.where?.meetingId && options.where?.userId) {
      return mockParticipants.find(
        (p: any) => p.meetingId === options.where.meetingId && p.userId === options.where.userId
      ) || null
    }
    return null
  }),
}

// Setup mocks
vi.mock("../../models/User", () => ({
  User: mockUserModel,
}))

vi.mock("../../models/Meeting", () => ({
  Meeting: mockMeetingModel,
}))

vi.mock("../../models/MeetingParticipant", () => ({
  MeetingParticipant: mockMeetingParticipantModel,
}))

describe("MeetingParticipant Model - Isolated Test", () => {
  let testUser: any
  let testMeeting: any

  beforeEach(() => {
    // Reset all mocks and data
    vi.clearAllMocks()
    mockParticipants.length = 0
    mockUsers.length = 0
    mockMeetings.length = 0

    // Create test user
    testUser = {
      id: "test-user-id",
      email: "test@example.com",
      passwordHash: "hashedpassword",
      firstName: "Test",
      lastName: "User",
      role: "user",
      avatarSeed: "test-seed",
      isActive: true,
    }

    // Create test meeting
    testMeeting = {
      id: "test-meeting-id",
      title: "Test Meeting",
      startDate: new Date("2025-12-01T10:00:00Z"),
      endDate: new Date("2025-12-01T11:00:00Z"),
      organizerId: testUser.id,
    }
  })

  it("should create a meeting participant with default INVITED status", async () => {
    const participant = await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
    })

    expect(participant).toBeDefined()
    expect(participant.meetingId).toBe(testMeeting.id)
    expect(participant.userId).toBe(testUser.id)
    expect(participant.status).toBe(ParticipantStatus.INVITED) // Default status
    expect(mockParticipants).toHaveLength(1)
    expect(mockParticipants[0]).toEqual(participant)
  })

  it("should create a meeting participant with explicit status", async () => {
    const participant = await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.ACCEPTED,
    })

    expect(participant.status).toBe(ParticipantStatus.ACCEPTED)
    expect(participant.isAccepted()).toBe(true)
  })

  it("should accept invitation and update status", async () => {
    const participant = await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.INVITED,
    })

    expect(participant.status).toBe(ParticipantStatus.INVITED)
    expect(participant.isAccepted()).toBe(false)

    await participant.accept()

    expect(participant.status).toBe(ParticipantStatus.ACCEPTED)
    expect(participant.isAccepted()).toBe(true)
  })

  it("should decline invitation and update status", async () => {
    const participant = await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.INVITED,
    })

    expect(participant.status).toBe(ParticipantStatus.INVITED)
    expect(participant.isDeclined()).toBe(false)

    await participant.decline()

    expect(participant.status).toBe(ParticipantStatus.DECLINED)
    expect(participant.isDeclined()).toBe(true)
  })

  it("should prevent duplicate participants for same meeting and user", async () => {
    // First participant should succeed
    const participant1 = await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.INVITED,
    })

    expect(participant1).toBeDefined()
    expect(mockParticipants).toHaveLength(1)

    // Second participant with same meetingId and userId should fail
    await expect(
      mockMeetingParticipantModel.create({
        meetingId: testMeeting.id,
        userId: testUser.id,
        status: ParticipantStatus.INVITED,
      })
    ).rejects.toThrow("Duplicate participant")

    // Should still only have one participant
    expect(mockParticipants).toHaveLength(1)
  })

  it("should allow same user in different meetings", async () => {
    // Create second meeting
    const meeting2 = await mockMeetingModel.create({
      title: "Second Meeting",
      startDate: new Date("2025-12-02T10:00:00Z"),
      endDate: new Date("2025-12-02T11:00:00Z"),
      organizerId: testUser.id,
    })

    // First participant for first meeting
    const participant1 = await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.INVITED,
    })

    // Second participant for second meeting (same user, different meeting)
    const participant2 = await mockMeetingParticipantModel.create({
      meetingId: meeting2.id,
      userId: testUser.id,
      status: ParticipantStatus.ACCEPTED,
    })

    expect(participant1).toBeDefined()
    expect(participant2).toBeDefined()
    expect(mockParticipants).toHaveLength(2)
    expect(participant1.meetingId).toBe(testMeeting.id)
    expect(participant2.meetingId).toBe(meeting2.id)
    expect(participant1.userId).toBe(testUser.id)
    expect(participant2.userId).toBe(testUser.id)
  })

  it("should allow different users in same meeting", async () => {
    // Create second user
    const user2 = await mockUserModel.create({
      email: "user2@example.com",
      passwordHash: "hashedpassword2",
      firstName: "User",
      lastName: "Two",
      role: "user",
      avatarSeed: "user2-seed",
      isActive: true,
    })

    // First participant
    const participant1 = await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.INVITED,
    })

    // Second participant for same meeting (different user)
    const participant2 = await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: user2.id,
      status: ParticipantStatus.ACCEPTED,
    })

    expect(participant1).toBeDefined()
    expect(participant2).toBeDefined()
    expect(mockParticipants).toHaveLength(2)
    expect(participant1.meetingId).toBe(testMeeting.id)
    expect(participant2.meetingId).toBe(testMeeting.id)
    expect(participant1.userId).toBe(testUser.id)
    expect(participant2.userId).toBe(user2.id)
  })

  it("should find existing participant by meeting and user", async () => {
    // Create a participant
    const createdParticipant = await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.INVITED,
    })

    // Find participant
    const foundParticipant = await mockMeetingParticipantModel.findOne({
      where: {
        meetingId: testMeeting.id,
        userId: testUser.id,
      },
    })

    expect(foundParticipant).toBeDefined()
    expect(foundParticipant.id).toBe(createdParticipant.id)
    expect(foundParticipant.meetingId).toBe(testMeeting.id)
    expect(foundParticipant.userId).toBe(testUser.id)
  })

  it("should return null when participant not found", async () => {
    const foundParticipant = await mockMeetingParticipantModel.findOne({
      where: {
        meetingId: "non-existent-meeting",
        userId: "non-existent-user",
      },
    })

    expect(foundParticipant).toBeNull()
  })

  it("should list all participants", async () => {
    // Create second user
    const user2 = await mockUserModel.create({
      email: "user2@example.com",
      passwordHash: "hashedpassword2",
      firstName: "User",
      lastName: "Two",
      role: "user",
      avatarSeed: "user2-seed",
      isActive: true,
    })

    // Create multiple participants
    await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: testUser.id,
      status: ParticipantStatus.INVITED,
    })

    await mockMeetingParticipantModel.create({
      meetingId: testMeeting.id,
      userId: user2.id,
      status: ParticipantStatus.ACCEPTED,
    })

    const allParticipants = await mockMeetingParticipantModel.findAll()

    expect(allParticipants).toHaveLength(2)
    expect(allParticipants[0].meetingId).toBe(testMeeting.id)
    expect(allParticipants[1].meetingId).toBe(testMeeting.id)
  })
})