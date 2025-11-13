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
   * Updated with real Digiforma API structure from query builder
   */
  async fetchCompanies(): Promise<any[]> {
    try {
      const query = `
        query {
          companies {
            id
            accountingNumber
            ape
            city
            cityCode
            code
            contacts {
              email
              firstname
              lastname
              civility
              id
              phone
              position
              title
              tags
            }
            country
            email
            employeesCount
            name
            note
            roadAddress
            siret
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
            acceptedAt
            date
            id
            insertedAt
            items {
              description
              forceTotal
              forcedTotal
              id
              name
              quantity
              type
              unitPrice
              vat
            }
            number
            numberStr
            prefix
            customer {
              accountingNumber
              id
              contracted
              crmStatus
              entity {
                ... on Company {
                  id
                  email
                  accountingNumber
                  city
                  cityCode
                  code
                  name
                  country
                }
              }
              accountManager {
                email
                firstname
                id
                lastname
                type
              }
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
            date
            id
            insertedAt
            updatedAt
            invoicePayments {
              amount
              date
              updatedAt
            }
            accountingAnalytics
            items {
              description
              quantity
              type
              unitPrice
              vat
              name
              id
            }
            number
            numberStr
            isPaymentLimitEndMonth
            paymentLimitDays
            customer {
              accountingNumber
              id
              contracted
              crmStatus
              entity {
                ... on Company {
                  id
                  email
                  accountingNumber
                  city
                  cityCode
                  code
                  name
                  country
                }
              }
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
            accountingNumber
            ape
            city
            cityCode
            code
            contacts {
              email
              firstname
              lastname
              civility
              id
              phone
              position
              title
              tags
            }
            country
            email
            employeesCount
            name
            note
            roadAddress
            siret
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
   * Calculates totals from invoice items and payments
   */
  async getTotalRevenue(): Promise<{ total: number; paid: number; unpaid: number }> {
    try {
      const invoices = await this.fetchInvoices()

      // Calculate total from items (quantity * unitPrice * (1 + vat))
      const total = invoices.reduce((sum, inv) => {
        const invoiceTotal = (inv.items || []).reduce((itemSum: number, item: any) => {
          const quantity = parseFloat(item.quantity || 0)
          const unitPrice = parseFloat(item.unitPrice || 0)
          const vat = parseFloat(item.vat || 0)
          const itemTotal = quantity * unitPrice * (1 + vat / 100)
          return itemSum + itemTotal
        }, 0)
        return sum + invoiceTotal
      }, 0)

      // Calculate paid from invoicePayments
      const paid = invoices.reduce((sum, inv) => {
        const invoicePaid = (inv.invoicePayments || []).reduce((paymentSum: number, payment: any) => {
          return paymentSum + parseFloat(payment.amount || 0)
        }, 0)
        return sum + invoicePaid
      }, 0)

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
   * Fetch quotes for a specific company
   */
  async fetchQuotesByCompanyId(companyId: string): Promise<any[]> {
    try {
      const allQuotes = await this.fetchQuotations()

      logger.info('Filtering quotes by company ID', {
        companyId,
        totalQuotes: allQuotes.length,
        sampleCustomerEntityIds: allQuotes.slice(0, 3).map(q => ({
          quoteId: q.id,
          customerId: q.customer?.id,
          entityId: q.customer?.entity?.id
        }))
      })

      // Match by customer.entity.id (the actual company ID)
      const filtered = allQuotes.filter(quote => quote.customer?.entity?.id === companyId)

      logger.info('Filtered quotes result', {
        companyId,
        matchedQuotes: filtered.length
      })

      return filtered
    } catch (error) {
      logger.error('Failed to fetch quotes for company', {
        error: (error as Error).message,
        companyId
      })
      throw error
    }
  }

  /**
   * Fetch invoices for a specific company
   */
  async fetchInvoicesByCompanyId(companyId: string): Promise<any[]> {
    try {
      const allInvoices = await this.fetchInvoices()
      // Match by customer.entity.id (the actual company ID)
      return allInvoices.filter(invoice => invoice.customer?.entity?.id === companyId)
    } catch (error) {
      logger.error('Failed to fetch invoices for company', {
        error: (error as Error).message,
        companyId
      })
      throw error
    }
  }

  /**
   * Get revenue for a specific company
   */
  async getCompanyRevenue(companyId: string): Promise<{ total: number; paid: number; unpaid: number }> {
    try {
      const invoices = await this.fetchInvoicesByCompanyId(companyId)

      // Calculate total from items
      const total = invoices.reduce((sum, inv) => {
        const invoiceTotal = (inv.items || []).reduce((itemSum: number, item: any) => {
          const quantity = parseFloat(item.quantity || 0)
          const unitPrice = parseFloat(item.unitPrice || 0)
          const vat = parseFloat(item.vat || 0)
          const itemTotal = quantity * unitPrice * (1 + vat / 100)
          return itemSum + itemTotal
        }, 0)
        return sum + invoiceTotal
      }, 0)

      // Calculate paid from invoicePayments
      const paid = invoices.reduce((sum, inv) => {
        const invoicePaid = (inv.invoicePayments || []).reduce((paymentSum: number, payment: any) => {
          return paymentSum + parseFloat(payment.amount || 0)
        }, 0)
        return sum + invoicePaid
      }, 0)

      return {
        total,
        paid,
        unpaid: total - paid,
      }
    } catch (error) {
      logger.error('Failed to calculate company revenue', {
        error: (error as Error).message,
        companyId
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

  /**
   * Search for a company by name (with optional city filter)
   * Uses confirmed Digiforma GraphQL structure with CompanyFilter
   *
   * @param name - Company name to search for
   * @param city - Optional city filter
   * @returns First matching company or null
   */
  async searchCompanyByName(name: string, city?: string): Promise<any | null> {
    try {
      const filter: any = { name }
      if (city) {
        filter.city = city
      }

      const query = `
        query SearchCompanies($filter: CompanyFilter!) {
          companies(filter: $filter) {
            id
            name
            accountingNumber
            siret
            code
            email
            city
            roadAddress
            cityCode
            country
            contacts {
              id
              firstname
              lastname
              email
              phone
              position
              title
            }
          }
        }
      `

      const variables = { filter }
      const response = await this.client.request(query, variables)
      const companies = (response as any).companies

      if (!companies || companies.length === 0) {
        logger.info('No company found by name', { name, city })
        return null
      }

      logger.info('Company found by name', {
        name,
        city,
        foundId: companies[0].id,
        foundName: companies[0].name
      })

      // Return first match
      return companies[0]
    } catch (error) {
      logger.error('Failed to search company by name', {
        error: (error as Error).message,
        name,
        city
      })
      throw error
    }
  }

  /**
   * Search for a company by accounting number
   * Uses confirmed Digiforma GraphQL structure with CompanyFilter
   * This is the PRIMARY matching method for CSV import
   *
   * @param accountingNumber - Accounting number (numéro client comptable)
   * @returns Matching company or null
   */
  async searchCompanyByAccountingNumber(accountingNumber: string): Promise<any | null> {
    try {
      const query = `
        query SearchByAccountingNumber($filter: CompanyFilter!) {
          companies(filter: $filter) {
            id
            name
            accountingNumber
            siret
            code
            email
            city
            roadAddress
            cityCode
            country
            contacts {
              id
              firstname
              lastname
              email
              phone
              position
              title
            }
          }
        }
      `

      const variables = {
        filter: { accountingNumber }
      }

      const response = await this.client.request(query, variables)
      const companies = (response as any).companies

      if (!companies || companies.length === 0) {
        logger.info('No company found by accounting number', { accountingNumber })
        return null
      }

      logger.info('Company found by accounting number', {
        accountingNumber,
        foundId: companies[0].id,
        foundName: companies[0].name
      })

      return companies[0]
    } catch (error) {
      logger.error('Failed to search company by accounting number', {
        error: (error as Error).message,
        accountingNumber
      })
      throw error
    }
  }
}
