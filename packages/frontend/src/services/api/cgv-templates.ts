import { apiClient } from "./index"

export interface CgvTemplate {
  id: string
  name: string
  description?: string
  content: string // JSON ProseMirror content
  category?: string
  isDefault: boolean
  isActive: boolean
  orderIndex: number
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface CgvTemplateCreateRequest {
  name: string
  description?: string
  content: string
  category?: string
  isDefault?: boolean
  isActive?: boolean
  orderIndex?: number
}

export interface CgvTemplateUpdateRequest {
  name?: string
  description?: string
  content?: string
  category?: string
  isDefault?: boolean
  isActive?: boolean
  orderIndex?: number
}

export const cgvTemplatesApi = {
  /**
   * Get all active CGV templates (for selection in forms)
   */
  getAll: async (): Promise<CgvTemplate[]> => {
    const response = await apiClient.get<{ success: boolean; data: CgvTemplate[] }>(
      "/cgv-templates"
    )
    return response.data
  },

  /**
   * Get all CGV templates including inactive (admin only)
   */
  getAllAdmin: async (): Promise<CgvTemplate[]> => {
    const response = await apiClient.get<{ success: boolean; data: CgvTemplate[] }>(
      "/cgv-templates/all"
    )
    return response.data
  },

  /**
   * Get a single CGV template by ID
   */
  getById: async (id: string): Promise<CgvTemplate> => {
    const response = await apiClient.get<{ success: boolean; data: CgvTemplate }>(
      `/cgv-templates/${id}`
    )
    return response.data
  },

  /**
   * Create a new CGV template (admin only)
   */
  create: async (data: CgvTemplateCreateRequest): Promise<CgvTemplate> => {
    const response = await apiClient.post<{ success: boolean; data: CgvTemplate }>(
      "/cgv-templates",
      data
    )
    return response.data
  },

  /**
   * Update a CGV template (admin only)
   */
  update: async (id: string, data: CgvTemplateUpdateRequest): Promise<CgvTemplate> => {
    const response = await apiClient.put<{ success: boolean; data: CgvTemplate }>(
      `/cgv-templates/${id}`,
      data
    )
    return response.data
  },

  /**
   * Delete a CGV template (admin only)
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/cgv-templates/${id}`)
  },

  /**
   * Set a template as the default (admin only)
   */
  setDefault: async (id: string): Promise<CgvTemplate> => {
    const response = await apiClient.put<{ success: boolean; data: CgvTemplate }>(
      `/cgv-templates/${id}/set-default`
    )
    return response.data
  },

  /**
   * Reorder templates (admin only)
   */
  reorder: async (templateIds: string[]): Promise<CgvTemplate[]> => {
    const response = await apiClient.put<{ success: boolean; data: CgvTemplate[] }>(
      "/cgv-templates/reorder",
      { templateIds }
    )
    return response.data
  },
}
