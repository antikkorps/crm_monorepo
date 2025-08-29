import { DiscountType, QuoteStatus } from "@medical-crm/shared"
import { sequelize } from "../../config/database"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Quote } from "../../models/Quote"
import { QuoteLine } from "../../models/QuoteLine"
import { User } from "../../models/User"
import { QuoteService } from "../../services/QuoteService"

describe("QuoteService", () => {
  let user: User
  let institution: MedicalInstitution

  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await QuoteLine.destroy({ where: {}, force: true })
    await Quote.destroy({ where: {}, force: true })
    await MedicalInstitution.destroy({ where: {}, force: true })
    await User.destroy({ where: {}, force: true })

    // Create test data
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

  describe("createQuote", () => {
    it("should create a quote with lines", async () => {
      const quoteData = {
        institutionId: institution.id,
        title: "Test Quote",
        description: "Test description",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [
          {
            description: "Product 1",
            quantity: 2,
            unitPrice: 100,
            discountType: DiscountType.PERCENTAGE,
            discountValue: 10,
            taxRate: 20,
          },
          {
            description: "Product 2",
            quantity: 1,
            unitPrice: 50,
            discountType: DiscountType.FIXED_AMOUNT,
            discountValue: 5,
            taxRate: 15,
          },
        ],
      }

      const quote = await QuoteService.createQuote(quoteData, user.id)

      expect(quote).toBeDefined()
      expect(quote.title).toBe("Test Quote")
      expect(quote.status).toBe(QuoteStatus.DRAFT)
      expect(quote.lines).toHaveLength(2)
      expect(quote.total).toBeGreaterThan(0)
    })

    it("should create a quote without lines", async () => {
      const quoteData = {
        institutionId: institution.id,
        title: "Empty Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [],
      }

      const quote = await QuoteService.createQuote(quoteData, user.id)

      expect(quote).toBeDefined()
      expect(quote.title).toBe("Empty Quote")
      expect(quote.total).toBe(0)
    })

    it("should throw error for invalid institution", async () => {
      const quoteData = {
        institutionId: "invalid-id",
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [],
      }

      await expect(QuoteService.createQuote(quoteData, user.id)).rejects.toThrow(
        "Medical institution not found"
      )
    })

    it("should throw error for invalid user", async () => {
      const quoteData = {
        institutionId: institution.id,
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [],
      }

      await expect(
        QuoteService.createQuote(quoteData, "invalid-user-id")
      ).rejects.toThrow("User not found")
    })
  })

  describe("getQuoteById", () => {
    it("should return quote with associations", async () => {
      const createdQuote = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Test Quote",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        user.id
      )

      const quote = await QuoteService.getQuoteById(createdQuote.id)

      expect(quote).toBeDefined()
      expect(quote.institution).toBeDefined()
      expect(quote.assignedUser).toBeDefined()
      expect(quote.lines).toBeDefined()
    })

    it("should throw error for non-existent quote", async () => {
      await expect(QuoteService.getQuoteById("non-existent-id")).rejects.toThrow(
        "Quote not found"
      )
    })
  })

  describe("updateQuote", () => {
    let quote: Quote

    beforeEach(async () => {
      quote = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Original Title",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        user.id
      )
    })

    it("should update quote details", async () => {
      const updateData = {
        title: "Updated Title",
        description: "Updated description",
      }

      const updatedQuote = await QuoteService.updateQuote(quote.id, updateData, user.id)

      expect(updatedQuote.title).toBe("Updated Title")
      expect(updatedQuote.description).toBe("Updated description")
    })

    it("should not allow update of non-modifiable quote", async () => {
      await quote.update({ status: QuoteStatus.ACCEPTED })

      await expect(
        QuoteService.updateQuote(quote.id, { title: "New Title" }, user.id)
      ).rejects.toThrow("Quote cannot be modified in its current state")
    })

    it("should not allow unauthorized user to update", async () => {
      const otherUser = await User.create({
        email: "other@example.com",
        firstName: "Other",
        lastName: "User",
        role: "USER",
        avatarSeed: "other",
        passwordHash: "hashedpassword",
      })

      await expect(
        QuoteService.updateQuote(quote.id, { title: "New Title" }, otherUser.id)
      ).rejects.toThrow("Insufficient permissions to modify this quote")
    })
  })

  describe("deleteQuote", () => {
    let quote: Quote

    beforeEach(async () => {
      quote = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Test Quote",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        user.id
      )
    })

    it("should delete draft quote", async () => {
      await QuoteService.deleteQuote(quote.id, user.id)

      await expect(QuoteService.getQuoteById(quote.id)).rejects.toThrow("Quote not found")
    })

    it("should not delete non-draft quote", async () => {
      await quote.update({ status: QuoteStatus.SENT })

      await expect(QuoteService.deleteQuote(quote.id, user.id)).rejects.toThrow(
        "Only draft quotes can be deleted"
      )
    })
  })

  describe("sendQuote", () => {
    let quote: Quote

    beforeEach(async () => {
      quote = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Test Quote",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [
            {
              description: "Product 1",
              quantity: 1,
              unitPrice: 100,
            },
          ],
        },
        user.id
      )
    })

    it("should send quote with lines", async () => {
      const sentQuote = await QuoteService.sendQuote(quote.id, user.id)

      expect(sentQuote.status).toBe(QuoteStatus.SENT)
    })

    it("should not send quote without lines", async () => {
      const emptyQuote = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Empty Quote",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        user.id
      )

      await expect(QuoteService.sendQuote(emptyQuote.id, user.id)).rejects.toThrow(
        "Cannot send quote without line items"
      )
    })
  })

  describe("acceptQuote", () => {
    let quote: Quote

    beforeEach(async () => {
      quote = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Test Quote",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [
            {
              description: "Product 1",
              quantity: 1,
              unitPrice: 100,
            },
          ],
        },
        user.id
      )
      await quote.send()
    })

    it("should accept sent quote", async () => {
      const acceptedQuote = await QuoteService.acceptQuote(quote.id, "Client accepts")

      expect(acceptedQuote.status).toBe(QuoteStatus.ACCEPTED)
      expect(acceptedQuote.clientComments).toBe("Client accepts")
      expect(acceptedQuote.acceptedAt).toBeDefined()
    })
  })

  describe("rejectQuote", () => {
    let quote: Quote

    beforeEach(async () => {
      quote = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Test Quote",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [
            {
              description: "Product 1",
              quantity: 1,
              unitPrice: 100,
            },
          ],
        },
        user.id
      )
      await quote.send()
    })

    it("should reject sent quote", async () => {
      const rejectedQuote = await QuoteService.rejectQuote(quote.id, "Client rejects")

      expect(rejectedQuote.status).toBe(QuoteStatus.REJECTED)
      expect(rejectedQuote.clientComments).toBe("Client rejects")
      expect(rejectedQuote.rejectedAt).toBeDefined()
    })
  })

  describe("Quote Line Management", () => {
    let quote: Quote

    beforeEach(async () => {
      quote = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Test Quote",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        user.id
      )
    })

    it("should add quote line", async () => {
      const lineData = {
        description: "New Product",
        quantity: 2,
        unitPrice: 150,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 5,
        taxRate: 10,
      }

      const line = await QuoteService.addQuoteLine(quote.id, lineData, user.id)

      expect(line).toBeDefined()
      expect(line.description).toBe("New Product")
      expect(line.orderIndex).toBe(1)
    })

    it("should update quote line", async () => {
      const line = await QuoteService.addQuoteLine(
        quote.id,
        {
          description: "Original Product",
          quantity: 1,
          unitPrice: 100,
        },
        user.id
      )

      const updatedLine = await QuoteService.updateQuoteLine(
        line.id,
        {
          description: "Updated Product",
          quantity: 3,
        },
        user.id
      )

      expect(updatedLine.description).toBe("Updated Product")
      expect(updatedLine.quantity).toBe(3)
    })

    it("should delete quote line", async () => {
      const line = await QuoteService.addQuoteLine(
        quote.id,
        {
          description: "Product to Delete",
          quantity: 1,
          unitPrice: 100,
        },
        user.id
      )

      await QuoteService.deleteQuoteLine(line.id, user.id)

      const lines = await QuoteLine.findByQuote(quote.id)
      expect(lines).toHaveLength(0)
    })

    it("should reorder quote lines", async () => {
      const line1 = await QuoteService.addQuoteLine(
        quote.id,
        {
          description: "Product 1",
          quantity: 1,
          unitPrice: 100,
        },
        user.id
      )

      const line2 = await QuoteService.addQuoteLine(
        quote.id,
        {
          description: "Product 2",
          quantity: 1,
          unitPrice: 200,
        },
        user.id
      )

      const line3 = await QuoteService.addQuoteLine(
        quote.id,
        {
          description: "Product 3",
          quantity: 1,
          unitPrice: 300,
        },
        user.id
      )

      // Reorder: line3, line1, line2
      const reorderedLines = await QuoteService.reorderQuoteLines(
        quote.id,
        [line3.id, line1.id, line2.id],
        user.id
      )

      expect(reorderedLines[0].id).toBe(line3.id)
      expect(reorderedLines[1].id).toBe(line1.id)
      expect(reorderedLines[2].id).toBe(line2.id)
    })
  })

  describe("searchQuotes", () => {
    beforeEach(async () => {
      // Create multiple quotes for testing
      await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Quote 1",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [
            {
              description: "Product 1",
              quantity: 1,
              unitPrice: 100,
            },
          ],
        },
        user.id
      )

      await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Quote 2",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [
            {
              description: "Product 2",
              quantity: 2,
              unitPrice: 200,
            },
          ],
        },
        user.id
      )
    })

    it("should search quotes with filters", async () => {
      const result = await QuoteService.searchQuotes(
        { institutionId: institution.id },
        user.id,
        "USER"
      )

      expect(result.quotes).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.pages).toBe(1)
    })

    it("should filter by status", async () => {
      const result = await QuoteService.searchQuotes(
        { status: QuoteStatus.DRAFT },
        user.id,
        "ADMIN"
      )

      expect(result.quotes).toHaveLength(2)
      expect(result.quotes.every((q) => q.status === QuoteStatus.DRAFT)).toBe(true)
    })

    it("should search by text", async () => {
      const result = await QuoteService.searchQuotes(
        { search: "Quote 1" },
        user.id,
        "ADMIN"
      )

      expect(result.quotes).toHaveLength(1)
      expect(result.quotes[0].title).toBe("Quote 1")
    })
  })

  describe("getQuoteStatistics", () => {
    beforeEach(async () => {
      // Create quotes with different statuses
      const quote1 = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Draft Quote",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [
            {
              description: "Product 1",
              quantity: 1,
              unitPrice: 100,
            },
          ],
        },
        user.id
      )

      const quote2 = await QuoteService.createQuote(
        {
          institutionId: institution.id,
          title: "Sent Quote",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [
            {
              description: "Product 2",
              quantity: 1,
              unitPrice: 200,
            },
          ],
        },
        user.id
      )

      await quote2.send()
      await quote2.accept()
    })

    it("should return quote statistics", async () => {
      const stats = await QuoteService.getQuoteStatistics(user.id)

      expect(stats.totalQuotes).toBe(2)
      expect(stats.draftQuotes).toBe(1)
      expect(stats.acceptedQuotes).toBe(1)
      expect(stats.totalValue).toBeGreaterThan(0)
      expect(stats.acceptedValue).toBeGreaterThan(0)
      expect(stats.conversionRate).toBeGreaterThan(0)
    })
  })

  describe("Validation", () => {
    it("should validate quote data", () => {
      expect(() => {
        QuoteService.validateQuoteData({
          title: "",
          institutionId: institution.id,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        })
      }).toThrow("Quote title is required")

      expect(() => {
        QuoteService.validateQuoteData({
          title: "Valid Title",
          institutionId: institution.id,
          validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
          lines: [],
        })
      }).toThrow("Valid until date must be in the future")
    })

    it("should validate quote line data", () => {
      expect(() => {
        QuoteService.validateQuoteLineData({
          description: "",
          quantity: 1,
          unitPrice: 100,
        })
      }).toThrow("Line description is required")

      expect(() => {
        QuoteService.validateQuoteLineData({
          description: "Valid Product",
          quantity: 0,
          unitPrice: 100,
        })
      }).toThrow("Quantity must be greater than 0")

      expect(() => {
        QuoteService.validateQuoteLineData({
          description: "Valid Product",
          quantity: 1,
          unitPrice: -50,
        })
      }).toThrow("Unit price cannot be negative")
    })
  })

  describe("markExpiredQuotes", () => {
    it("should mark expired quotes", async () => {
      // Create an expired quote
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

      const affectedCount = await QuoteService.markExpiredQuotes()
      expect(affectedCount).toBe(1)

      await expiredQuote.reload()
      expect(expiredQuote.status).toBe(QuoteStatus.EXPIRED)
    })
  })
})
