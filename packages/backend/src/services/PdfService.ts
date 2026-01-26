import { existsSync } from "fs"
import { mkdir, writeFile } from "fs/promises"
import Handlebars from "handlebars"
import { dirname, join } from "path"
import puppeteer, { Browser, PDFOptions } from "puppeteer"
import { v4 as uuidv4 } from "uuid"
import { sequelize } from "../config/database"
import { DocumentTemplate, TemplateType } from "../models/DocumentTemplate"
import { DocumentVersion, DocumentVersionType } from "../models/DocumentVersion"
import { Invoice } from "../models/Invoice"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Quote } from "../models/Quote"
import { User } from "../models/User"
import logger from "../utils/logger"
import EmailService from "./EmailService"

export interface PdfGenerationOptions {
  format?: "A4" | "Letter"
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
  saveToFile?: boolean
  emailOptions?: {
    recipients: string[]
    customMessage?: string
  }
}

export interface PdfGenerationResult {
  buffer: Buffer
  filePath?: string
  version?: DocumentVersion
  emailResult?: any
}

export class PdfService {
  private browser: Browser | null = null
  private emailService: EmailService
  private documentsPath: string

  constructor() {
    this.emailService = new EmailService()
    this.documentsPath =
      process.env.DOCUMENTS_PATH || join(process.cwd(), "storage", "documents")
    this.ensureDocumentsDirectory()
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
    }
    return this.browser
  }

  private async ensureDocumentsDirectory(): Promise<void> {
    try {
      if (!existsSync(this.documentsPath)) {
        await mkdir(this.documentsPath, { recursive: true })
      }

      // Create subdirectories for quotes and invoices
      const quotesPath = join(this.documentsPath, "quotes")
      const invoicesPath = join(this.documentsPath, "invoices")

      if (!existsSync(quotesPath)) {
        await mkdir(quotesPath, { recursive: true })
      }

      if (!existsSync(invoicesPath)) {
        await mkdir(invoicesPath, { recursive: true })
      }
    } catch (error) {
      logger.error("Failed to create documents directory", {
        error: (error as Error).message,
      })
    }
  }

  public async generateQuotePdf(
    quoteId: string,
    generatedBy: string,
    templateId?: string,
    options: PdfGenerationOptions = {}
  ): Promise<PdfGenerationResult> {
    return this.generateQuoteLikePdf("QUOTE", quoteId, generatedBy, templateId, options)
  }

  public async generateOrderPdf(
    quoteId: string,
    generatedBy: string,
    templateId?: string,
    options: PdfGenerationOptions = {}
  ): Promise<PdfGenerationResult> {
    return this.generateQuoteLikePdf("ORDER", quoteId, generatedBy, templateId, options)
  }

  public async generateInvoicePdf(
    invoiceId: string,
    generatedBy: string,
    templateId?: string,
    options: PdfGenerationOptions = {}
  ): Promise<PdfGenerationResult> {
    try {
      // Fetch invoice with all related data
      const invoice = await Invoice.findByPk(invoiceId, {
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            include: [
              // Include contacts to resolve recipient display name from email
              {
                model: sequelize.models.ContactPerson,
                as: "contactPersons",
                required: false,
              },
            ],
          },
          {
            model: User,
            as: "assignedUser",
          },
        ],
      })

      if (!invoice) {
        throw new Error(`Invoice with ID ${invoiceId} not found`)
      }

      // Query lines and payments directly to avoid instance method issues
      const InvoiceLine = sequelize.models.InvoiceLine
      const Payment = sequelize.models.Payment

      const lines = await InvoiceLine.findAll({
        where: { invoice_id: invoiceId },
        order: [["order_index", "ASC"]],
      })

      const payments = await Payment.findAll({
        where: { invoice_id: invoiceId },
        order: [["payment_date", "DESC"]],
      })

      // Get template from database or use default
      const templateResult = await this.getTemplateWithFallbackFlag(templateId, TemplateType.INVOICE)
      const template = templateResult.template
      const isFallbackTemplate = templateResult.isFallback

      // Convert to plain objects to avoid Sequelize getter/setter issues
      const invoiceData = invoice.toJSON ? invoice.toJSON() : (invoice as any)
      const linesData = lines.map(line => line.toJSON ? line.toJSON() : line)
      const paymentsData = payments.map(payment => payment.toJSON ? payment.toJSON() : payment)
      const institutionData = invoice.institution?.toJSON ? invoice.institution.toJSON() : invoice.institution
      const assignedUserData = invoice.assignedUser?.toJSON ? invoice.assignedUser.toJSON() : invoice.assignedUser

      console.log("Template data for rendering:", {
        invoiceId: invoiceData.id,
        invoiceNumber: invoiceData.invoiceNumber,
        title: invoiceData.title,
        total: invoiceData.total,
        linesCount: linesData.length,
        paymentsCount: paymentsData.length,
        institutionName: institutionData?.name,
        assignedUserName: assignedUserData ? `${assignedUserData.firstName} ${assignedUserData.lastName}` : null
      })

      const html = await this.renderTemplate(template, {
        invoice: invoiceData,
        lines: linesData,
        payments: paymentsData,
        institution: institutionData,
        assignedUser: assignedUserData,
        generatedAt: new Date(),
        companyName: template.companyName,
        companyAddress: template.companyAddress,
      })

      console.log("Rendered HTML preview:", html.substring(0, 500) + "...")
      const pdfBuffer = await this.generatePdfFromHtml(html, options)

      let filePath: string | undefined
      let version: DocumentVersion | undefined

      if (options.saveToFile !== false) {
        // Save to file and create version record
        const fileName = `Invoice-${
          invoice.invoiceNumber
        }-v${await DocumentVersion.getNextVersion(
          invoiceId,
          DocumentVersionType.INVOICE_PDF
        )}.pdf`
        filePath = join(this.documentsPath, "invoices", fileName)

        await this.ensureDirectoryExists(dirname(filePath))
        await writeFile(filePath, pdfBuffer)

        // Create document version record
        version = await DocumentVersion.createVersion({
          documentId: invoiceId,
          documentType: DocumentVersionType.INVOICE_PDF,
          templateId: isFallbackTemplate ? undefined : template.id,
          fileName,
          filePath,
          fileSize: pdfBuffer.length,
          mimeType: "application/pdf",
          generatedBy,
          generatedAt: new Date(),
          templateSnapshot: template.toJSON(),
        })
      }

      let emailResult
      if (options.emailOptions) {
        const providedRecipients = options.emailOptions.recipients || []
        const fallbackEmail = invoiceData.institution ? this.getInstitutionContactEmail(invoiceData.institution) : null
        let recipients: any[] = providedRecipients.length > 0
          ? providedRecipients
          : (fallbackEmail ? [fallbackEmail] : [])

        // Normalize recipients to string emails
        recipients = recipients
          .map((r: any) => (typeof r === 'string' ? r : r?.value || r?.email || ''))
          .filter((e: string) => !!e)

        // Determine display name: prefer first matching contact full name, fallback to institution name, else "Client"
        const firstRecipientEmail = Array.isArray(recipients) && recipients.length > 0 ? String(recipients[0]) : ""
        const contacts = (invoiceData.institution && (invoiceData.institution as any).contactPersons) || []
        let matchedContact = contacts.find((c: any) => (c?.email || '').toLowerCase() === firstRecipientEmail.toLowerCase())

        // If not found in loaded contacts, try fetching contact by email from DB (with institution)
        if (!matchedContact && firstRecipientEmail) {
          try {
            const ContactPerson = sequelize.models.ContactPerson
            const cp = await ContactPerson.findOne({
              where: { email: firstRecipientEmail },
              include: [
                { model: MedicalInstitution, as: 'institution', required: false },
              ],
            })
            if (cp) {
              matchedContact = cp.toJSON ? cp.toJSON() : cp
            }
          } catch (_) {}
        }

        const recipientDisplayName = matchedContact
          ? `${matchedContact.firstName || ''} ${matchedContact.lastName || ''}`.trim()
          : (
              invoiceData.institution?.name ||
              (matchedContact?.institution?.name) ||
              "Client"
            )

        if (recipients.length > 0) {
          emailResult = await this.emailService.sendInvoiceEmail(
            recipients,
            recipientDisplayName,
            invoiceData.invoiceNumber,
            template.companyName,
            invoiceData.dueDate,
            invoiceData.total,
            pdfBuffer,
            options.emailOptions.customMessage
          )

          // Update version record with email info
          if (version && emailResult.success) {
            await version.markAsEmailed(
              Array.isArray((emailResult as any).recipients) ? (emailResult as any).recipients : recipients,
              `Invoice ${invoiceData.invoiceNumber} from ${template.companyName}`
            )
          }
        }
      }

      return {
        buffer: pdfBuffer,
        filePath,
        version,
        emailResult,
      }
    } catch (error) {
      logger.error("Error generating invoice PDF:", error)
      throw new Error(`Failed to generate invoice PDF: ${(error as Error).message}`)
    }
  }

  private async generatePdfFromHtml(
    html: string,
    options: PdfGenerationOptions = {}
  ): Promise<Buffer> {
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    try {
      await page.setContent(html, { waitUntil: "networkidle0" })

      const pdfOptions: PDFOptions = {
        format: options.format || "A4",
        margin: options.margin || {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || "",
        footerTemplate: options.footerTemplate || "",
        printBackground: true,
      }

      const pdfUint8Array = await page.pdf(pdfOptions)
      const pdfBuffer = Buffer.from(pdfUint8Array)

      return pdfBuffer
    } finally {
      await page.close()
    }
  }

  private async renderTemplate(template: DocumentTemplate, data: any): Promise<string> {
    // Use custom HTML template if available, otherwise use default
    const htmlTemplate = template.htmlTemplate || this.getDefaultTemplate(template.type)
    // Always include defaults; allow template styles to override
    const styles = `${this.getDefaultStyles()}\n${template.styles || ''}`

    // Register Handlebars helpers
    this.registerHandlebarsHelpers()

    // Allow styles to use Handlebars variables (e.g., brand colors)
    const styleTemplate = Handlebars.compile(styles)
    const styleHtml = styleTemplate({
      ...data,
      template: template.toJSON(),
    })

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
          <style>${styleHtml}</style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `
  }

  // DRY: Shared generator for quote and order PDFs
  private async generateQuoteLikePdf(
    kind: "QUOTE" | "ORDER",
    quoteId: string,
    generatedBy: string,
    templateId?: string,
    options: PdfGenerationOptions = {}
  ): Promise<PdfGenerationResult> {
    try {
      const quote = await Quote.findByPk(quoteId, {
        include: [
          { model: MedicalInstitution, as: "institution" },
          { model: User, as: "assignedUser" },
          { model: (await import("../models/QuoteLine")).QuoteLine, as: "lines" },
        ],
      })
      if (!quote) {
        throw new Error(`Quote with ID ${quoteId} not found`)
      }

      // If institution wasn't loaded via include, try loading it separately
      let institution: MedicalInstitution | null | undefined = quote.institution
      if (!institution && quote.institutionId) {
        institution = await MedicalInstitution.findByPk(quote.institutionId)
      }

      const linesRaw = quote.lines && quote.lines.length > 0 ? quote.lines : await quote.getLines()
      const lines = linesRaw.map((l: any) => (typeof l.toJSON === "function" ? l.toJSON() : l))

      const resolvedTemplateId = templateId || (quote as any).templateId
      let templateResult
      try {
        templateResult = await this.getTemplateWithFallbackFlag(resolvedTemplateId, TemplateType.QUOTE)
      } catch {
        templateResult = await this.getTemplateWithFallbackFlag(undefined, TemplateType.QUOTE)
      }
      const template = templateResult.template
      const isFallbackTemplate = templateResult.isFallback

      // Calculate totals - handle both camelCase and snake_case field names
      const computed = {
        subtotal: lines.reduce((s: number, l: any) => s + Number(l.subtotal || l.sub_total || 0), 0),
        totalDiscountAmount: lines.reduce((s: number, l: any) => s + Number(l.discountAmount || l.discount_amount || 0), 0),
        totalTaxAmount: lines.reduce((s: number, l: any) => s + Number(l.taxAmount || l.tax_amount || 0), 0),
        total: lines.reduce((s: number, l: any) => s + Number(l.total || 0), 0),
      }

      const quoteForRender: any = { ...(quote.toJSON?.() || quote) }
      if (!Number(quoteForRender.total)) Object.assign(quoteForRender, computed)

      // Use the institution variable (which may have been loaded separately)
      const institutionData = institution?.toJSON ? institution.toJSON() : institution
      const assignedUserData = quote.assignedUser?.toJSON ? quote.assignedUser.toJSON() : quote.assignedUser

      const html = await this.renderTemplate(template, {
        order: kind === "ORDER",
        quote: quoteForRender,
        lines,
        institution: institutionData,
        assignedUser: assignedUserData,
        generatedAt: new Date(),
        companyName: template.companyName,
        companyAddress: template.companyAddress,
      })

      const pdfBuffer = await this.generatePdfFromHtml(html, options)

      let filePath: string | undefined
      let version: DocumentVersion | undefined
      if (options.saveToFile !== false) {
        const versionType = kind === "ORDER" ? DocumentVersionType.ORDER_PDF : DocumentVersionType.QUOTE_PDF
        const next = await DocumentVersion.getNextVersion(quoteId, versionType)
        const baseName = kind === "ORDER" ? `Order-${quote.orderNumber || (quote as any).quoteNumber}` : `Quote-${(quote as any).quoteNumber}`
        const fileName = `${baseName}-v${next}.pdf`
        filePath = join(this.documentsPath, "quotes", fileName)
        await this.ensureDirectoryExists(dirname(filePath))
        await writeFile(filePath, pdfBuffer)

        version = await DocumentVersion.createVersion({
          documentId: quoteId,
          documentType: versionType,
          templateId: isFallbackTemplate ? undefined : template.id,
          fileName,
          filePath,
          fileSize: pdfBuffer.length,
          mimeType: "application/pdf",
          generatedBy,
          generatedAt: new Date(),
          templateSnapshot: template.toJSON(),
        })
      }

      let emailResult
      if (kind === "QUOTE" && options.emailOptions && quote.institution) {
        const providedRecipients = options.emailOptions.recipients || []
        const fallbackEmail = this.getInstitutionContactEmail(quote.institution)
        const recipients = providedRecipients.length > 0
          ? providedRecipients
          : (fallbackEmail ? [fallbackEmail] : [])

        if (recipients.length > 0) {
          emailResult = await this.emailService.sendQuoteEmail(
            recipients,
            quote.institution.name,
            (quote as any).quoteNumber,
            template.companyName,
            pdfBuffer,
            options.emailOptions.customMessage
          )

          if (version && (emailResult as any).success) {
            await version.markAsEmailed(
              Array.isArray((emailResult as any).recipients) ? (emailResult as any).recipients : recipients,
              `Quote ${(quote as any).quoteNumber} from ${template.companyName}`
            )
          }
        }
      }

      return { buffer: pdfBuffer, filePath, version, emailResult }
    } catch (error) {
      const scope = kind === "ORDER" ? "order" : "quote"
      logger.error(`Error generating ${scope} PDF:`, error)
      throw new Error(`Failed to generate ${scope} PDF: ${(error as Error).message}`)
    }
  }

  private async getTemplate(
    templateId?: string,
    type?: TemplateType
  ): Promise<DocumentTemplate> {
    if (templateId) {
      const template = await DocumentTemplate.findByPk(templateId)
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`)
      }
      if (type && template.type !== type && template.type !== TemplateType.BOTH) {
        throw new Error(`Template ${templateId} is not compatible with type ${type}`)
      }
      return template
    }

    // Get default template for the type
    if (type) {
      const defaultTemplate = await DocumentTemplate.getDefaultTemplate(type)
      if (defaultTemplate) {
        return defaultTemplate
      }
    }

    // Create a fallback template if none exists
    return this.createFallbackTemplate(type || TemplateType.BOTH)
  }

  private async getTemplateWithFallbackFlag(
    templateId?: string,
    type?: TemplateType
  ): Promise<{ template: DocumentTemplate; isFallback: boolean }> {
    if (templateId) {
      const template = await DocumentTemplate.findByPk(templateId)
      if (!template) {
        throw new Error(`Template with ID ${templateId} not found`)
      }
      if (type && template.type !== type && template.type !== TemplateType.BOTH) {
        throw new Error(`Template ${templateId} is not compatible with type ${type}`)
      }
      return { template, isFallback: false }
    }

    // Get default template for the type
    if (type) {
      const defaultTemplate = await DocumentTemplate.getDefaultTemplate(type)
      if (defaultTemplate) {
        return { template: defaultTemplate, isFallback: false }
      }

      // Check if any compatible template exists (not default but usable)
      const anyTemplate = await DocumentTemplate.findOne({
        where: {
          isActive: true,
          type: [type, TemplateType.BOTH],
        },
        order: [["createdAt", "DESC"]],
      })
      if (anyTemplate) {
        return { template: anyTemplate, isFallback: false }
      }
    }

    // No template found - throw a clear error instead of using fallback
    const documentType = type === TemplateType.QUOTE ? "devis" : type === TemplateType.INVOICE ? "facture" : "document"
    throw new Error(
      `NO_TEMPLATE_CONFIGURED:Aucun modèle de document n'est configuré pour les ${documentType}s. ` +
      `Veuillez créer un modèle dans Paramètres > Modèles de documents avant de générer des PDFs.`
    )
  }

  private createFallbackTemplate(type: TemplateType): DocumentTemplate {
    const basicInvoiceTemplate = `
        <div class="header">
            <div class="company">{{companyName}}</div>
            <div class="company-details">
                {{companyAddress.street}}<br>
                {{companyAddress.city}}, {{companyAddress.state}} {{companyAddress.zipCode}}<br>
                {{companyAddress.country}}
            </div>
        </div>

        <div class="document-title">
            {{#if invoice}}INVOICE{{else}}QUOTE{{/if}}
        </div>

        <div class="document-info">
            <p><strong>{{#if invoice}}Invoice{{else}}Quote{{/if}} Number:</strong> {{#if invoice}}{{invoice.invoiceNumber}}{{else}}{{quote.quoteNumber}}{{/if}}</p>
            <p><strong>Date:</strong> {{formatDate generatedAt}}</p>
            {{#if invoice.dueDate}}<p><strong>Due Date:</strong> {{formatDate invoice.dueDate}}</p>{{/if}}
        </div>

        <div class="client-info">
            <h3>Bill To:</h3>
            {{#if institution}}
                <p><strong>{{institution.name}}</strong></p>
                {{#if institution.address}}
                    <p>{{institution.address.street}}<br>
                    {{institution.address.city}}, {{institution.address.state}} {{institution.address.zipCode}}<br>
                    {{institution.address.country}}</p>
                {{/if}}
            {{/if}}
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                    <th class="amount">Unit Price</th>
                    <th class="amount">Total</th>
                </tr>
            </thead>
            <tbody>
                {{#each lines}}
                <tr>
                    <td>{{this.description}}</td>
                    <td style="text-align: center;">{{this.quantity}}</td>
                    <td class="amount">{{currency this.unitPrice}}</td>
                    <td class="amount">{{currency this.total}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>

        <div class="totals">
            <table>
                {{#if invoice}}
                    <tr><td>Subtotal:</td><td class="amount">{{currency invoice.subtotal}}</td></tr>
                    {{#if invoice.totalDiscountAmount}}
                        <tr><td>Discount:</td><td class="amount">-{{currency invoice.totalDiscountAmount}}</td></tr>
                    {{/if}}
                    {{#if invoice.totalTaxAmount}}
                        <tr><td>Tax:</td><td class="amount">{{currency invoice.totalTaxAmount}}</td></tr>
                    {{/if}}
                    <tr class="total-row"><td><strong>Total:</strong></td><td class="amount"><strong>{{currency invoice.total}}</strong></td></tr>
                {{else}}
                    <tr><td>Subtotal:</td><td class="amount">{{currency quote.subtotal}}</td></tr>
                    {{#if quote.totalDiscountAmount}}
                        <tr><td>Discount:</td><td class="amount">-{{currency quote.totalDiscountAmount}}</td></tr>
                    {{/if}}
                    {{#if quote.totalTaxAmount}}
                        <tr><td>Tax:</td><td class="amount">{{currency quote.totalTaxAmount}}</td></tr>
                    {{/if}}
                    <tr class="total-row"><td><strong>Total:</strong></td><td class="amount"><strong>{{currency quote.total}}</strong></td></tr>
                {{/if}}
            </table>
        </div>

        <div class="footer">
            <p>Generated on {{formatDate generatedAt}} by {{companyName}}</p>
        </div>
    `

    const basicStyles = `
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .company { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 5px; }
        .company-details { color: #666; font-size: 14px; }
        .document-title { font-size: 32px; font-weight: bold; margin: 30px 0; }
        .document-info { margin-bottom: 30px; }
        .client-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .client-info h3 { margin: 0 0 10px 0; color: #007bff; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .amount { text-align: right; font-family: monospace; }
        .totals { margin-top: 20px; }
        .totals table { width: 300px; margin-left: auto; }
        .total-row { font-weight: bold; font-size: 18px; background-color: #007bff; color: white; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    `

    // Create a minimal template object (not saved to database)
    const template = new DocumentTemplate({
      id: uuidv4(),
      name: `Fallback ${type} Template`,
      type,
      isDefault: false,
      isActive: true,
      companyName: "Your Company Name",
      companyAddress: {
        street: "123 Business St",
        city: "Business City",
        state: "BC",
        zipCode: "12345",
        country: "USA",
      },
      logoPosition: "top_left" as any,
      headerHeight: 80,
      footerHeight: 60,
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 15,
      marginRight: 15,
      htmlTemplate: basicInvoiceTemplate,
      styles: basicStyles,
      createdBy: "system",
      version: 1,
    } as any)

    return template
  }

  private registerHandlebarsHelpers(): void {
    // Currency formatting helper
    Handlebars.registerHelper("currency", function (amount: number) {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(amount || 0)
    })

    // Date formatting helper
    Handlebars.registerHelper("formatDate", function (date: Date) {
      if (!date) return ""
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(new Date(date))
    })

    // Date formatting helper
    Handlebars.registerHelper("date", function (date: Date, format?: string) {
      if (!date) return ""
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(date))
    })

    // Percentage helper
    Handlebars.registerHelper("percentage", function (value: number) {
      return `${(value || 0).toFixed(2)}%`
    })

    // Address formatting helper
    Handlebars.registerHelper("formatAddress", function (address: any) {
      if (!address) return ""
      return `${address.street}<br>${address.city}, ${address.state} ${address.zipCode}<br>${address.country}`
    })

    // Equality check helper
    Handlebars.registerHelper("ifEquals", function (this: any, arg1: any, arg2: any, options: any) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this)
    })

    // Logo position check helper (checks if position starts with prefix)
    Handlebars.registerHelper("ifLogoPosition", function (this: any, position: string, prefix: string, options: any) {
      return position && position.startsWith(prefix) ? options.fn(this) : options.inverse(this)
    })

    // Current date helper
    Handlebars.registerHelper("currentDate", function () {
      return new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date())
    })
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true })
    }
  }

  private getInstitutionContactEmail(institution: MedicalInstitution): string | null {
    // Try to get primary contact email from institution
    if (institution.contactPersons && institution.contactPersons.length > 0) {
      const primaryContact =
        institution.contactPersons.find((c) => c.isPrimary) ||
        institution.contactPersons[0]
      return primaryContact.email
    }
    return null
  }

  private getDefaultTemplate(type: TemplateType): string {
    if (type === TemplateType.QUOTE) {
      return this.getDefaultQuoteTemplate()
    } else if (type === TemplateType.INVOICE) {
      return this.getDefaultInvoiceTemplate()
    } else {
      // For type "both", use combined template
      return this.getDefaultBothTemplate()
    }
  }

  private getDefaultQuoteTemplate(): string {
    return `
      <div class="document">
        <header class="header">
          {{#if template.logoUrl}}
            <img src="{{template.logoUrl}}" alt="{{template.companyName}}" class="logo logo-{{template.logoPosition}}" />
          {{/if}}
          <div class="company-info">
            <h1>{{template.companyName}}</h1>
            <div class="address">{{{formatAddress template.companyAddress}}}</div>
            {{#if template.companyPhone}}<div>Tél: {{template.companyPhone}}</div>{{/if}}
            {{#if template.companyEmail}}<div>Email: {{template.companyEmail}}</div>{{/if}}
          </div>
        </header>

        <div class="document-info">
          <h2>{{#if order}}BON DE COMMANDE{{else}}DEVIS{{/if}}</h2>
          <table class="info-table">
            {{#if order}}
              <tr><td><strong>N° Commande:</strong></td><td>{{quote.orderNumber}}</td></tr>
              <tr><td><strong>Réf. Devis:</strong></td><td>{{quote.quoteNumber}}</td></tr>
            {{else}}
              <tr><td><strong>N° Devis:</strong></td><td>{{quote.quoteNumber}}</td></tr>
            {{/if}}
            <tr><td><strong>Date:</strong></td><td>{{date quote.createdAt}}</td></tr>
            <tr><td><strong>Valide jusqu'au:</strong></td><td>{{date quote.validUntil}}</td></tr>
          </table>
        </div>

        <div class="client-info">
          <h3>Destinataire:</h3>
          <div><strong>{{institution.name}}</strong></div>
          <div>{{{formatAddress institution.address}}}</div>
        </div>

        <table class="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qté</th>
              <th>Prix unitaire</th>
              <th>Remise</th>
              <th>TVA</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each lines}}
            <tr>
              <td>{{description}}</td>
              <td>{{quantity}}</td>
              <td>{{currency unitPrice}}</td>
              <td>{{currency discountAmount}}</td>
              <td>{{currency taxAmount}}</td>
              <td>{{currency total}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <div class="totals">
          <table class="totals-table">
            <tr><td>Sous-total HT:</td><td>{{currency quote.subtotal}}</td></tr>
            <tr><td>Remise totale:</td><td>{{currency quote.totalDiscountAmount}}</td></tr>
            <tr><td>TVA:</td><td>{{currency quote.totalTaxAmount}}</td></tr>
            <tr class="total-row"><td><strong>Total TTC:</strong></td><td><strong>{{currency quote.total}}</strong></td></tr>
          </table>
        </div>

        {{#if template.termsAndConditions}}
        <div class="terms">
          <h3>Conditions générales</h3>
          <p>{{template.termsAndConditions}}</p>
        </div>
        {{/if}}

        <footer class="footer">
          {{#if template.customFooter}}
            <p>{{template.customFooter}}</p>
          {{else}}
            <p>Merci pour votre confiance!</p>
          {{/if}}
        </footer>
      </div>
    `
  }

  private getDefaultBothTemplate(): string {
    return `
      <div class="document">
        <header class="header">
          {{#if template.logoUrl}}
            <img src="{{template.logoUrl}}" alt="{{template.companyName}}" class="logo logo-{{template.logoPosition}}" />
          {{/if}}
          <div class="company-info">
            <h1>{{template.companyName}}</h1>
            <div class="address">{{{formatAddress template.companyAddress}}}</div>
            {{#if template.companyPhone}}<div>Tél: {{template.companyPhone}}</div>{{/if}}
            {{#if template.companyEmail}}<div>Email: {{template.companyEmail}}</div>{{/if}}
          </div>
        </header>

        <div class="document-info">
          {{#if invoice}}
            <h2>FACTURE</h2>
            <table class="info-table">
              <tr><td><strong>N° Facture:</strong></td><td>{{invoice.invoiceNumber}}</td></tr>
              <tr><td><strong>Date:</strong></td><td>{{date invoice.createdAt}}</td></tr>
              <tr><td><strong>Échéance:</strong></td><td>{{date invoice.dueDate}}</td></tr>
            </table>
          {{else}}
            <h2>{{#if order}}BON DE COMMANDE{{else}}DEVIS{{/if}}</h2>
            <table class="info-table">
              {{#if order}}
                <tr><td><strong>N° Commande:</strong></td><td>{{quote.orderNumber}}</td></tr>
                <tr><td><strong>Réf. Devis:</strong></td><td>{{quote.quoteNumber}}</td></tr>
              {{else}}
                <tr><td><strong>N° Devis:</strong></td><td>{{quote.quoteNumber}}</td></tr>
              {{/if}}
              <tr><td><strong>Date:</strong></td><td>{{date quote.createdAt}}</td></tr>
              <tr><td><strong>Valide jusqu'au:</strong></td><td>{{date quote.validUntil}}</td></tr>
            </table>
          {{/if}}
        </div>

        <div class="client-info">
          {{#if invoice}}<h3>Facturé à:</h3>{{else}}<h3>Destinataire:</h3>{{/if}}
          <div><strong>{{institution.name}}</strong></div>
          <div>{{{formatAddress institution.address}}}</div>
        </div>

        <table class="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qté</th>
              <th>Prix unitaire</th>
              <th>Remise</th>
              <th>TVA</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each lines}}
            <tr>
              <td>{{description}}</td>
              <td>{{quantity}}</td>
              <td>{{currency unitPrice}}</td>
              <td>{{currency discountAmount}}</td>
              <td>{{currency taxAmount}}</td>
              <td>{{currency total}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <div class="totals">
          <table class="totals-table">
            {{#if invoice}}
              <tr><td>Sous-total HT:</td><td>{{currency invoice.subtotal}}</td></tr>
              <tr><td>Remise totale:</td><td>{{currency invoice.totalDiscountAmount}}</td></tr>
              <tr><td>TVA:</td><td>{{currency invoice.totalTaxAmount}}</td></tr>
              <tr class="total-row"><td><strong>Total TTC:</strong></td><td><strong>{{currency invoice.total}}</strong></td></tr>
              {{#if invoice.totalPaid}}
              <tr><td>Déjà payé:</td><td>{{currency invoice.totalPaid}}</td></tr>
              <tr class="balance-row"><td><strong>Reste à payer:</strong></td><td><strong>{{currency invoice.remainingAmount}}</strong></td></tr>
              {{/if}}
            {{else}}
              <tr><td>Sous-total HT:</td><td>{{currency quote.subtotal}}</td></tr>
              <tr><td>Remise totale:</td><td>{{currency quote.totalDiscountAmount}}</td></tr>
              <tr><td>TVA:</td><td>{{currency quote.totalTaxAmount}}</td></tr>
              <tr class="total-row"><td><strong>Total TTC:</strong></td><td><strong>{{currency quote.total}}</strong></td></tr>
            {{/if}}
          </table>
        </div>

        {{#if template.termsAndConditions}}
        <div class="terms">
          <h3>Conditions générales</h3>
          <p>{{template.termsAndConditions}}</p>
        </div>
        {{/if}}

        <footer class="footer">
          {{#if template.customFooter}}
            <p>{{template.customFooter}}</p>
          {{else}}
            <p>Merci pour votre confiance!</p>
          {{/if}}
        </footer>
      </div>
    `
  }

  private getDefaultInvoiceTemplate(): string {
    return `
      <div class="document">
        <header class="header">
          {{#if template.logoUrl}}
            <img src="{{template.logoUrl}}" alt="{{template.companyName}}" class="logo logo-{{template.logoPosition}}" />
          {{/if}}
          <div class="company-info">
            <h1>{{template.companyName}}</h1>
            <div class="address">{{{formatAddress template.companyAddress}}}</div>
            {{#if template.companyPhone}}<div>Tél: {{template.companyPhone}}</div>{{/if}}
            {{#if template.companyEmail}}<div>Email: {{template.companyEmail}}</div>{{/if}}
          </div>
        </header>

        <div class="document-info">
          <h2>FACTURE</h2>
          <table class="info-table">
            <tr><td><strong>N° Facture:</strong></td><td>{{invoice.invoiceNumber}}</td></tr>
            <tr><td><strong>Date:</strong></td><td>{{date invoice.createdAt}}</td></tr>
            <tr><td><strong>Échéance:</strong></td><td>{{date invoice.dueDate}}</td></tr>
            {{#if invoice.quoteId}}<tr><td><strong>Réf. Devis:</strong></td><td>{{invoice.quote.quoteNumber}}</td></tr>{{/if}}
          </table>
        </div>

        <div class="client-info">
          <h3>Facturé à:</h3>
          <div><strong>{{institution.name}}</strong></div>
          <div>{{{formatAddress institution.address}}}</div>
        </div>

        <table class="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qté</th>
              <th>Prix unitaire</th>
              <th>Remise</th>
              <th>TVA</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {{#each lines}}
            <tr>
              <td>{{description}}</td>
              <td>{{quantity}}</td>
              <td>{{currency unitPrice}}</td>
              <td>{{currency discountAmount}}</td>
              <td>{{currency taxAmount}}</td>
              <td>{{currency total}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>

        <div class="totals">
          <table class="totals-table">
            <tr><td>Sous-total HT:</td><td>{{currency invoice.subtotal}}</td></tr>
            <tr><td>Remise totale:</td><td>{{currency invoice.totalDiscountAmount}}</td></tr>
            <tr><td>TVA:</td><td>{{currency invoice.totalTaxAmount}}</td></tr>
            <tr class="total-row"><td><strong>Total TTC:</strong></td><td><strong>{{currency invoice.total}}</strong></td></tr>
            {{#if invoice.totalPaid}}
            <tr><td>Déjà payé:</td><td>{{currency invoice.totalPaid}}</td></tr>
            <tr class="balance-row"><td><strong>Reste à payer:</strong></td><td><strong>{{currency invoice.remainingAmount}}</strong></td></tr>
            {{/if}}
          </table>
        </div>

        {{#if payments.length}}
        <div class="payments">
          <h3>Historique des paiements</h3>
          <table class="payments-table">
            <thead>
              <tr><th>Date</th><th>Méthode</th><th>Montant</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {{#each payments}}
              <tr>
                <td>{{date paymentDate}}</td>
                <td>{{paymentMethod}}</td>
                <td>{{currency amount}}</td>
                <td>{{status}}</td>
              </tr>
              {{/each}}
            </tbody>
          </table>
        </div>
        {{/if}}

        {{#if template.paymentInstructions}}
        <div class="payment-instructions">
          <h3>Payment Instructions</h3>
          <p>{{template.paymentInstructions}}</p>
        </div>
        {{/if}}

        {{#if template.termsAndConditions}}
        <div class="terms">
          <h3>Terms and Conditions</h3>
          <p>{{template.termsAndConditions}}</p>
        </div>
        {{/if}}

        <footer class="footer">
          {{#if template.customFooter}}
            <p>{{template.customFooter}}</p>
          {{else}}
            <p>Thank you for your business!</p>
          {{/if}}
        </footer>
      </div>
    `
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

      /* Legacy support for old templates */
      .line-items {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }

      .line-items th,
      .line-items td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }

      .line-items th {
        background-color: #3f51b5;
        color: white;
        font-weight: bold;
      }

      .totals-table {
        width: 280px;
        margin-left: auto;
      }

      .totals-table td {
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }

      .totals-table td:last-child {
        text-align: right;
      }

      .footer {
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

  // Document version management methods
  public async getDocumentVersions(
    documentId: string,
    documentType: DocumentVersionType
  ): Promise<DocumentVersion[]> {
    return DocumentVersion.getVersionHistory(documentId, documentType)
  }

  public async getLatestDocumentVersion(
    documentId: string,
    documentType: DocumentVersionType
  ): Promise<DocumentVersion | null> {
    return DocumentVersion.getLatestVersion(documentId, documentType)
  }

  // Email methods
  public async sendPaymentReminder(
    invoiceId: string,
    customMessage?: string
  ): Promise<any> {
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
        },
      ],
    })

    if (!invoice || !invoice.institution) {
      throw new Error("Invoice or institution not found")
    }

    const contactEmail = this.getInstitutionContactEmail(invoice.institution)
    if (!contactEmail) {
      throw new Error("No contact email found for institution")
    }

    const daysOverdue = invoice.getDaysOverdue() || 0
    const template = await this.getTemplate(invoice.templateId, TemplateType.INVOICE)

    return this.emailService.sendPaymentReminderEmail(
      contactEmail,
      invoice.institution.name,
      invoice.invoiceNumber,
      template.companyName,
      invoice.dueDate,
      invoice.remainingAmount,
      daysOverdue,
      customMessage
    )
  }

  public async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
    await this.emailService.close()
  }
}
