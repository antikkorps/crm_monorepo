import { Sequelize } from "sequelize"
import { beforeEach, afterEach } from "vitest"
import { InstitutionType, QuoteStatus, InvoiceStatus, MeetingStatus } from "@medical-crm/shared"

/**
 * Database mock utilities for testing
 * Provides transaction-based rollback for each test
 */

let transaction: any = null

/**
 * Start a transaction before each test
 */
export const setupDbMock = () => {
  beforeEach(async () => {
    const { sequelize } = await import("../../config/database")
    transaction = await sequelize.transaction()
  })

  afterEach(async () => {
    if (transaction) {
      await transaction.rollback()
      transaction = null
    }
  })
}

/**
 * Get the current transaction for use in tests
 */
export const getTransaction = () => transaction

/**
 * Clean all tables in the test database
 */
export const cleanDatabase = async (sequelize: Sequelize) => {
  const models = Object.values(sequelize.models)

  for (const model of models) {
    await model.destroy({ where: {}, truncate: true, cascade: true })
  }
}

/**
 * Create mock data helpers
 */
export const createMockUser = async (overrides = {}) => {
  const { User } = await import("../../models")
  const { UserRole } = await import("../../models/User")
  return User.create({
    email: `test-${Date.now()}@example.com`,
    passwordHash: "hashedPassword123",
    firstName: "Test",
    lastName: "User",
    role: UserRole.USER,
    avatarSeed: `seed-${Date.now()}`,
    avatarStyle: "adventurer",
    isActive: true,
    ...overrides,
  })
}

export const createMockTeam = async (overrides = {}) => {
  const { Team } = await import("../../models")
  return Team.create({
    name: `Test Team ${Date.now()}`,
    description: "Test team description",
    isActive: true,
    ...overrides,
  })
}

export const createMockMedicalInstitution = async (overrides = {}) => {
  const { MedicalInstitution } = await import("../../models")
  return MedicalInstitution.create({
    name: `Test Institution ${Date.now()}`,
    type: InstitutionType.HOSPITAL,
    address: {
      street: "123 Test St",
      city: "Test City",
      state: "Test State",
      zipCode: "12345",
      country: "France",
    },
    tags: [],
    isActive: true,
    ...overrides,
  })
}

export const createMockTask = async (assigneeId: string, institutionId: string, overrides = {}) => {
  const { Task } = await import("../../models")
  const { TaskStatus, TaskPriority } = await import("../../models/Task")
  return Task.create({
    title: `Test Task ${Date.now()}`,
    description: "Test task description",
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assigneeId,
    creatorId: assigneeId,
    institutionId,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    ...overrides,
  })
}

export const createMockQuote = async (institutionId: string, assignedUserId: string, overrides = {}) => {
  const { Quote } = await import("../../models")
  return Quote.create({
    title: `Test Quote ${Date.now()}`,
    institutionId,
    assignedUserId,
    status: QuoteStatus.DRAFT,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    ...overrides,
  })
}

export const createMockInvoice = async (institutionId: string, assignedUserId: string, overrides = {}) => {
  const { Invoice } = await import("../../models")
  return Invoice.create({
    title: `Test Invoice ${Date.now()}`,
    institutionId,
    assignedUserId,
    status: InvoiceStatus.DRAFT,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  })
}

export const createMockMeeting = async (institutionId: string, organizerId: string, overrides = {}) => {
  const { Meeting } = await import("../../models")
  return Meeting.create({
    title: `Test Meeting ${Date.now()}`,
    institutionId,
    organizerId,
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // +1 hour
    location: "Test Location",
    status: MeetingStatus.SCHEDULED,
    ...overrides,
  })
}

export const createMockNote = async (institutionId: string, creatorId: string, overrides = {}) => {
  const { Note } = await import("../../models")
  return Note.create({
    title: `Test Note ${Date.now()}`,
    content: `Test note content ${Date.now()}`,
    institutionId,
    creatorId,
    tags: [],
    isPrivate: false,
    ...overrides,
  })
}
