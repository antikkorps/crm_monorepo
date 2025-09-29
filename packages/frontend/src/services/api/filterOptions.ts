const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

class FilterOptionsApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(endpoint: string): Promise<T> {
    const token = localStorage.getItem("token")

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      method: "GET",
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

  // Contact filter options
  async getContactRoles(): Promise<{ data: string[] }> {
    return this.request<{ data: string[] }>("/filter-options/contacts/roles")
  }

  async getContactDepartments(): Promise<{ data: string[] }> {
    return this.request<{ data: string[] }>("/filter-options/contacts/departments")
  }

  async getContactTitles(): Promise<{ data: string[] }> {
    return this.request<{ data: string[] }>("/filter-options/contacts/titles")
  }

  // Institution filter options
  async getInstitutionTypes(): Promise<{ data: string[] }> {
    return this.request<{ data: string[] }>("/filter-options/institutions/types")
  }

  async getSpecialties(): Promise<{ data: string[] }> {
    return this.request<{ data: string[] }>("/filter-options/institutions/specialties")
  }

  async getCities(): Promise<{ data: string[] }> {
    return this.request<{ data: string[] }>("/filter-options/institutions/cities")
  }

  async getStates(): Promise<{ data: string[] }> {
    return this.request<{ data: string[] }>("/filter-options/institutions/states")
  }
}

// Export singleton instance
export const filterOptionsApi = new FilterOptionsApiClient(API_BASE_URL)

// Export class for testing or custom instances
export { FilterOptionsApiClient }