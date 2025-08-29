import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EmailService } from "../../services/EmailService"

// Mock nodemailer
const mockSendMail = vi.fn()
const mockVerify = vi.fn()
const mockClose = vi.fn()

vi.mock("nodemailer", () => ({
  default: {
    createTransporter: vi.fn(() => ({
      sendMail: mockSendMail,
      verify: mockVerify,
      close: mockClose,
    })),
  },
}))

describe("EmailService", () => {
  let emailService: EmailService

  beforeEach(() => {
    emailService = new EmailService()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await emailService.close()
  })

  describe("sendEmail", () => {
    it("should send email successfully", async () => {
      mockSendMail.mockResolvedValue({ messageId: "test-message-id" })

      const result = await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        text: "Test message",
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe("test-message-id")
      expect(result.recipients).toEqual(["test@example.com"])
      expect(mockSendMail).toHaveBeenCalledWith({
        from: "Medical CRM <noreply@medical-crm.com>",
        to: "test@example.com",
        cc: undefined,
        bcc: undefined,
        subject: "Test Subject",
        text: "Test message",
        html: undefined,
        attachments: undefined,
      })
    })

    it("should handle multiple recipients", async () => {
      mockSendMail.mockResolvedValue({ messageId: "test-message-id" })

      const recipients = ["test1@example.com", "test2@example.com"]
      const result = await emailService.sendEmail({
        to: recipients,
        subject: "Test Subject",
        text: "Test message",
      })

      expect(result.success).toBe(true)
      expect(result.recipients).toEqual(recipients)
    })

    it("should handle email sending errors", async () => {
      const error = new Error("SMTP connection failed")
      mockSendMail.mockRejectedValue(error)

      const result = await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        text: "Test message",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("SMTP connection failed")
      expect(result.recipients).toEqual(["test@example.com"])
    })

    it("should send email with attachments", async () => {
      mockSendMail.mockResolvedValue({ messageId: "test-message-id" })

      const attachments = [
        {
          filename: "test.pdf",
          content: Buffer.from("test content"),
          contentType: "application/pdf",
        },
      ]

      const result = await emailService.sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        text: "Test message",
        attachments,
      })

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments,
        })
      )
    })
  })

  describe("sendQuoteEmail", () => {
    it("should send quote email with PDF attachment", async () => {
      mockSendMail.mockResolvedValue({ messageId: "quote-message-id" })

      const pdfBuffer = Buffer.from("mock pdf content")
      const result = await emailService.sendQuoteEmail(
        "client@example.com",
        "Test Client",
        "Q202501001",
        "Test Company",
        pdfBuffer,
        "Custom message"
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "client@example.com",
          subject: "Quote Q202501001 from Test Company",
          html: "Custom message",
          attachments: [
            {
              filename: "Quote-Q202501001.pdf",
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        })
      )
    })

    it("should use default message when no custom message provided", async () => {
      mockSendMail.mockResolvedValue({ messageId: "quote-message-id" })

      const pdfBuffer = Buffer.from("mock pdf content")
      const result = await emailService.sendQuoteEmail(
        "client@example.com",
        "Test Client",
        "Q202501001",
        "Test Company",
        pdfBuffer
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("Dear Test Client"),
        })
      )
    })
  })

  describe("sendInvoiceEmail", () => {
    it("should send invoice email with PDF attachment", async () => {
      mockSendMail.mockResolvedValue({ messageId: "invoice-message-id" })

      const pdfBuffer = Buffer.from("mock pdf content")
      const dueDate = new Date("2025-02-28")
      const result = await emailService.sendInvoiceEmail(
        "client@example.com",
        "Test Client",
        "INV202501001",
        "Test Company",
        dueDate,
        1000,
        pdfBuffer,
        "Custom invoice message"
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "client@example.com",
          subject: "Invoice INV202501001 from Test Company",
          html: "Custom invoice message",
          attachments: [
            {
              filename: "Invoice-INV202501001.pdf",
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        })
      )
    })

    it("should use default message with formatted amount and due date", async () => {
      mockSendMail.mockResolvedValue({ messageId: "invoice-message-id" })

      const pdfBuffer = Buffer.from("mock pdf content")
      const dueDate = new Date("2025-02-28")
      const result = await emailService.sendInvoiceEmail(
        "client@example.com",
        "Test Client",
        "INV202501001",
        "Test Company",
        dueDate,
        1000,
        pdfBuffer
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("$1,000.00"),
        })
      )
    })
  })

  describe("sendPaymentReminderEmail", () => {
    it("should send payment reminder email", async () => {
      mockSendMail.mockResolvedValue({ messageId: "reminder-message-id" })

      const dueDate = new Date("2025-01-15")
      const result = await emailService.sendPaymentReminderEmail(
        "client@example.com",
        "Test Client",
        "INV202501001",
        "Test Company",
        dueDate,
        500,
        10,
        "Custom reminder message"
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "client@example.com",
          subject: "Payment Reminder: Invoice INV202501001 - 10 days overdue",
          html: "Custom reminder message",
        })
      )
    })

    it("should use default reminder message with overdue information", async () => {
      mockSendMail.mockResolvedValue({ messageId: "reminder-message-id" })

      const dueDate = new Date("2025-01-15")
      const result = await emailService.sendPaymentReminderEmail(
        "client@example.com",
        "Test Client",
        "INV202501001",
        "Test Company",
        dueDate,
        500,
        10
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("10 days overdue"),
        })
      )
    })
  })

  describe("sendCustomEmail", () => {
    it("should send custom email", async () => {
      mockSendMail.mockResolvedValue({ messageId: "custom-message-id" })

      const result = await emailService.sendCustomEmail(
        "recipient@example.com",
        "Custom Subject",
        "Custom message content"
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "recipient@example.com",
          subject: "Custom Subject",
          html: "Custom message content",
        })
      )
    })

    it("should send custom email with attachments", async () => {
      mockSendMail.mockResolvedValue({ messageId: "custom-message-id" })

      const attachments = [
        {
          filename: "document.pdf",
          content: Buffer.from("document content"),
          contentType: "application/pdf",
        },
      ]

      const result = await emailService.sendCustomEmail(
        "recipient@example.com",
        "Custom Subject",
        "Custom message content",
        attachments
      )

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments,
        })
      )
    })
  })

  describe("testConnection", () => {
    it("should return true when connection is successful", async () => {
      mockVerify.mockResolvedValue(true)

      const result = await emailService.testConnection()

      expect(result).toBe(true)
      expect(mockVerify).toHaveBeenCalled()
    })

    it("should return false when connection fails", async () => {
      mockVerify.mockRejectedValue(new Error("Connection failed"))

      const result = await emailService.testConnection()

      expect(result).toBe(false)
      expect(mockVerify).toHaveBeenCalled()
    })
  })

  describe("close", () => {
    it("should close the transporter", async () => {
      await emailService.close()

      expect(mockClose).toHaveBeenCalled()
    })
  })
})
