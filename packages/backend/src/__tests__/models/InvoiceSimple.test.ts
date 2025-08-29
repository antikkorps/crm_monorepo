import { Invoice } from "../../models/Invoice"
import { InvoiceLine } from "../../models/InvoiceLine"
import { Payment } from "../../models/Payment"

describe("Invoice Models Simple Test", () => {
  it("should create models without errors", async () => {
    expect(Invoice).toBeDefined()
    expect(InvoiceLine).toBeDefined()
    expect(Payment).toBeDefined()

    // Test model methods exist
    expect(typeof Invoice.generateInvoiceNumber).toBe("function")
    expect(typeof Invoice.createInvoice).toBe("function")
    expect(typeof InvoiceLine.createLine).toBe("function")
    expect(typeof Payment.createPayment).toBe("function")
  })
})
