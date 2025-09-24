import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock fs/promises for unlink
vi.mock("fs/promises", () => {
  return {
    unlink: vi.fn(async () => {}),
  }
})

// Mock PdfService used by the controller
vi.mock("../../services/PdfService", () => {
  class MockPdfService {
    async generateOrderPdf() {
      return {
        buffer: Buffer.from("pdf"),
        filePath: "/tmp/mock-order.pdf",
      }
    }
    async cleanup() {}
  }
  return { PdfService: MockPdfService }
})

// Mock Quote model used only for filename decoration (optional)
vi.mock("../../models/Quote", () => ({
  Quote: { findByPk: vi.fn(async () => null) },
}))

import { unlink } from "fs/promises"
import { QuoteController } from "../../controllers/QuoteController"

describe("QuoteController.generateOrderPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("sends PDF and deletes the temporary file", async () => {
    const ctx: any = {
      params: { id: "quote-1" },
      query: {},
      state: { user: { id: "user-1" } },
      set: vi.fn(),
    }

    await QuoteController.generateOrderPdf(ctx)

    expect(ctx.status).toBe(200)
    expect(ctx.type).toBe("application/pdf")
    expect(Buffer.isBuffer(ctx.body)).toBe(true)
    expect(unlink).toHaveBeenCalledWith("/tmp/mock-order.pdf")
  })
})

