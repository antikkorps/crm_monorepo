import nodemailer from "nodemailer"
import logger from "../utils/logger"

export interface EmailAttachment {
  filename: string
  path?: string
  content?: Buffer
  contentType?: string
}

export interface EmailOptions {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: EmailAttachment[]
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
  recipients: string[]
}

export class EmailService {
  private transporter: nodemailer.Transporter
  private fromAddress: string
  private fromName: string

  constructor() {
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || "noreply@medical-crm.com"
    this.fromName = process.env.EMAIL_FROM_NAME || "Medical CRM"

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    })

    // Optional verification to help diagnose SMTP setup at runtime
    this.transporter
      .verify()
      .then(() => {
        logger.info("SMTP transporter verified", {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE,
          from: `${this.fromName} <${this.fromAddress}>`,
        })
      })
      .catch((err) => {
        logger.error("SMTP transporter verification failed", {
          error: (err as Error).message,
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE,
        })
      })
  }

  public async sendEmail(options: EmailOptions): Promise<EmailDeliveryResult> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to]

      const mailOptions = {
        from: `${this.fromName} <${this.fromAddress}>`,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      }

      const result = await this.transporter.sendMail(mailOptions)

      const accepted = (result as any).accepted || []
      const rejected = (result as any).rejected || []

      logger.info("Email send attempt completed", {
        messageId: result.messageId,
        recipients,
        accepted,
        rejected,
        subject: options.subject,
      })

      return {
        success: Array.isArray(accepted) ? accepted.length > 0 : true,
        messageId: result.messageId,
        recipients,
      }
    } catch (error) {
      logger.error("Failed to send email", {
        error: (error as Error).message,
        recipients: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
      })

      return {
        success: false,
        error: (error as Error).message,
        recipients: Array.isArray(options.to) ? options.to : [options.to],
      }
    }
  }

  public async sendQuoteEmail(
    recipientEmail: string | string[],
    recipientName: string,
    quoteNumber: string,
    companyName: string,
    pdfBuffer: Buffer,
    customMessage?: string
  ): Promise<EmailDeliveryResult> {
    const subject = `Quote ${quoteNumber} from ${companyName}`

    const defaultMessage = `
      <p>Cher(e) ${recipientName},</p>

      <p>Veuillez trouver ci-joint notre devis ${quoteNumber}.</p>

      <p>Si vous avez des questions ou si vous avez besoin de clarifications sur des éléments, n'hésitez pas à nous contacter.</p>

      <p>En attendant d'avoir le plaisir de travailler avec vous.</p>

      <p>Cordialement,<br>
      ${companyName}</p>
    `

    const html = customMessage || defaultMessage

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      attachments: [
        {
          filename: `Quote-${quoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })
  }

  public async sendInvoiceEmail(
    recipientEmail: string | string[],
    recipientName: string,
    invoiceNumber: string | undefined,
    companyName: string | undefined,
    dueDate: Date | string | undefined,
    totalAmount: number | string,
    pdfBuffer: Buffer,
    customMessage?: string
  ): Promise<EmailDeliveryResult> {
    const safeCompany = companyName || process.env.EMAIL_FROM_NAME || "MVO"
    const safeNumber = invoiceNumber || "N/A"
    const safeRecipient = recipientName || "Client"

    const subject = `Invoice ${safeNumber} from ${safeCompany}`

    const formattedDueDate = dueDate
      ? new Date(dueDate as any).toLocaleDateString("fr-FR")
      : "N/A"
    const amountNumber =
      typeof totalAmount === "number" ? totalAmount : Number(totalAmount || 0)
    const formattedAmount = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amountNumber)

    const defaultMessage = `
      <p>Cher(e) ${safeRecipient},</p>

      <p>Veuillez trouver ci-joint la facture ${safeNumber} d'un montant de ${formattedAmount}.</p>

      <p><strong>Le paiement est dû avant le ${formattedDueDate}.</strong></p>

      <p>Si vous avez des questions concernant cette facture ou si vous devez discuter des modalités de paiement, veuillez nous contacter dès que possible.</p>

      <p>Merci pour votre confiance.</p>

      <p>Cordialement,<br>
      ${safeCompany}</p>
    `

    const customBlock = customMessage
      ? `
        <hr>
        <p><strong>Message à votre attention:</strong></p>
        <p>${(customMessage || "").replace(/\n/g, "<br>")}</p>
      `
      : ""

    const html = `${defaultMessage}${customBlock}`

    // Diagnostic log (without leaking body)
    logger.info("Preparing invoice email", {
      subject,
      recipients: Array.isArray(recipientEmail) ? recipientEmail : [recipientEmail],
      invoiceNumber: safeNumber,
      dueDate: formattedDueDate,
      amount: formattedAmount,
      recipientName: safeRecipient,
    })

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      attachments: [
        {
          filename: `Invoice-${safeNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })
  }

  public async sendPaymentReminderEmail(
    recipientEmail: string,
    recipientName: string,
    invoiceNumber: string,
    companyName: string,
    dueDate: Date,
    remainingAmount: number,
    daysOverdue: number,
    customMessage?: string
  ): Promise<EmailDeliveryResult> {
    const subject = `Payment Reminder: Invoice ${invoiceNumber} - ${daysOverdue} days overdue`

    const formattedDueDate = dueDate.toLocaleDateString("fr-FR")
    const formattedAmount = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(remainingAmount)

    const defaultMessage = `
      <p>Cher(e) ${recipientName},</p>

      <p>Ceci est un rappel amical que la facture ${invoiceNumber} d'un montant de ${formattedAmount} était due le ${formattedDueDate} et est maintenant en retard de ${daysOverdue} jours.</p>

      <p>Si le paiement a déjà été envoyé, veuillez ignorer cet avis. Sinon, veuillez organiser le paiement dès que possible.</p>

      <p>Si vous avez des questions ou si vous devez discuter des modalités de paiement, veuillez nous contacter immédiatement.</p>

      <p>Merci pour votre retour rapide.</p>

      <p>Cordialement,<br>
      ${companyName}</p>
    `

    const html = customMessage || defaultMessage

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
    })
  }

  public async sendCustomEmail(
    recipientEmail: string | string[],
    subject: string,
    message: string,
    attachments?: EmailAttachment[]
  ): Promise<EmailDeliveryResult> {
    return this.sendEmail({
      to: recipientEmail,
      subject,
      html: message,
      attachments,
    })
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      logger.info("Email service connection verified successfully")
      return true
    } catch (error) {
      logger.error("Email service connection failed", { error: (error as Error).message })
      return false
    }
  }

  public async close(): Promise<void> {
    this.transporter.close()
  }
}

export default EmailService
