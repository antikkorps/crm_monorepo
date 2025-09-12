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
    return this.post<{ data: SegmentPreviewData }>("/segments/preview", { criteria })
  }

  async getSegmentAnalytics(id: string): Promise<{ data: SegmentAnalytics }> {
    return this.get<{ data: SegmentAnalytics }>(`/segments/${id}/analytics`)
  }

  // Segment sharing
  async shareSegment(id: string, shareWith: string[], permissions: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/segments/${id}/share`, {
      shareWith,
      permissions
    })
  }

  // Bulk operations
  async performBulkOperation(
    segmentId: string, 
    options: BulkOperationOptions
  ): Promise<{ data: BulkOperationResult }> {
    return this.post<{ data: BulkOperationResult }>(`/segments/${segmentId}/bulk-operation`, options)
  }

  // Export functionality
  async exportSegment(
    id: string, 
    format: "csv" | "excel" | "pdf" | "json",
    fields?: string[]
  ): Promise<{ downloadUrl: string }> {
    return this.post<{ downloadUrl: string }>(`/segments/${id}/export`, {
      format,
      fields
    })
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