import { existsSync } from "fs"
import { readdir, stat, unlink, writeFile } from "fs/promises"
import { File as KoaFile } from "koa-multer"
import { join } from "path"
import sanitizeHtml from "sanitize-html"
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
      // Auto-generate htmlTemplate if not provided
      const templateData = { ...data }
      if (!templateData.htmlTemplate || templateData.htmlTemplate.trim() === "") {
        templateData.htmlTemplate = this.generateHtmlTemplate(templateData.type, templateData)
      }

      const template = await DocumentTemplate.createTemplate({
        ...templateData,
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

      // Always regenerate htmlTemplate to ensure it matches the current CSS/layout
      // The UI doesn't allow users to edit htmlTemplate directly, so we always generate it
      // from the template settings (company info, colors, etc.)
      const updateData = { ...updates }
      const templateType = updateData.type || template.type

      // Merge current template data with updates for generation
      const mergedData = {
        ...template.toJSON(),
        ...updateData,
      }
      updateData.htmlTemplate = this.generateHtmlTemplate(templateType, mergedData)
      logger.info("Regenerated htmlTemplate during update", { templateId, templateType })

      // Create a new version if this is a significant update
      // Use the original 'updates' to check, not 'updateData' (which always has htmlTemplate)
      if (this.isSignificantUpdate(updates)) {
        logger.info("Original template before creating version:", {
          type: template.type,
          companyName: template.companyName,
          companyAddress: template.companyAddress,
          createdBy: template.createdBy
        })

        // First, update the original template with the new data (including regenerated htmlTemplate)
        await template.update(updateData)

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
        // Minor update, just update the existing template (including regenerated htmlTemplate)
        await template.update(updateData)

        logger.info("Document template updated", {
          templateId,
          updatedBy,
          htmlTemplateUpdated: !!updateData.htmlTemplate,
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
    // SECURITY: Comprehensive HTML sanitization for preview using 'sanitize-html'
    // For production, this uses a robust and well-maintained library.
    // Allow a minimal set of safe tags and attributes, or restrict further if needed.
    return sanitizeHtml(html, {
      allowedTags: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'pre', 'code'],
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        span: ['style'],
        div: ['style'],
        '*': ['style']
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowProtocolRelative: false,
      allowedIframeHostnames: [],
      // Disallow all scripts, event handlers, style elements, iframes, embeds, objects, etc.
      disallowedTagsMode: 'discard'
    });
  }

  private getDefaultStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 13px;
        line-height: 1.5;
        color: #333;
        background: white;
      }

      .document {
        max-width: 800px;
        margin: 0 auto;
        padding: 30px;
      }

      /* Header */
      .header {
        display: flex;
        align-items: center;
        gap: 20px;
        padding-bottom: 20px;
        border-bottom: 3px solid #3f51b5;
        margin-bottom: 25px;
      }

      .header-logo {
        flex-shrink: 0;
      }

      .header-logo.logo-small img {
        max-height: 40px;
        max-width: 80px;
      }

      .header-logo.logo-medium img {
        max-height: 60px;
        max-width: 120px;
      }

      .header-logo.logo-large img {
        max-height: 80px;
        max-width: 160px;
      }

      .header-logo img {
        object-fit: contain;
      }

      .header-content h1 {
        font-size: 1.8rem;
        font-weight: 700;
        color: #3f51b5;
        margin: 0;
      }

      /* Document meta info */
      .document-meta {
        margin-bottom: 30px;
      }

      .document-type {
        font-size: 1.5rem;
        font-weight: 700;
        color: #333;
        margin-bottom: 10px;
      }

      .document-details p {
        margin: 4px 0;
        color: #555;
      }

      /* Parties table for two-column layout */
      .parties-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }

      .parties-table td.party {
        width: 50%;
        vertical-align: top;
        padding-right: 30px;
      }

      .parties-table td.party:last-child {
        padding-right: 0;
        padding-left: 30px;
      }

      .party h3 {
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #888;
        margin: 0 0 10px 0;
        letter-spacing: 0.5px;
      }

      .party-name {
        font-weight: 600;
        color: #333;
        margin-bottom: 5px;
      }

      .party p {
        margin: 3px 0;
        color: #555;
      }

      /* Custom message */
      .custom-message {
        background: #fff8e1;
        border-left: 3px solid #ffc107;
        padding: 12px 15px;
        margin-bottom: 25px;
        color: #856404;
      }

      /* Items table */
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      .items-table th {
        background: #3f51b5;
        color: white;
        padding: 12px 10px;
        text-align: left;
        font-weight: 600;
        font-size: 0.85rem;
      }

      .items-table td {
        padding: 12px 10px;
        border-bottom: 1px solid #eee;
        vertical-align: top;
      }

      .text-center {
        text-align: center;
      }

      .text-right {
        text-align: right;
      }

      /* Totals section */
      .totals-section {
        width: 280px;
        margin-left: auto;
        margin-bottom: 30px;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }

      .total-final {
        font-weight: 700;
        font-size: 1.1rem;
        color: #3f51b5;
        border-bottom: 2px solid #3f51b5;
        border-top: 1px solid #ccc;
        margin-top: 5px;
        padding-top: 10px;
      }

      /* Footer info */
      .footer-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin-bottom: 30px;
        padding-top: 20px;
        border-top: 1px solid #eee;
      }

      .footer-block h4 {
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #888;
        margin: 0 0 8px 0;
        letter-spacing: 0.5px;
      }

      .footer-block p {
        margin: 0;
        color: #555;
        font-size: 0.9rem;
        line-height: 1.6;
      }

      /* Document footer */
      .document-footer {
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid #eee;
        color: #888;
        font-size: 0.85rem;
      }

      @media print {
        .document {
          padding: 20px;
        }
      }

      @media (max-width: 768px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
          gap: 15px;
        }

        .parties-section {
          grid-template-columns: 1fr;
          gap: 25px;
        }

        .footer-info {
          grid-template-columns: 1fr;
          gap: 20px;
        }

        .totals-section {
          width: 100%;
        }
      }
    `
  }


  /**
   * Generate HTML template with Handlebars variables based on template type and data
   * This creates a template that matches the frontend preview (TemplatePreviewRenderer)
   */
  public generateHtmlTemplate(type: TemplateType, _data: Partial<DocumentTemplateCreationAttributes>): string {
    // Generate document type specific sections
    const documentMeta = this.getDocumentMetaSection(type)
    const clientSection = this.getClientSectionLabel(type)
    const totalsSection = this.getTotalsSection(type)

    return `
      <div class="document">
        <!-- Header with logo and company name -->
        <div class="header">
          {{#if template.logoUrl}}
          <div class="header-logo logo-{{template.logoSize}}">
            <img src="{{template.logoUrl}}" alt="{{template.companyName}}" />
          </div>
          {{/if}}
          <div class="header-content">
            <h1>{{template.companyName}}</h1>
          </div>
        </div>

        <!-- Document meta info - left aligned -->
        <div class="document-meta">
          ${documentMeta}
        </div>

        <!-- Two columns: Émetteur and Destinataire using table for PDF compatibility -->
        <table class="parties-table">
          <tr>
            <td class="party">
              <h3>Émetteur</h3>
              <p class="party-name">{{template.companyName}}</p>
              <p>{{template.companyAddress.street}}</p>
              <p>{{template.companyAddress.zipCode}} {{template.companyAddress.city}}</p>
              <p>{{template.companyAddress.country}}</p>
              {{#if template.companyPhone}}<p>Tél : {{template.companyPhone}}</p>{{/if}}
              {{#if template.companyEmail}}<p>Email : {{template.companyEmail}}</p>{{/if}}
              {{#if template.siretNumber}}<p>SIRET : {{template.siretNumber}}</p>{{/if}}
              {{#if template.taxNumber}}<p>TVA : {{template.taxNumber}}</p>{{/if}}
            </td>
            <td class="party">
              <h3>${clientSection}</h3>
              <p class="party-name">{{institution.name}}</p>
              {{#if institution.address}}
              <p>{{institution.address.street}}</p>
              <p>{{institution.address.zipCode}} {{institution.address.city}}</p>
              <p>{{institution.address.country}}</p>
              {{else}}
              {{#if institution.street}}<p>{{institution.street}}</p>{{/if}}
              {{#if institution.city}}<p>{{institution.zipCode}} {{institution.city}}</p>{{/if}}
              {{#if institution.country}}<p>{{institution.country}}</p>{{/if}}
              {{/if}}
              {{#if institution.phone}}<p>Tél : {{institution.phone}}</p>{{/if}}
              {{#if institution.email}}<p>Email : {{institution.email}}</p>{{/if}}
            </td>
          </tr>
        </table>

        {{#if template.customHeader}}
        <div class="custom-message">
          {{template.customHeader}}
        </div>
        {{/if}}

        <!-- Items table -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center">Qté</th>
              <th class="text-right">Prix unitaire</th>
              <th class="text-right">Remise</th>
              <th class="text-right">TVA</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each lines}}
            <tr>
              <td>{{this.description}}</td>
              <td class="text-center">{{this.quantity}}</td>
              <td class="text-right">{{currency this.unitPrice}}</td>
              <td class="text-right">{{currency this.discountAmount}}</td>
              <td class="text-right">{{currency this.taxAmount}}</td>
              <td class="text-right">{{currency this.total}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <!-- Totals section -->
        <div class="totals-section">
          ${totalsSection}
        </div>

        <!-- Footer info -->
        <div class="footer-info">
          {{#if template.termsAndConditions}}
          <div class="footer-block">
            <h4>Conditions générales</h4>
            <p>{{template.termsAndConditions}}</p>
          </div>
          {{/if}}

          {{#if template.paymentInstructions}}
          <div class="footer-block">
            <h4>Modalités de paiement</h4>
            <p>{{template.paymentInstructions}}</p>
          </div>
          {{/if}}
        </div>

        <!-- Document footer -->
        <div class="document-footer">
          {{#if template.customFooter}}
          {{template.customFooter}}
          {{else}}
          {{template.companyName}} - Document généré le {{currentDate}}
          {{/if}}
        </div>
      </div>
    `
  }

  private getDocumentMetaSection(type: TemplateType): string {
    if (type === TemplateType.INVOICE) {
      return `
          <div class="document-type">FACTURE</div>
          <div class="document-details">
            <p><strong>N° :</strong> {{invoice.invoiceNumber}}</p>
            <p><strong>Date :</strong> {{currentDate}}</p>
            <p><strong>Échéance :</strong> {{formatDate invoice.dueDate}}</p>
          </div>
      `
    } else if (type === TemplateType.QUOTE) {
      return `
          {{#if order}}
          <div class="document-type">BON DE COMMANDE</div>
          <div class="document-details">
            <p><strong>N° Commande :</strong> {{quote.orderNumber}}</p>
            <p><strong>Réf. Devis :</strong> {{quote.quoteNumber}}</p>
            <p><strong>Date :</strong> {{currentDate}}</p>
          </div>
          {{else}}
          <div class="document-type">DEVIS</div>
          <div class="document-details">
            <p><strong>N° :</strong> {{quote.quoteNumber}}</p>
            <p><strong>Date :</strong> {{currentDate}}</p>
            <p><strong>Valide jusqu'au :</strong> {{formatDate quote.validUntil}}</p>
          </div>
          {{/if}}
      `
    } else {
      // Type "both" - dynamic based on document
      return `
          {{#if invoice}}
          <div class="document-type">FACTURE</div>
          <div class="document-details">
            <p><strong>N° :</strong> {{invoice.invoiceNumber}}</p>
            <p><strong>Date :</strong> {{currentDate}}</p>
            <p><strong>Échéance :</strong> {{formatDate invoice.dueDate}}</p>
          </div>
          {{else}}
          {{#if order}}
          <div class="document-type">BON DE COMMANDE</div>
          <div class="document-details">
            <p><strong>N° Commande :</strong> {{quote.orderNumber}}</p>
            <p><strong>Réf. Devis :</strong> {{quote.quoteNumber}}</p>
            <p><strong>Date :</strong> {{currentDate}}</p>
          </div>
          {{else}}
          <div class="document-type">DEVIS</div>
          <div class="document-details">
            <p><strong>N° :</strong> {{quote.quoteNumber}}</p>
            <p><strong>Date :</strong> {{currentDate}}</p>
            <p><strong>Valide jusqu'au :</strong> {{formatDate quote.validUntil}}</p>
          </div>
          {{/if}}
          {{/if}}
      `
    }
  }

  private getClientSectionLabel(type: TemplateType): string {
    if (type === TemplateType.INVOICE) {
      return "Facturé à"
    } else if (type === TemplateType.QUOTE) {
      return "Destinataire"
    } else {
      return "{{#if invoice}}Facturé à{{else}}Destinataire{{/if}}"
    }
  }

  private getTotalsSection(type: TemplateType): string {
    const quoteTotals = `
          <div class="total-row">
            <span>Sous-total HT</span>
            <span>{{currency quote.subtotal}}</span>
          </div>
          <div class="total-row">
            <span>Remise totale</span>
            <span>-{{currency quote.totalDiscountAmount}}</span>
          </div>
          <div class="total-row">
            <span>TVA</span>
            <span>{{currency quote.totalTaxAmount}}</span>
          </div>
          <div class="total-row total-final">
            <span>Total TTC</span>
            <span>{{currency quote.total}}</span>
          </div>
    `

    const invoiceTotals = `
          <div class="total-row">
            <span>Sous-total HT</span>
            <span>{{currency invoice.subtotal}}</span>
          </div>
          <div class="total-row">
            <span>Remise totale</span>
            <span>-{{currency invoice.totalDiscountAmount}}</span>
          </div>
          <div class="total-row">
            <span>TVA</span>
            <span>{{currency invoice.totalTaxAmount}}</span>
          </div>
          <div class="total-row total-final">
            <span>Total TTC</span>
            <span>{{currency invoice.total}}</span>
          </div>
          {{#if invoice.totalPaid}}
          <div class="total-row">
            <span>Déjà payé</span>
            <span>-{{currency invoice.totalPaid}}</span>
          </div>
          <div class="total-row total-final">
            <span>Reste à payer</span>
            <span>{{currency invoice.remainingAmount}}</span>
          </div>
          {{/if}}
    `

    if (type === TemplateType.INVOICE) {
      return invoiceTotals
    } else if (type === TemplateType.QUOTE) {
      return quoteTotals
    } else {
      return `
          {{#if invoice}}
          ${invoiceTotals}
          {{else}}
          ${quoteTotals}
          {{/if}}
      `
    }
  }

  // Keep for backward compatibility - delegates to generateHtmlTemplate
  private getDefaultHtmlTemplate(type: TemplateType): string {
    return this.generateHtmlTemplate(type, {})
  }
}

export default DocumentTemplateService
