import { Sequelize } from "sequelize"
import { beforeEach, afterEach } from "vitest"

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
  return User.create({
    email: `test-${Date.now()}@example.com`,
    password: "hashedPassword123",
    firstName: "Test",
    lastName: "User",
    role: "USER",
    ...overrides,
  })
}

export const createMockTeam = async (overrides = {}) => {
  const { Team } = await import("../../models")
  return Team.create({
    name: `Test Team ${Date.now()}`,
    description: "Test team description",
    ...overrides,
  })
}

export const createMockMedicalInstitution = async (overrides = {}) => {
  const { MedicalInstitution } = await import("../../models")
  return MedicalInstitution.create({
    name: `Test Institution ${Date.now()}`,
    type: "hospital",
    address: "123 Test St",
    city: "Test City",
    postalCode: "12345",
    country: "France",
    phone: "0123456789",
    email: `institution-${Date.now()}@test.com`,
    ...overrides,
  })
}

export const createMockTask = async (userId: string, institutionId: string, overrides = {}) => {
  const { Task } = await import("../../models")
  return Task.create({
    title: `Test Task ${Date.now()}`,
    description: "Test task description",
    status: "pending",
    priority: "medium",
    assignedToId: userId,
    medicalInstitutionId: institutionId,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    ...overrides,
  })
}

export const createMockQuote = async (institutionId: string, creatorId: string, overrides = {}) => {
  const { Quote } = await import("../../models")
  return Quote.create({
    quoteNumber: `Q-${Date.now()}`,
    medicalInstitutionId: institutionId,
    createdById: creatorId,
    status: "draft",
    totalAmount: 1000,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    ...overrides,
  })
}

export const createMockInvoice = async (institutionId: string, creatorId: string, overrides = {}) => {
  const { Invoice } = await import("../../models")
  return Invoice.create({
    invoiceNumber: `INV-${Date.now()}`,
    medicalInstitutionId: institutionId,
    createdById: creatorId,
    status: "pending",
    totalAmount: 1500,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  })
}

export const createMockMeeting = async (institutionId: string, creatorId: string, overrides = {}) => {
  const { Meeting } = await import("../../models")
  return Meeting.create({
    title: `Test Meeting ${Date.now()}`,
    medicalInstitutionId: institutionId,
    createdById: creatorId,
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // +1 hour
    location: "Test Location",
    ...overrides,
  })
}

export const createMockNote = async (institutionId: string, authorId: string, overrides = {}) => {
  const { Note } = await import("../../models")
  return Note.create({
    content: `Test note content ${Date.now()}`,
    medicalInstitutionId: institutionId,
    authorId,
    ...overrides,
  })
}
