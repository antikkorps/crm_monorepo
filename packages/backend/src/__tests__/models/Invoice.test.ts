import { InvoiceStatus } from "@medical-crm/shared"
import { sequelize } from "../../config/database"
import { Invoice } from "../../models/Invoice"
import { InvoiceLine } from "../../models/InvoiceLine"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Payment } from "../../models/Payment"
import { Quote } from "../../models/Quote"
import { User } from "../../models/User"

describe("Invoice Model", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await Payment.destroy({ where: {}, force: true })
    await InvoiceLine.destroy({ where: {}, force: true })
    await Invoice.destroy({ where: {}, force: true })
    await Quote.destroy({ where: {}, force: true })
    await MedicalInstitution.destroy({ where: {}, force: true })
    await User.destroy({ where: {}, force: true })
  })

  describe("Model Creation", () => {
    it("should create an invoice with valid data", async () => {
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

      const invoiceData = {
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Invoice",
        description: "Test invoice description",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      }

      const invoice = await Invoice.createInvoice(invoiceData)

      expect(invoice).toBeDefined()
      expect(invoice.title).toBe("Test Invoice")
      expect(invoice.status).toBe(InvoiceStatus.DRAFT)
      expect(invoice.invoiceNumber).toMatch(/^INV\d{6}\d{4}$/)
      expect(invoice.subtotal).toBe(0)
      expect(invoice.total).toBe(0)
      expect(invoice.totalPaid).toBe(0)
      expect(invoice.remainingAmount).toBe(0)
    })

    it("should generate unique invoice numbers", async () => {
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

      const invoiceData = {
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }

      const invoice1 = await Invoice.createInvoice(invoiceData)
      const invoice2 = await Invoice.createInvoice(invoiceData)

      expect(invoice1.invoiceNumber).not.toBe(invoice2.invoiceNumber)
    })

    it("should validate required fields", async () => {
      await expect(
        Invoice.create({
          // Missing required fields
          title: "",
          dueDate: new Date(),
        } as any)
      ).rejects.toThrow()
    })
  })

  describe("Invoice Status Management", () => {
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

    it("should send a draft invoice", async () => {
      expect(invoice.status).toBe(InvoiceStatus.DRAFT)
      expect(invoice.canBeModified()).toBe(true)

      await invoice.send()

      expect(invoice.status).toBe(InvoiceStatus.SENT)
      expect(invoice.sentAt).toBeDefined()
      expect(invoice.canReceivePayments()).toBe(true)
    })

    it("should cancel a draft or sent invoice", async () => {
      // Cancel draft invoice
      await invoice.cancel()
      expect(invoice.status).toBe(InvoiceStatus.CANCELLED)

      // Create new invoice and send it
      const newInvoice = await Invoice.createInvoice({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Test Invoice 2",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await newInvoice.send()
      await newInvoice.cancel()
      expect(newInvoice.status).toBe(InvoiceStatus.CANCELLED)
    })

    it("should not allow invalid status transitions", async () => {
      // Cannot send an already sent invoice
      await invoice.send()
      await expect(invoice.send()).rejects.toThrow("Only draft invoices can be sent")

      // Cannot modify a sent invoice
      await invoice.send()
      expect(invoice.canBeModified()).toBe(false)
    })
  })

  describe("Invoice Payment Status", () => {
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

      // Set invoice total for payment testing
      invoice.total = 1000
      await invoice.save()
    })

    it("should detect overdue invoices", async () => {
      const overdueInvoice = await Invoice.create({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Overdue Invoice",
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        status: InvoiceStatus.SENT,
        invoiceNumber: "INV2024010001",
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 1000,
        totalPaid: 0,
        remainingAmount: 1000,
      })

      expect(overdueInvoice.isOverdue()).toBe(true)
      expect(overdueInvoice.canReceivePayments()).toBe(true)
    })

    it("should calculate days overdue", async () => {
      const overdueInvoice = await Invoice.create({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Overdue Invoice",
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: InvoiceStatus.SENT,
        invoiceNumber: "INV2024010002",
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 1000,
        totalPaid: 0,
        remainingAmount: 1000,
      })

      const daysOverdue = overdueInvoice.getDaysOverdue()
      expect(daysOverdue).toBe(5)
    })

    it("should calculate days until due", async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
      const invoice = await Invoice.create({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Future Invoice",
        dueDate: futureDate,
        status: InvoiceStatus.SENT,
        invoiceNumber: "INV2024010003",
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 1000,
        totalPaid: 0,
        remainingAmount: 1000,
      })

      const daysUntilDue = invoice.getDaysUntilDue()
      expect(daysUntilDue).toBe(10)
    })

    it("should mark overdue invoices", async () => {
      // Create overdue invoice
      await Invoice.create({
        institutionId: institution.id,
        assignedUserId: user.id,
        title: "Overdue Invoice",
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: InvoiceStatus.SENT,
        invoiceNumber: "INV2024010004",
        subtotal: 0,
        totalDiscountAmount: 0,
        totalTaxAmount: 0,
        total: 1000,
        totalPaid: 0,
        remainingAmount: 1000,
      })

      const affectedCount = await Invoice.markOverdueInvoices()
      expect(affectedCount).toBe(1)

      const overdueInvoice = await Invoice.findOne({
        where: { title: "Overdue Invoice" },
      })
      expect(overdueInvoice?.status).toBe(InvoiceStatus.OVERDUE)
    })

    it("should update payment status correctly", async () => {
      await invoice.send()

      // Create partial payment
      const payment1 = await Payment.create({
        invoiceId: invoice.id,
        amount: 300,
        paymentDate: new Date(),
        paymentMethod: "bank_transfer",
        status: "confirmed",
        recordedBy: user.id,
      })

      await invoice.updatePaymentStatus()
      await invoice.reload()

      expect(invoice.totalPaid).toBe(300)
      expect(invoice.remainingAmount).toBe(700)
      expect(invoice.status).toBe(InvoiceStatus.PARTIALLY_PAID)
      expect(invoice.isPartiallyPaid()).toBe(true)
      expect(invoice.isFullyPaid()).toBe(false)

      // Create full payment
      const payment2 = await Payment.create({
        invoiceId: invoice.id,
        amount: 700,
        paymentDate: new Date(),
        paymentMethod: "bank_transfer",
        status: "confirmed",
        recordedBy: user.id,
      })

      await invoice.updatePaymentStatus()
      await invoice.reload()

      expect(invoice.totalPaid).toBe(1000)
      expect(invoice.remainingAmount).toBe(0)
      expect(invoice.status).toBe(InvoiceStatus.PAID)
      expect(invoice.isFullyPaid()).toBe(true)
      expect(invoice.paidAt).toBeDefined()
    })
  })

  describe("Invoice Totals Calculation", () => {
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

    it("should recalculate totals when lines are added", async () => {
      // Add invoice lines
      const line1 = await InvoiceLine.create({
        invoiceId: invoice.id,
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

      const line2 = await InvoiceLine.create({
        invoiceId: invoice.id,
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

      await invoice.recalculateTotals()

      expect(invoice.subtotal).toBe(250) // 200 + 50
      expect(invoice.totalDiscountAmount).toBe(25) // 20 + 5
      expect(invoice.totalTaxAmount).toBe(45) // 36 + 9
      expect(invoice.total).toBe(270) // 216 + 54
      expect(invoice.remainingAmount).toBe(270) // total - totalPaid (0)
    })
  })

  describe("Create Invoice from Quote", () => {
    let user: User
    let institution: MedicalInstitution
    let quote: Quote

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
        description: "Test quote description",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await quote.send()
      await quote.accept()
    })

    it("should create invoice from accepted quote", async () => {
      const invoice = await Invoice.createFromQuote(quote)

      expect(invoice).toBeDefined()
      expect(invoice.institutionId).toBe(quote.institutionId)
      expect(invoice.assignedUserId).toBe(quote.assignedUserId)
      expect(invoice.quoteId).toBe(quote.id)
      expect(invoice.title).toBe(quote.title)
      expect(invoice.description).toBe(quote.description)
      expect(invoice.status).toBe(InvoiceStatus.DRAFT)
      expect(invoice.dueDate).toBeDefined()
    })
  })

  describe("Invoice Queries", () => {
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

    it("should find invoices by institution", async () => {
      await Invoice.createInvoice({
        institutionId: institution1.id,
        assignedUserId: user1.id,
        title: "Invoice for Hospital 1",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await Invoice.createInvoice({
        institutionId: institution2.id,
        assignedUserId: user1.id,
        title: "Invoice for Hospital 2",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const invoicesForInstitution1 = await Invoice.findByInstitution(institution1.id)
      expect(invoicesForInstitution1).toHaveLength(1)
      expect(invoicesForInstitution1[0].title).toBe("Invoice for Hospital 1")
    })

    it("should find invoices by user", async () => {
      await Invoice.createInvoice({
        institutionId: institution1.id,
        assignedUserId: user1.id,
        title: "Invoice by User 1",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await Invoice.createInvoice({
        institutionId: institution1.id,
        assignedUserId: user2.id,
        title: "Invoice by User 2",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const invoicesForUser1 = await Invoice.findByUser(user1.id)
      expect(invoicesForUser1).toHaveLength(1)
      expect(invoicesForUser1[0].title).toBe("Invoice by User 1")
    })

    it("should find invoices by status", async () => {
      const invoice1 = await Invoice.createInvoice({
        institutionId: institution1.id,
        assignedUserId: user1.id,
        title: "Draft Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      const invoice2 = await Invoice.createInvoice({
        institutionId: institution1.id,
        assignedUserId: user1.id,
        title: "Sent Invoice",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await invoice2.send()

      const draftInvoices = await Invoice.findByStatus(InvoiceStatus.DRAFT)
      const sentInvoices = await Invoice.findByStatus(InvoiceStatus.SENT)

      expect(draftInvoices).toHaveLength(1)
      expect(draftInvoices[0].title).toBe("Draft Invoice")
      expect(sentInvoices).toHaveLength(1)
      expect(sentInvoices[0].title).toBe("Sent Invoice")
    })
  })
})
