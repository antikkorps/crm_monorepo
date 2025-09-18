import { existsSync } from "fs"
import { readdir, stat, unlink, writeFile } from "fs/promises"
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

export interface LogoServeResult {
  buffer: Buffer
  contentType: string
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
        logger.info("Original template before creating version:", {
          type: template.type,
          companyName: template.companyName,
          companyAddress: template.companyAddress,
          createdBy: template.createdBy
        })

        // First, update the original template with the new data to ensure required fields are present
        await template.update(updates)

        // Reload to get the updated values
        await template.reload()

        // Now create a version from the updated template
        const newVersion = await template.createVersion()

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

      // Clean function to handle null/undefined values for optional fields
      const clean = (value: any) => (value === null || value === undefined || value === "" ? undefined : value)

      const duplicateData: DocumentTemplateCreationAttributes = {
        name: newName,
        type: originalTemplate.type || "both",
        companyName: originalTemplate.companyName || "Default Company",
        companyAddress: originalTemplate.companyAddress || {
          street: "Default Street",
          city: "Default City",
          state: "Default State",
          zipCode: "00000",
          country: "Default Country"
        },
        companyPhone: clean(originalTemplate.companyPhone),
        companyEmail: clean(originalTemplate.companyEmail),
        companyWebsite: clean(originalTemplate.companyWebsite),
        taxNumber: clean(originalTemplate.taxNumber),
        vatNumber: clean(originalTemplate.vatNumber),
        siretNumber: clean(originalTemplate.siretNumber),
        registrationNumber: clean(originalTemplate.registrationNumber),
        logoUrl: clean(originalTemplate.logoUrl),
        logoPosition: originalTemplate.logoPosition,
        primaryColor: clean(originalTemplate.primaryColor),
        secondaryColor: clean(originalTemplate.secondaryColor),
        headerHeight: originalTemplate.headerHeight,
        footerHeight: originalTemplate.footerHeight,
        marginTop: originalTemplate.marginTop,
        marginBottom: originalTemplate.marginBottom,
        marginLeft: originalTemplate.marginLeft,
        marginRight: originalTemplate.marginRight,
        customHeader: clean(originalTemplate.customHeader),
        customFooter: clean(originalTemplate.customFooter),
        termsAndConditions: clean(originalTemplate.termsAndConditions),
        paymentInstructions: clean(originalTemplate.paymentInstructions),
        htmlTemplate: clean(originalTemplate.htmlTemplate),
        styles: clean(originalTemplate.styles),
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

      const logoUrl = `/api/templates/logos/${filename}`

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

  public async listLogos(): Promise<
    { url: string; filename: string; size: number; modifiedAt: Date }[]
  > {
    try {
      // Ensure directory exists
      if (!existsSync(this.logoPath)) {
        const { mkdir } = await import("fs/promises")
        await mkdir(this.logoPath, { recursive: true })
      }

      const entries = await readdir(this.logoPath)
      const allowed = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg"])
      const items: { url: string; filename: string; size: number; modifiedAt: Date }[] = []
      for (const name of entries) {
        const lower = name.toLowerCase()
        const dot = lower.lastIndexOf(".")
        const ext = dot >= 0 ? lower.substring(dot) : ""
        if (!allowed.has(ext)) continue
        const filePath = join(this.logoPath, name)
        const s = await stat(filePath)
        if (!s.isFile()) continue
        // Use API route instead of direct path
        items.push({ url: `/api/templates/logos/${name}`, filename: name, size: s.size, modifiedAt: s.mtime })
      }
      // Newest first
      items.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
      return items
    } catch (error) {
      logger.error("Failed to list logos", { error: (error as Error).message })
      return []
    }
  }

  public async serveLogo(filename: string): Promise<LogoServeResult> {
    try {
      // Prevent path traversal
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        throw new Error("Invalid filename")
      }

      const filePath = join(this.logoPath, filename)

      if (!existsSync(filePath)) {
        throw new Error("File not found")
      }

      const { readFile } = await import("fs/promises")
      const buffer = await readFile(filePath)

      // Determine content type
      const ext = filename.toLowerCase().split('.').pop()
      const contentTypeMap: Record<string, string> = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "svg": "image/svg+xml",
      }

      const contentType = contentTypeMap[ext || ""] || "application/octet-stream"

      return { buffer, contentType }
    } catch (error) {
      logger.error("Failed to serve logo", {
        error: (error as Error).message,
        filename
      })
      throw error
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

      const htmlTemplate = template.htmlTemplate || this.getDefaultHtmlTemplate(template.type)
      const compiledTemplate = Handlebars.compile(htmlTemplate)

      const html = compiledTemplate({
        ...data,
        template: template.toJSON(),
      })

      // Clean HTML to remove any script tags or external references
      const cleanedHtml = this.cleanHtmlForPreview(html)

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta http-equiv="Content-Security-Policy" content="script-src 'none';">
            <style>${template.styles || this.getDefaultStyles()}</style>
          </head>
          <body>
            ${cleanedHtml}
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
      "termsAndConditions",
      "paymentInstructions",
    ]

    // Check if any significant field is being updated
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

    // Current date helper
    Handlebars.registerHelper("currentDate", function () {
      return new Date().toLocaleDateString("fr-FR")
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

  private cleanHtmlForPreview(html: string): string {
    // Remove any script tags
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

    // Remove any link tags that might reference external scripts
    html = html.replace(/<link[^>]*href[^>]*\.js[^>]*>/gi, '')

    // Remove any event handlers (onclick, onload, etc.)
    html = html.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')

    // Remove any javascript: protocols
    html = html.replace(/javascript:/gi, '')

    return html
  }

  private getDefaultStyles(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #2c3e50;
        background: white;
      }
      .document {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        padding: 20px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 30px 20px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-left: 4px solid #3f51b5;
        color: #2c3e50;
        margin-bottom: 30px;
      }
      .header h1 {
        font-size: 2.2rem;
        font-weight: 700;
        margin-bottom: 5px;
        color: #3f51b5;
      }
      .header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 5px;
      }
      .company-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        margin-bottom: 30px;
        padding: 0 20px;
      }
      .company-info, .client-info {
        background: #f8f9fa;
        padding: 25px;
        border-radius: 12px;
        border-left: 4px solid #3f51b5;
      }
      .company-info h3, .client-info h3 {
        color: #3f51b5;
        margin-bottom: 15px;
        font-size: 1.2rem;
        font-weight: 600;
      }
      .company-info p, .client-info p {
        margin-bottom: 8px;
        color: #5a6c7d;
      }
      .content {
        padding: 0 20px;
        margin-bottom: 40px;
      }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 30px 0;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      .items-table th {
        background: #3f51b5;
        color: white;
        padding: 15px;
        text-align: left;
        font-weight: 600;
      }
      .items-table td {
        padding: 15px;
        border-bottom: 1px solid #eee;
      }
      .items-table tr:hover {
        background: #f8f9fa;
      }
      .total-section {
        text-align: right;
        margin: 30px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      .total-line {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        padding: 5px 0;
      }
      .total-final {
        font-size: 1.2rem;
        font-weight: 700;
        color: #3f51b5;
        border-top: 2px solid #3f51b5;
        padding-top: 10px;
      }
      @media (max-width: 768px) {
        .company-details { grid-template-columns: 1fr; gap: 20px; }
        .header { flex-direction: column; text-align: center; gap: 20px; }
        .document-info { text-align: center; }
      }
    `
  }


  private getDefaultHtmlTemplate(type: TemplateType): string {
    if (type === TemplateType.QUOTE) {
      return this.getDefaultQuoteTemplate()
    } else if (type === TemplateType.INVOICE) {
      return this.getDefaultInvoiceTemplate()
    } else {
      // For 'both' type, use quote template as default
      return this.getDefaultQuoteTemplate()
    }
  }

  private getDefaultQuoteTemplate(): string {
    return `
      <div class="document">
        <div class="header">
          <h1>{{template.companyName}}</h1>
          <div class="document-info">
            <h2>DEVIS</h2>
            <p>Date: {{currentDate}}</p>
          </div>
        </div>

        <div class="company-details">
          <div class="company-info">
            <h3>Émetteur</h3>
            <p><strong>{{template.companyName}}</strong></p>
            <p>{{template.companyAddress.street}}</p>
            <p>{{template.companyAddress.city}}, {{template.companyAddress.state}} {{template.companyAddress.zipCode}}</p>
            <p>{{template.companyAddress.country}}</p>
            {{#if template.companyEmail}}<p>Email: {{template.companyEmail}}</p>{{/if}}
            {{#if template.companyPhone}}<p>Téléphone: {{template.companyPhone}}</p>{{/if}}
          </div>

          <div class="client-info">
            <h3>Destinataire</h3>
            <p><strong>{{institution.name}}</strong></p>
            <p>{{institution.address.street}}</p>
            <p>{{institution.address.city}}, {{institution.address.state}} {{institution.address.zipCode}}</p>
            <p>{{institution.address.country}}</p>
          </div>
        </div>

        <div class="content">
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantité</th>
                <th>Prix unitaire</th>
                <th>Total HT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Équipement médical spécialisé</td>
                <td>2</td>
                <td>1 250,00 €</td>
                <td>2 500,00 €</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-line">
              <span>Sous-total HT:</span>
              <span>2 500,00 €</span>
            </div>
            <div class="total-line">
              <span>TVA (20%):</span>
              <span>500,00 €</span>
            </div>
            <div class="total-line total-final">
              <span><strong>Total TTC:</strong></span>
              <span><strong>3 000,00 €</strong></span>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private getDefaultInvoiceTemplate(): string {
    return `
      <div class="document">
        <div class="header">
          <h1>{{template.companyName}}</h1>
          <div class="document-info">
            <h2>FACTURE</h2>
            <p>Date: {{currentDate}}</p>
          </div>
        </div>

        <div class="company-details">
          <div class="company-info">
            <h3>Émetteur</h3>
            <p><strong>{{template.companyName}}</strong></p>
            <p>{{template.companyAddress.street}}</p>
            <p>{{template.companyAddress.city}}, {{template.companyAddress.state}} {{template.companyAddress.zipCode}}</p>
            <p>{{template.companyAddress.country}}</p>
            {{#if template.companyEmail}}<p>Email: {{template.companyEmail}}</p>{{/if}}
            {{#if template.companyPhone}}<p>Téléphone: {{template.companyPhone}}</p>{{/if}}
          </div>

          <div class="client-info">
            <h3>Facturé à</h3>
            <p><strong>{{institution.name}}</strong></p>
            <p>{{institution.address.street}}</p>
            <p>{{institution.address.city}}, {{institution.address.state}} {{institution.address.zipCode}}</p>
            <p>{{institution.address.country}}</p>
          </div>
        </div>

        <div class="content">
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantité</th>
                <th>Prix unitaire</th>
                <th>Total HT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Équipement médical spécialisé</td>
                <td>2</td>
                <td>1 250,00 €</td>
                <td>2 500,00 €</td>
              </tr>
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-line">
              <span>Sous-total HT:</span>
              <span>2 500,00 €</span>
            </div>
            <div class="total-line">
              <span>TVA (20%):</span>
              <span>500,00 €</span>
            </div>
            <div class="total-line total-final">
              <span><strong>Total TTC:</strong></span>
              <span><strong>3 000,00 €</strong></span>
            </div>
          </div>
        </div>
      </div>
    `
  }
}

export default DocumentTemplateService
