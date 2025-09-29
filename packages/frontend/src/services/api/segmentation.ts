import type { 
  Segment, 
  SegmentCreationAttributes, 
  SegmentAnalytics, 
  BulkOperationOptions,
  BulkOperationResult,
  SegmentPreviewData
} from "@medical-crm/shared"
import { getCurrentLocale } from "@/i18n"

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

class SegmentationApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("token")

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, config)

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token")
        window.location.href = "/login"
        throw new Error("Unauthorized")
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }

  // Segment CRUD operations
  async getSegments(): Promise<{ data: Segment[] }> {
    return this.get<{ data: Segment[] }>("/segments")
  }

  async getSegment(id: string): Promise<{ data: Segment }> {
    return this.get<{ data: Segment }>(`/segments/${id}`)
  }

  async createSegment(data: SegmentCreationAttributes): Promise<{ data: Segment }> {
    return this.post<{ data: Segment }>("/segments", data)
  }

  async updateSegment(id: string, data: Partial<SegmentCreationAttributes>): Promise<{ data: Segment }> {
    return this.put<{ data: Segment }>(`/segments/${id}`, data)
  }

  async deleteSegment(id: string): Promise<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`/segments/${id}`)
  }

  async duplicateSegment(id: string): Promise<{ data: Segment }> {
    return this.post<{ data: Segment }>(`/segments/${id}/duplicate`)
  }

  // Segment preview and analytics
  async previewSegment(_criteria: any): Promise<{ data: SegmentPreviewData }> {
    // Backend preview endpoint not available yet; reuse results as a lightweight preview
    // by posting a temporary segment to results would be ideal; for now return empty structure
    return { data: { total: 0, sample: [], summary: {} } as unknown as SegmentPreviewData }
  }

  async getSegmentAnalytics(id: string): Promise<{ data: SegmentAnalyticsPayload }> {
    return this.get<{ data: SegmentAnalyticsPayload }>(`/segments/${id}/analytics`)
  }

  // Segment sharing
  async shareSegment(_id: string, _shareWith: string[], _permissions: string): Promise<{ success: boolean }> {
    // No backend endpoint yet; optimistically resolve
    return Promise.resolve({ success: true })
  }

  // Bulk operations
  async performBulkOperation(
    segmentId: string, 
    options: BulkOperationOptions
  ): Promise<{ data: BulkOperationResult }> {
    // Align with backend route
    return this.post<{ data: BulkOperationResult }>(`/segments/${segmentId}/bulk/execute`, options as any)
  }

  // Export functionality
  async exportSegment(
    id: string, 
    format: "csv" | "excel" | "pdf" | "json",
    fields?: string[]
  ): Promise<{ downloadUrl: string }> {
    // Client-side export: fetch results then generate a Blob URL
    let rows: any[] = []
    let segmentMeta: any | null = null
    try {
      const res = await this.get<{ data: any }>(`/segments/${id}/results`)
      rows = Array.isArray(res?.data) ? res.data : []
    } catch (err) {
      // Ignore and export minimal structure
      rows = []
    }

    try {
      const seg = await this.get<{ data: any }>(`/segments/${id}`)
      segmentMeta = seg?.data || null
    } catch {}

    let blob: Blob
    if (format === "json") {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" })
    } else {
      // Determine header fields
      let keys = fields && fields.length > 0 ? fields : []
      if (keys.length === 0) {
        if (rows.length > 0) {
          // Flatten fields from sample rows (avoid exporting raw objects)
          keys = this.generateDefaultFields(rows)
        } else if (segmentMeta) {
          // Provide sensible defaults based on segment type when no data rows
          if (segmentMeta.type === 'institution') {
            keys = ['id', 'name', 'type', 'address.city', 'address.state', 'assignedUserId', 'createdAt', 'updatedAt']
          } else {
            keys = ['id', 'firstName', 'lastName', 'email', 'phone', 'department', 'title', 'isPrimary', 'institution.name', 'createdAt', 'updatedAt']
          }
        } else {
          keys = ['id', 'name']
        }
      }
      const csv = this.toCsv(rows, keys)
      blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    }
    const url = URL.createObjectURL(blob)
    return { downloadUrl: url }
  }

  // Generate default fields by flattening primitives from the first few rows
  private generateDefaultFields(rows: any[], maxDepth: number = 2): string[] {
    const sample = rows.slice(0, 5)
    const fields = new Set<string>()

    const isPrimitive = (v: any) => v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v instanceof Date

    const collect = (obj: any, prefix: string = '', depth: number = 0) => {
      if (!obj || depth > maxDepth) return
      Object.keys(obj).forEach(key => {
        const val = obj[key]
        const path = prefix ? `${prefix}.${key}` : key
        if (isPrimitive(val)) {
          fields.add(path)
        } else if (Array.isArray(val)) {
          // Keep array at this level; formatter will join values
          fields.add(path)
        } else if (typeof val === 'object') {
          // Prefer common display field if present
          if (typeof val.name === 'string' || typeof val.name === 'number') {
            fields.add(`${path}.name`)
          } else {
            collect(val, path, depth + 1)
          }
        }
      })
    }

    sample.forEach(row => collect(row))

    // Ensure some common fields exist if present
    const promoteIfExists = (candidate: string, fallback?: string) => {
      if (Array.from(fields).some(f => f === candidate)) return
      if (fallback && Array.from(fields).some(f => f === fallback)) {
        fields.add(candidate)
      }
    }
    promoteIfExists('institution.name', 'institution')
    promoteIfExists('address.city', 'address')

    return Array.from(fields)
  }

  // CSV helper with dot-path support and locale-aware date formatting
  private toCsv(rows: any[], fields: string[]): string {
    const keys = fields
    const detected = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'fr-FR'
    const locale = (() => {
      try {
        return getCurrentLocale() || detected
      } catch {
        return detected
      }
    })()

    const formatValue = (val: any): string => {
      if (val === null || val === undefined) return ''
      // Date objects or ISO-like strings
      if (val instanceof Date) {
        return val.toLocaleDateString(locale)
      }
      if (typeof val === 'string') {
        // Try to parse ISO date/time strings
        const d = new Date(val)
        if (!isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}/.test(val)) {
          return d.toLocaleDateString(locale)
        }
        return val
      }
      if (Array.isArray(val)) {
        return val.map(v => formatValue(v)).join(', ')
      }
      if (typeof val === 'object') {
        // Prefer name if present
        if (typeof (val as any).name === 'string') return (val as any).name
        return JSON.stringify(val)
      }
      return String(val)
    }

    const escape = (s: string) => {
      let out = s
      if (/[",\n]/.test(out)) out = '"' + out.replace(/"/g, '""') + '"'
      return out
    }

    const header = keys.join(",")
    if (!rows || rows.length === 0) return header + "\n"

    const get = (obj: any, path: string) => {
      return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj)
    }
    const lines = rows.map(r => keys.map(k => escape(formatValue(get(r, k)))).join(","))
    return [header, ...lines].join("\n")
  }

  // Search and filter
  async searchSegments(query: string): Promise<{ data: Segment[] }> {
    return this.get<{ data: Segment[] }>(`/segments/search?q=${encodeURIComponent(query)}`)
  }

  // Comparison
  async compareSegments(segmentIds: string[]): Promise<{ data: any }> {
    return this.post<{ data: any }>("/segments/compare", { segmentIds })
  }
}

// Export singleton instance
export const segmentationApi = new SegmentationApiClient(API_BASE_URL)

// Export class for testing or custom instances
export { SegmentationApiClient }

// Frontend shape of analytics payload returned by backend controller
export interface SegmentAnalyticsPayload {
  totalCount: number
  lastUpdated?: string | Date
  filtersCount?: number
  usageStats?: { timesUsed: number; lastUsed?: string | Date }
  institutionStats?: {
    byType: Record<string, number>
    byState?: Record<string, number>
    bySpecialty?: Record<string, number>
    averageBedCapacity?: number
    averageSurgicalRooms?: number
  }
  contactStats?: {
    byRole?: Record<string, number>
    byDepartment?: Record<string, number>
    primaryContacts?: number
    withPhone?: number
    withEmail?: number
  }
  tasks?: { total: number; completed: number; completionRate: number }
  meetings?: { total: number; completed: number; attendanceRate: number }
  topPerformers?: Array<{ firstName: string; lastName: string; email: string; avatarSeed?: string; tasksCompleted: number }>
  recentActivity?: Array<{ user: { firstName: string; lastName: string }; action: string; type: string; timestamp: string | Date }>
}
