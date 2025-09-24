import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies first
vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn(() => ({
      newPage: vi.fn(() => ({
        setContent: vi.fn(),
        pdf: vi.fn(() => Buffer.from("mock-pdf-content")),
        close: vi.fn(),
      })),
      close: vi.fn(),
    })),
  },
}))

vi.mock("../../services/EmailService", () => ({
  default: class MockEmailService {
    sendQuoteEmail = vi.fn(() => ({ success: true, messageId: "test-123" }))
    sendInvoiceEmail = vi.fn(() => ({ success: true, messageId: "test-456" }))
    sendPaymentReminderEmail = vi.fn(() => ({ success: true, messageId: "test-789" }))
    close = vi.fn()
  },
}))

vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}))

vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
}))

// Mock the models
const mockQuoteFindByPk = vi.fn()
const mockInvoiceFindByPk = vi.fn()
const mockDocumentTemplateFindByPk = vi.fn()
const mockDocumentTemplateGetDefaultTemplate = vi.fn()
const mockDocumentVersionGetNextVersion = vi.fn()
const mockDocumentVersionCreateVersion = vi.fn()
const mockDocumentVersionGetVersionHistory = vi.fn()
const mockDocumentVersionGetLatestVersion = vi.fn()

vi.mock("../../models/Quote", () => ({
  Quote: {
    findByPk: mockQuoteFindByPk,
  },
}))

vi.mock("../../models/Invoice", () => ({
  Invoice: {
    findByPk: mockInvoiceFindByPk,
  },
}))

vi.mock("../../models/DocumentTemplate", () => ({
  DocumentTemplate: {
    findByPk: mockDocumentTemplateFindByPk,
    getDefaultTemplate: mockDocumentTemplateGetDefaultTemplate,
  },
  TemplateType: {
    QUOTE: "quote",
    INVOICE: "invoice",
    BOTH: "both",
  },
}))

vi.mock("../../models/DocumentVersion", () => ({
  DocumentVersion: {
    getNextVersion: mockDocumentVersionGetNextVersion,
    createVersion: mockDocumentVersionCreateVersion,
    getVersionHistory: mockDocumentVersionGetVersionHistory,
    getLatestVersion: mockDocumentVersionGetLatestVersion,
  },
  DocumentVersionType: {
    QUOTE_PDF: "quote_pdf",
    INVOICE_PDF: "invoice_pdf",
    ORDER_PDF: "order_pdf",
  },
}))

import { PdfService } from "../../services/PdfService"

describe("PdfService", () => {
  let pdfService: PdfService
  let mockQuote: any
  let mockInvoice: any
  let mockInstitution: any
  let mockUser: any
  let mockTemplate: any

  beforeEach(() => {
    pdfService = new PdfService()

    // Mock institution
    mockInstitution = {
      id: "institution-1",
      name: "Test Medical Center",
      address: {
        street: "123 Medical St",
        city: "Health City",
        state: "HC",
        zipCode: "12345",
        country: "USA",
      },
      contactPersons: [
        {
          email: "contact@medical-center.com",
          isPrimary: true,
        },
      ],
    }

    // Mock user
    mockUser = {
      id: "user-1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@company.com",
    }

    // Mock template
    mockTemplate = {
      id: "template-1",
      name: "Test Template",
      type: "quote",
      companyName: "Test Company",
      companyAddress: {
        street: "456 Business Ave",
        city: "Business City",
        state: "BC",
        zipCode: "67890",
        country: "USA",
      },
      logoPosition: "top_left",
      headerHeight: 80,
      footerHeight: 60,
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 15,
      marginRight: 15,
      toJSON: vi.fn(() => mockTemplate),
    }

    // Mock quote
    mockQuote = {
      id: "quote-1",
      quoteNumber: "Q202501001",
      title: "Test Quote",
      institutionId: "institution-1",
      assignedUserId: "user-1",
      templateId: "template-1",
      subtotal: 1000,
      totalDiscountAmount: 100,
      totalTaxAmount: 90,
      total: 990,
      createdAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      institution: mockInstitution,
      assignedUser: mockUser,
      getLines: vi.fn(() => [
        {
          description: "Test Item",
          quantity: 1,
          unitPrice: 1000,
          discountAmount: 100,
          taxAmount: 90,
          total: 990,
        },
      ]),
    }

    // Mock invoice
    mockInvoice = {
      id: "invoice-1",
      invoiceNumber: "INV202501001",
      title: "Test Invoice",
      institutionId: "institution-1",
      assignedUserId: "user-1",
      templateId: "template-1",
      subtotal: 1000,
      totalDiscountAmount: 100,
      totalTaxAmount: 90,
      total: 990,
      totalPaid: 500,
      remainingAmount: 490,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      institution: mockInstitution,
      assignedUser: mockUser,
      getLines: vi.fn(() => [
        {
          description: "Test Item",
          quantity: 1,
          unitPrice: 1000,
          discountAmount: 100,
          taxAmount: 90,
          total: 990,
        },
      ]),
      getPayments: vi.fn(() => [
        {
          paymentDate: new Date(),
          amount: 500,
          paymentMethod: "Bank Transfer",
          status: "confirmed",
        },
      ]),
      getDaysOverdue: vi.fn(() => 5),
    }

    // Setup mock returns
    mockQuoteFindByPk.mockResolvedValue(mockQuote)
    mockInvoiceFindByPk.mockResolvedValue(mockInvoice)
    mockDocumentTemplateFindByPk.mockResolvedValue(mockTemplate)
    mockDocumentTemplateGetDefaultTemplate.mockResolvedValue(mockTemplate)
    mockDocumentVersionGetNextVersion.mockResolvedValue(1)
    mockDocumentVersionCreateVersion.mockResolvedValue({
      id: "version-1",
      version: 1,
      markAsEmailed: vi.fn(),
    })
    mockDocumentVersionGetVersionHistory.mockResolvedValue([])
    mockDocumentVersionGetLatestVersion.mockResolvedValue(null)
  })

  afterEach(async () => {
    await pdfService.cleanup()
    vi.clearAllMocks()
  })

  describe("generateQuotePdf", () => {
    it("should generate a quote PDF successfully", async () => {
      const result = await pdfService.generateQuotePdf("quote-1", "user-1")

      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.buffer.toString()).toBe("mock-pdf-content")
      expect(mockQuoteFindByPk).toHaveBeenCalledWith("quote-1", expect.any(Object))
    })

    it("should save PDF to file when saveToFile is true", async () => {
      const result = await pdfService.generateQuotePdf("quote-1", "user-1", undefined, {
        saveToFile: true,
      })

      expect(result.filePath).toBeDefined()
      expect(result.version).toBeDefined()
      expect(mockDocumentVersionCreateVersion).toHaveBeenCalled()
    })

    it("should throw error when quote is not found", async () => {
      mockQuoteFindByPk.mockResolvedValue(null)

      await expect(
        pdfService.generateQuotePdf("nonexistent-quote", "user-1")
      ).rejects.toThrow("Quote with ID nonexistent-quote not found")
    })

    it("should not save PDF when saveToFile is false", async () => {
      const result = await pdfService.generateQuotePdf("quote-1", "user-1", undefined, {
        saveToFile: false,
      })

      expect(result.filePath).toBeUndefined()
      expect(result.version).toBeUndefined()
      expect(mockDocumentVersionCreateVersion).not.toHaveBeenCalled()
    })
  })

  describe("generateInvoicePdf", () => {
    it("should generate an invoice PDF successfully", async () => {
      const result = await pdfService.generateInvoicePdf("invoice-1", "user-1")

      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.buffer.toString()).toBe("mock-pdf-content")
      expect(mockInvoiceFindByPk).toHaveBeenCalledWith("invoice-1", expect.any(Object))
    })

    it("should throw error when invoice is not found", async () => {
      mockInvoiceFindByPk.mockResolvedValue(null)

      await expect(
        pdfService.generateInvoicePdf("nonexistent-invoice", "user-1")
      ).rejects.toThrow("Invoice with ID nonexistent-invoice not found")
    })
  })

  describe("generateOrderPdf", () => {
    it("should generate an order PDF successfully (no save)", async () => {
      const result = await pdfService.generateOrderPdf("quote-1", "user-1", undefined, { saveToFile: false })

      expect(result.buffer).toBeInstanceOf(Buffer)
      expect(result.filePath).toBeUndefined()
      expect(mockQuoteFindByPk).toHaveBeenCalledWith("quote-1", expect.any(Object))
      expect(mockDocumentVersionCreateVersion).not.toHaveBeenCalled()
    })

    it("should save order PDF when saveToFile is true", async () => {
      const result = await pdfService.generateOrderPdf("quote-1", "user-1", undefined, { saveToFile: true })

      expect(result.filePath).toBeDefined()
      expect(result.version).toBeDefined()
      expect(mockDocumentVersionCreateVersion).toHaveBeenCalled()
    })
  })

  describe("getDocumentVersions", () => {
    it("should return document versions for a quote", async () => {
      const mockVersions = [
        { id: "version-1", version: 1 },
        { id: "version-2", version: 2 },
      ]
      mockDocumentVersionGetVersionHistory.mockResolvedValue(mockVersions)

      const versions = await pdfService.getDocumentVersions("quote-1", "quote_pdf" as any)

      expect(versions).toEqual(mockVersions)
      expect(mockDocumentVersionGetVersionHistory).toHaveBeenCalledWith(
        "quote-1",
        "quote_pdf"
      )
    })
  })

  describe("sendPaymentReminder", () => {
    it("should send payment reminder email successfully", async () => {
      const result = await pdfService.sendPaymentReminder(
        "invoice-1",
        "Custom reminder message"
      )

      expect(result.success).toBe(true)
      expect(mockInvoiceFindByPk).toHaveBeenCalledWith("invoice-1", expect.any(Object))
    })

    it("should throw error when invoice is not found", async () => {
      mockInvoiceFindByPk.mockResolvedValue(null)

      await expect(pdfService.sendPaymentReminder("nonexistent-invoice")).rejects.toThrow(
        "Invoice or institution not found"
      )
    })
  })
})
