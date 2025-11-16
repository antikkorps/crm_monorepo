import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
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
    getSegmentAnalytics: vi.fn(),
    performBulkOperation: vi.fn(),
    exportSegment: vi.fn(),
    searchSegments: vi.fn(),
    compareSegments: vi.fn(),
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
    // Reset all mocks to default state
    vi.useFakeTimers()
    // Clear all mock implementations
    mockApiClient.getSegments.mockReset()
    mockApiClient.createSegment.mockReset()
    mockApiClient.updateSegment.mockReset()
    mockApiClient.deleteSegment.mockReset()
    mockApiClient.duplicateSegment.mockReset()
    mockApiClient.shareSegment.mockReset()
    mockApiClient.previewSegment.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
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
    
    await loadSegments()
    await nextTick()
    
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(segments.value).toEqual([mockSegment])
  })

  it('should handle loading error', async () => {
    const errorMessage = 'Failed to load segments'
    mockApiClient.getSegments.mockRejectedValue(new Error(errorMessage))

    const { segments, loading, error, loadSegments } = useSegmentation()
    
    // Force refresh to bypass cache
    await loadSegments(true)
    await nextTick()
    
    expect(loading.value).toBe(false)
    expect(error.value).toBe(errorMessage)
    expect(segments.value).toEqual([])
  })

  it('should update segment successfully', async () => {
    // First load the segments
    mockApiClient.getSegments.mockResolvedValue({
      data: [mockSegment]
    })
    
    const updatedData = { name: 'Updated Name' }
    const updatedSegment = { ...mockSegment, ...updatedData }
    
    mockApiClient.updateSegment.mockResolvedValue({
      data: updatedSegment
    })

    const { segments, loadSegments, updateSegment } = useSegmentation()
    
    // Load initial data
    await loadSegments()
    await nextTick()
    
    // Clear previous calls
    mockApiClient.getSegments.mockClear()
    
    // Update the segment
    await updateSegment('1', updatedData)
    await nextTick()
    
    expect(segments.value[0]).toEqual(updatedSegment)
    expect(mockApiClient.updateSegment).toHaveBeenCalledWith('1', updatedData)
  })

  it('should delete segment successfully', async () => {
    // First load the segments
    mockApiClient.getSegments.mockResolvedValue({
      data: [mockSegment]
    })
    
    mockApiClient.deleteSegment.mockResolvedValue({ success: true })

    const { segments, loadSegments, deleteSegment } = useSegmentation()
    
    // Load initial data
    await loadSegments()
    await nextTick()
    
    // Clear previous calls
    mockApiClient.getSegments.mockClear()
    
    // Delete the segment
    await deleteSegment('1')
    await nextTick()
    
    expect(segments.value).toEqual([])
    expect(mockApiClient.deleteSegment).toHaveBeenCalledWith('1')
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
    mockApiClient.shareSegment.mockResolvedValue({ success: true })

    const { shareSegment } = useSegmentation()
    
    await shareSegment('1', ['user2'], 'view')
    
    expect(mockApiClient.shareSegment).toHaveBeenCalledWith('1', ['user2'], 'view')
  })

  it('should preview segment successfully', async () => {
    const mockPreviewData = {
      count: 100,
      sampleRecords: [],
      lastUpdated: new Date()
    }
    
    mockApiClient.previewSegment.mockResolvedValue({
      data: mockPreviewData
    })

    const { previewSegment } = useSegmentation()
    
    const result = await previewSegment('institution', {})
    
    expect(result).toEqual(mockPreviewData)
    expect(mockApiClient.previewSegment).toHaveBeenCalledWith('institution', {})
  })

  it('should preview contact segment successfully', async () => {
    const mockPreviewData = {
      count: 50,
      sampleRecords: [],
      lastUpdated: new Date()
    }
    
    mockApiClient.previewSegment.mockResolvedValue({
      data: mockPreviewData
    })

    const { previewSegment } = useSegmentation()
    
    const result = await previewSegment('contact', {})
    
    expect(result).toEqual(mockPreviewData)
    expect(mockApiClient.previewSegment).toHaveBeenCalledWith('contact', {})
  })
})