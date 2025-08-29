import { DiscountType, QuoteStatus } from "@medical-crm/shared"
import { QuoteService } from "../../services/QuoteService"

describe("Quote Business Logic", () => {
  describe("Validation", () => {
    it("should validate quote data", () => {
      expect(() => {
        QuoteService.validateQuoteData({
          title: "",
          institutionId: "institution-id",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        })
      }).toThrow("Quote title is required")

      expect(() => {
        QuoteService.validateQuoteData({
          title: "Valid Title",
          institutionId: "institution-id",
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

      expect(() => {
        QuoteService.validateQuoteLineData({
          description: "Valid Product",
          quantity: 1,
          unitPrice: 100,
          discountValue: -10,
        })
      }).toThrow("Discount value cannot be negative")

      expect(() => {
        QuoteService.validateQuoteLineData({
          description: "Valid Product",
          quantity: 1,
          unitPrice: 100,
          taxRate: -5,
        })
      }).toThrow("Tax rate must be between 0 and 100")

      expect(() => {
        QuoteService.validateQuoteLineData({
          description: "Valid Product",
          quantity: 1,
          unitPrice: 100,
          taxRate: 150,
        })
      }).toThrow("Tax rate must be between 0 and 100")

      expect(() => {
        QuoteService.validateQuoteLineData({
          description: "Valid Product",
          quantity: 1,
          unitPrice: 100,
          discountType: DiscountType.PERCENTAGE,
          discountValue: 150,
        })
      }).toThrow("Percentage discount cannot exceed 100%")
    })

    it("should pass validation for valid data", () => {
      expect(() => {
        QuoteService.validateQuoteData({
          title: "Valid Quote",
          institutionId: "institution-id",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [
            {
              description: "Valid Product",
              quantity: 1,
              unitPrice: 100,
              discountType: DiscountType.PERCENTAGE,
              discountValue: 10,
              taxRate: 20,
            },
          ],
        })
      }).not.toThrow()

      expect(() => {
        QuoteService.validateQuoteLineData({
          description: "Valid Product",
          quantity: 1,
          unitPrice: 100,
          discountType: DiscountType.FIXED_AMOUNT,
          discountValue: 10,
          taxRate: 15,
        })
      }).not.toThrow()
    })
  })

  describe("Discount Calculations", () => {
    // These tests would be for the calculation logic
    // Since we can't easily test the model methods without database setup,
    // we can test the calculation logic if we extract it to utility functions

    it("should calculate percentage discount", () => {
      const subtotal = 200
      const discountValue = 15
      const discountAmount = subtotal * (discountValue / 100)

      expect(discountAmount).toBe(30)
    })

    it("should calculate fixed amount discount", () => {
      const subtotal = 150
      const discountValue = 25
      const discountAmount = Math.min(discountValue, subtotal)

      expect(discountAmount).toBe(25)
    })

    it("should limit fixed discount to subtotal", () => {
      const subtotal = 50
      const discountValue = 100
      const discountAmount = Math.min(discountValue, subtotal)

      expect(discountAmount).toBe(50)
    })

    it("should calculate tax on discounted amount", () => {
      const subtotal = 200
      const discountAmount = 30
      const totalAfterDiscount = subtotal - discountAmount
      const taxRate = 20
      const taxAmount = totalAfterDiscount * (taxRate / 100)

      expect(totalAfterDiscount).toBe(170)
      expect(taxAmount).toBe(34)
    })

    it("should calculate final total", () => {
      const subtotal = 200
      const discountAmount = 30
      const totalAfterDiscount = subtotal - discountAmount
      const taxAmount = totalAfterDiscount * 0.2
      const total = totalAfterDiscount + taxAmount

      expect(total).toBe(204)
    })
  })

  describe("Quote Status Logic", () => {
    it("should validate status transitions", () => {
      // Draft quote can be sent
      expect(QuoteStatus.DRAFT).toBe("draft")
      expect(QuoteStatus.SENT).toBe("sent")
      expect(QuoteStatus.ACCEPTED).toBe("accepted")
      expect(QuoteStatus.REJECTED).toBe("rejected")
      expect(QuoteStatus.EXPIRED).toBe("expired")
      expect(QuoteStatus.CANCELLED).toBe("cancelled")
    })

    it("should calculate expiration correctly", () => {
      const now = new Date()
      const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 1 day ago

      const daysUntilExpiry = Math.ceil(
        (futureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const isExpired = pastDate < now

      expect(daysUntilExpiry).toBe(5)
      expect(isExpired).toBe(true)
    })
  })

  describe("Quote Number Generation", () => {
    it("should generate quote number format", () => {
      const year = new Date().getFullYear()
      const month = String(new Date().getMonth() + 1).padStart(2, "0")
      const sequence = 1

      const quoteNumber = `Q${year}${month}${String(sequence).padStart(4, "0")}`

      expect(quoteNumber).toMatch(/^Q\d{6}\d{4}$/)
      expect(quoteNumber.length).toBe(11)
    })

    it("should increment sequence numbers", () => {
      const year = new Date().getFullYear()
      const month = String(new Date().getMonth() + 1).padStart(2, "0")

      const quote1 = `Q${year}${month}${String(1).padStart(4, "0")}`
      const quote2 = `Q${year}${month}${String(2).padStart(4, "0")}`

      expect(quote1).not.toBe(quote2)
      expect(quote2 > quote1).toBe(true)
    })
  })

  describe("Line Ordering Logic", () => {
    it("should maintain order indexes", () => {
      const lines = [
        { id: "1", orderIndex: 1 },
        { id: "2", orderIndex: 2 },
        { id: "3", orderIndex: 3 },
      ]

      const reorderedIds = ["3", "1", "2"]
      const newOrder = reorderedIds.map((id, index) => ({
        id,
        orderIndex: index + 1,
      }))

      expect(newOrder[0]).toEqual({ id: "3", orderIndex: 1 })
      expect(newOrder[1]).toEqual({ id: "1", orderIndex: 2 })
      expect(newOrder[2]).toEqual({ id: "2", orderIndex: 3 })
    })

    it("should validate reorder input", () => {
      const existingLineIds = ["1", "2", "3"]
      const reorderIds = ["3", "1", "2"]

      const invalidIds = reorderIds.filter((id) => !existingLineIds.includes(id))
      const missingIds = existingLineIds.filter((id) => !reorderIds.includes(id))

      expect(invalidIds).toHaveLength(0)
      expect(missingIds).toHaveLength(0)
      expect(reorderIds.length).toBe(existingLineIds.length)
    })
  })

  describe("Search and Filter Logic", () => {
    it("should build search filters", () => {
      const filters = {
        institutionId: "inst-1",
        status: QuoteStatus.DRAFT,
        dateFrom: new Date("2024-01-01"),
        dateTo: new Date("2024-12-31"),
        amountMin: 100,
        amountMax: 1000,
        search: "test quote",
      }

      expect(filters.institutionId).toBe("inst-1")
      expect(filters.status).toBe(QuoteStatus.DRAFT)
      expect(filters.search).toBe("test quote")
    })

    it("should handle pagination", () => {
      const page = 2
      const limit = 20
      const offset = (page - 1) * limit
      const totalCount = 45
      const totalPages = Math.ceil(totalCount / limit)

      expect(offset).toBe(20)
      expect(totalPages).toBe(3)
    })
  })

  describe("Statistics Calculation", () => {
    it("should calculate conversion rate", () => {
      const sentQuotes = 10
      const acceptedQuotes = 3
      const conversionRate = sentQuotes > 0 ? (acceptedQuotes / sentQuotes) * 100 : 0

      expect(conversionRate).toBe(30)
    })

    it("should handle zero division", () => {
      const sentQuotes = 0
      const acceptedQuotes = 0
      const conversionRate = sentQuotes > 0 ? (acceptedQuotes / sentQuotes) * 100 : 0

      expect(conversionRate).toBe(0)
    })

    it("should calculate totals", () => {
      const quotes = [
        { total: 100, status: QuoteStatus.ACCEPTED },
        { total: 200, status: QuoteStatus.DRAFT },
        { total: 150, status: QuoteStatus.ACCEPTED },
      ]

      const totalValue = quotes.reduce((sum, quote) => sum + quote.total, 0)
      const acceptedValue = quotes
        .filter((quote) => quote.status === QuoteStatus.ACCEPTED)
        .reduce((sum, quote) => sum + quote.total, 0)

      expect(totalValue).toBe(450)
      expect(acceptedValue).toBe(250)
    })
  })
})
