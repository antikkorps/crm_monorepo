import { apiClient } from "./index"

/**
 * Timeline Item Type
 */
export type TimelineItemType = "note" | "meeting" | "call" | "reminder" | "task" | "quote" | "invoice" | "engagement_letter"

/**
 * Timeline Item Interface
 */
export interface TimelineItem {
  id: string
  type: TimelineItemType
  title: string
  description: string
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  assignee?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  createdAt: string
  metadata: Record<string, any>
}

/**
 * Timeline Response Interface
 */
export interface TimelineResponse {
  items: TimelineItem[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

/**
 * Timeline Query Params
 */
export interface TimelineParams {
  limit?: number
  offset?: number
  startDate?: string
  endDate?: string
}

export const timelineApi = {
  /**
   * Get timeline for an institution with pagination
   */
  getInstitutionTimeline: (
    institutionId: string,
    params?: TimelineParams
  ) => {
    const queryParams = new URLSearchParams()

    if (params?.limit) queryParams.append("limit", params.limit.toString())
    if (params?.offset) queryParams.append("offset", params.offset.toString())
    if (params?.startDate) queryParams.append("startDate", params.startDate)
    if (params?.endDate) queryParams.append("endDate", params.endDate)

    const queryString = queryParams.toString()
    const url = `/institutions/${institutionId}/timeline${queryString ? `?${queryString}` : ""}`

    return apiClient.get<TimelineResponse>(url)
  },
}
