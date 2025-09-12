import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useSegmentation } from '@/composables/useSegmentation'
import type { Segment, SegmentCreationAttributes } from '@medical-crm/shared'
import { SegmentType, SegmentVisibility } from '@medical-crm/shared'

// Mock the API module with factory function
vi.mock('@/services/api/segmentation', () => ({
  segmentationApi: {
    getSegments: vi.fn(),
    getSegment: vi.fn(),
    createSegment: vi.fn(),
    updateSegment: vi.fn(),
    deleteSegment: vi.fn(),
    duplicateSegment: vi.fn(),
    shareSegment: vi.fn(),
    previewSegment: vi.fn(),
  }
}))

// Get reference to mocked API
import { segmentationApi } from '@/services/api/segmentation'
const mockApiClient = vi.mocked(segmentationApi)

const mockSegment: Segment = {
  id: '1',
  name: 'Test Segment',
  type: SegmentType.INSTITUTION,
  criteria: {},
  description: 'Test description',
  visibility: SegmentVisibility.PRIVATE,
  ownerId: 'user1',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

describe('useSegmentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { segments, loading, error } = useSegmentation()
    
    expect(segments.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('should load segments successfully', async () => {
    mockApiClient.getSegments.mockResolvedValue({
      data: [mockSegment]
    })

    const { segments, loading, error, loadSegments } = useSegmentation()
    
    const loadPromise = loadSegments()
    expect(loading.value).toBe(true)
    
    await loadPromise
    await nextTick()
    
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(segments.value).toEqual([mockSegment])
    expect(mockApiClient.getSegments).toHaveBeenCalledOnce()
  })

  it('should handle loading error', async () => {
    const errorMessage = 'Failed to load segments'
    mockApiClient.getSegments.mockRejectedValue(new Error(errorMessage))

    const { segments, loading, error, loadSegments } = useSegmentation()
    
    await loadSegments()
    await nextTick()
    
    expect(loading.value).toBe(false)
    expect(error.value).toBe(errorMessage)
    expect(segments.value).toEqual([])
  })

  it('should create segment successfully', async () => {
    const newSegmentData: SegmentCreationAttributes = {
      name: 'New Segment',
      type: SegmentType.CONTACT,
      criteria: {},
      description: 'New description'
    }
    const createdSegment = { ...mockSegment, ...newSegmentData, id: '2' }
    
    mockApiClient.createSegment.mockResolvedValue({
      data: createdSegment
    })

    const { segments, createSegment } = useSegmentation()
    
    await createSegment(newSegmentData)
    await nextTick()
    
    expect(segments.value).toContainEqual(createdSegment)
    expect(mockApiClient.createSegment).toHaveBeenCalledWith(newSegmentData)
  })

  it('should update segment successfully', async () => {
    mockApiClient.getSegments.mockResolvedValue({
      data: [mockSegment]
    })
    
    const updatedData = { name: 'Updated Name' }
    const updatedSegment = { ...mockSegment, ...updatedData }
    
    mockApiClient.updateSegment.mockResolvedValue({
      data: updatedSegment
    })

    const { segments, loadSegments, updateSegment } = useSegmentation()
    
    await loadSegments()
    await updateSegment('1', updatedData)
    await nextTick()
    
    expect(segments.value[0]).toEqual(updatedSegment)
    expect(mockApiClient.updateSegment).toHaveBeenCalledWith('1', updatedData)
  })

  it('should delete segment successfully', async () => {
    mockApiClient.getSegments.mockResolvedValue({
      data: [mockSegment]
    })
    
    mockApiClient.deleteSegment.mockResolvedValue({})

    const { segments, loadSegments, deleteSegment } = useSegmentation()
    
    await loadSegments()
    await deleteSegment('1')
    await nextTick()
    
    expect(segments.value).toEqual([])
    expect(mockApiClient.deleteSegment).toHaveBeenCalledWith('1')
  })

  it('should duplicate segment successfully', async () => {
    const duplicatedSegment = { ...mockSegment, id: '2', name: 'Test Segment (Copy)' }
    
    mockApiClient.duplicateSegment.mockResolvedValue({
      data: duplicatedSegment
    })

    const { segments, duplicateSegment } = useSegmentation()
    
    await duplicateSegment('1')
    await nextTick()
    
    expect(segments.value).toContainEqual(duplicatedSegment)
    expect(mockApiClient.duplicateSegment).toHaveBeenCalledWith('1')
  })

  it('should share segment successfully', async () => {
    mockApiClient.shareSegment.mockResolvedValue({})

    const { shareSegment } = useSegmentation()
    
    await shareSegment('1', ['user2'], 'view')
    
    expect(mockApiClient.shareSegment).toHaveBeenCalledWith('1', ['user2'], 'view')
  })

  it('should clear error', () => {
    const { error, clearError } = useSegmentation()
    
    error.value = 'Test error'
    clearError()
    
    expect(error.value).toBeNull()
  })

  it('should handle API errors gracefully', async () => {
    const errorMessage = 'API Error'
    mockApiClient.createSegment.mockRejectedValue(new Error(errorMessage))

    const { error, createSegment } = useSegmentation()
    
    try {
      await createSegment({
        name: 'Test',
        type: SegmentType.INSTITUTION,
        criteria: {}
      })
    } catch (err) {
      // Expected error
    }
    
    await nextTick()
    expect(error.value).toBe(errorMessage)
  })
})