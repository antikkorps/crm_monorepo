import { apiClient } from './index'

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json'
  includeHeaders: boolean
  dateRange?: {
    start: string
    end: string
  }
  searchQuery?: string
  limit?: number
  offset?: number
  useQueue?: boolean
  // Type-specific options
  institutionType?: string
  taskStatus?: string
  quoteStatus?: string
  invoiceStatus?: string
}

export interface ExportMetadata {
  availableExports: Array<{
    type: string
    name: string
    description: string
    formats: string[]
    permissions: boolean
    recordCount: number
  }>
  formats: Record<string, {
    name: string
    description: string
    mimeType: string
  }>
}

export interface ExportJob {
  jobId: string
  exportType?: string
  format?: string
  recordCount?: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  estimatedRecords?: number
  downloadUrl?: string
  error?: string
  createdAt: string
  completedAt?: string
}

export interface QueuedExportResponse {
  success: boolean
  message: string
  jobId: string
  estimatedRecords: number
  downloadUrl?: string
}

export class ExportApiService {
  /**
   * Get export metadata (available exports, formats, permissions)
   */
  static async getExportMetadata(): Promise<ExportMetadata> {
    return await apiClient.get<ExportMetadata>('/export/metadata')
  }

  /**
   * Export medical institutions
   */
  static async exportMedicalInstitutions(options: ExportOptions): Promise<Blob> {
    const params = new URLSearchParams()

    params.append('format', options.format)
    params.append('includeHeaders', options.includeHeaders.toString())

    if (options.dateRange) {
      if (options.dateRange.start) {
        params.append('startDate', options.dateRange.start)
      }
      if (options.dateRange.end) {
        params.append('endDate', options.dateRange.end)
      }
    }

    if (options.searchQuery) {
      params.append('search', options.searchQuery)
    }

    if (options.limit) {
      params.append('limit', options.limit.toString())
    }

    if (options.offset) {
      params.append('offset', options.offset.toString())
    }

    if (options.institutionType) {
      params.append('type', options.institutionType)
    }

    // For blob responses, we need to use fetch directly
    const token = localStorage.getItem("token")
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/export/institutions?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.blob()
  }

  /**
   * Export contacts
   */
  static async exportContacts(options: ExportOptions): Promise<Blob> {
    const params = new URLSearchParams()

    params.append('format', options.format)
    params.append('includeHeaders', options.includeHeaders.toString())

    if (options.dateRange) {
      if (options.dateRange.start) {
        params.append('startDate', options.dateRange.start)
      }
      if (options.dateRange.end) {
        params.append('endDate', options.dateRange.end)
      }
    }

    if (options.searchQuery) {
      params.append('search', options.searchQuery)
    }

    if (options.limit) {
      params.append('limit', options.limit.toString())
    }

    if (options.offset) {
      params.append('offset', options.offset.toString())
    }

    // For blob responses, we need to use fetch directly
    const token = localStorage.getItem("token")
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/export/contacts?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.blob()
  }

  /**
   * Export tasks
   */
  static async exportTasks(options: ExportOptions): Promise<Blob> {
    const params = new URLSearchParams()

    params.append('format', options.format)
    params.append('includeHeaders', options.includeHeaders.toString())

    if (options.dateRange) {
      if (options.dateRange.start) {
        params.append('startDate', options.dateRange.start)
      }
      if (options.dateRange.end) {
        params.append('endDate', options.dateRange.end)
      }
    }

    if (options.searchQuery) {
      params.append('search', options.searchQuery)
    }

    if (options.limit) {
      params.append('limit', options.limit.toString())
    }

    if (options.offset) {
      params.append('offset', options.offset.toString())
    }

    if (options.taskStatus) {
      params.append('status', options.taskStatus)
    }

    // For blob responses, we need to use fetch directly
    const token = localStorage.getItem("token")
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/export/tasks?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.blob()
  }

  /**
   * Export quotes
   */
  static async exportQuotes(options: ExportOptions): Promise<Blob> {
    const params = new URLSearchParams()

    params.append('format', options.format)
    params.append('includeHeaders', options.includeHeaders.toString())

    if (options.dateRange) {
      if (options.dateRange.start) {
        params.append('startDate', options.dateRange.start)
      }
      if (options.dateRange.end) {
        params.append('endDate', options.dateRange.end)
      }
    }

    if (options.searchQuery) {
      params.append('search', options.searchQuery)
    }

    if (options.limit) {
      params.append('limit', options.limit.toString())
    }

    if (options.offset) {
      params.append('offset', options.offset.toString())
    }

    if (options.quoteStatus) {
      params.append('status', options.quoteStatus)
    }

    // For blob responses, we need to use fetch directly
    const token = localStorage.getItem("token")
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/export/quotes?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.blob()
  }

  /**
   * Export invoices
   */
  static async exportInvoices(options: ExportOptions): Promise<Blob> {
    const params = new URLSearchParams()

    params.append('format', options.format)
    params.append('includeHeaders', options.includeHeaders.toString())

    if (options.dateRange) {
      if (options.dateRange.start) {
        params.append('startDate', options.dateRange.start)
      }
      if (options.dateRange.end) {
        params.append('endDate', options.dateRange.end)
      }
    }

    if (options.searchQuery) {
      params.append('search', options.searchQuery)
    }

    if (options.limit) {
      params.append('limit', options.limit.toString())
    }

    if (options.offset) {
      params.append('offset', options.offset.toString())
    }

    if (options.invoiceStatus) {
      params.append('status', options.invoiceStatus)
    }

    // For blob responses, we need to use fetch directly
    const token = localStorage.getItem("token")
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/export/invoices?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.blob()
  }

  /**
   * Queue export for large datasets
   */
  static async queueExport(exportType: string, options: ExportOptions): Promise<QueuedExportResponse> {
    return await apiClient.post<QueuedExportResponse>('/export/queue', {
      exportType,
      ...options
    })
  }

  /**
   * Get export job status
   */
  static async getExportStatus(jobId: string): Promise<ExportJob> {
    const result = await apiClient.get<{ status: ExportJob }>(`/export/status/${jobId}`)
    return result.status
  }

  /**
   * Download export file
   */
  static downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  /**
   * Generate filename for export
   */
  static generateFilename(exportType: string, format: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    return `${exportType}_export_${timestamp}.${format}`
  }
}