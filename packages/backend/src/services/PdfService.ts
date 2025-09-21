import { existsSync } from "fs"
import { mkdir, writeFile } from "fs/promises"
import Handlebars from "handlebars"
import { dirname, join } from "path"
import puppeteer, { Browser, PDFOptions } from "puppeteer"
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
    try {
      // Fetch quote with all related data (including lines)
      const quote = await Quote.findByPk(quoteId, {
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
          },
          {
            model: User,
            as: "assignedUser",
          },
          {
            // Include lines to ensure we have them for rendering
            model: (await import("../models/QuoteLine")).QuoteLine,
            as: "lines",
          },
        ],
      })

      if (!quote) {
        throw new Error(`Quote with ID ${quoteId} not found`)
      }

      const linesRaw = quote.lines && quote.lines.length > 0 ? quote.lines : await quote.getLines()
      const lines = linesRaw.map((l: any) => (typeof l.toJSON === 'function' ? l.toJSON() : l))

      // Get template from database or use quote.templateId or default
      const resolvedTemplateId = templateId || (quote as any).templateId
      let template
      try {
        template = await this.getTemplate(resolvedTemplateId, TemplateType.QUOTE)
      } catch (err) {
        // If incompatible or not found, fall back to default QUOTE template
        template = await this.getTemplate(undefined, TemplateType.QUOTE)
      }

      // Compute totals fallback if missing
      const computed = {
        subtotal: lines.reduce((s: number, l: any) => s + Number(l.subtotal || 0), 0),
        totalDiscountAmount: lines.reduce((s: number, l: any) => s + Number(l.discountAmount || 0), 0),
        totalTaxAmount: lines.reduce((s: number, l: any) => s + Number(l.taxAmount || 0), 0),
        total: lines.reduce((s: number, l: any) => s + Number(l.total || 0), 0),
      }
      const quoteForRender: any = { ...quote.toJSON?.() || quote }
      if (!Number(quoteForRender.total)) {
        quoteForRender.subtotal = computed.subtotal
        quoteForRender.totalDiscountAmount = computed.totalDiscountAmount
        quoteForRender.totalTaxAmount = computed.totalTaxAmount
        quoteForRender.total = computed.total
      }

      const html = await this.renderTemplate(template, {
        quote: quoteForRender,
        lines,
        institution: quote.institution,
        assignedUser: quote.assignedUser,
        generatedAt: new Date(),
      })

      const pdfBuffer = await this.generatePdfFromHtml(html, options)

      let filePath: string | undefined
      let version: DocumentVersion | undefined

      if (options.saveToFile !== false) {
        // Save to file and create version record
        const fileName = `Quote-${
          quote.quoteNumber
        }-v${await DocumentVersion.getNextVersion(
          quoteId,
          DocumentVersionType.QUOTE_PDF
        )}.pdf`
        filePath = join(this.documentsPath, "quotes", fileName)

        await this.ensureDirectoryExists(dirname(filePath))
        await writeFile(filePath, pdfBuffer)

        // Create document version record
        version = await DocumentVersion.createVersion({
          documentId: quoteId,
          documentType: DocumentVersionType.QUOTE_PDF,
          templateId: template.id,
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
      if (options.emailOptions && quote.institution) {
        // Send email with PDF attachment
        const contactEmail = this.getInstitutionContactEmail(quote.institution)
        if (contactEmail) {
          emailResult = await this.emailService.sendQuoteEmail(
            contactEmail,
            quote.institution.name,
            quote.quoteNumber,
            template.companyName,
            pdfBuffer,
            options.emailOptions.customMessage
          )

          // Update version record with email info
          if (version && emailResult.success) {
            await version.markAsEmailed(
              options.emailOptions.recipients,
              `Quote ${quote.quoteNumber} from ${template.companyName}`
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
      logger.error("Error generating quote PDF:", error)
      throw new Error(`Failed to generate quote PDF: ${(error as Error).message}`)
    }
  }

  public async generateOrderPdf(
    quoteId: string,
    generatedBy: string,
    templateId?: string,
    options: PdfGenerationOptions = {}
  ): Promise<PdfGenerationResult> {
    try {
      // Fetch quote with institution, user, and lines
      const quote = await Quote.findByPk(quoteId, {
        include: [
          { model: MedicalInstitution, as: "institution" },
          { model: User, as: "assignedUser" },
          { model: (await import("../models/QuoteLine")).QuoteLine, as: "lines" },
        ],
      })
      if (!quote) throw new Error(`Quote with ID ${quoteId} not found`)

      // Ensure lines
      const linesRaw = quote.lines && quote.lines.length > 0 ? quote.lines : await quote.getLines()
      const lines = linesRaw.map((l: any) => (typeof l.toJSON === 'function' ? l.toJSON() : l))

      // Template selection: use provided or quote.templateId; fallback to default QUOTE template
      const resolvedTemplateId = templateId || (quote as any).templateId
      let template
      try {
        template = await this.getTemplate(resolvedTemplateId, TemplateType.QUOTE)
      } catch {
        template = await this.getTemplate(undefined, TemplateType.QUOTE)
      }

      // Compute totals fallback
      const computed = {
        subtotal: lines.reduce((s: number, l: any) => s + Number(l.subtotal || 0), 0),
        totalDiscountAmount: lines.reduce((s: number, l: any) => s + Number(l.discountAmount || 0), 0),
        totalTaxAmount: lines.reduce((s: number, l: any) => s + Number(l.taxAmount || 0), 0),
        total: lines.reduce((s: number, l: any) => s + Number(l.total || 0), 0),
      }
      const quoteForRender: any = { ...quote.toJSON?.() || quote }
      if (!Number(quoteForRender.total)) Object.assign(quoteForRender, computed)

      // Render using same template but with a different heading context
      const html = await this.renderTemplate(template, {
        order: true,
        quote: quoteForRender,
        lines,
        institution: quote.institution,
        assignedUser: quote.assignedUser,
        generatedAt: new Date(),
      })

      const pdfBuffer = await this.generatePdfFromHtml(html, options)

      let filePath: string | undefined
      let version: DocumentVersion | undefined
      if (options.saveToFile !== false) {
        const seq = await DocumentVersion.getNextVersion(quoteId, DocumentVersionType.ORDER_PDF)
        const fileName = `Order-${quote.orderNumber || quote.quoteNumber}-v${seq}.pdf`
        filePath = join(this.documentsPath, "quotes", fileName)
        await this.ensureDirectoryExists(dirname(filePath))
        await writeFile(filePath, pdfBuffer)
        version = await DocumentVersion.create({
          documentId: quoteId,
          documentType: DocumentVersionType.ORDER_PDF as any,
          templateId: template.id,
          fileName,
          filePath,
          fileSize: pdfBuffer.length,
          mimeType: "application/pdf",
          generatedBy,
          generatedAt: new Date(),
          templateSnapshot: template.toJSON(),
          version: seq,
        } as any)
      }

      return { buffer: pdfBuffer, filePath, version }
    } catch (error) {
      logger.error("Error generating order PDF:", error)
      throw new Error(`Failed to generate order PDF: ${(error as Error).message}`)
    }
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

      const lines = await invoice.getLines()
      const payments = await invoice.getPayments()

      // Get template from database or use default
      const template = await this.getTemplate(templateId, TemplateType.INVOICE)

      const html = await this.renderTemplate(template, {
        invoice,
        lines,
        payments,
        institution: invoice.institution,
        assignedUser: invoice.assignedUser,
        generatedAt: new Date(),
      })

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
          templateId: template.id,
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
      if (options.emailOptions && invoice.institution) {
        // Send email with PDF attachment
        const contactEmail = this.getInstitutionContactEmail(invoice.institution)
        if (contactEmail) {
          emailResult = await this.emailService.sendInvoiceEmail(
            contactEmail,
            invoice.institution.name,
            invoice.invoiceNumber,
            template.companyName,
            invoice.dueDate,
            invoice.total,
            pdfBuffer,
            options.emailOptions.customMessage
          )

          // Update version record with email info
          if (version && emailResult.success) {
            await version.markAsEmailed(
              options.emailOptions.recipients,
              `Invoice ${invoice.invoiceNumber} from ${template.companyName}`
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

  private createFallbackTemplate(type: TemplateType): DocumentTemplate {
    // Create a minimal template object (not saved to database)
    const template = new DocumentTemplate({
      id: `fallback-${type}`,
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
      createdBy: "system",
      version: 1,
    } as any)

    return template
  }

  private registerHandlebarsHelpers(): void {
    // Currency formatting helper
    Handlebars.registerHelper("currency", function (amount: number) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount || 0)
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
    } else {
      return this.getDefaultInvoiceTemplate()
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
            {{#if template.companyPhone}}<div>Phone: {{template.companyPhone}}</div>{{/if}}
            {{#if template.companyEmail}}<div>Email: {{template.companyEmail}}</div>{{/if}}
          </div>
        </header>

        <div class="document-info">
          <h2>{{#if order}}ORDER{{else}}QUOTE{{/if}}</h2>
          <table class="info-table">
            {{#if order}}
              <tr><td><strong>Order Number:</strong></td><td>{{quote.orderNumber}}</td></tr>
              <tr><td><strong>Quote Ref:</strong></td><td>{{quote.quoteNumber}}</td></tr>
            {{else}}
              <tr><td><strong>Quote Number:</strong></td><td>{{quote.quoteNumber}}</td></tr>
            {{/if}}
            <tr><td><strong>Date:</strong></td><td>{{date quote.createdAt}}</td></tr>
            <tr><td><strong>Valid Until:</strong></td><td>{{date quote.validUntil}}</td></tr>
          </table>
        </div>

        <div class="client-info">
          <h3>Bill To:</h3>
          <div><strong>{{institution.name}}</strong></div>
          <div>{{{formatAddress institution.address}}}</div>
        </div>

        <table class="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th>Tax</th>
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
            <tr><td>Subtotal:</td><td>{{currency quote.subtotal}}</td></tr>
            <tr><td>Total Discount:</td><td>{{currency quote.totalDiscountAmount}}</td></tr>
            <tr><td>Total Tax:</td><td>{{currency quote.totalTaxAmount}}</td></tr>
            <tr class="total-row"><td><strong>Total:</strong></td><td><strong>{{currency quote.total}}</strong></td></tr>
          </table>
        </div>

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
            {{#if template.companyPhone}}<div>Phone: {{template.companyPhone}}</div>{{/if}}
            {{#if template.companyEmail}}<div>Email: {{template.companyEmail}}</div>{{/if}}
          </div>
        </header>

        <div class="document-info">
          <h2>INVOICE</h2>
          <table class="info-table">
            <tr><td><strong>Invoice Number:</strong></td><td>{{invoice.invoiceNumber}}</td></tr>
            <tr><td><strong>Date:</strong></td><td>{{date invoice.createdAt}}</td></tr>
            <tr><td><strong>Due Date:</strong></td><td>{{date invoice.dueDate}}</td></tr>
            {{#if invoice.quoteId}}<tr><td><strong>Quote Reference:</strong></td><td>{{invoice.quote.quoteNumber}}</td></tr>{{/if}}
          </table>
        </div>

        <div class="client-info">
          <h3>Bill To:</h3>
          <div><strong>{{institution.name}}</strong></div>
          <div>{{{formatAddress institution.address}}}</div>
        </div>

        <table class="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th>Tax</th>
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
            <tr><td>Subtotal:</td><td>{{currency invoice.subtotal}}</td></tr>
            <tr><td>Total Discount:</td><td>{{currency invoice.totalDiscountAmount}}</td></tr>
            <tr><td>Total Tax:</td><td>{{currency invoice.totalTaxAmount}}</td></tr>
            <tr class="total-row"><td><strong>Total:</strong></td><td><strong>{{currency invoice.total}}</strong></td></tr>
            {{#if invoice.totalPaid}}
            <tr><td>Amount Paid:</td><td>{{currency invoice.totalPaid}}</td></tr>
            <tr class="balance-row"><td><strong>Balance Due:</strong></td><td><strong>{{currency invoice.remainingAmount}}</strong></td></tr>
            {{/if}}
          </table>
        </div>

        {{#if payments.length}}
        <div class="payments">
          <h3>Payment History</h3>
          <table class="payments-table">
            <thead>
              <tr><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr>
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
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        margin: 0;
        padding: 0;
      }

      .document {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
        border-bottom: 2px solid #eee;
        padding-bottom: 20px;
      }

      .logo {
        max-height: 80px;
        max-width: 200px;
      }

      .company-info {
        text-align: right;
      }

      .company-info h1 {
        margin: 0 0 10px 0;
        font-size: 24px;
        color: #2c3e50;
      }

      .document-info {
        margin-bottom: 30px;
      }

      .document-info h2 {
        font-size: 28px;
        color: #2c3e50;
        margin: 0 0 15px 0;
      }

      .info-table {
        width: 300px;
      }

      .info-table td {
        padding: 5px 10px 5px 0;
        vertical-align: top;
      }

      .client-info {
        margin-bottom: 30px;
      }

      .client-info h3 {
        margin: 0 0 10px 0;
        font-size: 16px;
        color: #2c3e50;
      }

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
        background-color: #f8f9fa;
        font-weight: bold;
        color: #2c3e50;
      }

      .line-items td:nth-child(2),
      .line-items td:nth-child(3),
      .line-items td:nth-child(4),
      .line-items td:nth-child(5),
      .line-items td:nth-child(6) {
        text-align: right;
      }

      .totals {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 30px;
      }

      .totals-table {
        width: 300px;
      }

      .totals-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #eee;
      }

      .totals-table td:last-child {
        text-align: right;
      }

      .total-row td {
        border-top: 2px solid #2c3e50;
        border-bottom: 2px solid #2c3e50;
        font-size: 16px;
      }

      .balance-row td {
        border-top: 1px solid #e74c3c;
        color: #e74c3c;
        font-size: 14px;
      }

      .payments {
        margin-bottom: 30px;
      }

      .payments h3 {
        margin: 0 0 15px 0;
        font-size: 16px;
        color: #2c3e50;
      }

      .payments-table {
        width: 100%;
        border-collapse: collapse;
      }

      .payments-table th,
      .payments-table td {
        padding: 8px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }

      .payments-table th {
        background-color: #f8f9fa;
        font-weight: bold;
      }

      .payment-instructions,
      .terms {
        margin-bottom: 30px;
      }

      .payment-instructions h3,
      .terms h3 {
        margin: 0 0 10px 0;
        font-size: 16px;
        color: #2c3e50;
      }

      .footer {
        text-align: center;
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        color: #666;
      }

      @media print {
        .document {
          max-width: none;
          margin: 0;
          padding: 0;
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
