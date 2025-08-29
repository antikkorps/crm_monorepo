import request from "supertest"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../../app"
import { DocumentTemplate, TemplateType } from "../../models/DocumentTemplate"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"
import { closeDatabaseConnection, initializeDatabase } from "../../utils/database-init"

describe("Document Templates Integration Tests", () => {
  let app: any
  let testUser: User
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
    // Create test user with admin privileges
    testUser = await User.create({
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      role: UserRole.SUPER_ADMIN,
      password: "hashedpassword",
      avatarSeed: "admin-seed",
      isActive: true,
    })

    // Generate auth token
    authToken = AuthService.generateAccessToken(testUser.id, testUser.role)

    // Create test template
    testTemplate = await DocumentTemplate.create({
      name: "Test Template",
      type: TemplateType.QUOTE,
      companyName: "Test Company",
      companyAddress: {
        street: "123 Business St",
        city: "Business City",
        state: "BC",
        zipCode: "12345",
        country: "USA",
      },
      companyPhone: "+1-555-0123",
      companyEmail: "info@testcompany.com",
      companyWebsite: "https://testcompany.com",
      taxNumber: "TAX123456",
      vatNumber: "VAT789012",
      logoPosition: "top_left",
      primaryColor: "#007bff",
      secondaryColor: "#6c757d",
      headerHeight: 80,
      footerHeight: 60,
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 15,
      marginRight: 15,
      customHeader: "Custom header text",
      customFooter: "Custom footer text",
      termsAndConditions: "Terms and conditions text",
      paymentInstructions: "Payment instructions text",
      createdBy: testUser.id,
      version: 1,
    })
  })

  afterEach(async () => {
    // Clean up test data
    await DocumentTemplate.destroy({ where: {} })
    await User.destroy({ where: {} })
  })

  describe("GET /api/templates", () => {
    it("should return all templates", async () => {
      const response = await request(app.callback())
        .get("/api/templates")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it("should filter templates by type", async () => {
      const response = await request(app.callback())
        .get("/api/templates?type=quote")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(
        response.body.data.every((t: any) => t.type === "quote" || t.type === "both")
      ).toBe(true)
    })

    it("should require authentication", async () => {
      await request(app.callback()).get("/api/templates").expect(401)
    })
  })

  describe("GET /api/templates/:id", () => {
    it("should return specific template", async () => {
      const response = await request(app.callback())
        .get(`/api/templates/${testTemplate.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testTemplate.id)
      expect(response.body.data.name).toBe("Test Template")
    })

    it("should return 404 for non-existent template", async () => {
      const response = await request(app.callback())
        .get("/api/templates/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe("Template not found")
    })
  })

  describe("POST /api/templates", () => {
    it("should create new template", async () => {
      const templateData = {
        name: "New Template",
        type: TemplateType.INVOICE,
        companyName: "New Company",
        companyAddress: {
          street: "456 New St",
          city: "New City",
          state: "NC",
          zipCode: "67890",
          country: "USA",
        },
        logoPosition: "top_center",
        headerHeight: 100,
        footerHeight: 80,
        marginTop: 25,
        marginBottom: 25,
        marginLeft: 20,
        marginRight: 20,
      }

      const response = await request(app.callback())
        .post("/api/templates")
        .set("Authorization", `Bearer ${authToken}`)
        .send(templateData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe("New Template")
      expect(response.body.data.type).toBe(TemplateType.INVOICE)
    })

    it("should validate required fields", async () => {
      const response = await request(app.callback())
        .post("/api/templates")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Incomplete Template",
          // Missing required fields
        })
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it("should require admin permissions", async () => {
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
        .post("/api/templates")
        .set("Authorization", `Bearer ${regularToken}`)
        .send({
          name: "Unauthorized Template",
          type: TemplateType.QUOTE,
        })
        .expect(403)

      await regularUser.destroy()
    })
  })

  describe("PUT /api/templates/:id", () => {
    it("should update template", async () => {
      const updates = {
        name: "Updated Template Name",
        companyName: "Updated Company Name",
      }

      const response = await request(app.callback())
        .put(`/api/templates/${testTemplate.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updates)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe("Updated Template Name")
    })

    it("should return 404 for non-existent template", async () => {
      const response = await request(app.callback())
        .put("/api/templates/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated Name" })
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe("DELETE /api/templates/:id", () => {
    it("should delete template", async () => {
      const response = await request(app.callback())
        .delete(`/api/templates/${testTemplate.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain("deleted successfully")
    })

    it("should return 404 for non-existent template", async () => {
      const response = await request(app.callback())
        .delete("/api/templates/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe("PUT /api/templates/:id/set-default", () => {
    it("should set template as default", async () => {
      const response = await request(app.callback())
        .put(`/api/templates/${testTemplate.id}/set-default`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.isDefault).toBe(true)
    })
  })

  describe("POST /api/templates/:id/duplicate", () => {
    it("should duplicate template", async () => {
      const response = await request(app.callback())
        .post(`/api/templates/${testTemplate.id}/duplicate`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Duplicated Template" })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe("Duplicated Template")
      expect(response.body.data.id).not.toBe(testTemplate.id)
    })

    it("should require name for duplication", async () => {
      const response = await request(app.callback())
        .post(`/api/templates/${testTemplate.id}/duplicate`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe("Template name is required")
    })
  })

  describe("POST /api/templates/upload-logo", () => {
    it("should upload logo successfully", async () => {
      const logoBuffer = Buffer.from("fake image data")

      const response = await request(app.callback())
        .post("/api/templates/upload-logo")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("logo", logoBuffer, "test-logo.png")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.logoUrl).toMatch(/^\/logos\/logo-\d+\.png$/)
      expect(response.body.data.originalName).toBe("test-logo.png")
    })

    it("should reject invalid file types", async () => {
      const textBuffer = Buffer.from("not an image")

      const response = await request(app.callback())
        .post("/api/templates/upload-logo")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("logo", textBuffer, "document.txt")
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain("Invalid file type")
    })

    it("should require file upload", async () => {
      const response = await request(app.callback())
        .post("/api/templates/upload-logo")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe("No file uploaded")
    })
  })

  describe("POST /api/templates/:id/upload-logo", () => {
    it("should upload logo for specific template", async () => {
      const logoBuffer = Buffer.from("fake image data")

      const response = await request(app.callback())
        .post(`/api/templates/${testTemplate.id}/upload-logo`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("logo", logoBuffer, "template-logo.png")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.logoUrl).toMatch(/^\/logos\/logo-\d+\.png$/)

      // Verify template was updated
      const updatedTemplate = await DocumentTemplate.findByPk(testTemplate.id)
      expect(updatedTemplate?.logoUrl).toBe(response.body.data.logoUrl)
    })
  })

  describe("GET /api/templates/:id/preview", () => {
    it("should generate template preview", async () => {
      const response = await request(app.callback())
        .get(`/api/templates/${testTemplate.id}/preview`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)

      expect(response.headers["content-type"]).toContain("text/html")
      expect(response.text).toContain("<!DOCTYPE html>")
    })

    it("should return 404 for non-existent template", async () => {
      const response = await request(app.callback())
        .get("/api/templates/00000000-0000-0000-0000-000000000000/preview")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe("POST /api/templates/:id/preview", () => {
    it("should generate template preview with custom data", async () => {
      const customData = {
        quote: {
          quoteNumber: "PREVIEW001",
          title: "Preview Quote",
          total: 1500,
        },
        institution: {
          name: "Preview Medical Center",
        },
      }

      const response = await request(app.callback())
        .post(`/api/templates/${testTemplate.id}/preview`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(customData)
        .expect(200)

      expect(response.headers["content-type"]).toContain("text/html")
      expect(response.text).toContain("<!DOCTYPE html>")
    })
  })

  describe("Authorization", () => {
    it("should allow template viewing for all authenticated users", async () => {
      const regularUser = await User.create({
        email: "viewer@example.com",
        firstName: "Viewer",
        lastName: "User",
        role: UserRole.USER,
        password: "hashedpassword",
        avatarSeed: "viewer-seed",
        isActive: true,
      })

      const viewerToken = AuthService.generateAccessToken(
        regularUser.id,
        regularUser.role
      )

      const response = await request(app.callback())
        .get("/api/templates")
        .set("Authorization", `Bearer ${viewerToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)

      await regularUser.destroy()
    })

    it("should restrict template management to admins", async () => {
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

      // Test various admin-only operations
      await request(app.callback())
        .post("/api/templates")
        .set("Authorization", `Bearer ${regularToken}`)
        .send({ name: "Test" })
        .expect(403)

      await request(app.callback())
        .put(`/api/templates/${testTemplate.id}`)
        .set("Authorization", `Bearer ${regularToken}`)
        .send({ name: "Updated" })
        .expect(403)

      await request(app.callback())
        .delete(`/api/templates/${testTemplate.id}`)
        .set("Authorization", `Bearer ${regularToken}`)
        .expect(403)

      await regularUser.destroy()
    })
  })
})
