import type { ApiResponse } from "@medical-crm/shared"
import { apiClient } from "./index"

export interface Team {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TeamCreateRequest {
  name: string
  description?: string
  isActive?: boolean
}

export interface TeamUpdateRequest {
  name?: string
  description?: string
  isActive?: boolean
}

export const teamsApi = {
  /**
   * Get all teams
   */
  getAll: () => apiClient.get<ApiResponse<Team[]>>("/teams"),

  /**
   * Get a single team by ID
   */
  getById: (id: string) => apiClient.get<ApiResponse<Team>>(`/teams/${id}`),

  /**
   * Get a single team by ID (alias for getById)
   */
  getTeam: (id: string) => apiClient.get<ApiResponse<Team>>(`/teams/${id}`),

  /**
   * Create a new team
   */
  createTeam: (data: TeamCreateRequest) =>
    apiClient.post<ApiResponse<Team>>("/teams", data),

  /**
   * Update an existing team
   */
  updateTeam: (id: string, data: TeamUpdateRequest) =>
    apiClient.put<ApiResponse<Team>>(`/teams/${id}`, data),

  /**
   * Delete a team
   */
  deleteTeam: (id: string) => apiClient.delete<ApiResponse<void>>(`/teams/${id}`),

  /**
   * Get team members
   */
  getTeamMembers: (id: string) =>
    apiClient.get<ApiResponse<any[]>>(`/teams/${id}/members`),

  /**
   * Add a member to a team
   */
  addTeamMember: (teamId: string, userId: string) =>
    apiClient.post<ApiResponse<void>>(`/teams/${teamId}/members`, { userId }),

  /**
   * Remove a member from a team
   */
  removeTeamMember: (teamId: string, userId: string) =>
    apiClient.delete<ApiResponse<void>>(`/teams/${teamId}/members/${userId}`),
}
