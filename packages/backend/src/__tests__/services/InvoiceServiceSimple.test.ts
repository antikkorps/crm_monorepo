import { InvoiceService } from "../../services/InvoiceService"

describe("InvoiceService Simple Tests", () => {
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

    it("should pass valid invoice data", () => {
      expect(() => {
        InvoiceService.validateInvoiceData({
          title: "Valid Title",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
      }).not.toThrow()
    })

    it("should pass valid invoice line data", () => {
      expect(() => {
        InvoiceService.validateInvoiceLineData({
          quantity: 2,
          unitPrice: 100,
          discountValue: 10,
          taxRate: 20,
        })
      }).not.toThrow()
    })
  })
})
