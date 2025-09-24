import type { DocumentVersion } from "@medical-crm/shared"
import { apiClient } from "./index"

export interface DocumentGenerationOptions {
  templateId?: string
  email?: boolean
  customMessage?: string
  recipients?: string[]
}

export interface DocumentVersionResponse {
  success: boolean
  data: DocumentVersion[]
}

export interface DocumentGenerationResponse {
  success: boolean
  data: {
    version?: DocumentVersion
    emailSent?: boolean
    emailError?: string
  }
  message?: string
}

export interface PaymentReminderResponse {
  success: boolean
  data: any
  message?: string
}

export const documentsApi = {
  // Quote PDF operations
  async generateQuotePdf(
    quoteId: string,
    options: DocumentGenerationOptions = {}
  ): Promise<Blob | DocumentGenerationResponse> {
    const params = new URLSearchParams()
    if (options.templateId) params.append("templateId", options.templateId)
    if (options.email) params.append("email", "true")

    const url = `/quotes/${quoteId}/pdf${
      params.toString() ? `?${params.toString()}` : ""
    }`

    if (options.email) {
      // When emailing, send custom message in body and expect JSON response
      const response = await apiClient.post<DocumentGenerationResponse>(url, {
        customMessage: options.customMessage,
        recipients: options.recipients,
      })
      return response
    } else {
      // When downloading, expect blob response
      const blob = await apiClient.get<Blob>(url, { responseType: "blob" } as any)
      return blob
    }
  },

  async getQuoteVersions(quoteId: string): Promise<DocumentVersion[]> {
    const response = await apiClient.get<any>(`/quotes/${quoteId}/versions`)
    return (response?.data ?? response) as DocumentVersion[]
  },

  // Invoice PDF operations
  async generateInvoicePdf(
    invoiceId: string,
    options: DocumentGenerationOptions = {}
  ): Promise<Blob | DocumentGenerationResponse> {
    const params = new URLSearchParams()
    if (options.templateId) params.append("templateId", options.templateId)
    if (options.email) params.append("email", "true")

    const url = `/invoices/${invoiceId}/pdf${
      params.toString() ? `?${params.toString()}` : ""
    }`

    if (options.email) {
      // When emailing, send custom message in body and expect JSON response
      const response = await apiClient.post<DocumentGenerationResponse>(url, {
        customMessage: options.customMessage,
        recipients: options.recipients,
      })
      return response
    } else {
      // When downloading, expect blob response
      const blob = await apiClient.get<Blob>(url, { responseType: "blob" } as any)
      return blob
    }
  },

  async getInvoiceVersions(invoiceId: string): Promise<DocumentVersion[]> {
    const response = await apiClient.get<any>(`/invoices/${invoiceId}/versions`)
    return (response?.data ?? response) as DocumentVersion[]
  },

  // Payment reminder
  async sendPaymentReminder(
    invoiceId: string,
    customMessage?: string
  ): Promise<PaymentReminderResponse> {
    const response = await apiClient.post<PaymentReminderResponse>(
      `/invoices/${invoiceId}/payment-reminder`,
      { customMessage }
    )
    return response
  },

  // Utility functions
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  openBlobInNewTab(blob: Blob): void {
    const url = window.URL.createObjectURL(blob)
    window.open(url, "_blank")
  },
}
