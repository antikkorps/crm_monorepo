import { InvoiceStatus, PaymentMethod, PaymentStatus } from "@medical-crm/shared"
import request from "supertest"
import { createApp } from "../../app"
import { sequelize } from "../../config/database"
import { Invoice } from "../../models/Invoice"
import { InvoiceLine } from "../../models/InvoiceLine"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Payment } from "../../models/Payment"
import { Quote } from "../../models/Quote"
import { User } from "../../models/User"

describe("Invoice API Integration Tests", () => {
  let app: any
  let testUser: User
  let testInstitution: MedicalInstitution
  let authToken: string

  beforeAll(async () => {
    app = createApp()
    await sequelize.sync({ force: true })

    // Create test user
    testUser = await User.create({
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "SUPER_ADMIN",
      avatarSeed: "test",
      passwordHash: "$2b$10$test.hash.for.testing.purposes.only",
    })

    // Create test institution
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

    // Login to get auth token
    const loginResponse = await request(app.callback()).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
    })

    authToken = loginResponse.body.data.accessToken
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

  describe("POST /api/invoices", () => {
    it("should create a new invoice", async () => {
      const invoiceData = {
        institutionId: testInstitution.id,
        title: "Test Invoice",
        description: "Test invoice description",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lines: [
          {
            description: "Test Product",
            quantity: 2,
            unitPrice: 100,
            discountType: "percentage",
            discountValue: 10,
            taxRate: 20,
          },
        ],
      }

      const response = await request(app.callback())
        .post("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe("Test Invoice")
      expect(response.body.data.status).toBe(InvoiceStatus.DRAFT)
      expect(response.body.data.invoiceNumber).toMatch(/^INV\d{6}\d{4}$/)
      expect(response.body.data.lines).toHaveLength(1)
      expect(response.body.data.total).toBe(216) // (2 * 100 - 20) * 1.2
    })

    it("should validate required fields", async () => {
      const response = await request(app.callback())
        .post("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("GET /api/invoices", () => {
    it("should get all invoices with pagination", async () => {
      // Create test invoices
      await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Invoice 1",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Invoice 2",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const response = await request(app.callback())
        .get("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.meta.total).toBe(2)
      expect(response.body.meta.page).toBe(1)
    })

    it("should filter invoices by status", async () => {
      const invoice1 = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Draft Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const invoice2 = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Sent Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await invoice2.send()

      const response = await request(app.callback())
        .get("/api/invoices?status=sent")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].status).toBe(InvoiceStatus.SENT)
    })
  })

  describe("GET /api/invoices/:id", () => {
    it("should get a specific invoice", async () => {
      const invoice = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const response = await request(app.callback())
        .get(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(invoice.id)
      expect(response.body.data.title).toBe("Test Invoice")
    })

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app.callback())
        .get("/api/invoices/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INVOICE_NOT_FOUND")
    })
  })

  describe("PUT /api/invoices/:id", () => {
    it("should update an invoice", async () => {
      const invoice = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Original Title",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const updateData = {
        title: "Updated Title",
        description: "Updated description",
      }

      const response = await request(app.callback())
        .put(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe("Updated Title")
      expect(response.body.data.description).toBe("Updated description")
    })

    it("should not allow updating sent invoice", async () => {
      const invoice = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await invoice.send()

      const response = await request(app.callback())
        .put(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Updated Title" })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INVOICE_NOT_MODIFIABLE")
    })
  })

  describe("PUT /api/invoices/:id/send", () => {
    it("should send an invoice", async () => {
      const invoice = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const response = await request(app.callback())
        .put(`/api/invoices/${invoice.id}/send`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe(InvoiceStatus.SENT)
      expect(response.body.data.sentAt).toBeDefined()
    })
  })

  describe("POST /api/invoices/from-quote/:quoteId", () => {
    it("should create invoice from accepted quote", async () => {
      // Create and accept a quote
      const quote = await Quote.createQuote({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await quote.send()
      await quote.accept()

      const response = await request(app.callback())
        .post(`/api/invoices/from-quote/${quote.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.quoteId).toBe(quote.id)
      expect(response.body.data.title).toBe("Test Quote")
      expect(response.body.data.status).toBe(InvoiceStatus.DRAFT)
    })

    it("should not create invoice from non-accepted quote", async () => {
      const quote = await Quote.createQuote({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const response = await request(app.callback())
        .post(`/api/invoices/from-quote/${quote.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("QUOTE_NOT_ACCEPTED")
    })
  })

  describe("Invoice Lines Management", () => {
    let testInvoice: Invoice

    beforeEach(async () => {
      testInvoice = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
    })

    it("should add line to invoice", async () => {
      const lineData = {
        description: "Test Product",
        quantity: 2,
        unitPrice: 100,
        discountType: "percentage",
        discountValue: 10,
        taxRate: 20,
      }

      const response = await request(app.callback())
        .post(`/api/invoices/${testInvoice.id}/lines`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(lineData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.description).toBe("Test Product")
      expect(response.body.data.total).toBe(216) // (2 * 100 - 20) * 1.2
    })

    it("should get invoice lines", async () => {
      await InvoiceLine.createLine({
        invoiceId: testInvoice.id,
        description: "Test Product",
        quantity: 1,
        unitPrice: 100,
      })

      const response = await request(app.callback())
        .get(`/api/invoices/${testInvoice.id}/lines`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].description).toBe("Test Product")
    })

    it("should update invoice line", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: testInvoice.id,
        description: "Original Product",
        quantity: 1,
        unitPrice: 100,
      })

      const updateData = {
        description: "Updated Product",
        quantity: 2,
        unitPrice: 150,
      }

      const response = await request(app.callback())
        .put(`/api/invoices/${testInvoice.id}/lines/${line.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.description).toBe("Updated Product")
      expect(response.body.data.quantity).toBe(2)
      expect(response.body.data.unitPrice).toBe(150)
    })

    it("should delete invoice line", async () => {
      const line = await InvoiceLine.createLine({
        invoiceId: testInvoice.id,
        description: "Test Product",
        quantity: 1,
        unitPrice: 100,
      })

      const response = await request(app.callback())
        .delete(`/api/invoices/${testInvoice.id}/lines/${line.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verify line is deleted
      const lines = await InvoiceLine.findByInvoice(testInvoice.id)
      expect(lines).toHaveLength(0)
    })
  })

  describe("Payment Management", () => {
    let testInvoice: Invoice

    beforeEach(async () => {
      testInvoice = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      // Set invoice total for payment testing
      testInvoice.total = 1000
      await testInvoice.save()
      await testInvoice.send()
    })

    it("should record payment for invoice", async () => {
      const paymentData = {
        amount: 500,
        paymentDate: new Date().toISOString(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        reference: "TXN123456",
        notes: "Partial payment",
      }

      const response = await request(app.callback())
        .post(`/api/invoices/${testInvoice.id}/payments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.amount).toBe(500)
      expect(response.body.data.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER)
      expect(response.body.data.status).toBe(PaymentStatus.PENDING)
    })

    it("should get invoice payments", async () => {
      await Payment.createPayment({
        invoiceId: testInvoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: testUser.id,
      })

      const response = await request(app.callback())
        .get(`/api/invoices/${testInvoice.id}/payments`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].amount).toBe(500)
    })

    it("should confirm payment", async () => {
      const payment = await Payment.createPayment({
        invoiceId: testInvoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: testUser.id,
      })

      const response = await request(app.callback())
        .put(`/api/invoices/payments/${payment.id}/confirm`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe(PaymentStatus.CONFIRMED)
    })

    it("should cancel payment", async () => {
      const payment = await Payment.createPayment({
        invoiceId: testInvoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: testUser.id,
      })

      const cancelData = {
        reason: "Customer requested cancellation",
      }

      const response = await request(app.callback())
        .put(`/api/invoices/payments/${payment.id}/cancel`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(cancelData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe(PaymentStatus.CANCELLED)
    })

    it("should not allow payment exceeding remaining amount", async () => {
      const paymentData = {
        amount: 1500, // More than invoice total
        paymentDate: new Date().toISOString(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      }

      const response = await request(app.callback())
        .post(`/api/invoices/${testInvoice.id}/payments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("PAYMENT_EXCEEDS_REMAINING")
    })
  })

  describe("Invoice Statistics", () => {
    beforeEach(async () => {
      // Create test invoices with different statuses
      const invoice1 = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Draft Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      invoice1.total = 1000
      await invoice1.save()

      const invoice2 = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Sent Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      invoice2.total = 2000
      await invoice2.save()
      await invoice2.send()

      // Add payment to one invoice
      const payment = await Payment.createPayment({
        invoiceId: invoice2.id,
        amount: 1000,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: testUser.id,
      })
      await payment.confirm()
    })

    it("should get invoice statistics", async () => {
      const response = await request(app.callback())
        .get("/api/invoices/statistics")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.totalInvoices).toBe(2)
      expect(response.body.data.totalAmount).toBe(3000)
      expect(response.body.data.paidAmount).toBe(1000)
      expect(response.body.data.statusBreakdown).toBeDefined()
      expect(response.body.data.paymentMethodBreakdown).toBeDefined()
    })
  })

  describe("Payment Reconciliation", () => {
    let testInvoice: Invoice

    beforeEach(async () => {
      testInvoice = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Test Invoice for Reconciliation",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      testInvoice.total = 1000
      await testInvoice.save()
      await testInvoice.send()
    })

    it("should reconcile invoice payments and update status", async () => {
      // Add multiple payments
      const payment1 = await Payment.createPayment({
        invoiceId: testInvoice.id,
        amount: 400,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: testUser.id,
      })
      await payment1.confirm()

      const payment2 = await Payment.createPayment({
        invoiceId: testInvoice.id,
        amount: 600,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: testUser.id,
      })
      await payment2.confirm()

      const response = await request(app.callback())
        .put(`/api/invoices/${testInvoice.id}/reconcile`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.totalPaid).toBe(1000)
      expect(response.body.data.remainingAmount).toBe(0)
      expect(response.body.data.statusChanged).toBe(true)
      expect(response.body.data.invoice.status).toBe(InvoiceStatus.PAID)
    })

    it("should handle partial payment reconciliation", async () => {
      // Add partial payment
      const payment = await Payment.createPayment({
        invoiceId: testInvoice.id,
        amount: 300,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CASH,
        recordedBy: testUser.id,
      })
      await payment.confirm()

      const response = await request(app.callback())
        .put(`/api/invoices/${testInvoice.id}/reconcile`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.totalPaid).toBe(300)
      expect(response.body.data.remainingAmount).toBe(700)
      expect(response.body.data.statusChanged).toBe(true)
      expect(response.body.data.invoice.status).toBe(InvoiceStatus.PARTIALLY_PAID)
    })

    it("should handle reconciliation with cancelled payments", async () => {
      // Add payments with different statuses
      const payment1 = await Payment.createPayment({
        invoiceId: testInvoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: testUser.id,
      })
      await payment1.confirm()

      const payment2 = await Payment.createPayment({
        invoiceId: testInvoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: testUser.id,
      })
      await payment2.cancel("Duplicate payment")

      const response = await request(app.callback())
        .put(`/api/invoices/${testInvoice.id}/reconcile`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.totalPaid).toBe(500) // Only confirmed payment
      expect(response.body.data.remainingAmount).toBe(500)
      expect(response.body.data.invoice.status).toBe(InvoiceStatus.PARTIALLY_PAID)
    })
  })

  describe("Payment History", () => {
    beforeEach(async () => {
      // Create multiple invoices with payments
      const invoice1 = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Invoice 1",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      invoice1.total = 1000
      await invoice1.save()
      await invoice1.send()

      const invoice2 = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Invoice 2",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      invoice2.total = 2000
      await invoice2.save()
      await invoice2.send()

      // Add payments with different methods and statuses
      const payment1 = await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 500,
        paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: testUser.id,
      })
      await payment1.confirm()

      const payment2 = await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 500,
        paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: testUser.id,
      })
      await payment2.confirm()

      await Payment.createPayment({
        invoiceId: invoice2.id,
        amount: 1000,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CASH,
        recordedBy: testUser.id,
      })
      // This payment remains pending
    })

    it("should get payment history with pagination", async () => {
      const response = await request(app.callback())
        .get("/api/invoices/payments/history")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(3)
      expect(response.body.meta.total).toBe(3)
      expect(response.body.meta.page).toBe(1)
      expect(response.body.meta.totalPages).toBe(1)
    })

    it("should filter payment history by status", async () => {
      const response = await request(app.callback())
        .get("/api/invoices/payments/history?status=confirmed")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(
        response.body.data.every((p: any) => p.status === PaymentStatus.CONFIRMED)
      ).toBe(true)
    })

    it("should filter payment history by payment method", async () => {
      const response = await request(app.callback())
        .get(
          `/api/invoices/payments/history?paymentMethod=${PaymentMethod.BANK_TRANSFER}`
        )
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].paymentMethod).toBe(PaymentMethod.BANK_TRANSFER)
    })

    it("should filter payment history by date range", async () => {
      const dateFrom = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
      const dateTo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago

      const response = await request(app.callback())
        .get(`/api/invoices/payments/history?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2) // Payments from 2 days ago and 1 day ago
    })

    it("should paginate payment history", async () => {
      const response = await request(app.callback())
        .get("/api/invoices/payments/history?page=1&limit=2")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.meta.total).toBe(3)
      expect(response.body.meta.totalPages).toBe(2)
    })
  })

  describe("Payment Summary", () => {
    beforeEach(async () => {
      // Create invoices and payments for summary testing
      const invoice1 = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Invoice 1",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      invoice1.total = 1000
      await invoice1.save()
      await invoice1.send()

      const invoice2 = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Invoice 2",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      invoice2.total = 2000
      await invoice2.save()
      await invoice2.send()

      // Add payments with different statuses and methods
      const payment1 = await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 800,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: testUser.id,
      })
      await payment1.confirm()

      const payment2 = await Payment.createPayment({
        invoiceId: invoice2.id,
        amount: 1500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: testUser.id,
      })
      await payment2.confirm()

      const payment3 = await Payment.createPayment({
        invoiceId: invoice2.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CASH,
        recordedBy: testUser.id,
      })
      // This payment remains pending

      const payment4 = await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 200,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        recordedBy: testUser.id,
      })
      await payment4.cancel("Customer requested cancellation")
    })

    it("should get payment summary with analytics", async () => {
      const response = await request(app.callback())
        .get("/api/invoices/payments/summary")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.totalPayments).toBe(4)
      expect(response.body.data.totalAmount).toBe(3000) // 800 + 1500 + 500 + 200
      expect(response.body.data.confirmedAmount).toBe(2300) // 800 + 1500
      expect(response.body.data.pendingAmount).toBe(500)
      expect(response.body.data.cancelledAmount).toBe(200)
      expect(response.body.data.averagePaymentAmount).toBe(750) // 3000 / 4

      // Check payment method breakdown
      expect(
        response.body.data.paymentMethodBreakdown[PaymentMethod.BANK_TRANSFER].count
      ).toBe(1)
      expect(
        response.body.data.paymentMethodBreakdown[PaymentMethod.BANK_TRANSFER].amount
      ).toBe(800)
      expect(response.body.data.paymentMethodBreakdown[PaymentMethod.CHECK].count).toBe(1)
      expect(response.body.data.paymentMethodBreakdown[PaymentMethod.CHECK].amount).toBe(
        1500
      )

      // Check status breakdown
      expect(response.body.data.statusBreakdown[PaymentStatus.CONFIRMED].count).toBe(2)
      expect(response.body.data.statusBreakdown[PaymentStatus.CONFIRMED].amount).toBe(
        2300
      )
      expect(response.body.data.statusBreakdown[PaymentStatus.PENDING].count).toBe(1)
      expect(response.body.data.statusBreakdown[PaymentStatus.PENDING].amount).toBe(500)
      expect(response.body.data.statusBreakdown[PaymentStatus.CANCELLED].count).toBe(1)
      expect(response.body.data.statusBreakdown[PaymentStatus.CANCELLED].amount).toBe(200)

      // Check monthly trends
      expect(response.body.data.monthlyTrends).toBeDefined()
      expect(Array.isArray(response.body.data.monthlyTrends)).toBe(true)
    })

    it("should filter payment summary by date range", async () => {
      const dateFrom = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      const dateTo = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day from now

      const response = await request(app.callback())
        .get(`/api/invoices/payments/summary?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.totalPayments).toBe(4) // All payments are within range
    })
  })

  describe("Advanced Payment Workflows", () => {
    let testInvoice: Invoice

    beforeEach(async () => {
      testInvoice = await Invoice.createInvoice({
        institutionId: testInstitution.id,
        assignedUserId: testUser.id,
        title: "Advanced Workflow Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      testInvoice.total = 1000
      await testInvoice.save()
      await testInvoice.send()
    })

    it("should handle complex payment scenarios with automatic status updates", async () => {
      // Record first partial payment
      const payment1Response = await request(app.callback())
        .post(`/api/invoices/${testInvoice.id}/payments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 300,
          paymentDate: new Date().toISOString(),
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          reference: "TXN001",
        })
        .expect(201)

      // Confirm first payment
      await request(app.callback())
        .put(`/api/invoices/payments/${payment1Response.body.data.id}/confirm`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      // Record second payment that completes the invoice
      const payment2Response = await request(app.callback())
        .post(`/api/invoices/${testInvoice.id}/payments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 700,
          paymentDate: new Date().toISOString(),
          paymentMethod: PaymentMethod.CHECK,
          reference: "CHK002",
        })
        .expect(201)

      // Confirm second payment
      await request(app.callback())
        .put(`/api/invoices/payments/${payment2Response.body.data.id}/confirm`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      // Reconcile payments to update invoice status
      const reconcileResponse = await request(app.callback())
        .put(`/api/invoices/${testInvoice.id}/reconcile`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(reconcileResponse.body.data.invoice.status).toBe(InvoiceStatus.PAID)
      expect(reconcileResponse.body.data.totalPaid).toBe(1000)
      expect(reconcileResponse.body.data.remainingAmount).toBe(0)
    })

    it("should handle payment cancellation and status reversion", async () => {
      // Record and confirm a payment that fully pays the invoice
      const paymentResponse = await request(app.callback())
        .post(`/api/invoices/${testInvoice.id}/payments`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 1000,
          paymentDate: new Date().toISOString(),
          paymentMethod: PaymentMethod.BANK_TRANSFER,
        })
        .expect(201)

      await request(app.callback())
        .put(`/api/invoices/payments/${paymentResponse.body.data.id}/confirm`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      // Reconcile to mark as paid
      await request(app.callback())
        .put(`/api/invoices/${testInvoice.id}/reconcile`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      // Cancel the payment
      await request(app.callback())
        .put(`/api/invoices/payments/${paymentResponse.body.data.id}/cancel`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ reason: "Payment bounced" })
        .expect(200)

      // Reconcile again to update status
      const reconcileResponse = await request(app.callback())
        .put(`/api/invoices/${testInvoice.id}/reconcile`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(reconcileResponse.body.data.invoice.status).toBe(InvoiceStatus.SENT)
      expect(reconcileResponse.body.data.totalPaid).toBe(0)
      expect(reconcileResponse.body.data.remainingAmount).toBe(1000)
    })
  })
})
