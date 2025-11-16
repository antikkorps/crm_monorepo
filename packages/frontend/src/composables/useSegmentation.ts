import { ref, computed } from "vue"
import { segmentationApi } from "@/services/api/segmentation"
import { debounce, SimpleCache } from "@/utils/performance"
import type {
  Segment,
  SegmentCreationAttributes,
  BulkOperationOptions,
  SegmentPreviewData
} from "@medical-crm/shared"
import type { SegmentAnalyticsPayload } from "@/services/api/segmentation"

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Global cache for segments to avoid unnecessary reloads
const segmentsCache = ref<{
  data: Segment[]
  lastUpdated: number
  ttl: number
}>({
  data: [],
  lastUpdated: 0,
  ttl: CACHE_TTL
})

// Cache for segment previews and searches
const previewCache = new SimpleCache<SegmentPreviewData>()
const searchCache = new SimpleCache<Segment[]>()

export function useSegmentation() {
  // Reactive state
  const segments = ref<Segment[]>([])
  const currentSegment = ref<Segment | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Check if cache is valid
  const isCacheValid = computed(() => {
    return segmentsCache.value.lastUpdated && 
           (Date.now() - segmentsCache.value.lastUpdated) < segmentsCache.value.ttl
  })

  // Load all segments with caching
  const loadSegments = async (forceRefresh = false) => {
    // Use cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid.value && segmentsCache.value.data.length > 0) {
      segments.value = segmentsCache.value.data
      return
    }

    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.getSegments()
      segments.value = response.data
      
      // Update cache
      segmentsCache.value = {
        data: response.data,
        lastUpdated: Date.now(),
        ttl: CACHE_TTL
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load segments"
      console.error("Error loading segments:", err)
    } finally {
      loading.value = false
    }
  }

  // Load single segment
  const loadSegment = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.getSegment(id)
      currentSegment.value = response.data
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load segment"
      console.error("Error loading segment:", err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Create segment
  const createSegment = async (data: SegmentCreationAttributes) => {
    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.createSegment(data)
      segments.value.push(response.data)

      // Invalidate and update cache
      segmentsCache.value = {
        data: segments.value,
        lastUpdated: Date.now(),
        ttl: CACHE_TTL
      }

      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create segment"
      console.error("Error creating segment:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update segment
  const updateSegment = async (id: string, data: Partial<SegmentCreationAttributes>) => {
    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.updateSegment(id, data)
      const index = segments.value.findIndex(s => s.id === id)
      if (index !== -1) {
        segments.value[index] = response.data
      }
      if (currentSegment.value?.id === id) {
        currentSegment.value = response.data
      }

      // Invalidate and update cache
      segmentsCache.value = {
        data: segments.value,
        lastUpdated: Date.now(),
        ttl: CACHE_TTL
      }

      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update segment"
      console.error("Error updating segment:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete segment
  const deleteSegment = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      await segmentationApi.deleteSegment(id)
      segments.value = segments.value.filter(s => s.id !== id)
      if (currentSegment.value?.id === id) {
        currentSegment.value = null
      }

      // Invalidate and update cache
      segmentsCache.value = {
        data: segments.value,
        lastUpdated: Date.now(),
        ttl: CACHE_TTL
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete segment"
      console.error("Error deleting segment:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Duplicate segment
  const duplicateSegment = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.duplicateSegment(id)
      segments.value.push(response.data)

      // Invalidate and update cache
      segmentsCache.value = {
        data: segments.value,
        lastUpdated: Date.now(),
        ttl: CACHE_TTL
      }

      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to duplicate segment"
      console.error("Error duplicating segment:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Preview segment with caching
  const previewSegment = async (type: string, criteria: any): Promise<SegmentPreviewData | null> => {
    const cacheKey = JSON.stringify({ type, criteria })
    
    // Check cache first
    const cachedPreview = previewCache.get(cacheKey)
    if (cachedPreview) {
      return cachedPreview
    }

    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.previewSegment(type, criteria)
      // Cache the result for 2 minutes
      previewCache.set(cacheKey, response.data, 2 * 60 * 1000)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to preview segment"
      console.error("Error previewing segment:", err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Debounced preview function
  const debouncedPreview = debounce(previewSegment, 500)

  // Get analytics
  const getAnalytics = async (id: string): Promise<SegmentAnalyticsPayload | null> => {
    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.getSegmentAnalytics(id)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to get analytics"
      console.error("Error getting analytics:", err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Share segment
  const shareSegment = async (id: string, shareWith: string[], permissions: string) => {
    loading.value = true
    error.value = null
    try {
      await segmentationApi.shareSegment(id, shareWith, permissions)
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to share segment"
      console.error("Error sharing segment:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Perform bulk operation
  const performBulkOperation = async (segmentId: string, options: BulkOperationOptions) => {
    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.performBulkOperation(segmentId, options)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to perform bulk operation"
      console.error("Error performing bulk operation:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Export segment
  const exportSegment = async (id: string, format: "csv" | "excel" | "pdf" | "json", fields?: string[]) => {
    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.exportSegment(id, format, fields)
      // Trigger download
      window.open(response.downloadUrl, '_blank')
      return response.downloadUrl
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to export segment"
      console.error("Error exporting segment:", err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Search segments with caching
  const searchSegments = async (query: string) => {
    if (!query.trim()) return []
    
    const cacheKey = `search:${query.toLowerCase().trim()}`
    
    // Check cache first
    const cachedResults = searchCache.get(cacheKey)
    if (cachedResults) {
      return cachedResults
    }

    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.searchSegments(query)
      // Cache results for 3 minutes
      searchCache.set(cacheKey, response.data, 3 * 60 * 1000)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to search segments"
      console.error("Error searching segments:", err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Debounced search function
  const debouncedSearch = debounce(searchSegments, 300)

  // Compare segments
  const compareSegments = async (segmentIds: string[]) => {
    loading.value = true
    error.value = null
    try {
      const response = await segmentationApi.compareSegments(segmentIds)
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to compare segments"
      console.error("Error comparing segments:", err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    // State
    segments,
    currentSegment,
    loading,
    error,

    // Actions
    loadSegments,
    loadSegment,
    createSegment,
    updateSegment,
    deleteSegment,
    duplicateSegment,
    previewSegment,
    debouncedPreview,
    getAnalytics,
    shareSegment,
    performBulkOperation,
    exportSegment,
    searchSegments,
    debouncedSearch,
    compareSegments,
    clearError,
  }
}