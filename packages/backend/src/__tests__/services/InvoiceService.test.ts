import { InvoiceStatus, PaymentMethod, PaymentStatus } from "@medical-crm/shared"
import { sequelize } from "../../config/database"
import { Invoice } from "../../models/Invoice"
import { InvoiceLine } from "../../models/InvoiceLine"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Payment } from "../../models/Payment"
import { Quote } from "../../models/Quote"
import { User } from "../../models/User"
import { InvoiceService } from "../../services/InvoiceService"

describe("InvoiceService", () => {
  let testUser: User
  let testInstitution: MedicalInstitution

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    testUser = await User.create({
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "USER",
      avatarSeed: "test",
      passwordHash: "hashedpassword",
    })

    testInstitution = await MedicalInstitution.create({
      name: "Test Hospital",
      type: "hospital",
      address: {
        street: "123 Test St",
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

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await Payment.destroy({ where: {}, force: true })
    await InvoiceLine.destroy({ where: {}, force: true })
    await Invoice.destroy({ where: {}, force: true })
    await Quote.destroy({ where: {}, force: true })
  })

  describe("createInvoice", () => {
    it("should create invoice with lines", async () => {
      const invoiceData = {
        institutionId: testInstitution.id,
        title: "Test Invoice",
        description: "Test description",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [
          {
            description: "Product 1",
            quantity: 2,
            unitPrice: 100,
            discountType: "percentage" as const,
            discountValue: 10,
            taxRate: 20,
          },
          {
            description: "Product 2",
            quantity: 1,
            unitPrice: 50,
            discountType: "fixed_amount" as const,
            discountValue: 5,
            taxRate: 10,
          },
        ],
      }

      const invoice = await InvoiceService.createInvoice(invoiceData, testUser.id)

      expect(invoice).toBeDefined()
      expect(invoice.title).toBe("Test Invoice")
      expect(invoice.status).toBe(InvoiceStatus.DRAFT)
      expect(invoice.lines).toHaveLength(2)
      expect(invoice.total).toBeGreaterThan(0)
    })

    it("should throw error for non-existent institution", async () => {
      const invoiceData = {
        institutionId: "non-existent-id",
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [],
      }

      await expect(
        InvoiceService.createInvoice(invoiceData, testUser.id)
      ).rejects.toMatchObject({
        code: "INSTITUTION_NOT_FOUND",
        status: 404,
      })
    })
  })

  describe("createInvoiceFromQuote", () => {
    it("should create invoice from accepted quote", async () => {
      const quote = await Quote.createQuote({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await quote.send()
      await quote.accept()

      const invoice = await InvoiceService.createInvoiceFromQuote(quote.id, testUser.id)

      expect(invoice).toBeDefined()
      expect(invoice.quoteId).toBe(quote.id)
      expect(invoice.title).toBe(quote.title)
      expect(invoice.status).toBe(InvoiceStatus.DRAFT)
    })

    it("should throw error for non-accepted quote", async () => {
      const quote = await Quote.createQuote({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await expect(
        InvoiceService.createInvoiceFromQuote(quote.id, testUser.id)
      ).rejects.toMatchObject({
        code: "QUOTE_NOT_ACCEPTED",
        status: 400,
      })
    })

    it("should throw error for non-existent quote", async () => {
      await expect(
        InvoiceService.createInvoiceFromQuote("non-existent-id", testUser.id)
      ).rejects.toMatchObject({
        code: "QUOTE_NOT_FOUND",
        status: 404,
      })
    })
  })

  describe("updateInvoice", () => {
    it("should update draft invoice", async () => {
      const invoice = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Original Title",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )

      const updatedInvoice = await InvoiceService.updateInvoice(
        invoice.id,
        {
          title: "Updated Title",
          description: "Updated description",
        },
        testUser.id
      )

      expect(updatedInvoice.title).toBe("Updated Title")
      expect(updatedInvoice.description).toBe("Updated description")
    })

    it("should not allow updating sent invoice", async () => {
      const invoice = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Test Invoice",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )

      await invoice.send()

      await expect(
        InvoiceService.updateInvoice(invoice.id, { title: "Updated Title" }, testUser.id)
      ).rejects.toMatchObject({
        code: "INVOICE_NOT_MODIFIABLE",
        status: 400,
      })
    })
  })

  describe("sendInvoice", () => {
    it("should send draft invoice", async () => {
      const invoice = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Test Invoice",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )

      const sentInvoice = await InvoiceService.sendInvoice(invoice.id, testUser.id)

      expect(sentInvoice.status).toBe(InvoiceStatus.SENT)
      expect(sentInvoice.sentAt).toBeDefined()
    })
  })

  describe("recordPayment", () => {
    let testInvoice: Invoice

    beforeEach(async () => {
      testInvoice = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Test Invoice",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )

      testInvoice.total = 1000
      await testInvoice.save()
      await testInvoice.send()
    })

    it("should record payment for sent invoice", async () => {
      const paymentData = {
        invoiceId: testInvoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        reference: "TXN123456",
        notes: "Partial payment",
      }

      const payment = await InvoiceService.recordPayment(paymentData, testUser.id)

      expect(payment).toBeDefined()
      expect(payment.amount).toBe(500)
      expect(payment.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER)
      expect(payment.status).toBe(PaymentStatus.PENDING)
    })

    it("should not allow payment exceeding remaining amount", async () => {
      const paymentData = {
        invoiceId: testInvoice.id,
        amount: 1500, // More than invoice total
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }

      await expect(
        InvoiceService.recordPayment(paymentData, testUser.id)
      ).rejects.toMatchObject({
        code: "PAYMENT_EXCEEDS_REMAINING",
        status: 400,
      })
    })

    it("should not allow payment for draft invoice", async () => {
      const draftInvoice = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Draft Invoice",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )

      draftInvoice.total = 1000
      await draftInvoice.save()

      const paymentData = {
        invoiceId: draftInvoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }

      await expect(
        InvoiceService.recordPayment(paymentData, testUser.id)
      ).rejects.toMatchObject({
        code: "INVOICE_CANNOT_RECEIVE_PAYMENTS",
        status: 400,
      })
    })
  })

  describe("confirmPayment", () => {
    it("should confirm pending payment", async () => {
      const invoice = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Test Invoice",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )

      invoice.total = 1000
      await invoice.save()
      await invoice.send()

      const payment = await InvoiceService.recordPayment(
        {
          invoiceId: invoice.id,
          amount: 500,
          paymentDate: new Date(),
          paymentMethod: PaymentMethod.BANK_TRANSFER,
        },
        testUser.id
      )

      const confirmedPayment = await InvoiceService.confirmPayment(
        payment.id,
        testUser.id
      )

      expect(confirmedPayment.status).toBe(PaymentStatus.CONFIRMED)
    })
  })

  describe("searchInvoices", () => {
    beforeEach(async () => {
      // Create test invoices
      const invoice1 = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Invoice 1",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )

      const invoice2 = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Invoice 2",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )

      await invoice2.send()
    })

    it("should search invoices with filters", async () => {
      const result = await InvoiceService.searchInvoices(
        { status: InvoiceStatus.SENT },
        testUser.id,
        "USER"
      )

      expect(result.invoices).toHaveLength(1)
      expect(result.invoices[0].status).toBe(InvoiceStatus.SENT)
      expect(result.total).toBe(1)
    })

    it("should paginate results", async () => {
      const result = await InvoiceService.searchInvoices({}, testUser.id, "USER", 1, 1)

      expect(result.invoices).toHaveLength(1)
      expect(result.total).toBe(2)
      expect(result.pages).toBe(2)
    })
  })

  describe("getInvoiceStatistics", () => {
    beforeEach(async () => {
      // Create invoices with different statuses and payments
      const invoice1 = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Draft Invoice",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )
      invoice1.total = 1000
      await invoice1.save()

      const invoice2 = await InvoiceService.createInvoice(
        {
          institutionId: testInstitution.id,
          title: "Paid Invoice",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: [],
        },
        testUser.id
      )
      invoice2.total = 2000
      await invoice2.save()
      await invoice2.send()

      // Add payment
      const payment = await Payment.createPayment({
        invoiceId: invoice2.id,
        amount: 2000,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: testUser.id,
      })
      await payment.confirm()
    })

    it("should return invoice statistics", async () => {
      const stats = await InvoiceService.getInvoiceStatistics(testUser.id)

      expect(stats.totalInvoices).toBe(2)
      expect(stats.totalAmount).toBe(3000)
      expect(stats.paidAmount).toBe(2000)
      expect(stats.statusBreakdown).toBeDefined()
      expect(stats.statusBreakdown[InvoiceStatus.DRAFT]).toBe(1)
      expect(stats.paymentMethodBreakdown).toBeDefined()
      expect(stats.paymentMethodBreakdown[PaymentMethod.BANK_TRANSFER]).toBe(1)
    })
  })

  describe("validation", () => {
    it("should validate invoice data", () => {
      expect(() => {
        InvoiceService.validateInvoiceData({ title: "" })
      }).toThrow("Invoice title cannot be empty")

      expect(() => {
        InvoiceService.validateInvoiceData({
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        })
      }).toThrow("Due date cannot be in the past")
    })

    it("should validate invoice line data", () => {
      expect(() => {
        InvoiceService.validateInvoiceLineData({ quantity: 0 })
      }).toThrow("Quantity must be greater than zero")

      expect(() => {
        InvoiceService.validateInvoiceLineData({ unitPrice: -10 })
      }).toThrow("Unit price cannot be negative")

      expect(() => {
        InvoiceService.validateInvoiceLineData({ discountValue: -5 })
      }).toThrow("Discount value cannot be negative")

      expect(() => {
        InvoiceService.validateInvoiceLineData({ taxRate: 150 })
      }).toThrow("Tax rate must be between 0 and 100")
    })
  })
})
