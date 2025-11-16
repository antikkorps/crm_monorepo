import type {
  Note,
  NoteCreateRequest,
  NoteUpdateRequest,
  NoteSearchFilters,
  SharePermission,
  ApiResponse,
} from "@medical-crm/shared"
import { apiClient } from "./index"

export interface NoteFilters extends NoteSearchFilters {
  page?: number
  limit?: number
}

export const notesApi = {
  /**
   * Get all notes with optional filters
   */
  getAll: (filters?: NoteFilters) => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, v.toString()))
          } else {
            params.append(key, value.toString())
          }
        }
      })
    }
    const queryString = params.toString()
    return apiClient.get<ApiResponse<Note[]>>(
      `/notes${queryString ? `?${queryString}` : ""}`
    )
  },

  /**
   * Get a single note by ID
   */
  getById: (id: string) => apiClient.get<ApiResponse<Note>>(`/notes/${id}`),

  /**
   * Create a new note
   */
  create: (data: NoteCreateRequest) =>
    apiClient.post<ApiResponse<Note>>("/notes", data),

  /**
   * Update an existing note
   */
  update: (id: string, data: NoteUpdateRequest) =>
    apiClient.put<ApiResponse<Note>>(`/notes/${id}`, data),

  /**
   * Delete a note
   */
  delete: (id: string) => apiClient.delete<ApiResponse<void>>(`/notes/${id}`),

  /**
   * Get notes by institution
   */
  getByInstitution: (institutionId: string) =>
    apiClient.get<ApiResponse<Note[]>>(`/notes/institution/${institutionId}`),

  /**
   * Get notes shared with me
   */
  getSharedWithMe: () =>
    apiClient.get<ApiResponse<Note[]>>("/notes/shared-with-me"),

  /**
   * Share a note with users
   */
  shareNote: (
    id: string,
    shares: Array<{ userId: string; permission: SharePermission }>
  ) => apiClient.post<ApiResponse<void>>(`/notes/${id}/share`, { shares }),

  /**
   * Update share permission for a note
   */
  updateShare: (id: string, shareId: string, permission: SharePermission) =>
    apiClient.put<ApiResponse<void>>(`/notes/${id}/shares/${shareId}`, {
      permission,
    }),

  /**
   * Remove a share from a note
   */
  removeShare: (id: string, shareId: string) =>
    apiClient.delete<ApiResponse<void>>(`/notes/${id}/shares/${shareId}`),
}
