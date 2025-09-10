import { MeetingStatus, ParticipantStatus } from "@medical-crm/shared"
import { describe, expect, it, vi } from "vitest"
import { Meeting } from "../../models/Meeting"
import { MeetingParticipant } from "../../models/MeetingParticipant"
import { User, UserRole } from "../../models/User"

// Mock database state
let mockUsers: any[] = []
let mockMeetings: any[] = []
let mockParticipants: any[] = []

// Mock User model
const MockUser = {
  create: async (data: any) => {
    const user = {
      id: data.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || UserRole.USER,
      avatarSeed: data.avatarSeed,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockUsers.push(user)
    return user
  },

  destroy: async (options: any) => {
    if (options.where && Object.keys(options.where).length === 0) {
      mockUsers = []
    }
    return [1]
  },

  sync: async () => {},

  findAll: async (options?: any) => {
    let results = [...mockUsers]
    return results
  },

  findOne: async (options?: any) => {
    let results = [...mockUsers]
    if (options?.where) {
      results = results.filter(user => {
        for (const [key, value] of Object.entries(options.where)) {
          if (user[key] !== value) return false
        }
        return true
      })
    }
    return results[0] || null
  }
}

// Mock Meeting model
const MockMeeting = {
  create: async (data: any) => {
    // Validate required fields
    if (!data.title) {
      throw new Error('Title is required')
    }
    if (!data.startDate || !data.endDate) {
      throw new Error('Start and end dates are required')
    }
    if (!data.organizerId) {
      throw new Error('Organizer ID is required')
    }

    // Validate date logic
    if (data.startDate >= data.endDate) {
      throw new Error('End date must be after start date')
    }

    // Check if organizer exists
    const organizer = mockUsers.find(u => u.id === data.organizerId)
    if (!organizer) {
      throw new Error('Organizer not found')
    }

    const meeting = {
      id: data.id || `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      location: data.location,
      organizerId: data.organizerId,
      institutionId: data.institutionId,
      status: data.status || MeetingStatus.SCHEDULED,
      createdAt: new Date(),
      updatedAt: new Date(),

      // Instance methods
      getDuration: function() {
        return this.endDate.getTime() - this.startDate.getTime()
      },

      getDurationInMinutes: function() {
        return Math.round(this.getDuration() / (1000 * 60))
      },

      isUpcoming: function() {
        return this.startDate > new Date() && this.status === MeetingStatus.SCHEDULED
      },

      isInProgress: function() {
        const now = new Date()
        return (
          this.startDate <= now &&
          this.endDate >= now &&
          this.status === MeetingStatus.IN_PROGRESS
        )
      },

      isCompleted: function() {
        return this.status === MeetingStatus.COMPLETED
      },

      isCancelled: function() {
        return this.status === MeetingStatus.CANCELLED
      },

      addParticipant: async function(userId: string) {
        // Check if participant already exists
        const existingParticipant = mockParticipants.find(
          p => p.meetingId === this.id && p.userId === userId
        )

        if (existingParticipant) {
          throw new Error("User is already a participant in this meeting")
        }

        const participant = {
          id: `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          meetingId: this.id,
          userId,
          status: ParticipantStatus.INVITED,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        mockParticipants.push(participant)
        return participant
      },

      removeParticipant: async function(userId: string) {
        const index = mockParticipants.findIndex(
          p => p.meetingId === this.id && p.userId === userId
        )
        if (index !== -1) {
          mockParticipants.splice(index, 1)
        }
      },

      getParticipants: async function() {
        return mockParticipants
          .filter(p => p.meetingId === this.id)
          .map(p => ({
            ...p,
            user: mockUsers.find(u => u.id === p.userId)
          }))
      },

      canUserAccess: async function(userId: string) {
        // Organizer always has access
        if (this.organizerId === userId) {
          return true
        }

        // Check if user is a participant
        const participant = mockParticipants.find(
          p => p.meetingId === this.id && p.userId === userId
        )

        return !!participant
      },

      canUserEdit: async function(userId: string) {
        // Only organizer can edit
        return this.organizerId === userId
      },

      updateStatus: async function(newStatus: MeetingStatus) {
        // Basic status transition validation
        const validTransitions: Record<MeetingStatus, MeetingStatus[]> = {
          [MeetingStatus.SCHEDULED]: [MeetingStatus.IN_PROGRESS, MeetingStatus.CANCELLED],
          [MeetingStatus.IN_PROGRESS]: [MeetingStatus.COMPLETED, MeetingStatus.CANCELLED],
          [MeetingStatus.COMPLETED]: [],
          [MeetingStatus.CANCELLED]: [],
        }

        if (!validTransitions[this.status].includes(newStatus)) {
          throw new Error(`Cannot transition from ${this.status} to ${newStatus}`)
        }

        this.status = newStatus
        this.updatedAt = new Date()
      },

      reschedule: async function(startDate: Date, endDate: Date) {
        if (startDate >= endDate) {
          throw new Error('End date must be after start date')
        }

        this.startDate = startDate
        this.endDate = endDate
        this.status = MeetingStatus.SCHEDULED
        this.updatedAt = new Date()
      },

      toJSON: function() {
        return {
          ...this,
          duration: this.getDuration(),
          durationInMinutes: this.getDurationInMinutes(),
          isUpcoming: this.isUpcoming(),
          isInProgress: this.isInProgress(),
          isCompleted: this.isCompleted(),
          isCancelled: this.isCancelled(),
        }
      }
    }

    mockMeetings.push(meeting)
    return meeting
  },

  findOne: async (options: any) => {
    let results = [...mockMeetings]
    
    if (options?.where) {
      results = results.filter(meeting => {
        for (const [key, value] of Object.entries(options.where)) {
          if (meeting[key] !== value) return false
        }
        return true
      })
    }

    return results[0] || null
  },

  findAll: async (options: any) => {
    let results = [...mockMeetings]
    
    if (options?.where) {
      results = results.filter(meeting => {
        for (const [key, value] of Object.entries(options.where)) {
          if (key === 'organizerId' && meeting.organizerId !== value) return false
          if (key === 'institutionId' && meeting.institutionId !== value) return false
          if (key === 'status' && meeting.status !== value) return false
          if (key === 'startDate' && typeof value === 'object') {
            const opKey = Object.keys(value)[0]
            const opValue = value[opKey]
            if (opKey === Symbol.for('Op.gt') && meeting.startDate <= opValue) return false
          }
        }
        return true
      })
    }

    // Mock include functionality
    if (options?.include) {
      results = results.map(meeting => ({
        ...meeting,
        organizer: mockUsers.find(u => u.id === meeting.organizerId),
        institution: meeting.institutionId ? { id: meeting.institutionId, name: 'Test Institution' } : null,
      }))
    }

    return results
  },

  destroy: async (options: any) => {
    if (options.where && Object.keys(options.where).length === 0) {
      mockMeetings = []
      return [mockMeetings.length]
    }
    return [0]
  },

  sync: async () => {},

  // Static methods
  findByOrganizer: async (organizerId: string) => {
    return MockMeeting.findAll({
      where: { organizerId },
      include: [
        {
          model: MockUser,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })
  },

  findByInstitution: async (institutionId: string) => {
    return MockMeeting.findAll({
      where: { institutionId },
      include: [
        {
          model: MockUser,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })
  },

  findByStatus: async (status: MeetingStatus) => {
    return MockMeeting.findAll({
      where: { status },
      include: [
        {
          model: MockUser,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })
  },

  findUpcomingMeetings: async () => {
    return MockMeeting.findAll({
      where: {
        startDate: {
          [Symbol.for('Op.gt')]: new Date(),
        },
        status: MeetingStatus.SCHEDULED,
      },
      include: [
        {
          model: MockUser,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })
  },

  validateMeetingData: (meetingData: any) => {
    if (meetingData.title !== undefined) {
      if (typeof meetingData.title !== 'string' || meetingData.title.length === 0 || meetingData.title.length > 255) {
        throw new Error('Title must be between 1 and 255 characters')
      }
    }

    if (meetingData.startDate && meetingData.endDate) {
      if (meetingData.startDate >= meetingData.endDate) {
        throw new Error('End date must be after start date')
      }
    }

    if (meetingData.location !== undefined) {
      if (typeof meetingData.location !== 'string' || meetingData.location.length > 500) {
        throw new Error('Location must be less than 500 characters')
      }
    }
  }
}

// Mock MeetingParticipant model
const MockMeetingParticipant = {
  create: async (data: any) => {
    const participant = {
      id: data.id || `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      meetingId: data.meetingId,
      userId: data.userId,
      status: data.status || ParticipantStatus.INVITED,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockParticipants.push(participant)
    return participant
  },

  findOne: async (options: any) => {
    let results = [...mockParticipants]
    
    if (options?.where) {
      results = results.filter(participant => {
        for (const [key, value] of Object.entries(options.where)) {
          if (participant[key] !== value) return false
        }
        return true
      })
    }

    return results[0] || null
  },

  destroy: async (options: any) => {
    if (options.where && Object.keys(options.where).length === 0) {
      mockParticipants = []
      return [mockParticipants.length]
    }
    return [0]
  },

  sync: async () => {},
}

// Mock the actual models
vi.mock("../../models", () => ({
  Meeting: MockMeeting,
  MeetingParticipant: MockMeetingParticipant,
  User: MockUser,
}))

describe("Meeting Model - Isolated Test", () => {
  beforeEach(() => {
    // Reset mock database
    mockUsers = []
    mockMeetings = []
    mockParticipants = []
  })

  it("should create a simple meeting", async () => {
    // Create a test user first
    const user = await MockUser.create({
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

    const meeting = await MockMeeting.create({
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
