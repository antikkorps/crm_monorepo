import { logger } from '../utils/logger'
import { MedicalInstitution } from '../models'
import { InstitutionType } from '@medical-crm/shared'
import { SageSettings } from '../models/SageSettings'

/**
 * SageService - Service for integrating with Sage accounting system
 *
 * This service handles unidirectional data sync from Sage → CRM (v1)
 * - Customer data sync (institutions with accountingNumber)
 * - Invoice data sync
 * - Payment tracking
 *
 * @note Feature flag controlled - disabled by default (SAGE_INTEGRATION_ENABLED)
 * @note v2 will include CRM → Sage sync (create invoices in Sage from CRM quotes)
 *
 * TODO: Implement actual Sage API integration
 * - Choose Sage product (Sage 50, Business Cloud, Intacct)
 * - Add Sage SDK/API client library
 * - Implement authentication (OAuth2, API key, etc.)
 * - Handle rate limiting and pagination
 */

export interface SageConfig {
  apiUrl: string
  apiKey: string
  companyId: string
  enabled: boolean
}

export interface SageCustomer {
  id: string
  accountingNumber: string  // Numéro client comptable - PRIMARY matching key
  name: string
  address: {
    street: string
    city: string
    zipCode: string
    country: string
  }
  vatNumber?: string
  paymentTerms?: number  // Days
  email?: string
  phone?: string
}

export interface SageInvoice {
  id: string
  invoiceNumber: string
  customerId: string
  accountingNumber: string  // Numéro client - for matching to CRM institutions
  date: Date
  dueDate: Date
  amount: number
  paidAmount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  items: SageInvoiceItem[]
}

export interface SageInvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  totalAmount: number
}

export interface SagePayment {
  id: string
  invoiceId: string
  accountingNumber: string
  amount: number
  date: Date
  paymentMethod: string
  reference?: string
}

export class SageService {
  private apiUrl: string
  private apiKey: string
  private companyId: string
  private enabled: boolean

  constructor(config: SageConfig) {
    this.apiUrl = config.apiUrl
    this.apiKey = config.apiKey
    this.companyId = config.companyId
    this.enabled = config.enabled

    logger.info('SageService initialized', {
      apiUrl: this.apiUrl,
      companyId: this.companyId,
      enabled: this.enabled
    })
  }

  /**
   * Create SageService instance from settings
   */
  static async fromSettings(): Promise<SageService> {
    const settings = await SageSettings.getSettings()

    if (!settings.isConfigured()) {
      throw new Error('Sage settings are not configured')
    }

    if (!settings.isEnabled) {
      throw new Error('Sage integration is disabled')
    }

    const apiKey = await settings.getDecryptedApiKey()
    return new SageService({
      apiKey,
      apiUrl: settings.apiUrl,
      companyId: settings.companyId,
      enabled: settings.isEnabled,
    })
  }

  /**
   * Test connection to Sage API
   *
   * TODO: Implement actual Sage API call once credentials are available
   * - Test authentication with API key
   * - Verify company access
   * - Return connection status
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.enabled) {
      return { success: false, message: 'Sage integration is disabled' }
    }

    // TODO: Implement Sage API connection test
    // Example (pseudo-code):
    // try {
    //   const response = await fetch(`${this.apiUrl}/api/auth/test`, {
    //     headers: {
    //       'Authorization': `Bearer ${this.apiKey}`,
    //       'X-Company-Id': this.companyId
    //     }
    //   })
    //   return { success: response.ok, message: 'Connection successful' }
    // } catch (error) {
    //   return { success: false, message: error.message }
    // }

    logger.warn('Sage testConnection: Not yet implemented - need API credentials')
    return { success: false, message: 'Sage API integration not yet configured' }
  }

  /**
   * Sync customers from Sage to CRM
   * Match by accountingNumber, create/update institutions
   *
   * TODO: Implement Sage customer sync
   * - Fetch all customers from Sage API
   * - For each customer:
   *   - Match by accountingNumber
   *   - Create new institution if not found
   *   - Update existing institution if found
   * - Track sync statistics
   */
  public async syncCustomers(): Promise<{
    synced: number
    created: number
    updated: number
    errors: string[]
  }> {
    if (!this.enabled) {
      logger.info('Sage customer sync skipped - integration disabled')
      return { synced: 0, created: 0, updated: 0, errors: [] }
    }

    // TODO: Implement Sage API call to fetch customers
    // const sageCustomers = await this.fetchCustomers()
    //
    // let created = 0
    // let updated = 0
    // const errors: string[] = []
    //
    // for (const sageCustomer of sageCustomers) {
    //   try {
    //     const institution = await this.matchOrCreateInstitution(sageCustomer)
    //     if (institution.isNewRecord) {
    //       created++
    //     } else {
    //       updated++
    //     }
    //   } catch (error) {
    //     errors.push(`Failed to sync ${sageCustomer.accountingNumber}: ${error.message}`)
    //   }
    // }
    //
    // return { synced: sageCustomers.length, created, updated, errors }

    logger.warn('Sage syncCustomers: Not yet implemented')
    return { synced: 0, created: 0, updated: 0, errors: [] }
  }

  /**
   * Sync invoices from Sage to CRM
   * Match by accountingNumber to link to institutions
   *
   * TODO: Implement Sage invoice sync
   * - Fetch invoices from Sage API (with date range filter)
   * - For each invoice:
   *   - Match customer by accountingNumber
   *   - Create/update invoice record in CRM
   *   - Link to institution
   * - Track sync statistics
   */
  public async syncInvoices(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    synced: number
    created: number
    updated: number
    errors: string[]
  }> {
    if (!this.enabled) {
      logger.info('Sage invoice sync skipped - integration disabled')
      return { synced: 0, created: 0, updated: 0, errors: [] }
    }

    // TODO: Implement Sage API call to fetch invoices
    // const sageInvoices = await this.fetchInvoices(startDate, endDate)
    //
    // let created = 0
    // let updated = 0
    // const errors: string[] = []
    //
    // for (const sageInvoice of sageInvoices) {
    //   try {
    //     // Match to institution by accountingNumber
    //     const institution = await MedicalInstitution.findOne({
    //       where: { accountingNumber: sageInvoice.accountingNumber }
    //     })
    //
    //     if (!institution) {
    //       errors.push(`No institution found for accountingNumber: ${sageInvoice.accountingNumber}`)
    //       continue
    //     }
    //
    //     // Create/update invoice in CRM
    //     // TODO: Implement invoice model and create/update logic
    //
    //   } catch (error) {
    //     errors.push(`Failed to sync invoice ${sageInvoice.invoiceNumber}: ${error.message}`)
    //   }
    // }
    //
    // return { synced: sageInvoices.length, created, updated, errors }

    logger.warn('Sage syncInvoices: Not yet implemented')
    return { synced: 0, created: 0, updated: 0, errors: [] }
  }

  /**
   * Sync payments from Sage to CRM
   * Update invoice payment status
   *
   * TODO: Implement Sage payment sync
   * - Fetch payments from Sage API (with date range filter)
   * - For each payment:
   *   - Match invoice by invoiceNumber or invoiceId
   *   - Update payment status in CRM
   *   - Update institution payment metrics
   */
  public async syncPayments(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    synced: number
    created: number
    updated: number
    errors: string[]
  }> {
    if (!this.enabled) {
      logger.info('Sage payment sync skipped - integration disabled')
      return { synced: 0, created: 0, updated: 0, errors: [] }
    }

    // TODO: Implement Sage API call to fetch payments
    // const sagePayments = await this.fetchPayments(startDate, endDate)

    logger.warn('Sage syncPayments: Not yet implemented')
    return { synced: 0, created: 0, updated: 0, errors: [] }
  }

  /**
   * Match Sage customer to CRM institution by accountingNumber
   * Create new institution if not found
   *
   * @private
   */
  private async matchOrCreateInstitution(
    sageCustomer: SageCustomer
  ): Promise<MedicalInstitution> {
    // Try to find by accountingNumber first
    let institution = await MedicalInstitution.findOne({
      where: { accountingNumber: sageCustomer.accountingNumber }
    })

    if (institution) {
      logger.info('Matched Sage customer to existing institution', {
        accountingNumber: sageCustomer.accountingNumber,
        institutionId: institution.id
      })
      return institution
    }

    // TODO: If not found, should we create a new institution or skip?
    // Decision: Create basic institution with Sage data, mark as needs review
    logger.warn('Sage customer not found in CRM, creating new institution', {
      accountingNumber: sageCustomer.accountingNumber,
      name: sageCustomer.name
    })

    institution = await MedicalInstitution.create({
      name: sageCustomer.name,
      type: InstitutionType.HOSPITAL,  // Default type, needs manual review
      accountingNumber: sageCustomer.accountingNumber,
      address: {
        street: sageCustomer.address.street,
        city: sageCustomer.address.city,
        state: '',  // Sage may not have state
        zipCode: sageCustomer.address.zipCode,
        country: sageCustomer.address.country
      },
      tags: ['sage-import', 'needs-review']
    })

    return institution
  }

  // ========== API Methods (TODO: Implement once credentials available) ==========

  /**
   * Fetch customers from Sage API
   *
   * TODO: Implement Sage API call
   * - GET /api/customers or equivalent
   * - Handle pagination
   * - Map Sage response to SageCustomer interface
   */
  private async fetchCustomers(): Promise<SageCustomer[]> {
    // TODO: Implement Sage API call
    // const response = await fetch(`${this.apiUrl}/api/customers`, {
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'X-Company-Id': this.companyId
    //   }
    // })
    // const data = await response.json()
    // return data.customers.map(this.mapSageCustomer)

    logger.warn('fetchCustomers: Not yet implemented')
    return []
  }

  /**
   * Fetch invoices from Sage API
   *
   * TODO: Implement Sage API call
   * - GET /api/invoices with date range filters
   * - Handle pagination
   * - Map Sage response to SageInvoice interface
   */
  private async fetchInvoices(startDate?: Date, endDate?: Date): Promise<SageInvoice[]> {
    // TODO: Implement Sage API call
    // const params = new URLSearchParams()
    // if (startDate) params.append('startDate', startDate.toISOString())
    // if (endDate) params.append('endDate', endDate.toISOString())
    //
    // const response = await fetch(`${this.apiUrl}/api/invoices?${params}`, {
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'X-Company-Id': this.companyId
    //   }
    // })
    // const data = await response.json()
    // return data.invoices.map(this.mapSageInvoice)

    logger.warn('fetchInvoices: Not yet implemented', { startDate, endDate })
    return []
  }

  /**
   * Fetch payments from Sage API
   *
   * TODO: Implement Sage API call
   * - GET /api/payments with date range filters
   * - Handle pagination
   * - Map Sage response to SagePayment interface
   */
  private async fetchPayments(startDate?: Date, endDate?: Date): Promise<SagePayment[]> {
    // TODO: Implement Sage API call

    logger.warn('fetchPayments: Not yet implemented', { startDate, endDate })
    return []
  }

  // ========== Data Mapping Methods (TODO: Implement based on Sage API structure) ==========

  /**
   * Map Sage API customer response to SageCustomer interface
   *
   * TODO: Implement based on actual Sage API response structure
   */
  private mapSageCustomer(sageData: any): SageCustomer {
    // TODO: Map actual Sage response fields to SageCustomer interface
    return {
      id: sageData.id,
      accountingNumber: sageData.accountingNumber || sageData.customerNumber,
      name: sageData.name || sageData.companyName,
      address: {
        street: sageData.address?.street || '',
        city: sageData.address?.city || '',
        zipCode: sageData.address?.zipCode || '',
        country: sageData.address?.country || 'FR'
      },
      vatNumber: sageData.vatNumber,
      paymentTerms: sageData.paymentTerms,
      email: sageData.email,
      phone: sageData.phone
    }
  }

  /**
   * Map Sage API invoice response to SageInvoice interface
   *
   * TODO: Implement based on actual Sage API response structure
   */
  private mapSageInvoice(sageData: any): SageInvoice {
    // TODO: Map actual Sage response fields to SageInvoice interface
    return {
      id: sageData.id,
      invoiceNumber: sageData.invoiceNumber || sageData.number,
      customerId: sageData.customerId,
      accountingNumber: sageData.customerNumber || sageData.accountingNumber,
      date: new Date(sageData.date),
      dueDate: new Date(sageData.dueDate),
      amount: sageData.totalAmount || 0,
      paidAmount: sageData.paidAmount || 0,
      status: this.mapInvoiceStatus(sageData.status),
      items: (sageData.items || []).map(this.mapSageInvoiceItem)
    }
  }

  /**
   * Map Sage invoice status to CRM status
   */
  private mapInvoiceStatus(sageStatus: string): 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' {
    // TODO: Map actual Sage status values to CRM status
    const statusMap: Record<string, 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'> = {
      'draft': 'draft',
      'sent': 'sent',
      'paid': 'paid',
      'overdue': 'overdue',
      'cancelled': 'cancelled'
    }
    return statusMap[sageStatus?.toLowerCase()] || 'draft'
  }

  /**
   * Map Sage invoice item to SageInvoiceItem interface
   */
  private mapSageInvoiceItem(sageItem: any): SageInvoiceItem {
    // TODO: Map actual Sage item structure
    return {
      id: sageItem.id,
      description: sageItem.description || '',
      quantity: sageItem.quantity || 0,
      unitPrice: sageItem.unitPrice || 0,
      vatRate: sageItem.vatRate || 0,
      totalAmount: sageItem.totalAmount || 0
    }
  }

  // ========== v2 Features (CRM → Sage sync) ==========

  /**
   * Create invoice in Sage from CRM quote
   *
   * TODO v2: Implement CRM → Sage sync
   * - Convert CRM quote to Sage invoice format
   * - POST to Sage API to create invoice
   * - Store Sage invoice ID in CRM for tracking
   *
   * @note This is a v2 feature - bidirectional sync
   */
  public async createInvoiceFromQuote(quoteId: string): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    logger.warn('createInvoiceFromQuote: v2 feature - not yet implemented', { quoteId })
    return { success: false, error: 'Feature not available in v1' }
  }

  /**
   * Update customer in Sage from CRM institution
   *
   * TODO v2: Implement CRM → Sage sync
   * - Map CRM institution to Sage customer format
   * - PUT to Sage API to update customer
   *
   * @note This is a v2 feature - bidirectional sync
   */
  public async updateCustomerFromInstitution(institutionId: string): Promise<{ success: boolean; error?: string }> {
    logger.warn('updateCustomerFromInstitution: v2 feature - not yet implemented', { institutionId })
    return { success: false, error: 'Feature not available in v1' }
  }
}

export default SageService
