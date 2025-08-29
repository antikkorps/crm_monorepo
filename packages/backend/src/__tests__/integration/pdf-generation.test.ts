import request from "supertest"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../../app"
import { DocumentTemplate, TemplateType } from "../../models/DocumentTemplate"
import { Invoice } from "../../models/Invoice"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Quote } from "../../models/Quote"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"
import { closeDatabaseConnection, initializeDatabase } from "../../utils/database-init"

describe("PDF Generation Integration Tests", () => {
  let app: any
  let testUser: User
  let testInstitution: MedicalInstitution
  let testQuote: Quote
  let testInvoice: Invoice
  let testTemplate: DocumentTemplate
  let authToken: string

  beforeAll(async () => {
    app = createApp()
    await initializeDatabase()
  })

  afterAll(async () => {
    await closeDatabaseConnection()
  })

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: UserRole.SUPER_ADMIN,
      password: "hashedpassword",
      avatarSeed: "test-seed",
      isActive: true,
    })

    // Generate auth token
    authToken = AuthService.generateAccessToken(testUser.id, testUser.role)

    // Create test institution
    testInstitution = await MedicalInstitution.create({
      name: "Test Medical Center",
      type: "hospital",
      address: {
        street: "123 Medical St",
        city: "Health City",
        state: "HC",
        zipCode: "12345",
        country: "USA",
      },
      assignedUserId: testUser.id,
    })

    // Create test template
    testTemplate = await DocumentTemplate.create({
      name: "Test Template",
      type: TemplateType.BOTH,
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
      createdBy: testUser.id,
      version: 1,
    })

    // Create test quote
    testQuote = await Quote.create({
      institutionId: testInstitution.id,
      assignedUserId: testUser.id,
      templateId: testTemplate.id,
      title: "Test Quote",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 1000,
      totalDiscountAmount: 100,
      totalTaxAmount: 90,
      total: 990,
    })

    // Create test invoice
    testInvoice = await Invoice.create({
      institutionId: testInstitution.id,
      assignedUserId: testUser.id,
      templateId: testTemplate.id,
      title: "Test Invoice",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 1000,
      totalDiscountAmount: 100,
      totalTaxAmount: 90,
      total: 990,
      totalPaid: 0,
      remainingAmount: 990,
    })
  })

  afterEach(async () => {
    // Clean up test data
    await Invoice.destroy({ where: {} })
    await Quote.destroy({ where: {} })
    await DocumentTemplate.destroy({ where: {} })
    await MedicalInstitution.destroy({ where: {} })
    await User.destroy({ where: {} })
  })

  describe("Quote PDF Generation", () => {
    it("should generate quote PDF successfully", async () => {
      const response = await request(app.callback())
        .get(`/api/quotes/${testQuote.id}/pdf`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.headers["content-type"]).toBe("application/pdf")
      expect(response.headers["content-disposition"]).toContain("Quote-")
      expect(response.body).toBeInstanceOf(Buffer)
    })

    it("should generate quote PDF with custom template", async () => {
      const response = await request(app.callback())
        .get(`/api/quotes/${testQuote.id}/pdf?templateId=${testTemplate.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.headers["content-type"]).toBe("application/pdf")
    })

    it("should return 404 for non-existent quote", async () => {
      const response = await request(app.callback())
        .get("/api/quotes/nonexistent-id/pdf")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.error.code).toBe("PDF_GENERATION_ERROR")
    })

    it("should require authentication", async () => {
      await request(app.callback()).get(`/api/quotes/${testQuote.id}/pdf`).expect(401)
    })
  })

  describe("Invoice PDF Generation", () => {
    it("should generate invoice PDF successfully", async () => {
      const response = await request(app.callback())
        .get(`/api/invoices/${testInvoice.id}/pdf`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.headers["content-type"]).toBe("application/pdf")
      expect(response.headers["content-disposition"]).toContain("Invoice-")
      expect(response.body).toBeInstanceOf(Buffer)
    })

    it("should generate invoice PDF with custom template", async () => {
      const response = await request(app.callback())
        .get(`/api/invoices/${testInvoice.id}/pdf?templateId=${testTemplate.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.headers["content-type"]).toBe("application/pdf")
    })

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app.callback())
        .get("/api/invoices/nonexistent-id/pdf")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.error.code).toBe("PDF_GENERATION_ERROR")
    })
  })

  describe("Document Versions", () => {
    it("should return quote document versions", async () => {
      // First generate a PDF to create a version
      await request(app.callback())
        .get(`/api/quotes/${testQuote.id}/pdf`)
        .set("Authorization", `Bearer ${authToken}`)

      const response = await request(app.callback())
        .get(`/api/quotes/${testQuote.id}/versions`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it("should return invoice document versions", async () => {
      // First generate a PDF to create a version
      await request(app.callback())
        .get(`/api/invoices/${testInvoice.id}/pdf`)
        .set("Authorization", `Bearer ${authToken}`)

      const response = await request(app.callback())
        .get(`/api/invoices/${testInvoice.id}/versions`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })
  })

  describe("Payment Reminders", () => {
    it("should send payment reminder successfully", async () => {
      const response = await request(app.callback())
        .post(`/api/invoices/${testInvoice.id}/send-reminder`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          customMessage: "Please pay your invoice as soon as possible.",
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain("reminder")
    })

    it("should require proper permissions for payment reminders", async () => {
      // Create a regular user without billing permissions
      const regularUser = await User.create({
        email: "regular@example.com",
        firstName: "Regular",
        lastName: "User",
        role: UserRole.USER,
        password: "hashedpassword",
        avatarSeed: "regular-seed",
        isActive: true,
      })

      const regularToken = AuthService.generateAccessToken(
        regularUser.id,
        regularUser.role
      )

      await request(app.callback())
        .post(`/api/invoices/${testInvoice.id}/send-reminder`)
        .set("Authorization", `Bearer ${regularToken}`)
        .send({
          customMessage: "Please pay your invoice.",
        })
        .expect(403)

      await regularUser.destroy()
    })
  })

  describe("Error Handling", () => {
    it("should handle PDF generation errors gracefully", async () => {
      // Try to generate PDF for a quote that doesn't exist
      const response = await request(app.callback())
        .get("/api/quotes/00000000-0000-0000-0000-000000000000/pdf")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("PDF_GENERATION_ERROR")
      expect(response.body.error.message).toContain("Failed to generate quote PDF")
    })

    it("should handle invalid template IDs", async () => {
      const response = await request(app.callback())
        .get(`/api/quotes/${testQuote.id}/pdf?templateId=invalid-template-id`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("PDF_GENERATION_ERROR")
    })
  })

  describe("Performance", () => {
    it("should generate PDF within reasonable time", async () => {
      const startTime = Date.now()

      await request(app.callback())
        .get(`/api/quotes/${testQuote.id}/pdf`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      const endTime = Date.now()
      const duration = endTime - startTime

      // PDF generation should complete within 10 seconds
      expect(duration).toBeLessThan(10000)
    })

    it("should handle concurrent PDF generation requests", async () => {
      const requests = Array(3)
        .fill(null)
        .map(() =>
          request(app.callback())
            .get(`/api/quotes/${testQuote.id}/pdf`)
            .set("Authorization", `Bearer ${authToken}`)
        )

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.headers["content-type"]).toBe("application/pdf")
      })
    })
  })
})
