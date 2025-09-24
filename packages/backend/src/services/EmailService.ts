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
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
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

      logger.info("Email sent successfully", {
        messageId: result.messageId,
        recipients,
        subject: options.subject,
      })

      return {
        success: true,
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
      <p>Dear ${recipientName},</p>
      
      <p>Please find attached our quote ${quoteNumber} for your review.</p>
      
      <p>If you have any questions or need clarification on any items, please don't hesitate to contact us.</p>
      
      <p>We look forward to working with you.</p>
      
      <p>Best regards,<br>
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
    invoiceNumber: string,
    companyName: string,
    dueDate: Date,
    totalAmount: number,
    pdfBuffer: Buffer,
    customMessage?: string
  ): Promise<EmailDeliveryResult> {
    const subject = `Invoice ${invoiceNumber} from ${companyName}`

    const formattedDueDate = dueDate.toLocaleDateString()
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(totalAmount)

    const defaultMessage = `
      <p>Dear ${recipientName},</p>
      
      <p>Please find attached invoice ${invoiceNumber} in the amount of ${formattedAmount}.</p>
      
      <p><strong>Payment is due by ${formattedDueDate}.</strong></p>
      
      <p>If you have any questions about this invoice or need to discuss payment arrangements, please contact us as soon as possible.</p>
      
      <p>Thank you for your business.</p>
      
      <p>Best regards,<br>
      ${companyName}</p>
    `

    const html = customMessage || defaultMessage

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
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

    const formattedDueDate = dueDate.toLocaleDateString()
    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(remainingAmount)

    const defaultMessage = `
      <p>Dear ${recipientName},</p>
      
      <p>This is a friendly reminder that invoice ${invoiceNumber} in the amount of ${formattedAmount} was due on ${formattedDueDate} and is now ${daysOverdue} days overdue.</p>
      
      <p>If payment has already been sent, please disregard this notice. Otherwise, please arrange payment as soon as possible.</p>
      
      <p>If you have any questions or need to discuss payment arrangements, please contact us immediately.</p>
      
      <p>Thank you for your prompt attention to this matter.</p>
      
      <p>Best regards,<br>
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
