import { defineStore } from "pinia"
import { ref, computed } from "vue"
import type {
  Opportunity,
  OpportunityCreateRequest,
  OpportunityUpdateRequest,
  OpportunityStage,
  PipelineStage,
  ForecastResponse,
} from "@medical-crm/shared"
import { opportunitiesApi, type OpportunityFilters } from "@/services/api/opportunities"

export const useOpportunitiesStore = defineStore("opportunities", () => {
  // State
  const opportunities = ref<Opportunity[]>([])
  const pipeline = ref<PipelineStage[]>([])
  const forecast = ref<ForecastResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
  })

  // Computed
  const activeOpportunities = computed(() =>
    opportunities.value.filter((opp) => opp.status === "active")
  )

  const wonOpportunities = computed(() =>
    opportunities.value.filter((opp) => opp.status === "won")
  )

  const lostOpportunities = computed(() =>
    opportunities.value.filter((opp) => opp.status === "lost")
  )

  const totalValue = computed(() =>
    opportunities.value.reduce((sum, opp) => sum + parseFloat(opp.value.toString()), 0)
  )

  const weightedValue = computed(() =>
    opportunities.value.reduce(
      (sum, opp) => sum + (parseFloat(opp.value.toString()) * opp.probability) / 100,
      0
    )
  )

  const overdueOpportunities = computed(() =>
    activeOpportunities.value.filter((opp) => {
      const expected = new Date(opp.expectedCloseDate)
      return expected < new Date()
    })
  )

  // Actions
  const fetchOpportunities = async (filters?: OpportunityFilters) => {
    loading.value = true
    error.value = null

    try {
      const response: any = await opportunitiesApi.getAll(filters)
      const data = response.data?.data || response.data || response

      opportunities.value = data.opportunities || []
      if (data.pagination) {
        pagination.value = data.pagination
      }
    } catch (err) {
      console.error("Error fetching opportunities:", err)
      error.value = err instanceof Error ? err.message : "Failed to fetch opportunities"
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchPipeline = async (filters?: { assignedUserId?: string; institutionId?: string }) => {
    loading.value = true
    error.value = null

    try {
      const response = await opportunitiesApi.getPipeline(filters)
      const data = response.data?.data || response.data || response
      pipeline.value = data.pipeline || []
    } catch (err) {
      console.error("Error fetching pipeline:", err)
      error.value = err instanceof Error ? err.message : "Failed to fetch pipeline"
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchForecast = async (filters?: { assignedUserId?: string; months?: number }) => {
    loading.value = true
    error.value = null

    try {
      const response = await opportunitiesApi.getForecast(filters)
      const data = response.data?.data || response.data || response
      forecast.value = data
    } catch (err) {
      console.error("Error fetching forecast:", err)
      error.value = err instanceof Error ? err.message : "Failed to fetch forecast"
      throw err
    } finally {
      loading.value = false
    }
  }

  const getOpportunityById = (id: string): Opportunity | undefined => {
    return opportunities.value.find((opp) => opp.id === id)
  }

  const createOpportunity = async (data: OpportunityCreateRequest): Promise<Opportunity> => {
    loading.value = true
    error.value = null

    try {
      const response: any = await opportunitiesApi.create(data)
      const newOpportunity =
        response.data?.data?.opportunity || response.data?.opportunity || response.data

      opportunities.value.unshift(newOpportunity)
      return newOpportunity
    } catch (err) {
      console.error("Error creating opportunity:", err)
      error.value = err instanceof Error ? err.message : "Failed to create opportunity"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateOpportunity = async (
    id: string,
    data: OpportunityUpdateRequest
  ): Promise<Opportunity> => {
    loading.value = true
    error.value = null

    try {
      const response: any = await opportunitiesApi.update(id, data)
      const updated =
        response.data?.data?.opportunity || response.data?.opportunity || response.data

      const index = opportunities.value.findIndex((opp) => opp.id === id)
      if (index > -1) {
        opportunities.value.splice(index, 1, updated)
      }

      return updated
    } catch (err) {
      console.error("Error updating opportunity:", err)
      error.value = err instanceof Error ? err.message : "Failed to update opportunity"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateStage = async (
    id: string,
    stage: OpportunityStage,
    wonReason?: string,
    lostReason?: string
  ): Promise<Opportunity> => {
    loading.value = true
    error.value = null

    try {
      const response: any = await opportunitiesApi.updateStage(id, {
        stage,
        wonReason,
        lostReason,
      })
      const updated =
        response.data?.data?.opportunity || response.data?.opportunity || response.data

      const index = opportunities.value.findIndex((opp) => opp.id === id)
      if (index > -1) {
        opportunities.value.splice(index, 1, updated)
      }

      // Update pipeline if loaded
      if (pipeline.value.length > 0) {
        // Remove from old stage
        pipeline.value.forEach((stageData) => {
          stageData.opportunities = stageData.opportunities.filter((opp) => opp.id !== id)
        })

        // Add to new stage if active
        if (
          updated.status === "active" &&
          stage !== "closed_won" &&
          stage !== "closed_lost"
        ) {
          const stageData = pipeline.value.find((s) => s.stage === stage)
          if (stageData) {
            stageData.opportunities.push(updated)
          }
        }
      }

      return updated
    } catch (err) {
      console.error("Error updating opportunity stage:", err)
      error.value = err instanceof Error ? err.message : "Failed to update stage"
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteOpportunity = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      await opportunitiesApi.delete(id)
      opportunities.value = opportunities.value.filter((opp) => opp.id !== id)

      // Remove from pipeline if loaded
      if (pipeline.value.length > 0) {
        pipeline.value.forEach((stageData) => {
          stageData.opportunities = stageData.opportunities.filter((opp) => opp.id !== id)
        })
      }
    } catch (err) {
      console.error("Error deleting opportunity:", err)
      error.value = err instanceof Error ? err.message : "Failed to delete opportunity"
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    opportunities,
    pipeline,
    forecast,
    loading,
    error,
    pagination,

    // Computed
    activeOpportunities,
    wonOpportunities,
    lostOpportunities,
    totalValue,
    weightedValue,
    overdueOpportunities,

    // Actions
    fetchOpportunities,
    fetchPipeline,
    fetchForecast,
    getOpportunityById,
    createOpportunity,
    updateOpportunity,
    updateStage,
    deleteOpportunity,
    clearError,
  }
})
