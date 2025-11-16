import { callsApi, type CallFilters } from "@/services/api/calls"
import type {
  Call,
  CallCreateRequest,
  CallUpdateRequest,
  CallType,
} from "@medical-crm/shared"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

export const useCallsStore = defineStore("calls", () => {
  // State
  const calls = ref<Call[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<CallFilters>({})

  // Getters
  const filteredCalls = computed(() => {
    let result = [...calls.value]

    // Apply filters
    if (filters.value.callType) {
      result = result.filter((call) => call.callType === filters.value.callType)
    }

    if (filters.value.userId) {
      result = result.filter((call) => call.userId === filters.value.userId)
    }

    if (filters.value.institutionId) {
      result = result.filter((call) => call.institutionId === filters.value.institutionId)
    }

    if (filters.value.contactPersonId) {
      result = result.filter((call) => call.contactPersonId === filters.value.contactPersonId)
    }

    if (filters.value.phoneNumber) {
      const phoneSearch = filters.value.phoneNumber.toLowerCase()
      result = result.filter((call) => call.phoneNumber.toLowerCase().includes(phoneSearch))
    }

    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase()
      result = result.filter(
        (call) =>
          call.phoneNumber.toLowerCase().includes(searchTerm) ||
          call.summary?.toLowerCase().includes(searchTerm)
      )
    }

    return result
  })

  const callsByType = computed(() => {
    return {
      incoming: filteredCalls.value.filter((call) => call.callType === "incoming"),
      outgoing: filteredCalls.value.filter((call) => call.callType === "outgoing"),
      missed: filteredCalls.value.filter((call) => call.callType === "missed"),
    }
  })

  const todayCalls = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return calls.value
      .filter((call) => {
        const callDate = new Date(call.createdAt)
        return callDate >= today && callDate < tomorrow
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  const callStats = computed(() => ({
    total: calls.value.length,
    incoming: callsByType.value.incoming.length,
    outgoing: callsByType.value.outgoing.length,
    missed: callsByType.value.missed.length,
    today: todayCalls.value.length,
  }))

  // Actions
  const fetchCalls = async (customFilters?: CallFilters) => {
    try {
      loading.value = true
      error.value = null
      const response = await callsApi.getAll(customFilters || filters.value)
      calls.value = (response as any)?.data || (response as any)
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch calls"
      console.error("Error fetching calls:", err)
    } finally {
      loading.value = false
    }
  }

  const createCall = async (callData: CallCreateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await callsApi.create(callData)
      const newCall = (response as any)?.data || (response as any)
      calls.value.push(newCall)
      return newCall
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create call"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateCall = async (callId: string, updates: CallUpdateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await callsApi.update(callId, updates)
      const updatedCall = (response as any)?.data || (response as any)

      const index = calls.value.findIndex((call) => call.id === callId)
      if (index !== -1) {
        calls.value[index] = updatedCall
      }

      return updatedCall
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update call"
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteCall = async (callId: string) => {
    try {
      loading.value = true
      error.value = null
      await callsApi.delete(callId)

      const index = calls.value.findIndex((call) => call.id === callId)
      if (index !== -1) {
        calls.value.splice(index, 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete call"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateFilters = (newFilters: Partial<CallFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {}
  }

  const getCallById = (callId: string) => {
    return calls.value.find((call) => call.id === callId)
  }

  return {
    // State
    calls,
    loading,
    error,
    filters,

    // Getters
    filteredCalls,
    callsByType,
    todayCalls,
    callStats,

    // Actions
    fetchCalls,
    createCall,
    updateCall,
    deleteCall,
    updateFilters,
    clearFilters,
    getCallById,
  }
})
