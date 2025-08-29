import { existsSync } from "fs"
import { unlink, writeFile } from "fs/promises"
import { File as KoaFile } from "koa-multer"
import { join } from "path"
import {
  DocumentTemplate,
  DocumentTemplateCreationAttributes,
  TemplateType,
} from "../models/DocumentTemplate"
import { User } from "../models/User"
import logger from "../utils/logger"

export interface LogoUploadResult {
  logoUrl: string
  originalName: string
  size: number
}

export class DocumentTemplateService {
  private logoPath: string

  constructor() {
    this.logoPath = process.env.LOGO_PATH || join(process.cwd(), "storage", "logos")
  }

  public async createTemplate(
    data: DocumentTemplateCreationAttributes,
    createdBy: string
  ): Promise<DocumentTemplate> {
    try {
      const template = await DocumentTemplate.createTemplate({
        ...data,
        createdBy,
      })

      logger.info("Document template created", {
        templateId: template.id,
        name: template.name,
        type: template.type,
        createdBy,
      })

      return template
    } catch (error) {
      logger.error("Failed to create document template", {
        error: (error as Error).message,
        data,
        createdBy,
      })
      throw error
    }
  }

  public async updateTemplate(
    templateId: string,
    updates: Partial<DocumentTemplateCreationAttributes>,
    updatedBy: string
  ): Promise<DocumentTemplate> {
    try {
      const template = await DocumentTemplate.findByPk(templateId)
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`)
      }

      // Create a new version if this is a significant update
      if (this.isSignificantUpdate(updates)) {
        const newVersion = await template.createVersion()

        // Update the new version with the changes
        await newVersion.update(updates)

        logger.info("Document template version created", {
          originalId: templateId,
          newVersionId: newVersion.id,
          version: newVersion.version,
          updatedBy,
        })

        return newVersion
      } else {
        // Minor update, just update the existing template
        await template.update(updates)

        logger.info("Document template updated", {
          templateId,
          updatedBy,
        })

        return template
      }
    } catch (error) {
      logger.error("Failed to update document template", {
        error: (error as Error).message,
        templateId,
        updates,
        updatedBy,
      })
      throw error
    }
  }

  public async deleteTemplate(templateId: string): Promise<void> {
    try {
      const template = await DocumentTemplate.findByPk(templateId)
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`)
      }

      if (!template.canBeDeleted()) {
        throw new Error("Cannot delete default template")
      }

      // Delete associated logo file if exists
      if (template.logoUrl) {
        await this.deleteLogo(template.logoUrl)
      }

      await template.destroy()

      logger.info("Document template deleted", {
        templateId,
        name: template.name,
      })
    } catch (error) {
      logger.error("Failed to delete document template", {
        error: (error as Error).message,
        templateId,
      })
      throw error
    }
  }

  public async getTemplate(templateId: string): Promise<DocumentTemplate | null> {
    try {
      return await DocumentTemplate.findByPk(templateId, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })
    } catch (error) {
      logger.error("Failed to get document template", {
        error: (error as Error).message,
        templateId,
      })
      throw error
    }
  }

  public async getTemplates(type?: TemplateType): Promise<DocumentTemplate[]> {
    try {
      return await DocumentTemplate.getActiveTemplates(type)
    } catch (error) {
      logger.error("Failed to get document templates", {
        error: (error as Error).message,
        type,
      })
      throw error
    }
  }

  public async getDefaultTemplate(type: TemplateType): Promise<DocumentTemplate | null> {
    try {
      return await DocumentTemplate.getDefaultTemplate(type)
    } catch (error) {
      logger.error("Failed to get default template", {
        error: (error as Error).message,
        type,
      })
      throw error
    }
  }

  public async setDefaultTemplate(templateId: string): Promise<DocumentTemplate> {
    try {
      const template = await DocumentTemplate.findByPk(templateId)
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`)
      }

      await template.setAsDefault()

      logger.info("Template set as default", {
        templateId,
        name: template.name,
        type: template.type,
      })

      return template
    } catch (error) {
      logger.error("Failed to set default template", {
        error: (error as Error).message,
        templateId,
      })
      throw error
    }
  }

  public async duplicateTemplate(
    templateId: string,
    newName: string,
    createdBy: string
  ): Promise<DocumentTemplate> {
    try {
      const originalTemplate = await DocumentTemplate.findByPk(templateId)
      if (!originalTemplate) {
        throw new Error(`Template with ID ${templateId} not found`)
      }

      const duplicateData: DocumentTemplateCreationAttributes = {
        name: newName,
        type: originalTemplate.type,
        companyName: originalTemplate.companyName,
        companyAddress: originalTemplate.companyAddress,
        companyPhone: originalTemplate.companyPhone,
        companyEmail: originalTemplate.companyEmail,
        companyWebsite: originalTemplate.companyWebsite,
        taxNumber: originalTemplate.taxNumber,
        vatNumber: originalTemplate.vatNumber,
        siretNumber: originalTemplate.siretNumber,
        registrationNumber: originalTemplate.registrationNumber,
        logoUrl: originalTemplate.logoUrl,
        logoPosition: originalTemplate.logoPosition,
        primaryColor: originalTemplate.primaryColor,
        secondaryColor: originalTemplate.secondaryColor,
        headerHeight: originalTemplate.headerHeight,
        footerHeight: originalTemplate.footerHeight,
        marginTop: originalTemplate.marginTop,
        marginBottom: originalTemplate.marginBottom,
        marginLeft: originalTemplate.marginLeft,
        marginRight: originalTemplate.marginRight,
        customHeader: originalTemplate.customHeader,
        customFooter: originalTemplate.customFooter,
        termsAndConditions: originalTemplate.termsAndConditions,
        paymentInstructions: originalTemplate.paymentInstructions,
        htmlTemplate: originalTemplate.htmlTemplate,
        styles: originalTemplate.styles,
        createdBy,
      }

      const duplicate = await this.createTemplate(duplicateData, createdBy)

      logger.info("Template duplicated", {
        originalId: templateId,
        duplicateId: duplicate.id,
        newName,
        createdBy,
      })

      return duplicate
    } catch (error) {
      logger.error("Failed to duplicate template", {
        error: (error as Error).message,
        templateId,
        newName,
        createdBy,
      })
      throw error
    }
  }

  public async uploadLogo(file: KoaFile, templateId?: string): Promise<LogoUploadResult> {
    try {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/svg+xml"]
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error(
          "Invalid file type. Only JPEG, PNG, GIF, and SVG files are allowed."
        )
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error("File size too large. Maximum size is 5MB.")
      }

      // Generate unique filename
      const timestamp = Date.now()
      const extension = file.originalname.split(".").pop()
      const filename = `logo-${timestamp}.${extension}`
      const filePath = join(this.logoPath, filename)

      // Ensure logo directory exists
      if (!existsSync(this.logoPath)) {
        const { mkdir } = await import("fs/promises")
        await mkdir(this.logoPath, { recursive: true })
      }

      // Save file
      await writeFile(filePath, file.buffer)

      const logoUrl = `/logos/${filename}`

      // Update template if templateId provided
      if (templateId) {
        const template = await DocumentTemplate.findByPk(templateId)
        if (template) {
          // Delete old logo if exists
          if (template.logoUrl) {
            await this.deleteLogo(template.logoUrl)
          }

          template.logoUrl = logoUrl
          await template.save()
        }
      }

      logger.info("Logo uploaded successfully", {
        filename,
        originalName: file.originalname,
        size: file.size,
        templateId,
      })

      return {
        logoUrl,
        originalName: file.originalname,
        size: file.size,
      }
    } catch (error) {
      logger.error("Failed to upload logo", {
        error: (error as Error).message,
        originalName: file.originalname,
        templateId,
      })
      throw error
    }
  }

  public async deleteLogo(logoUrl: string): Promise<void> {
    try {
      // Extract filename from URL
      const filename = logoUrl.split("/").pop()
      if (!filename) return

      const filePath = join(this.logoPath, filename)

      if (existsSync(filePath)) {
        await unlink(filePath)
        logger.info("Logo deleted", { logoUrl, filePath })
      }
    } catch (error) {
      logger.error("Failed to delete logo", {
        error: (error as Error).message,
        logoUrl,
      })
      // Don't throw error for logo deletion failures
    }
  }

  public async previewTemplate(templateId: string, sampleData?: any): Promise<string> {
    try {
      const template = await DocumentTemplate.findByPk(templateId)
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`)
      }

      // Use sample data if not provided
      const data = sampleData || this.getSampleData(template.type)

      // Render template with sample data
      const Handlebars = require("handlebars")

      // Register helpers (same as in PdfService)
      this.registerHandlebarsHelpers(Handlebars)

      const htmlTemplate = template.htmlTemplate || this.getDefaultTemplate(template.type)
      const compiledTemplate = Handlebars.compile(htmlTemplate)

      const html = compiledTemplate({
        ...data,
        template: template.toJSON(),
      })

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>${template.styles || this.getDefaultStyles()}</style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `
    } catch (error) {
      logger.error("Failed to preview template", {
        error: (error as Error).message,
        templateId,
      })
      throw error
    }
  }

  private isSignificantUpdate(
    updates: Partial<DocumentTemplateCreationAttributes>
  ): boolean {
    // Consider updates to these fields as significant (requiring new version)
    const significantFields = [
      "htmlTemplate",
      "styles",
      "companyName",
      "companyAddress",
      "logoUrl",
      "termsAndConditions",
      "paymentInstructions",
    ]

    return significantFields.some((field) => updates.hasOwnProperty(field))
  }

  private registerHandlebarsHelpers(Handlebars: any): void {
    // Currency formatting helper
    Handlebars.registerHelper("currency", function (amount: number) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount || 0)
    })

    // Date formatting helper
    Handlebars.registerHelper("date", function (date: Date) {
      if (!date) return ""
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(date))
    })

    // Address formatting helper
    Handlebars.registerHelper("formatAddress", function (address: any) {
      if (!address) return ""
      return `${address.street}<br>${address.city}, ${address.state} ${address.zipCode}<br>${address.country}`
    })
  }

  private getSampleData(type: TemplateType): any {
    const baseData = {
      institution: {
        name: "Sample Medical Center",
        address: {
          street: "123 Healthcare Ave",
          city: "Medical City",
          state: "MC",
          zipCode: "12345",
          country: "USA",
        },
      },
      assignedUser: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@company.com",
      },
      lines: [
        {
          description: "Medical Equipment Installation",
          quantity: 1,
          unitPrice: 5000,
          discountAmount: 500,
          taxAmount: 450,
          total: 4950,
        },
        {
          description: "Training Services",
          quantity: 8,
          unitPrice: 150,
          discountAmount: 0,
          taxAmount: 120,
          total: 1320,
        },
      ],
      generatedAt: new Date(),
    }

    if (type === TemplateType.QUOTE) {
      return {
        ...baseData,
        quote: {
          quoteNumber: "Q202501001",
          title: "Medical Equipment Quote",
          createdAt: new Date(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: 6200,
          totalDiscountAmount: 500,
          totalTaxAmount: 570,
          total: 6270,
        },
      }
    } else {
      return {
        ...baseData,
        invoice: {
          invoiceNumber: "INV202501001",
          title: "Medical Equipment Invoice",
          createdAt: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: 6200,
          totalDiscountAmount: 500,
          totalTaxAmount: 570,
          total: 6270,
          totalPaid: 3000,
          remainingAmount: 3270,
        },
        payments: [
          {
            paymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            amount: 3000,
            paymentMethod: "Bank Transfer",
            status: "confirmed",
          },
        ],
      }
    }
  }

  private getDefaultStyles(): string {
    // This would be the same as in PdfService
    return `
      body { font-family: Arial, sans-serif; }
      .document { max-width: 800px; margin: 0 auto; padding: 20px; }
    `
  }
}

export default DocumentTemplateService
