import { DiscountType } from "@medical-crm/shared"
import { beforeEach, vi } from "vitest"
import { Quote } from "../../models/Quote"
import { QuoteLine } from "../../models/QuoteLine"

describe("Quote and QuoteLine Unit Tests", () => {
  beforeEach(async () => {
    try {
      if (process.env.NODE_ENV === "test") {
        // For pg-mem, just clean tables data without recreating schema
        await QuoteLine.destroy({ where: {}, force: true })
        await Quote.destroy({ where: {}, force: true })
      }
    } catch (error) {
      console.warn("Database cleanup warning:", error.message)
    }
  })
  describe("Quote Model", () => {
    it("should generate unique quote numbers", async () => {
      // Mock the database query to return different sequences
      let callCount = 0
      vi.spyOn(Quote, 'findOne').mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          // First call: no existing quote
          return null
        } else {
          // Second call: simulate existing quote to get next sequence
          return { quoteNumber: `Q2025090001` } as any
        }
      })
      
      const quoteNumber1 = await Quote.generateQuoteNumber()
      const quoteNumber2 = await Quote.generateQuoteNumber()

      expect(quoteNumber1).toMatch(/^Q\d{6}\d{4}$/)
      expect(quoteNumber2).toMatch(/^Q\d{6}\d{4}$/)
      // Since they're generated in sequence, they should be different
      expect(quoteNumber1).not.toBe(quoteNumber2)
      
      vi.restoreAllMocks()
    })

    it("should validate quote status transitions", () => {
      const quote = Quote.build({
        id: "test-id",
        quoteNumber: "Q2024010001",
        institutionId: "institution-id",
        assignedUserId: "user-id",
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "draft" as any,
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 0,
      })

      expect(quote.canBeModified()).toBe(true)
      expect(quote.canBeAccepted()).toBe(false)
      expect(quote.canBeRejected()).toBe(false)
    })

    it("should detect expired quotes", () => {
      const expiredQuote = Quote.build({
        id: "test-id",
        quoteNumber: "Q2024010001",
        institutionId: "institution-id",
        assignedUserId: "user-id",
        title: "Expired Quote",
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        status: "sent" as any,
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 0,
      })

      expect(expiredQuote.isExpired()).toBe(true)
      expect(expiredQuote.canBeAccepted()).toBe(false)
      expect(expiredQuote.canBeRejected()).toBe(false)
    })

    it("should calculate days until expiry", () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      const quote = Quote.build({
        id: "test-id",
        quoteNumber: "Q2024010001",
        institutionId: "institution-id",
        assignedUserId: "user-id",
        title: "Future Quote",
        validUntil: futureDate,
        status: "sent" as any,
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 0,
      })

      const daysUntilExpiry = quote.getDaysUntilExpiry()
      expect(daysUntilExpiry).toBe(5)
    })
  })

  describe("QuoteLine Model", () => {
    it("should calculate percentage discount correctly", () => {
      const line = QuoteLine.build({
        id: "test-id",
        quoteId: "quote-id",
        orderIndex: 1,
        description: "Product with percentage discount",
        quantity: 2,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        taxRate: 20,
        subtotal: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
        taxAmount: 0,
        total: 0,
      })

      line.calculateTotals()

      expect(line.subtotal).toBe(200) // 2 * 100
      expect(line.discountAmount).toBe(30) // 200 * 0.15
      expect(line.totalAfterDiscount).toBe(170) // 200 - 30
      expect(line.taxAmount).toBe(34) // 170 * 0.20
      expect(line.total).toBe(204) // 170 + 34
    })

    it("should calculate fixed amount discount correctly", () => {
      const line = QuoteLine.build({
        id: "test-id",
        quoteId: "quote-id",
        orderIndex: 1,
        description: "Product with fixed discount",
        quantity: 3,
        unitPrice: 50,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 25,
        taxRate: 10,
        subtotal: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
        taxAmount: 0,
        total: 0,
      })

      line.calculateTotals()

      expect(line.subtotal).toBe(150) // 3 * 50
      expect(line.discountAmount).toBe(25) // Fixed amount
      expect(line.totalAfterDiscount).toBe(125) // 150 - 25
      expect(line.taxAmount).toBe(12.5) // 125 * 0.10
      expect(line.total).toBe(137.5) // 125 + 12.5
    })

    it("should limit fixed discount to subtotal", () => {
      const line = QuoteLine.build({
        id: "test-id",
        quoteId: "quote-id",
        orderIndex: 1,
        description: "Product with excessive fixed discount",
        quantity: 1,
        unitPrice: 50,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 100, // More than subtotal
        taxRate: 0,
        subtotal: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
        taxAmount: 0,
        total: 0,
      })

      line.calculateTotals()

      expect(line.subtotal).toBe(50)
      expect(line.discountAmount).toBe(50) // Limited to subtotal
      expect(line.totalAfterDiscount).toBe(0)
      expect(line.taxAmount).toBe(0)
      expect(line.total).toBe(0)
    })

    it("should validate percentage discount range", () => {
      const line = QuoteLine.build({
        id: "test-id",
        quoteId: "quote-id",
        orderIndex: 1,
        description: "Product",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 50,
        taxRate: 0,
        subtotal: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
        taxAmount: 0,
        total: 0,
      })

      line.calculateTotals()
      expect(line.validateDiscount()).toBe(true)

      line.discountValue = 150 // Invalid percentage
      expect(line.validateDiscount()).toBe(false)
    })

    it("should validate fixed amount discount", () => {
      const line = QuoteLine.build({
        id: "test-id",
        quoteId: "quote-id",
        orderIndex: 1,
        description: "Product",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 50,
        taxRate: 0,
        subtotal: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
        taxAmount: 0,
        total: 0,
      })

      line.calculateTotals()
      expect(line.validateDiscount()).toBe(true)

      line.discountValue = -10 // Negative discount
      expect(line.validateDiscount()).toBe(false)
    })

    it("should calculate discount percentage", () => {
      const line = QuoteLine.build({
        id: "test-id",
        quoteId: "quote-id",
        orderIndex: 1,
        description: "Product",
        quantity: 2,
        unitPrice: 100,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 40,
        taxRate: 0,
        subtotal: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
        taxAmount: 0,
        total: 0,
      })

      line.calculateTotals()
      expect(line.getDiscountPercentage()).toBe(20) // 40/200 * 100
    })

    it("should return tax percentage", () => {
      const line = QuoteLine.build({
        id: "test-id",
        quoteId: "quote-id",
        orderIndex: 1,
        description: "Product",
        quantity: 1,
        unitPrice: 100,
        taxRate: 15,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0,
        subtotal: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
        taxAmount: 0,
        total: 0,
      })

      expect(line.getTaxPercentage()).toBe(15)
    })

    it("should handle zero discount", () => {
      const line = QuoteLine.build({
        id: "test-id",
        quoteId: "quote-id",
        orderIndex: 1,
        description: "Product with no discount",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0,
        taxRate: 15,
        subtotal: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
        taxAmount: 0,
        total: 0,
      })

      line.calculateTotals()

      expect(line.subtotal).toBe(100)
      expect(line.discountAmount).toBe(0)
      expect(line.totalAfterDiscount).toBe(100)
      expect(line.taxAmount).toBe(15)
      expect(line.total).toBe(115)
    })

    it("should handle high precision calculations", () => {
      const line = QuoteLine.build({
        id: "test-id",
        quoteId: "quote-id",
        orderIndex: 1,
        description: "Product",
        quantity: 3.333,
        unitPrice: 33.33,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 33.33,
        taxRate: 19.6,
        subtotal: 0,
        discountAmount: 0,
        totalAfterDiscount: 0,
        taxAmount: 0,
        total: 0,
      })

      line.calculateTotals()

      // Verify calculations are handled properly
      expect(line.subtotal).toBeCloseTo(111.08889, 2) // 3.333 * 33.33
      expect(line.discountAmount).toBeCloseTo(37.03, 2) // 111.08889 * 0.3333
      expect(line.totalAfterDiscount).toBeCloseTo(74.06, 2) // 111.08889 - 37.03
      expect(line.taxAmount).toBeCloseTo(14.52, 2)
      expect(line.total).toBeCloseTo(88.58, 1) // Less precision for accumulated float errors
    })
  })
})
