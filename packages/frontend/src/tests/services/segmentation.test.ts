import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SegmentationApiClient } from '@/services/api/segmentation'
import type { Segment, SegmentCreationAttributes } from '@medical-crm/shared'
import { SegmentType, SegmentVisibility } from '@medical-crm/shared'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

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

describe('SegmentationApiClient', () => {
  let client: SegmentationApiClient

  beforeEach(() => {
    client = new SegmentationApiClient('/api')
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should get segments successfully', async () => {
    const mockResponse = { data: [mockSegment] }
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const result = await client.getSegments()

    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith('/api/segments', {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'GET'
    })
  })

  it('should create segment successfully', async () => {
    const segmentData: SegmentCreationAttributes = {
      name: 'New Segment',
      type: SegmentType.CONTACT,
      criteria: {}
    }
    const mockResponse = { data: { ...mockSegment, ...segmentData, id: '2' } }
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const result = await client.createSegment(segmentData)

    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith('/api/segments', {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(segmentData)
    })
  })

  it('should handle 401 error by redirecting to login', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401
    })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    })

    await expect(client.getSegments()).rejects.toThrow('Unauthorized')
    expect(window.location.href).toBe('/login')
  })

  it('should handle other HTTP errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    })

    await expect(client.getSegments()).rejects.toThrow('HTTP error! status: 500')
  })

  it('should include auth token when available', async () => {
    localStorage.setItem('token', 'test-token')
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    })

    await client.getSegments()

    expect(mockFetch).toHaveBeenCalledWith('/api/segments', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      method: 'GET'
    })
  })

  it('should delete segment successfully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({})
    })

    await client.deleteSegment('1')

    expect(mockFetch).toHaveBeenCalledWith('/api/segments/1', {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'DELETE'
    })
  })

  it('should update segment successfully', async () => {
    const updateData = { name: 'Updated Name' }
    const mockResponse = { data: { ...mockSegment, ...updateData } }
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const result = await client.updateSegment('1', updateData)

    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith('/api/segments/1', {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'PUT',
      body: JSON.stringify(updateData)
    })
  })

  it('should duplicate segment successfully', async () => {
    const mockResponse = { 
      data: { ...mockSegment, id: '2', name: 'Test Segment (Copy)' } 
    }
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    const result = await client.duplicateSegment('1')

    expect(result).toEqual(mockResponse)
    expect(mockFetch).toHaveBeenCalledWith('/api/segments/1/duplicate', {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    })
  })
})