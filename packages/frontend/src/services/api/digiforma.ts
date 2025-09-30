/**
 * Digiforma API Service
 *
 * Handles all communication with Digiforma integration endpoints.
 * Includes settings, synchronization, and consolidated revenue.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

/**
 * Get authentication token
 */
function getAuthToken(): string {
  return localStorage.getItem("token") || ""
}

/**
 * API Client helper
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }))
    throw new Error(error.message || error.error?.message || `Request failed: ${response.status}`)
  }

  return response.json()
}

// ============================================================================
// Digiforma Settings
// ============================================================================

export interface DigiformaSettings {
  isConfigured: boolean
  isEnabled: boolean
  apiUrl: string
  autoSyncEnabled: boolean
  syncFrequency: 'daily' | 'weekly' | 'monthly'
  lastTestDate?: string
  lastTestSuccess?: boolean
  lastTestMessage?: string
  lastSyncDate?: string
}

export interface UpdateDigiformaSettingsPayload {
  bearerToken?: string
  apiUrl?: string
  isEnabled?: boolean
  autoSyncEnabled?: boolean
  syncFrequency?: 'daily' | 'weekly' | 'monthly'
}

export const digiformaSettingsApi = {
  /**
   * Get Digiforma configuration
   */
  getSettings: async (): Promise<DigiformaSettings> => {
    const response = await apiRequest<{ success: boolean; data: DigiformaSettings }>('/digiforma/settings')
    return response.data
  },

  /**
   * Update Digiforma configuration
   */
  updateSettings: async (payload: UpdateDigiformaSettingsPayload): Promise<DigiformaSettings> => {
    const response = await apiRequest<{ success: boolean; data: DigiformaSettings }>('/digiforma/settings', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return response.data
  },

  /**
   * Test connection to Digiforma API
   */
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    return apiRequest('/digiforma/test-connection', {
      method: 'POST',
    })
  },
}

// ============================================================================
// Digiforma Synchronization
// ============================================================================

export interface DigiformaSyncStatus {
  lastSync: DigiformaSync | null
  isRunning: boolean
  stats: {
    totalCompanies: number
    linkedCompanies: number
    unlinkedCompanies: number
  }
}

export interface DigiformaSync {
  id: string
  syncType: 'manual' | 'scheduled' | 'auto'
  status: 'pending' | 'in_progress' | 'success' | 'error' | 'partial'
  startedAt: string
  completedAt?: string
  companiesSynced: number
  contactsSynced: number
  quotesSynced: number
  invoicesSynced: number
  companiesCreated: number
  companiesUpdated: number
  contactsCreated: number
  contactsUpdated: number
  quotesCreated: number
  quotesUpdated: number
  invoicesCreated: number
  invoicesUpdated: number
  errors: Array<{ type: string; message: string; details?: any }>
  metadata?: Record<string, any>
  triggeredBy?: string
}

export const digiformaSyncApi = {
  /**
   * Trigger manual synchronization
   */
  triggerSync: async (): Promise<{ syncId: string; status: string }> => {
    const response = await apiRequest<{ success: boolean; data: { syncId: string; status: string } }>('/digiforma/sync', {
      method: 'POST',
    })
    return response.data
  },

  /**
   * Get current sync status
   */
  getStatus: async (): Promise<DigiformaSyncStatus> => {
    const response = await apiRequest<{ success: boolean; data: DigiformaSyncStatus }>('/digiforma/sync/status')
    return response.data
  },

  /**
   * Get sync history with pagination
   */
  getHistory: async (limit = 50, offset = 0): Promise<{ syncs: DigiformaSync[]; pagination: any }> => {
    const response = await apiRequest<{ success: boolean; data: { syncs: DigiformaSync[]; pagination: any } }>(
      `/digiforma/sync/history?limit=${limit}&offset=${offset}`
    )
    return response.data
  },
}

// ============================================================================
// Digiforma Data (Quotes & Invoices)
// ============================================================================

export interface DigiformaQuote {
  id: string
  digiformaId: string
  quoteNumber?: string
  status: string
  totalAmount: number
  currency: string
  validUntil?: string
  createdDate: string
}

export interface DigiformaInvoice {
  id: string
  digiformaId: string
  invoiceNumber?: string
  status: string
  totalAmount: number
  paidAmount: number
  currency: string
  issueDate: string
  dueDate?: string
  paidDate?: string
}

export const digiformaDataApi = {
  /**
   * Get Digiforma quotes for an institution
   */
  getInstitutionQuotes: async (institutionId: string): Promise<DigiformaQuote[]> => {
    const response = await apiRequest<{ success: boolean; data: { quotes: DigiformaQuote[] } }>(
      `/digiforma/institutions/${institutionId}/quotes`
    )
    return response.data.quotes
  },

  /**
   * Get Digiforma invoices for an institution
   */
  getInstitutionInvoices: async (institutionId: string): Promise<DigiformaInvoice[]> => {
    const response = await apiRequest<{ success: boolean; data: { invoices: DigiformaInvoice[] } }>(
      `/digiforma/institutions/${institutionId}/invoices`
    )
    return response.data.invoices
  },
}

// ============================================================================
// Consolidated Revenue
// ============================================================================

export interface ConsolidatedRevenue {
  audit: {
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    invoiceCount: number
  }
  formation: {
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    invoiceCount: number
  }
  other: {
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    invoiceCount: number
  }
  total: {
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
  }
}

export interface RevenueEvolution {
  month: string // 'YYYY-MM'
  audit: number
  formation: number
  other: number
  total: number
}

export const consolidatedRevenueApi = {
  /**
   * Get consolidated revenue for a specific institution
   */
  getInstitutionRevenue: async (
    institutionId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ConsolidatedRevenue> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const query = params.toString()
    const endpoint = `/institutions/${institutionId}/revenue/consolidated${query ? `?${query}` : ''}`

    const response = await apiRequest<{ success: boolean; data: ConsolidatedRevenue }>(endpoint)
    return response.data
  },

  /**
   * Get global consolidated revenue (all institutions)
   */
  getGlobalRevenue: async (startDate?: string, endDate?: string): Promise<ConsolidatedRevenue> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const query = params.toString()
    const endpoint = `/dashboard/revenue/consolidated${query ? `?${query}` : ''}`

    const response = await apiRequest<{ success: boolean; data: ConsolidatedRevenue }>(endpoint)
    return response.data
  },

  /**
   * Get revenue evolution by month
   */
  getRevenueEvolution: async (months = 12, institutionId?: string): Promise<RevenueEvolution[]> => {
    const params = new URLSearchParams()
    params.append('months', months.toString())
    if (institutionId) params.append('institutionId', institutionId)

    const query = params.toString()
    const endpoint = `/dashboard/revenue/evolution?${query}`

    const response = await apiRequest<{ success: boolean; data: { evolution: RevenueEvolution[] } }>(endpoint)
    return response.data.evolution
  },
}

// ============================================================================
// Export combined API
// ============================================================================

export const digiformaApi = {
  settings: digiformaSettingsApi,
  sync: digiformaSyncApi,
  data: digiformaDataApi,
  revenue: consolidatedRevenueApi,
}

export default digiformaApi
