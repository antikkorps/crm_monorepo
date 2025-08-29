import { DiscountType } from "@medical-crm/shared"
import { sequelize } from "../../config/database"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Quote } from "../../models/Quote"
import { QuoteLine } from "../../models/QuoteLine"
import { User } from "../../models/User"

describe("QuoteLine Model", () => {
  let quote: Quote
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

    quote = await Quote.createQuote({
      institutionId: institution.id,
      assignedUserId: user.id,
      title: "Test Quote",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
  })

  describe("Model Creation", () => {
    it("should create a quote line with valid data", async () => {
      const lineData = {
        quoteId: quote.id,
        description: "Test Product",
        quantity: 2,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        taxRate: 20,
      }

      const line = await QuoteLine.createLine(lineData)

      expect(line).toBeDefined()
      expect(line.description).toBe("Test Product")
      expect(line.quantity).toBe(2)
      expect(line.unitPrice).toBe(100)
      expect(line.orderIndex).toBe(1)
    })

    it("should auto-assign order index", async () => {
      const lineData = {
        quoteId: quote.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 50,
      }

      const line1 = await QuoteLine.createLine(lineData)
      const line2 = await QuoteLine.createLine({
        ...lineData,
        description: "Product 2",
      })

      expect(line1.orderIndex).toBe(1)
      expect(line2.orderIndex).toBe(2)
    })

    it("should validate required fields", async () => {
      await expect(
        QuoteLine.create({
          // Missing required fields
          description: "",
          quantity: 0,
        } as any)
      ).rejects.toThrow()
    })
  })

  describe("Discount Calculations", () => {
    it("should calculate percentage discount correctly", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product with percentage discount",
        quantity: 2,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        taxRate: 20,
      })

      expect(line.subtotal).toBe(200) // 2 * 100
      expect(line.discountAmount).toBe(30) // 200 * 0.15
      expect(line.totalAfterDiscount).toBe(170) // 200 - 30
      expect(line.taxAmount).toBe(34) // 170 * 0.20
      expect(line.total).toBe(204) // 170 + 34
    })

    it("should calculate fixed amount discount correctly", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product with fixed discount",
        quantity: 3,
        unitPrice: 50,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 25,
        taxRate: 10,
      })

      expect(line.subtotal).toBe(150) // 3 * 50
      expect(line.discountAmount).toBe(25) // Fixed amount
      expect(line.totalAfterDiscount).toBe(125) // 150 - 25
      expect(line.taxAmount).toBe(12.5) // 125 * 0.10
      expect(line.total).toBe(137.5) // 125 + 12.5
    })

    it("should limit fixed discount to subtotal", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product with excessive fixed discount",
        quantity: 1,
        unitPrice: 50,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 100, // More than subtotal
        taxRate: 0,
      })

      expect(line.subtotal).toBe(50)
      expect(line.discountAmount).toBe(50) // Limited to subtotal
      expect(line.totalAfterDiscount).toBe(0)
      expect(line.taxAmount).toBe(0)
      expect(line.total).toBe(0)
    })

    it("should handle zero discount", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product with no discount",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0,
        taxRate: 15,
      })

      expect(line.subtotal).toBe(100)
      expect(line.discountAmount).toBe(0)
      expect(line.totalAfterDiscount).toBe(100)
      expect(line.taxAmount).toBe(15)
      expect(line.total).toBe(115)
    })

    it("should recalculate totals when line is updated", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        taxRate: 20,
      })

      // Update quantity
      await line.update({ quantity: 3 })

      expect(line.subtotal).toBe(300) // 3 * 100
      expect(line.discountAmount).toBe(30) // 300 * 0.10
      expect(line.totalAfterDiscount).toBe(270) // 300 - 30
      expect(line.taxAmount).toBe(54) // 270 * 0.20
      expect(line.total).toBe(324) // 270 + 54
    })
  })

  describe("Discount Validation", () => {
    it("should validate percentage discount range", async () => {
      const line = QuoteLine.build({
        quoteId: quote.id,
        description: "Product",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 50,
        taxRate: 0,
        orderIndex: 1,
      })

      line.calculateTotals()
      expect(line.validateDiscount()).toBe(true)

      line.discountValue = 150 // Invalid percentage
      expect(line.validateDiscount()).toBe(false)
    })

    it("should validate fixed amount discount", async () => {
      const line = QuoteLine.build({
        quoteId: quote.id,
        description: "Product",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 50,
        taxRate: 0,
        orderIndex: 1,
      })

      line.calculateTotals()
      expect(line.validateDiscount()).toBe(true)

      line.discountValue = -10 // Negative discount
      expect(line.validateDiscount()).toBe(false)
    })

    it("should prevent creating line with invalid percentage discount", async () => {
      await expect(
        QuoteLine.create({
          quoteId: quote.id,
          description: "Product",
          quantity: 1,
          unitPrice: 100,
          discountType: DiscountType.PERCENTAGE,
          discountValue: 150, // Invalid percentage
          taxRate: 0,
          orderIndex: 1,
          subtotal: 0,
          discountAmount: 0,
          totalAfterDiscount: 0,
          taxAmount: 0,
          total: 0,
        })
      ).rejects.toThrow("Percentage discount cannot exceed 100%")
    })
  })

  describe("Line Ordering", () => {
    it("should maintain order indexes", async () => {
      const line1 = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 100,
      })

      const line2 = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 2",
        quantity: 1,
        unitPrice: 200,
      })

      const line3 = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 3",
        quantity: 1,
        unitPrice: 300,
      })

      expect(line1.orderIndex).toBe(1)
      expect(line2.orderIndex).toBe(2)
      expect(line3.orderIndex).toBe(3)
    })

    it("should reorder lines", async () => {
      const line1 = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 100,
      })

      const line2 = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 2",
        quantity: 1,
        unitPrice: 200,
      })

      const line3 = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 3",
        quantity: 1,
        unitPrice: 300,
      })

      // Reorder: line3, line1, line2
      await QuoteLine.reorderLines(quote.id, [line3.id, line1.id, line2.id])

      const reorderedLines = await QuoteLine.findByQuote(quote.id)
      expect(reorderedLines[0].id).toBe(line3.id)
      expect(reorderedLines[0].orderIndex).toBe(1)
      expect(reorderedLines[1].id).toBe(line1.id)
      expect(reorderedLines[1].orderIndex).toBe(2)
      expect(reorderedLines[2].id).toBe(line2.id)
      expect(reorderedLines[2].orderIndex).toBe(3)
    })

    it("should update order indexes after deletion", async () => {
      const line1 = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 100,
      })

      const line2 = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 2",
        quantity: 1,
        unitPrice: 200,
      })

      const line3 = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 3",
        quantity: 1,
        unitPrice: 300,
      })

      // Delete middle line
      await line2.destroy()
      await QuoteLine.updateOrderIndexes(quote.id)

      const remainingLines = await QuoteLine.findByQuote(quote.id)
      expect(remainingLines).toHaveLength(2)
      expect(remainingLines[0].orderIndex).toBe(1)
      expect(remainingLines[1].orderIndex).toBe(2)
    })
  })

  describe("Line Queries", () => {
    it("should find lines by quote", async () => {
      await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 100,
      })

      await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 2",
        quantity: 1,
        unitPrice: 200,
      })

      const lines = await QuoteLine.findByQuote(quote.id)
      expect(lines).toHaveLength(2)
      expect(lines[0].orderIndex).toBeLessThan(lines[1].orderIndex)
    })

    it("should delete all lines by quote", async () => {
      await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 100,
      })

      await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product 2",
        quantity: 1,
        unitPrice: 200,
      })

      const deletedCount = await QuoteLine.deleteByQuote(quote.id)
      expect(deletedCount).toBe(2)

      const remainingLines = await QuoteLine.findByQuote(quote.id)
      expect(remainingLines).toHaveLength(0)
    })
  })

  describe("Helper Methods", () => {
    it("should calculate discount percentage", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product",
        quantity: 2,
        unitPrice: 100,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 40,
        taxRate: 0,
      })

      expect(line.getDiscountPercentage()).toBe(20) // 40/200 * 100
    })

    it("should return tax percentage", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product",
        quantity: 1,
        unitPrice: 100,
        taxRate: 15,
      })

      expect(line.getTaxPercentage()).toBe(15)
    })

    it("should include calculated values in JSON output", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        taxRate: 20,
      })

      const json = line.toJSON()
      expect(json.discountPercentage).toBe(10)
      expect(json.taxPercentage).toBe(20)
    })
  })

  describe("Edge Cases", () => {
    it("should handle zero quantity", async () => {
      await expect(
        QuoteLine.createLine({
          quoteId: quote.id,
          description: "Product",
          quantity: 0,
          unitPrice: 100,
        })
      ).rejects.toThrow()
    })

    it("should handle negative unit price", async () => {
      await expect(
        QuoteLine.createLine({
          quoteId: quote.id,
          description: "Product",
          quantity: 1,
          unitPrice: -50,
        })
      ).rejects.toThrow()
    })

    it("should handle very small quantities", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product",
        quantity: 0.001,
        unitPrice: 1000,
        taxRate: 10,
      })

      expect(line.subtotal).toBe(1) // 0.001 * 1000
      expect(line.taxAmount).toBe(0.1) // 1 * 0.10
      expect(line.total).toBe(1.1)
    })

    it("should handle high precision calculations", async () => {
      const line = await QuoteLine.createLine({
        quoteId: quote.id,
        description: "Product",
        quantity: 3.333,
        unitPrice: 33.33,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 33.33,
        taxRate: 19.6,
      })

      // Verify calculations are handled properly
      expect(line.subtotal).toBeCloseTo(111.1, 2)
      expect(line.discountAmount).toBeCloseTo(37.03, 2)
      expect(line.totalAfterDiscount).toBeCloseTo(74.07, 2)
      expect(line.taxAmount).toBeCloseTo(14.52, 2)
      expect(line.total).toBeCloseTo(88.59, 2)
    })
  })
})
