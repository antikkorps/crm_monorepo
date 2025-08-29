import { QuoteStatus } from "@medical-crm/shared"
import { sequelize } from "../../config/database"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Quote } from "../../models/Quote"
import { QuoteLine } from "../../models/QuoteLine"
import { User } from "../../models/User"

describe("Quote Model", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await Quote.destroy({ where: {}, force: true })
    await QuoteLine.destroy({ where: {}, force: true })
    await MedicalInstitution.destroy({ where: {}, force: true })
    await User.destroy({ where: {}, force: true })
  })

  describe("Model Creation", () => {
    it("should create a quote with valid data", async () => {
      // Create test user and institution
      const user = await User.create({
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "USER",
        avatarSeed: "test",
        passwordHash: "hashedpassword",
      })

      const institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: "hospital",
        address: {
          street: "123 Main St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          country: "Test Country",
        },
        medicalProfile: {
          bedCapacity: 100,
          surgicalRooms: 5,
          specialties: ["cardiology", "neurology"],
          departments: ["emergency", "surgery"],
          equipmentTypes: ["MRI", "CT"],
          certifications: ["ISO9001"],
          complianceStatus: {
            isCompliant: true,
            lastAuditDate: new Date(),
          },
        },
      })

      const quoteData = {
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Quote",
        description: "Test quote description",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }

      const quote = await Quote.createQuote(quoteData)

      expect(quote).toBeDefined()
      expect(quote.title).toBe("Test Quote")
      expect(quote.status).toBe(QuoteStatus.DRAFT)
      expect(quote.quoteNumber).toMatch(/^Q\d{6}\d{4}$/)
      expect(quote.subtotal).toBe(0)
      expect(quote.total).toBe(0)
    })

    it("should generate unique quote numbers", async () => {
      const user = await User.create({
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "USER",
        avatarSeed: "test",
        passwordHash: "hashedpassword",
      })

      const institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: "hospital",
        address: {
          street: "123 Main St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          country: "Test Country",
        },
        medicalProfile: {
          bedCapacity: 100,
          surgicalRooms: 5,
          specialties: ["cardiology"],
          departments: ["emergency"],
          equipmentTypes: ["MRI"],
          certifications: ["ISO9001"],
          complianceStatus: {
            isCompliant: true,
          },
        },
      })

      const quoteData = {
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      const quote1 = await Quote.createQuote(quoteData)
      const quote2 = await Quote.createQuote(quoteData)

      expect(quote1.quoteNumber).not.toBe(quote2.quoteNumber)
    })

    it("should validate required fields", async () => {
      await expect(
        Quote.create({
          // Missing required fields
          title: "",
          validUntil: new Date(),
        } as any)
      ).rejects.toThrow()
    })
  })

  describe("Quote Status Management", () => {
    let quote: Quote
    let user: User
    let institution: MedicalInstitution

    beforeEach(async () => {
      user = await User.create({
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "USER",
        avatarSeed: "test",
        passwordHash: "hashedpassword",
      })

      institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: "hospital",
        address: {
          street: "123 Main St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          country: "Test Country",
        },
        medicalProfile: {
          bedCapacity: 100,
          surgicalRooms: 5,
          specialties: ["cardiology"],
          departments: ["emergency"],
          equipmentTypes: ["MRI"],
          certifications: ["ISO9001"],
          complianceStatus: {
            isCompliant: true,
          },
        },
      })

      quote = await Quote.createQuote({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
    })

    it("should send a draft quote", async () => {
      expect(quote.status).toBe(QuoteStatus.DRAFT)
      expect(quote.canBeModified()).toBe(true)

      await quote.send()

      expect(quote.status).toBe(QuoteStatus.SENT)
      expect(quote.canBeModified()).toBe(true)
    })

    it("should accept a sent quote", async () => {
      await quote.send()
      expect(quote.canBeAccepted()).toBe(true)

      await quote.accept("Client accepts the quote")

      expect(quote.status).toBe(QuoteStatus.ACCEPTED)
      expect(quote.acceptedAt).toBeDefined()
      expect(quote.clientComments).toBe("Client accepts the quote")
      expect(quote.canBeModified()).toBe(false)
    })

    it("should reject a sent quote", async () => {
      await quote.send()
      expect(quote.canBeRejected()).toBe(true)

      await quote.reject("Client rejects the quote")

      expect(quote.status).toBe(QuoteStatus.REJECTED)
      expect(quote.rejectedAt).toBeDefined()
      expect(quote.clientComments).toBe("Client rejects the quote")
      expect(quote.canBeModified()).toBe(false)
    })

    it("should cancel a draft or sent quote", async () => {
      // Cancel draft quote
      await quote.cancel()
      expect(quote.status).toBe(QuoteStatus.CANCELLED)

      // Create new quote and send it
      const newQuote = await Quote.createQuote({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Quote 2",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await newQuote.send()
      await newQuote.cancel()
      expect(newQuote.status).toBe(QuoteStatus.CANCELLED)
    })

    it("should not allow invalid status transitions", async () => {
      // Cannot send an already sent quote
      await quote.send()
      await expect(quote.send()).rejects.toThrow("Only draft quotes can be sent")

      // Cannot accept a draft quote
      const draftQuote = await Quote.createQuote({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Draft Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await expect(draftQuote.accept()).rejects.toThrow(
        "Quote cannot be accepted in its current state"
      )
    })
  })

  describe("Quote Expiration", () => {
    let user: User
    let institution: MedicalInstitution

    beforeEach(async () => {
      user = await User.create({
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "USER",
        avatarSeed: "test",
        passwordHash: "hashedpassword",
      })

      institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: "hospital",
        address: {
          street: "123 Main St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          country: "Test Country",
        },
        medicalProfile: {
          bedCapacity: 100,
          surgicalRooms: 5,
          specialties: ["cardiology"],
          departments: ["emergency"],
          equipmentTypes: ["MRI"],
          certifications: ["ISO9001"],
          complianceStatus: {
            isCompliant: true,
          },
        },
      })
    })

    it("should detect expired quotes", async () => {
      const expiredQuote = await Quote.create({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Expired Quote",
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        status: QuoteStatus.SENT,
        quoteNumber: "Q2024010001",
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 0,
      })

      expect(expiredQuote.isExpired()).toBe(true)
      expect(expiredQuote.canBeAccepted()).toBe(false)
      expect(expiredQuote.canBeRejected()).toBe(false)
    })

    it("should calculate days until expiry", async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      const quote = await Quote.create({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Future Quote",
        validUntil: futureDate,
        status: QuoteStatus.SENT,
        quoteNumber: "Q2024010002",
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 0,
      })

      const daysUntilExpiry = quote.getDaysUntilExpiry()
      expect(daysUntilExpiry).toBe(5)
    })

    it("should mark expired quotes", async () => {
      // Create expired quote
      await Quote.create({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Expired Quote",
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: QuoteStatus.SENT,
        quoteNumber: "Q2024010003",
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 0,
      })

      const affectedCount = await Quote.markExpiredQuotes()
      expect(affectedCount).toBe(1)

      const expiredQuote = await Quote.findOne({
        where: { title: "Expired Quote" },
      })
      expect(expiredQuote?.status).toBe(QuoteStatus.EXPIRED)
    })
  })

  describe("Quote Totals Calculation", () => {
    let quote: Quote
    let user: User
    let institution: MedicalInstitution

    beforeEach(async () => {
      user = await User.create({
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "USER",
        avatarSeed: "test",
        passwordHash: "hashedpassword",
      })

      institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: "hospital",
        address: {
          street: "123 Main St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          country: "Test Country",
        },
        medicalProfile: {
          bedCapacity: 100,
          surgicalRooms: 5,
          specialties: ["cardiology"],
          departments: ["emergency"],
          equipmentTypes: ["MRI"],
          certifications: ["ISO9001"],
          complianceStatus: {
            isCompliant: true,
          },
        },
      })

      quote = await Quote.createQuote({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
    })

    it("should recalculate totals when lines are added", async () => {
      // Add quote lines
      const line1 = await QuoteLine.create({
        quoteId: quote.id,
        orderIndex: 1,
        description: "Product 1",
        quantity: 2,
        unitPrice: 100,
        discountType: "percentage",
        discountValue: 10,
        taxRate: 20,
        subtotal: 200,
        discountAmount: 20,
        totalAfterDiscount: 180,
        taxAmount: 36,
        total: 216,
      })

      const line2 = await QuoteLine.create({
        quoteId: quote.id,
        orderIndex: 2,
        description: "Product 2",
        quantity: 1,
        unitPrice: 50,
        discountType: "fixed_amount",
        discountValue: 5,
        taxRate: 20,
        subtotal: 50,
        discountAmount: 5,
        totalAfterDiscount: 45,
        taxAmount: 9,
        total: 54,
      })

      await quote.recalculateTotals()

      expect(quote.subtotal).toBe(250) // 200 + 50
      expect(quote.totalDiscountAmount).toBe(25) // 20 + 5
      expect(quote.totalTaxAmount).toBe(45) // 36 + 9
      expect(quote.total).toBe(270) // 216 + 54
    })
  })

  describe("Quote Queries", () => {
    let user1: User
    let user2: User
    let institution1: MedicalInstitution
    let institution2: MedicalInstitution

    beforeEach(async () => {
      user1 = await User.create({
        email: "user1@example.com",
        firstName: "User",
        lastName: "One",
        role: "USER",
        avatarSeed: "user1",
        passwordHash: "hashedpassword",
      })

      user2 = await User.create({
        email: "user2@example.com",
        firstName: "User",
        lastName: "Two",
        role: "USER",
        avatarSeed: "user2",
        passwordHash: "hashedpassword",
      })

      institution1 = await MedicalInstitution.create({
        name: "Hospital 1",
        type: "hospital",
        address: {
          street: "123 Main St",
          city: "City 1",
          state: "State 1",
          zipCode: "12345",
          country: "Country 1",
        },
        medicalProfile: {
          bedCapacity: 100,
          surgicalRooms: 5,
          specialties: ["cardiology"],
          departments: ["emergency"],
          equipmentTypes: ["MRI"],
          certifications: ["ISO9001"],
          complianceStatus: {
            isCompliant: true,
          },
        },
      })

      institution2 = await MedicalInstitution.create({
        name: "Hospital 2",
        type: "clinic",
        address: {
          street: "456 Oak St",
          city: "City 2",
          state: "State 2",
          zipCode: "67890",
          country: "Country 2",
        },
        medicalProfile: {
          bedCapacity: 50,
          surgicalRooms: 2,
          specialties: ["neurology"],
          departments: ["outpatient"],
          equipmentTypes: ["CT"],
          certifications: ["ISO9001"],
          complianceStatus: {
            isCompliant: true,
          },
        },
      })
    })

    it("should find quotes by institution", async () => {
      await Quote.createQuote({
        institutionId: institution1.id,
        assignedUserId: user1.id,
        title: "Quote for Hospital 1",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await Quote.createQuote({
        institutionId: institution2.id,
        assignedUserId: user1.id,
        title: "Quote for Hospital 2",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const quotesForInstitution1 = await Quote.findByInstitution(institution1.id)
      expect(quotesForInstitution1).toHaveLength(1)
      expect(quotesForInstitution1[0].title).toBe("Quote for Hospital 1")
    })

    it("should find quotes by user", async () => {
      await Quote.createQuote({
        institutionId: institution1.id,
        assignedUserId: user1.id,
        title: "Quote by User 1",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await Quote.createQuote({
        institutionId: institution1.id,
        assignedUserId: user2.id,
        title: "Quote by User 2",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const quotesForUser1 = await Quote.findByUser(user1.id)
      expect(quotesForUser1).toHaveLength(1)
      expect(quotesForUser1[0].title).toBe("Quote by User 1")
    })

    it("should find quotes by status", async () => {
      const quote1 = await Quote.createQuote({
        institutionId: institution1.id,
        assignedUserId: user1.id,
        title: "Draft Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const quote2 = await Quote.createQuote({
        institutionId: institution1.id,
        assignedUserId: user1.id,
        title: "Sent Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await quote2.send()

      const draftQuotes = await Quote.findByStatus(QuoteStatus.DRAFT)
      const sentQuotes = await Quote.findByStatus(QuoteStatus.SENT)

      expect(draftQuotes).toHaveLength(1)
      expect(draftQuotes[0].title).toBe("Draft Quote")
      expect(sentQuotes).toHaveLength(1)
      expect(sentQuotes[0].title).toBe("Sent Quote")
    })
  })
})
