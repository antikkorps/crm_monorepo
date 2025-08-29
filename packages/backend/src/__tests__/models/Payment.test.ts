import { PaymentMethod, PaymentStatus } from "@medical-crm/shared"
import { sequelize } from "../../config/database"
import { Invoice } from "../../models/Invoice"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Payment } from "../../models/Payment"
import { User } from "../../models/User"

describe("Payment Model", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await Payment.destroy({ where: {}, force: true })
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

      // Set invoice total for payment testing
      invoice.total = 1000
      await invoice.save()
    })

    it("should create a payment with valid data", async () => {
      const paymentData = {
        invoiceId: invoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        reference: "TXN123456",
        notes: "Partial payment",
        recordedBy: user.id,
      }

      const payment = await Payment.createPayment(paymentData)

      expect(payment).toBeDefined()
      expect(payment.amount).toBe(500)
      expect(payment.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER)
      expect(payment.reference).toBe("TXN123456")
      expect(payment.status).toBe(PaymentStatus.PENDING)
      expect(payment.recordedBy).toBe(user.id)
    })

    it("should validate required fields", async () => {
      await expect(
        Payment.create({
          // Missing required fields
          amount: 0,
        } as any)
      ).rejects.toThrow()
    })

    it("should validate minimum amount", async () => {
      await expect(
        Payment.create({
          invoiceId: invoice.id,
          amount: 0, // Invalid: must be > 0
          paymentDate: new Date(),
          paymentMethod: PaymentMethod.CASH,
          recordedBy: user.id,
        })
      ).rejects.toThrow()
    })
  })

  describe("Payment Status Management", () => {
    let payment: Payment
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

      invoice.total = 1000
      await invoice.save()

      payment = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user.id,
      })
    })

    it("should confirm a pending payment", async () => {
      expect(payment.status).toBe(PaymentStatus.PENDING)
      expect(payment.canBeConfirmed()).toBe(true)

      await payment.confirm()

      expect(payment.status).toBe(PaymentStatus.CONFIRMED)
      expect(payment.canBeConfirmed()).toBe(false)
    })

    it("should fail a pending payment", async () => {
      expect(payment.status).toBe(PaymentStatus.PENDING)

      await payment.fail("Bank rejected the transaction")

      expect(payment.status).toBe(PaymentStatus.FAILED)
      expect(payment.notes).toContain("Failed: Bank rejected the transaction")
    })

    it("should cancel a pending payment", async () => {
      expect(payment.status).toBe(PaymentStatus.PENDING)
      expect(payment.canBeCancelled()).toBe(true)

      await payment.cancel("Customer requested cancellation")

      expect(payment.status).toBe(PaymentStatus.CANCELLED)
      expect(payment.notes).toContain("Cancelled: Customer requested cancellation")
      expect(payment.canBeCancelled()).toBe(false)
    })

    it("should not allow invalid status transitions", async () => {
      // Confirm payment first
      await payment.confirm()

      // Cannot confirm an already confirmed payment
      await expect(payment.confirm()).rejects.toThrow(
        "Payment cannot be confirmed in its current state"
      )

      // Cannot cancel a confirmed payment
      expect(payment.canBeCancelled()).toBe(false)
    })

    it("should update invoice payment status when payment is confirmed", async () => {
      await invoice.send()

      // Confirm payment
      await payment.confirm()

      // Reload invoice to get updated payment status
      await invoice.reload()
      expect(invoice.totalPaid).toBe(500)
      expect(invoice.remainingAmount).toBe(500)
      expect(invoice.status).toBe("partially_paid")
    })
  })

  describe("Payment Methods", () => {
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

      invoice.total = 1000
      await invoice.save()
    })

    it("should handle bank transfer payments", async () => {
      const payment = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 1000,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        reference: "WIRE123456789",
        recordedBy: user.id,
      })

      expect(payment.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER)
      expect(payment.reference).toBe("WIRE123456789")
      expect(payment.getFormattedReference()).toBe("WIRE123456789")
    })

    it("should handle check payments", async () => {
      const payment = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CHECK,
        reference: "CHECK001234",
        recordedBy: user.id,
      })

      expect(payment.paymentMethod).toBe(PaymentMethod.CHECK)
      expect(payment.reference).toBe("CHECK001234")
    })

    it("should handle cash payments", async () => {
      const payment = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 250,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CASH,
        recordedBy: user.id,
      })

      expect(payment.paymentMethod).toBe(PaymentMethod.CASH)
      expect(payment.reference).toBeUndefined()
      expect(payment.getFormattedReference()).toMatch(/^CASH-/)
    })

    it("should handle credit card payments", async () => {
      const payment = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 750,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CREDIT_CARD,
        reference: "CC*1234",
        recordedBy: user.id,
      })

      expect(payment.paymentMethod).toBe(PaymentMethod.CREDIT_CARD)
      expect(payment.reference).toBe("CC*1234")
    })
  })

  describe("Payment Queries", () => {
    let invoice1: Invoice
    let invoice2: Invoice
    let user1: User
    let user2: User
    let institution: MedicalInstitution

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

      invoice1 = await Invoice.createInvoice({
        institutionId: institution.id,
        assignedUserId: user1.id,
        title: "Invoice 1",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      invoice2 = await Invoice.createInvoice({
        institutionId: institution.id,
        assignedUserId: user1.id,
        title: "Invoice 2",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      invoice1.total = 1000
      invoice2.total = 2000
      await invoice1.save()
      await invoice2.save()
    })

    it("should find payments by invoice", async () => {
      await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user1.id,
      })

      await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 300,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: user1.id,
      })

      await Payment.createPayment({
        invoiceId: invoice2.id,
        amount: 1000,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CASH,
        recordedBy: user2.id,
      })

      const paymentsForInvoice1 = await Payment.findByInvoice(invoice1.id)
      expect(paymentsForInvoice1).toHaveLength(2)

      const paymentsForInvoice2 = await Payment.findByInvoice(invoice2.id)
      expect(paymentsForInvoice2).toHaveLength(1)
    })

    it("should find payments by status", async () => {
      const payment1 = await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user1.id,
      })

      const payment2 = await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 300,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: user1.id,
      })

      await payment1.confirm()

      const pendingPayments = await Payment.findByStatus(PaymentStatus.PENDING)
      const confirmedPayments = await Payment.findByStatus(PaymentStatus.CONFIRMED)

      expect(pendingPayments).toHaveLength(1)
      expect(confirmedPayments).toHaveLength(1)
    })

    it("should find payments by user", async () => {
      await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user1.id,
      })

      await Payment.createPayment({
        invoiceId: invoice2.id,
        amount: 1000,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CASH,
        recordedBy: user2.id,
      })

      const paymentsForUser1 = await Payment.findByUser(user1.id)
      const paymentsForUser2 = await Payment.findByUser(user2.id)

      expect(paymentsForUser1).toHaveLength(1)
      expect(paymentsForUser2).toHaveLength(1)
    })

    it("should find payments by payment method", async () => {
      await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user1.id,
      })

      await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 300,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user1.id,
      })

      await Payment.createPayment({
        invoiceId: invoice2.id,
        amount: 1000,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CASH,
        recordedBy: user2.id,
      })

      const bankTransferPayments = await Payment.findByPaymentMethod(
        PaymentMethod.BANK_TRANSFER
      )
      const cashPayments = await Payment.findByPaymentMethod(PaymentMethod.CASH)

      expect(bankTransferPayments).toHaveLength(2)
      expect(cashPayments).toHaveLength(1)
    })

    it("should find payments by date range", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const today = new Date()
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

      await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 500,
        paymentDate: yesterday,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user1.id,
      })

      await Payment.createPayment({
        invoiceId: invoice1.id,
        amount: 300,
        paymentDate: today,
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: user1.id,
      })

      await Payment.createPayment({
        invoiceId: invoice2.id,
        amount: 1000,
        paymentDate: tomorrow,
        paymentMethod: PaymentMethod.CASH,
        recordedBy: user2.id,
      })

      const paymentsInRange = await Payment.findByDateRange(yesterday, today)
      expect(paymentsInRange).toHaveLength(2)
    })
  })

  describe("Payment Aggregations", () => {
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

      invoice.total = 1000
      await invoice.save()
    })

    it("should calculate total by status", async () => {
      const payment1 = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 300,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user.id,
      })

      const payment2 = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: user.id,
      })

      await payment1.confirm()
      // payment2 remains pending

      const totalConfirmed = await Payment.getTotalByStatus(PaymentStatus.CONFIRMED)
      const totalPending = await Payment.getTotalByStatus(PaymentStatus.PENDING)

      expect(totalConfirmed).toBe(300)
      expect(totalPending).toBe(500)
    })

    it("should calculate total by invoice", async () => {
      const payment1 = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 300,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user.id,
      })

      const payment2 = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: user.id,
      })

      await payment1.confirm()
      await payment2.confirm()

      const totalPaid = await Payment.getTotalByInvoice(invoice.id)
      expect(totalPaid).toBe(800)
    })

    it("should get payment summary for invoice", async () => {
      const payment1 = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 300,
        paymentDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user.id,
      })

      const payment2 = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 500,
        paymentDate: new Date(), // Today
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: user.id,
      })

      const payment3 = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 200,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CASH,
        recordedBy: user.id,
      })

      await payment1.confirm()
      await payment2.confirm()
      // payment3 remains pending

      const summary = await Payment.getPaymentSummary(invoice.id)

      expect(summary.totalPaid).toBe(800)
      expect(summary.totalPending).toBe(200)
      expect(summary.paymentCount).toBe(2)
      expect(summary.lastPaymentDate).toBeDefined()
    })
  })

  describe("Payment Utilities", () => {
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

      invoice.total = 1000
      await invoice.save()
    })

    it("should detect recent payments", async () => {
      const recentPayment = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 500,
        paymentDate: new Date(), // Today
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user.id,
      })

      const oldPayment = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 300,
        paymentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: user.id,
      })

      expect(recentPayment.isRecent()).toBe(true)
      expect(oldPayment.isRecent()).toBe(false)
    })

    it("should generate formatted reference when none provided", async () => {
      const payment = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 500,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CASH,
        recordedBy: user.id,
      })

      const formattedRef = payment.getFormattedReference()
      expect(formattedRef).toMatch(/^CASH-[a-f0-9]{8}$/)
    })

    it("should reconcile payments for invoice", async () => {
      const payment1 = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 600,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        recordedBy: user.id,
      })

      const payment2 = await Payment.createPayment({
        invoiceId: invoice.id,
        amount: 400,
        paymentDate: new Date(),
        paymentMethod: PaymentMethod.CHECK,
        recordedBy: user.id,
      })

      await payment1.confirm()
      await payment2.confirm()

      await Payment.reconcilePayments(invoice.id)

      await invoice.reload()
      expect(invoice.totalPaid).toBe(1000)
      expect(invoice.status).toBe("paid")
    })
  })
})
