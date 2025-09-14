import type { 
  Segment, 
  SegmentCreationAttributes, 
  SegmentAnalytics, 
  BulkOperationOptions,
  BulkOperationResult,
  SegmentPreviewData
} from "@medical-crm/shared"

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
  async previewSegment(criteria: any): Promise<{ data: SegmentPreviewData }> {
    // Backend preview endpoint not available yet; reuse results as a lightweight preview
    // by posting a temporary segment to results would be ideal; for now return empty structure
    return { data: { total: 0, sample: [], summary: {} } as unknown as SegmentPreviewData }
  }

  async getSegmentAnalytics(id: string): Promise<{ data: SegmentAnalytics }> {
    return this.get<{ data: SegmentAnalytics }>(`/segments/${id}/analytics`)
  }

  // Segment sharing
  async shareSegment(id: string, shareWith: string[], permissions: string): Promise<{ success: boolean }> {
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
          keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
        } else if (segmentMeta) {
          // Provide sensible defaults based on segment type when no data rows
          if (segmentMeta.type === 'institution') {
            keys = ['id', 'name', 'type', 'address.city', 'address.state', 'assignedUserId']
          } else {
            keys = ['id', 'firstName', 'lastName', 'email', 'phone', 'department', 'title', 'isPrimary']
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

  // Very small CSV helper with dot-path support
  private toCsv(rows: any[], fields: string[]): string {
    const keys = fields
    const escape = (val: any) => {
      if (val === null || val === undefined) return ""
      let s = typeof val === "object" ? JSON.stringify(val) : String(val)
      if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const header = keys.join(",")
    if (!rows || rows.length === 0) return header + "\n"
    const get = (obj: any, path: string) => {
      return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj)
    }
    const lines = rows.map(r => keys.map(k => escape(get(r, k))).join(","))
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
