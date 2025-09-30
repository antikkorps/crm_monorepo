import { GraphQLClient } from 'graphql-request'
import { logger } from '../utils/logger'

/**
 * DigiformaService - Service for interacting with Digiforma GraphQL API
 *
 * This service handles all communication with Digiforma's API including:
 * - Company (client) data retrieval
 * - Contact information sync
 * - Quote data extraction
 * - Invoice and revenue tracking
 *
 * @note Read-only operations only (Qualiopi compliance)
 */
export class DigiformaService {
  private client: GraphQLClient
  private apiUrl: string
  private bearerToken: string

  constructor(bearerToken: string, apiUrl = 'https://app.digiforma.com/api/v1/graphql') {
    this.apiUrl = apiUrl
    this.bearerToken = bearerToken
    this.client = new GraphQLClient(this.apiUrl, {
      headers: {
        authorization: `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Test connection to Digiforma API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Simple query to test authentication
      const query = `
        query TestConnection {
          __typename
        }
      `
      await this.client.request(query)
      return { success: true, message: 'Connection successful' }
    } catch (error) {
      logger.error('Digiforma connection test failed', { error: (error as Error).message })
      return { success: false, message: (error as Error).message }
    }
  }

  /**
   * Fetch companies from Digiforma
   */
  async fetchCompanies(): Promise<any[]> {
    try {
      const query = `
        query {
          companies {
            id
            name
            country
            city
            email
            opca
          }
        }
      `

      const response = await this.client.request(query)

      return (response as any).companies || []
    } catch (error) {
      logger.error('Failed to fetch Digiforma companies', {
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * Fetch trainees (contacts in Digiforma)
   */
  async fetchTrainees(): Promise<any[]> {
    try {
      const query = `
        query {
          trainees {
            id
            firstname
            lastname
            email
            phone
            company {
              id
              name
            }
          }
        }
      `

      const response = await this.client.request(query)

      return (response as any).trainees || []
    } catch (error) {
      logger.error('Failed to fetch Digiforma trainees', {
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * Fetch customers (alternative to companies)
   */
  async fetchCustomers(): Promise<any[]> {
    try {
      const query = `
        query {
          customers {
            id
            name
            email
            city
            country
          }
        }
      `

      const response = await this.client.request(query)

      return (response as any).customers || []
    } catch (error) {
      logger.error('Failed to fetch Digiforma customers', {
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * Fetch quotations from Digiforma
   */
  async fetchQuotations(): Promise<any[]> {
    try {
      const query = `
        query {
          quotations {
            id
            reference
            date
            status
            total_amount
            customer {
              id
              name
            }
          }
        }
      `

      const response = await this.client.request(query)

      return (response as any).quotations || []
    } catch (error) {
      logger.error('Failed to fetch Digiforma quotations', {
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * Fetch invoices from Digiforma for revenue tracking
   */
  async fetchInvoices(): Promise<any[]> {
    try {
      const query = `
        query {
          invoices {
            id
            reference
            date
            status
            total_amount
            paid_amount
            customer {
              id
              name
            }
          }
        }
      `

      const response = await this.client.request(query)

      return (response as any).invoices || []
    } catch (error) {
      logger.error('Failed to fetch Digiforma invoices', {
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * Fetch a single company by ID
   */
  async fetchCompanyById(companyId: string): Promise<any | null> {
    try {
      const query = `
        query GetCompany($id: ID!) {
          company(id: $id) {
            id
            name
            country
            city
            email
            opca
          }
        }
      `

      const variables = { id: companyId }
      const response = await this.client.request(query, variables)

      return (response as any).company || null
    } catch (error) {
      logger.error('Failed to fetch Digiforma company', {
        error: (error as Error).message,
        companyId
      })
      throw error
    }
  }

  /**
   * Fetch training sessions
   */
  async fetchTrainingSessions(): Promise<any[]> {
    try {
      const query = `
        query {
          trainingSessions {
            id
            name
            start_date
            end_date
            status
          }
        }
      `

      const response = await this.client.request(query)

      return (response as any).trainingSessions || []
    } catch (error) {
      logger.error('Failed to fetch Digiforma training sessions', {
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * Get total revenue from Digiforma
   */
  async getTotalRevenue(): Promise<{ total: number; paid: number; unpaid: number }> {
    try {
      const invoices = await this.fetchInvoices()

      const total = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)
      const paid = invoices.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0)

      return {
        total,
        paid,
        unpaid: total - paid,
      }
    } catch (error) {
      logger.error('Failed to calculate Digiforma revenue', {
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * Fetch all companies (no pagination needed based on Digiforma API)
   */
  async fetchAllCompanies(): Promise<any[]> {
    return await this.fetchCompanies()
  }
}
