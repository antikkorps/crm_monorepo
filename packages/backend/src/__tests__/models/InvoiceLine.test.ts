import { DiscountType } from "@medical-crm/shared"
import { sequelize } from "../../config/database"
import { Invoice } from "../../models/Invoice"
import { InvoiceLine } from "../../models/InvoiceLine"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { User } from "../../models/User"

describe("InvoiceLine Model", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await InvoiceLine.destroy({ where: {}, force: true })
    await Invoice.destroy({ where: {}, force: true })
    await MedicalInstitution.destroy({ where: {}, force: true })
    await User.destroy({ where: {}, force: true })
  })

  describe("Model Creation", () => {
    let invoice: Invoice
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

      invoice = await Invoice.createInvoice({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
    })

    it("should create an invoice line with valid data", async () => {
      const lineData = {
        invoiceId: invoice.id,
        description: "Test Product",
        quantity: 2,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        taxRate: 20,
      }

      const line = await InvoiceLine.createLine(lineData)

      expect(line).toBeDefined()
      expect(line.description).toBe("Test Product")
      expect(line.quantity).toBe(2)
      expect(line.unitPrice).toBe(100)
      expect(line.orderIndex).toBe(1)
      expect(line.subtotal).toBe(200) // 2 * 100
      expect(line.discountAmount).toBe(20) // 200 * 0.1
      expect(line.totalAfterDiscount).toBe(180) // 200 - 20
      expect(line.taxAmount).toBe(36) // 180 * 0.2
      expect(line.total).toBe(216) // 180 + 36
    })

    it("should auto-increment order index", async () => {
      const lineData = {
        invoiceId: invoice.id,
        description: "Test Product",
        quantity: 1,
        unitPrice: 100,
      }

      const line1 = await InvoiceLine.createLine(lineData)
      const line2 = await InvoiceLine.createLine(lineData)
      const line3 = await InvoiceLine.createLine(lineData)

      expect(line1.orderIndex).toBe(1)
      expect(line2.orderIndex).toBe(2)
      expect(line3.orderIndex).toBe(3)
    })

    it("should validate required fields", async () => {
      await expect(
        InvoiceLine.create({
          // Missing required fields
          description: "",
          quantity: 0,
        } as any)
      ).rejects.toThrow()
    })
  })

  describe("Discount Calculations", () => {
    let invoice: Invoice
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

      invoice = await Invoice.createInvoice({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
    })

    it("should calculate percentage discount correctly", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product with percentage discount",
        quantity: 2,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15, // 15%
        taxRate: 10,
      })

      expect(line.subtotal).toBe(200) // 2 * 100
      expect(line.discountAmount).toBe(30) // 200 * 0.15
      expect(line.totalAfterDiscount).toBe(170) // 200 - 30
      expect(line.taxAmount).toBe(17) // 170 * 0.1
      expect(line.total).toBe(187) // 170 + 17
      expect(line.getDiscountPercentage()).toBe(15)
    })

    it("should calculate fixed amount discount correctly", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product with fixed discount",
        quantity: 3,
        unitPrice: 50,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 25, // $25 fixed
        taxRate: 8,
      })

      expect(line.subtotal).toBe(150) // 3 * 50
      expect(line.discountAmount).toBe(25) // Fixed $25
      expect(line.totalAfterDiscount).toBe(125) // 150 - 25
      expect(line.taxAmount).toBe(10) // 125 * 0.08
      expect(line.total).toBe(135) // 125 + 10
      expect(line.getDiscountPercentage()).toBeCloseTo(16.67, 2) // 25/150 * 100
    })

    it("should not allow fixed discount greater than subtotal", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product with excessive fixed discount",
        quantity: 1,
        unitPrice: 50,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 100, // $100 fixed (more than $50 subtotal)
        taxRate: 10,
      })

      expect(line.subtotal).toBe(50)
      expect(line.discountAmount).toBe(50) // Capped at subtotal
      expect(line.totalAfterDiscount).toBe(0)
      expect(line.taxAmount).toBe(0)
      expect(line.total).toBe(0)
    })

    it("should handle zero discount", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: invoice.id,
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

    it("should validate discount values", async () => {
      const line = InvoiceLine.build({
        invoiceId: invoice.id,
        description: "Test",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 150, // Invalid: > 100%
        taxRate: 10,
      })

      line.calculateTotals()
      expect(line.validateDiscount()).toBe(false)

      // Valid percentage
      line.discountValue = 50
      line.calculateTotals()
      expect(line.validateDiscount()).toBe(true)

      // Valid fixed amount
      line.discountType = DiscountType.FIXED_AMOUNT
      line.discountValue = 80
      line.calculateTotals()
      expect(line.validateDiscount()).toBe(true)
    })
  })

  describe("Tax Calculations", () => {
    let invoice: Invoice
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

      invoice = await Invoice.createInvoice({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
    })

    it("should calculate tax on discounted amount", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product with tax on discounted amount",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20, // 20% discount
        taxRate: 10, // 10% tax
      })

      expect(line.subtotal).toBe(100)
      expect(line.discountAmount).toBe(20) // 100 * 0.2
      expect(line.totalAfterDiscount).toBe(80) // 100 - 20
      expect(line.taxAmount).toBe(8) // 80 * 0.1 (tax on discounted amount)
      expect(line.total).toBe(88) // 80 + 8
    })

    it("should handle zero tax rate", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product with no tax",
        quantity: 2,
        unitPrice: 50,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        taxRate: 0,
      })

      expect(line.subtotal).toBe(100)
      expect(line.discountAmount).toBe(10)
      expect(line.totalAfterDiscount).toBe(90)
      expect(line.taxAmount).toBe(0)
      expect(line.total).toBe(90)
    })

    it("should handle high tax rates", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product with high tax",
        quantity: 1,
        unitPrice: 100,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 0,
        taxRate: 25, // 25% tax
      })

      expect(line.subtotal).toBe(100)
      expect(line.discountAmount).toBe(0)
      expect(line.totalAfterDiscount).toBe(100)
      expect(line.taxAmount).toBe(25)
      expect(line.total).toBe(125)
    })
  })

  describe("Line Management", () => {
    let invoice: Invoice
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

      invoice = await Invoice.createInvoice({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
    })

    it("should find lines by invoice", async () => {
      const line1 = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 100,
      })

      const line2 = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 2",
        quantity: 2,
        unitPrice: 50,
      })

      const lines = await InvoiceLine.findByInvoice(invoice.id)
      expect(lines).toHaveLength(2)
      expect(lines[0].orderIndex).toBe(1)
      expect(lines[1].orderIndex).toBe(2)
    })

    it("should reorder lines", async () => {
      const line1 = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 100,
      })

      const line2 = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 2",
        quantity: 1,
        unitPrice: 50,
      })

      const line3 = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 3",
        quantity: 1,
        unitPrice: 75,
      })

      // Reorder: line3, line1, line2
      await InvoiceLine.reorderLines(invoice.id, [line3.id, line1.id, line2.id])

      const reorderedLines = await InvoiceLine.findByInvoice(invoice.id)
      expect(reorderedLines[0].id).toBe(line3.id)
      expect(reorderedLines[0].orderIndex).toBe(1)
      expect(reorderedLines[1].id).toBe(line1.id)
      expect(reorderedLines[1].orderIndex).toBe(2)
      expect(reorderedLines[2].id).toBe(line2.id)
      expect(reorderedLines[2].orderIndex).toBe(3)
    })

    it("should update order indexes after deletion", async () => {
      const line1 = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 100,
      })

      const line2 = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 2",
        quantity: 1,
        unitPrice: 50,
      })

      const line3 = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 3",
        quantity: 1,
        unitPrice: 75,
      })

      // Delete middle line
      await line2.destroy()

      // Update order indexes
      await InvoiceLine.updateOrderIndexes(invoice.id)

      const remainingLines = await InvoiceLine.findByInvoice(invoice.id)
      expect(remainingLines).toHaveLength(2)
      expect(remainingLines[0].orderIndex).toBe(1)
      expect(remainingLines[1].orderIndex).toBe(2)
    })

    it("should delete all lines by invoice", async () => {
      await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 1",
        quantity: 1,
        unitPrice: 100,
      })

      await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product 2",
        quantity: 1,
        unitPrice: 50,
      })

      const deletedCount = await InvoiceLine.deleteByInvoice(invoice.id)
      expect(deletedCount).toBe(2)

      const remainingLines = await InvoiceLine.findByInvoice(invoice.id)
      expect(remainingLines).toHaveLength(0)
    })
  })

  describe("Decimal Precision", () => {
    let invoice: Invoice
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

      invoice = await Invoice.createInvoice({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
    })

    it("should handle fractional quantities", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Product with fractional quantity",
        quantity: 2.5,
        unitPrice: 33.33,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        taxRate: 8.25,
      })

      expect(line.subtotal).toBeCloseTo(83.33, 2) // 2.5 * 33.33
      expect(line.discountAmount).toBeCloseTo(8.33, 2) // 83.33 * 0.1
      expect(line.totalAfterDiscount).toBeCloseTo(75.0, 2) // 83.33 - 8.33
      expect(line.taxAmount).toBeCloseTo(6.19, 2) // 75.00 * 0.0825
      expect(line.total).toBeCloseTo(81.19, 2) // 75.00 + 6.19
    })

    it("should handle complex calculations with precision", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: invoice.id,
        description: "Complex calculation",
        quantity: 3.333,
        unitPrice: 99.99,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 50.55,
        taxRate: 13.75,
      })

      expect(line.subtotal).toBeCloseTo(333.3, 2) // 3.333 * 99.99
      expect(line.discountAmount).toBe(50.55) // Fixed amount
      expect(line.totalAfterDiscount).toBeCloseTo(282.75, 2) // 333.30 - 50.55
      expect(line.taxAmount).toBeCloseTo(38.88, 2) // 282.75 * 0.1375
      expect(line.total).toBeCloseTo(321.63, 2) // 282.75 + 38.88
    })
  })
})
