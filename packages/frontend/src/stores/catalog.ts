import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'

export interface CatalogItem {
  id: string
  name: string
  description?: string
  category?: string
  unitPrice: number
  taxRate: number
  isActive: boolean
  sku?: string
  unit?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  creator?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface CatalogFilters {
  search?: string
  category?: string
  isActive?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  limit?: number
}

export interface CatalogPagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export const useCatalogStore = defineStore('catalog', () => {
  const items = ref<CatalogItem[]>([])
  const categories = ref<string[]>([])
  const pagination = ref<CatalogPagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeItems = computed(() =>
    items.value.filter(item => item.isActive)
  )

  const fetchItems = async (filters: CatalogFilters = {}) => {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.category) params.append('category', filters.category)
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())

      const response = await api.get(`/catalog?${params.toString()}`)
      items.value = response.items
      pagination.value = response.pagination
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch catalog items'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/catalog/categories')
      categories.value = response.categories
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch categories'
      throw err
    }
  }

  const searchItems = async (query: string) => {
    try {
      const response = await api.get(`/catalog/search?q=${encodeURIComponent(query)}`)
      return response.items
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to search items'
      throw err
    }
  }

  const getItemById = async (id: string) => {
    try {
      const response = await api.get(`/catalog/${id}`)
      return response
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch item'
      throw err
    }
  }

  const createItem = async (itemData: Partial<CatalogItem>) => {
    loading.value = true
    error.value = null
    try {
      const newItem = (await api.post('/catalog', itemData)) as CatalogItem
      if (!newItem) throw new Error('Empty response creating item')
      items.value.unshift(newItem)
      return newItem
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create item'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateItem = async (id: string, itemData: Partial<CatalogItem>) => {
    loading.value = true
    error.value = null
    try {
      const updatedItem = (await api.put(`/catalog/${id}`, itemData)) as CatalogItem
      if (!updatedItem) throw new Error('Empty response updating item')
      const index = items.value.findIndex(item => item.id === id)
      if (index !== -1) {
        items.value[index] = updatedItem
      }
      return updatedItem
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to update item'
      throw err
    } finally {
      loading.value = false
    }
  }

  const toggleItemStatus = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const updatedItem = (await api.patch(`/catalog/${id}/toggle`)) as CatalogItem
      if (!updatedItem) throw new Error('Empty response toggling item')
      const index = items.value.findIndex(item => item.id === id)
      if (index !== -1) {
        items.value[index] = updatedItem
      }
      return updatedItem
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to toggle item status'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteItem = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      await api.delete(`/catalog/${id}`)
      items.value = items.value.filter(item => item.id !== id)
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete item'
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    items,
    categories,
    pagination,
    loading,
    error,
    activeItems,
    fetchItems,
    fetchCategories,
    searchItems,
    getItemById,
    createItem,
    updateItem,
    toggleItemStatus,
    deleteItem,
    clearError
  }
})
