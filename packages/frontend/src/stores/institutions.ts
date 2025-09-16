import { institutionsApi } from "@/services/api"
import type { MedicalInstitution } from "@medical-crm/shared"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useInstitutionsStore = defineStore("institutions", () => {
  // State
  const institutions = ref<MedicalInstitution[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  const fetchInstitutions = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await institutionsApi.getAll()
      const data = (response as any).data || response

      // Handle paginated response: {institutions: [...], pagination: {...}}
      let institutionsArray: any[] = []
      if (Array.isArray(data)) {
        institutionsArray = data
      } else if (data && Array.isArray(data.institutions)) {
        institutionsArray = data.institutions
      } else {
        console.warn("Institutions API response format unexpected:", data)
        institutionsArray = []
      }

      institutions.value = institutionsArray
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch institutions"
      console.error("Error fetching institutions:", err)
      institutions.value = []
    } finally {
      loading.value = false
    }
  }

  const getInstitutionById = (institutionId: string) => {
    return institutions.value.find((institution) => institution.id === institutionId)
  }

  return {
    // State
    institutions,
    loading,
    error,

    // Actions
    fetchInstitutions,
    getInstitutionById,
  }
})