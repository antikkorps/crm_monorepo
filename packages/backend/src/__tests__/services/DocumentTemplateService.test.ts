import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DocumentTemplate, TemplateType } from "../../models/DocumentTemplate"
import { DocumentTemplateService } from "../../services/DocumentTemplateService"

// Mock file system operations
vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
}))

vi.mock("fs", () => ({
  existsSync: vi.fn(() => true),
}))

// Mock Handlebars
vi.mock("handlebars", () => ({
  compile: vi.fn(() => vi.fn(() => "<html>Compiled template</html>")),
  registerHelper: vi.fn(),
}))

describe("DocumentTemplateService", () => {
  let templateService: DocumentTemplateService
  let mockTemplate: any
  let mockUser: any

  beforeEach(() => {
    templateService = new DocumentTemplateService()

    mockUser = {
      id: "user-1",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@company.com",
    }

    mockTemplate = {
      id: "template-1",
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
      logoUrl: "/logos/test-logo.png",
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
      htmlTemplate: "<div>Custom HTML template</div>",
      styles: "body { font-family: Arial; }",
      createdBy: "user-1",
      version: 1,
      canBeDeleted: vi.fn(() => true),
      setAsDefault: vi.fn(),
      createVersion: vi.fn(() => ({
        id: "template-2",
        version: 2,
      })),
      update: vi.fn(),
      save: vi.fn(),
      destroy: vi.fn(),
      toJSON: vi.fn(() => mockTemplate),
    }

    // Mock Sequelize model methods
    vi.mocked(DocumentTemplate.createTemplate).mockResolvedValue(mockTemplate as any)
    vi.mocked(DocumentTemplate.findByPk).mockResolvedValue(mockTemplate as any)
    vi.mocked(DocumentTemplate.getActiveTemplates).mockResolvedValue([
      mockTemplate,
    ] as any)
    vi.mocked(DocumentTemplate.getDefaultTemplate).mockResolvedValue(mockTemplate as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("createTemplate", () => {
    it("should create a new template successfully", async () => {
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
        logoPosition: "top_center" as any,
        headerHeight: 100,
        footerHeight: 80,
        marginTop: 25,
        marginBottom: 25,
        marginLeft: 20,
        marginRight: 20,
      }

      const result = await templateService.createTemplate(templateData, "user-1")

      expect(result).toEqual(mockTemplate)
      expect(DocumentTemplate.createTemplate).toHaveBeenCalledWith({
        ...templateData,
        createdBy: "user-1",
      })
    })

    it("should handle creation errors", async () => {
      const error = new Error("Database error")
      vi.mocked(DocumentTemplate.createTemplate).mockRejectedValue(error)

      await expect(templateService.createTemplate({} as any, "user-1")).rejects.toThrow(
        "Database error"
      )
    })
  })

  describe("updateTemplate", () => {
    it("should update template with minor changes", async () => {
      const updates = { name: "Updated Template Name" }

      const result = await templateService.updateTemplate("template-1", updates, "user-1")

      expect(result).toEqual(mockTemplate)
      expect(mockTemplate.update).toHaveBeenCalledWith(updates)
    })

    it("should create new version for significant changes", async () => {
      const updates = { htmlTemplate: "<div>New HTML template</div>" }
      const newVersion = { id: "template-2", version: 2, update: vi.fn() }
      mockTemplate.createVersion.mockResolvedValue(newVersion)

      const result = await templateService.updateTemplate("template-1", updates, "user-1")

      expect(mockTemplate.createVersion).toHaveBeenCalled()
      expect(newVersion.update).toHaveBeenCalledWith(updates)
    })

    it("should throw error when template not found", async () => {
      vi.mocked(DocumentTemplate.findByPk).mockResolvedValue(null)

      await expect(
        templateService.updateTemplate("nonexistent", {}, "user-1")
      ).rejects.toThrow("Template with ID nonexistent not found")
    })
  })

  describe("deleteTemplate", () => {
    it("should delete template successfully", async () => {
      await templateService.deleteTemplate("template-1")

      expect(mockTemplate.destroy).toHaveBeenCalled()
    })

    it("should delete associated logo file", async () => {
      const { unlink } = await import("fs/promises")

      await templateService.deleteTemplate("template-1")

      expect(unlink).toHaveBeenCalled()
    })

    it("should throw error when trying to delete default template", async () => {
      mockTemplate.canBeDeleted.mockReturnValue(false)

      await expect(templateService.deleteTemplate("template-1")).rejects.toThrow(
        "Cannot delete default template"
      )
    })

    it("should throw error when template not found", async () => {
      vi.mocked(DocumentTemplate.findByPk).mockResolvedValue(null)

      await expect(templateService.deleteTemplate("nonexistent")).rejects.toThrow(
        "Template with ID nonexistent not found"
      )
    })
  })

  describe("getTemplate", () => {
    it("should return template with creator information", async () => {
      const result = await templateService.getTemplate("template-1")

      expect(result).toEqual(mockTemplate)
      expect(DocumentTemplate.findByPk).toHaveBeenCalledWith("template-1", {
        include: expect.arrayContaining([
          expect.objectContaining({
            as: "creator",
          }),
        ]),
      })
    })

    it("should return null when template not found", async () => {
      vi.mocked(DocumentTemplate.findByPk).mockResolvedValue(null)

      const result = await templateService.getTemplate("nonexistent")

      expect(result).toBeNull()
    })
  })

  describe("getTemplates", () => {
    it("should return all active templates", async () => {
      const result = await templateService.getTemplates()

      expect(result).toEqual([mockTemplate])
      expect(DocumentTemplate.getActiveTemplates).toHaveBeenCalledWith(undefined)
    })

    it("should return templates filtered by type", async () => {
      const result = await templateService.getTemplates(TemplateType.INVOICE)

      expect(result).toEqual([mockTemplate])
      expect(DocumentTemplate.getActiveTemplates).toHaveBeenCalledWith(
        TemplateType.INVOICE
      )
    })
  })

  describe("getDefaultTemplate", () => {
    it("should return default template for type", async () => {
      const result = await templateService.getDefaultTemplate(TemplateType.QUOTE)

      expect(result).toEqual(mockTemplate)
      expect(DocumentTemplate.getDefaultTemplate).toHaveBeenCalledWith(TemplateType.QUOTE)
    })
  })

  describe("setDefaultTemplate", () => {
    it("should set template as default", async () => {
      const result = await templateService.setDefaultTemplate("template-1")

      expect(result).toEqual(mockTemplate)
      expect(mockTemplate.setAsDefault).toHaveBeenCalled()
    })

    it("should throw error when template not found", async () => {
      vi.mocked(DocumentTemplate.findByPk).mockResolvedValue(null)

      await expect(templateService.setDefaultTemplate("nonexistent")).rejects.toThrow(
        "Template with ID nonexistent not found"
      )
    })
  })

  describe("duplicateTemplate", () => {
    it("should duplicate template successfully", async () => {
      const newTemplate = {
        ...mockTemplate,
        id: "template-duplicate",
        name: "Duplicated Template",
      }
      vi.mocked(DocumentTemplate.createTemplate).mockResolvedValue(newTemplate as any)

      const result = await templateService.duplicateTemplate(
        "template-1",
        "Duplicated Template",
        "user-1"
      )

      expect(result).toEqual(newTemplate)
      expect(DocumentTemplate.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Duplicated Template",
          createdBy: "user-1",
        }),
        "user-1"
      )
    })

    it("should throw error when original template not found", async () => {
      vi.mocked(DocumentTemplate.findByPk).mockResolvedValue(null)

      await expect(
        templateService.duplicateTemplate("nonexistent", "New Name", "user-1")
      ).rejects.toThrow("Template with ID nonexistent not found")
    })
  })

  describe("uploadLogo", () => {
    it("should upload logo successfully", async () => {
      const mockFile = {
        originalname: "logo.png",
        mimetype: "image/png",
        size: 1024,
        buffer: Buffer.from("mock image data"),
      } as Express.Multer.File

      const result = await templateService.uploadLogo(mockFile)

      expect(result.originalName).toBe("logo.png")
      expect(result.size).toBe(1024)
      expect(result.logoUrl).toMatch(/^\/logos\/logo-\d+\.png$/)
    })

    it("should update template logo when templateId provided", async () => {
      const mockFile = {
        originalname: "logo.png",
        mimetype: "image/png",
        size: 1024,
        buffer: Buffer.from("mock image data"),
      } as Express.Multer.File

      await templateService.uploadLogo(mockFile, "template-1")

      expect(mockTemplate.save).toHaveBeenCalled()
    })

    it("should reject invalid file types", async () => {
      const mockFile = {
        originalname: "document.txt",
        mimetype: "text/plain",
        size: 1024,
        buffer: Buffer.from("text content"),
      } as Express.Multer.File

      await expect(templateService.uploadLogo(mockFile)).rejects.toThrow(
        "Invalid file type"
      )
    })

    it("should reject files that are too large", async () => {
      const mockFile = {
        originalname: "large-image.png",
        mimetype: "image/png",
        size: 6 * 1024 * 1024, // 6MB
        buffer: Buffer.alloc(6 * 1024 * 1024),
      } as Express.Multer.File

      await expect(templateService.uploadLogo(mockFile)).rejects.toThrow(
        "File size too large"
      )
    })
  })

  describe("previewTemplate", () => {
    it("should generate template preview with sample data", async () => {
      const result = await templateService.previewTemplate("template-1")

      expect(result).toContain("<html>Compiled template</html>")
      expect(DocumentTemplate.findByPk).toHaveBeenCalledWith("template-1")
    })

    it("should generate template preview with custom data", async () => {
      const customData = {
        quote: {
          quoteNumber: "CUSTOM001",
          title: "Custom Quote",
        },
      }

      const result = await templateService.previewTemplate("template-1", customData)

      expect(result).toContain("<html>Compiled template</html>")
    })

    it("should throw error when template not found", async () => {
      vi.mocked(DocumentTemplate.findByPk).mockResolvedValue(null)

      await expect(templateService.previewTemplate("nonexistent")).rejects.toThrow(
        "Template with ID nonexistent not found"
      )
    })
  })

  describe("deleteLogo", () => {
    it("should delete logo file", async () => {
      const { unlink } = await import("fs/promises")

      await templateService.deleteLogo("/logos/test-logo.png")

      expect(unlink).toHaveBeenCalled()
    })

    it("should handle deletion errors gracefully", async () => {
      const { unlink } = await import("fs/promises")
      vi.mocked(unlink).mockRejectedValue(new Error("File not found"))

      // Should not throw error
      await expect(
        templateService.deleteLogo("/logos/nonexistent.png")
      ).resolves.toBeUndefined()
    })
  })
})
