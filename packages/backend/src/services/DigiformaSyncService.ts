import { Op } from 'sequelize'
import { DigiformaService } from './DigiformaService'
import { DigiformaSync, SyncStatus, SyncType } from '../models/DigiformaSync'
import { DigiformaCompany } from '../models/DigiformaCompany'
import { DigiformaContact } from '../models/DigiformaContact'
import { DigiformaQuote, DigiformaQuoteStatus } from '../models/DigiformaQuote'
import { DigiformaInvoice, DigiformaInvoiceStatus } from '../models/DigiformaInvoice'
import { MedicalInstitution } from '../models/MedicalInstitution'
import { ContactPerson } from '../models/ContactPerson'
import { logger } from '../utils/logger'
import { InstitutionType } from '@medical-crm/shared'

/**
 * DigiformaSyncService - Handles synchronization logic between Digiforma and CRM
 *
 * This service orchestrates the entire sync process:
 * 1. Fetch data from Digiforma API
 * 2. Store in Digiforma tables
 * 3. Merge with existing CRM data (institutions, contacts)
 * 4. Track sync statistics
 */
export class DigiformaSyncService {
  private digiformaService: DigiformaService
  private currentSync: DigiformaSync | null = null

  constructor(bearerToken: string) {
    this.digiformaService = new DigiformaService(bearerToken)
  }

  /**
   * Test connection to Digiforma
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    return await this.digiformaService.testConnection()
  }

  /**
   * Start a full synchronization
   * @param triggeredBy - User who triggered the sync
   * @param mode - 'initial' creates/updates all institutions, 'normal' only creates new ones
   */
  async startFullSync(triggeredBy?: string, mode: 'initial' | 'normal' = 'normal'): Promise<DigiformaSync> {
    // Check if sync is already running
    const runningSyncexist = await DigiformaSync.findOne({
      where: { status: SyncStatus.IN_PROGRESS },
    })

    if (runningSyncexist) {
      throw new Error('A synchronization is already in progress')
    }

    // Create sync record
    this.currentSync = await DigiformaSync.createSync(
      triggeredBy ? SyncType.MANUAL : SyncType.SCHEDULED,
      triggeredBy
    )

    try {
      await this.currentSync.update({ status: SyncStatus.IN_PROGRESS })

      logger.info('Starting Digiforma sync', { syncId: this.currentSync.id, mode })

      // Step 1: Sync companies
      logger.info('Starting Digiforma companies sync', { syncId: this.currentSync.id })
      await this.syncCompanies()

      // Step 2: Merge with CRM data (creates institutions)
      // Note: Quotes and invoices are fetched on-demand per institution for better performance
      logger.info('Starting Digiforma-CRM merge', { syncId: this.currentSync.id, mode })
      await this.mergeWithCRM(mode)

      // Step 3: Sync contacts (after institutions are created/linked)
      logger.info('Starting Digiforma contacts sync', { syncId: this.currentSync.id, mode })
      await this.syncContacts(mode)

      // Complete sync
      const finalStatus =
        this.currentSync.errors.length > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS
      await this.currentSync.complete(finalStatus)

      logger.info('Digiforma sync completed', {
        syncId: this.currentSync.id,
        mode,
        status: finalStatus,
        stats: {
          companiesSynced: this.currentSync.companiesSynced,
          contactsSynced: this.currentSync.contactsSynced,
          quotesSynced: this.currentSync.quotesSynced,
          invoicesSynced: this.currentSync.invoicesSynced,
          errors: this.currentSync.errors.length,
        },
      })

      return this.currentSync
    } catch (error) {
      logger.error('Digiforma sync failed', {
        syncId: this.currentSync.id,
        error: (error as Error).message,
      })

      await this.currentSync.addError('SYNC_FAILED', (error as Error).message, {
        stack: (error as Error).stack,
      })
      await this.currentSync.complete(SyncStatus.ERROR)

      throw error
    }
  }

  /**
   * Sync companies from Digiforma
   */
  private async syncCompanies(): Promise<void> {
    try {
      const companies = await this.digiformaService.fetchAllCompanies()

      let created = 0
      let updated = 0

      for (const company of companies) {
        try {
          // Skip companies without ID
          if (!company.id) {
            logger.warn('Skipping company without ID', { name: company.name })
            continue
          }

          const existing = await DigiformaCompany.findByDigiformaId(company.id)

          const companyData = {
            digiformaId: company.id,
            name: company.name,
            email: company.email || undefined,
            phone: undefined, // Not available in API
            address: {
              street: company.roadAddress || undefined,
              city: company.city || undefined,
              cityCode: company.cityCode || undefined,
              country: company.country || undefined,
            },
            siret: company.siret || undefined,
            website: undefined,
            lastSyncAt: new Date(),
            metadata: {
              accountingNumber: company.accountingNumber || undefined,
              ape: company.ape || undefined,
              code: company.code || undefined,
              employeesCount: company.employeesCount || undefined,
              note: company.note || undefined,
              contacts: company.contacts || [], // Store contacts for later processing
            },
          }

          if (existing) {
            await existing.update(companyData)
            updated++
          } else {
            await DigiformaCompany.create(companyData)
            created++
          }
        } catch (error) {
          logger.error('Failed to sync Digiforma company', {
            companyId: company.id,
            error: (error as Error).message,
          })
          await this.currentSync?.addError('COMPANY_SYNC_FAILED', (error as Error).message, {
            companyId: company.id,
          })
        }
      }

      await this.currentSync?.updateSyncProgress({
        companiesSynced: companies.length,
        companiesCreated: created,
        companiesUpdated: updated,
      })

      logger.info('Digiforma companies synced', {
        total: companies.length,
        created,
        updated,
      })
    } catch (error) {
      logger.error('Failed to sync Digiforma companies', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Sync contacts from Digiforma companies metadata
   * Contacts are already fetched with companies and stored in metadata
   * @param mode - 'initial' updates all contacts, 'normal' only creates new ones
   */
  private async syncContacts(mode: 'initial' | 'normal' = 'normal'): Promise<void> {
    try {
      // Get all companies with contacts in metadata
      const companies = await DigiformaCompany.findAll({
        include: [{ model: MedicalInstitution, as: 'institution' }]
      })

      for (const company of companies) {
        try {
          const contacts = company.metadata?.contacts || []

          if (contacts.length === 0) {
            continue
          }

          // Only create contacts for companies linked to institutions
          if (!company.institutionId) {
            continue
          }

          // Create contacts for this institution
          for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i]

            if (!contact.email) {
              continue // Skip contacts without email
            }

            try {
              // Check if contact already exists
              const existing = await ContactPerson.findOne({
                where: {
                  institutionId: company.institutionId,
                  email: contact.email
                }
              })

              if (existing) {
                // Only update in initial mode
                if (mode === 'initial') {
                  await existing.update({
                    firstName: contact.firstname || 'Contact',
                    lastName: contact.lastname || company.name,
                    phone: contact.phone || undefined,
                    title: contact.position || contact.title || undefined,
                    isPrimary: i === 0 && !existing.isPrimary,
                  })
                }
                // In normal mode, skip existing contacts
              } else {
                // Create new contact (both modes)
                await ContactPerson.create({
                  institutionId: company.institutionId,
                  firstName: contact.firstname || 'Contact',
                  lastName: contact.lastname || company.name,
                  email: contact.email,
                  phone: contact.phone || undefined,
                  title: contact.position || contact.title || undefined,
                  isPrimary: i === 0,
                })
                this.currentSync!.contactsSynced++
              }
            } catch (error) {
              logger.error('Failed to sync contact', {
                companyId: company.id,
                contactEmail: contact.email,
                error: (error as Error).message
              })
            }
          }
        } catch (error) {
          logger.error('Failed to sync contacts for company', {
            companyId: company.id,
            error: (error as Error).message
          })
        }
      }

      logger.info(`Synced ${this.currentSync!.contactsSynced} contacts`)
    } catch (error) {
      logger.error('Failed to sync Digiforma contacts', { error: (error as Error).message })
      await this.currentSync?.addError('CONTACTS_SYNC_FAILED', (error as Error).message)
    }
  }

  /**
   * Sync quotes from Digiforma
   */
  private async syncQuotes(): Promise<void> {
    try {
      const quotations = await this.digiformaService.fetchQuotations()
      logger.info(`Fetched ${quotations.length} quotations from Digiforma`)

      for (const quote of quotations) {
        try {
          // Calculate total from items
          const totalAmount = (quote.items || []).reduce((sum: number, item: any) => {
            const quantity = parseFloat(item.quantity || 0)
            const unitPrice = parseFloat(item.unitPrice || 0)
            const vat = parseFloat(item.vat || 0)
            return sum + quantity * unitPrice * (1 + vat / 100)
          }, 0)

          // Determine status
          let status = DigiformaQuoteStatus.DRAFT
          if (quote.acceptedAt) {
            status = DigiformaQuoteStatus.ACCEPTED
          }

          // Find linked company
          const company = await DigiformaCompany.findOne({
            where: { digiformaId: quote.customer?.id }
          })

          // Create or update quote
          const [digiformaQuote, created] = await DigiformaQuote.upsert({
            digiformaId: quote.id,
            digiformaCompanyId: company?.id,
            institutionId: company?.institutionId,
            quoteNumber: quote.numberStr || quote.number?.toString(),
            status,
            totalAmount,
            currency: 'EUR',
            createdDate: new Date(quote.date || quote.insertedAt),
            acceptedDate: quote.acceptedAt ? new Date(quote.acceptedAt) : undefined,
            lastSyncAt: new Date(),
            metadata: {
              prefix: quote.prefix,
              items: quote.items,
              customer: quote.customer,
            }
          })

          if (created) {
            this.currentSync!.quotesSynced++
          }
        } catch (error) {
          logger.error('Failed to sync quote', {
            quoteId: quote.id,
            error: (error as Error).message
          })
          await this.currentSync?.addError('QUOTE_SYNC_FAILED', (error as Error).message, {
            quoteId: quote.id
          })
        }
      }

      logger.info(`Synced ${this.currentSync!.quotesSynced} quotes`)
    } catch (error) {
      logger.error('Failed to sync Digiforma quotes', { error: (error as Error).message })
      await this.currentSync?.addError('QUOTES_SYNC_FAILED', (error as Error).message)
    }
  }

  /**
   * Sync invoices from Digiforma
   */
  private async syncInvoices(): Promise<void> {
    try {
      const invoices = await this.digiformaService.fetchInvoices()
      logger.info(`Fetched ${invoices.length} invoices from Digiforma`)

      for (const invoice of invoices) {
        try {
          // Calculate total from items
          const totalAmount = (invoice.items || []).reduce((sum: number, item: any) => {
            const quantity = parseFloat(item.quantity || 0)
            const unitPrice = parseFloat(item.unitPrice || 0)
            const vat = parseFloat(item.vat || 0)
            return sum + quantity * unitPrice * (1 + vat / 100)
          }, 0)

          // Calculate paid amount from payments
          const paidAmount = (invoice.invoicePayments || []).reduce((sum: number, payment: any) => {
            return sum + parseFloat(payment.amount || 0)
          }, 0)

          // Determine status
          let status = DigiformaInvoiceStatus.DRAFT
          if (paidAmount >= totalAmount && paidAmount > 0) {
            status = DigiformaInvoiceStatus.PAID
          } else if (paidAmount > 0) {
            status = DigiformaInvoiceStatus.PARTIALLY_PAID
          } else if (invoice.date) {
            status = DigiformaInvoiceStatus.SENT
          }

          // Find linked company
          const company = await DigiformaCompany.findOne({
            where: { digiformaId: invoice.customer?.id }
          })

          // Find if this invoice is linked to a quote
          const linkedQuote = await DigiformaQuote.findOne({
            where: {
              digiformaCompanyId: company?.id,
              // Match by similar date/amount if no explicit link
            }
          })

          // Create or update invoice
          const [digiformaInvoice, created] = await DigiformaInvoice.upsert({
            digiformaId: invoice.id,
            digiformaCompanyId: company?.id,
            digiformaQuoteId: linkedQuote?.id,
            institutionId: company?.institutionId,
            invoiceNumber: invoice.numberStr || invoice.number?.toString(),
            status,
            totalAmount,
            paidAmount,
            currency: 'EUR',
            issueDate: new Date(invoice.date || invoice.insertedAt),
            paidDate: invoice.invoicePayments?.[0]?.date ? new Date(invoice.invoicePayments[0].date) : undefined,
            lastSyncAt: new Date(),
            metadata: {
              items: invoice.items,
              invoicePayments: invoice.invoicePayments,
              accountingAnalytics: invoice.accountingAnalytics,
              isPaymentLimitEndMonth: invoice.isPaymentLimitEndMonth,
              paymentLimitDays: invoice.paymentLimitDays,
              customer: invoice.customer,
            }
          })

          if (created) {
            this.currentSync!.invoicesSynced++
          }
        } catch (error) {
          logger.error('Failed to sync invoice', {
            invoiceId: invoice.id,
            error: (error as Error).message
          })
          await this.currentSync?.addError('INVOICE_SYNC_FAILED', (error as Error).message, {
            invoiceId: invoice.id
          })
        }
      }

      logger.info(`Synced ${this.currentSync!.invoicesSynced} invoices`)
    } catch (error) {
      logger.error('Failed to sync Digiforma invoices', { error: (error as Error).message })
      await this.currentSync?.addError('INVOICES_SYNC_FAILED', (error as Error).message)
    }
  }

  /**
   * Merge Digiforma data with CRM (companies → institutions, contacts → contact persons)
   * @param mode - 'initial' updates existing institutions, 'normal' only creates new ones
   */
  private async mergeWithCRM(mode: 'initial' | 'normal' = 'normal'): Promise<void> {
    try {
      // Find unlinked Digiforma companies
      const unlinkedCompanies = await DigiformaCompany.findUnlinked()

      for (const digiformaCompany of unlinkedCompanies) {
        try {
          // Try to find matching institution by email
          let matchingInstitution: MedicalInstitution | null = null

          if (digiformaCompany.email) {
            // Search by email in institutions (check if any contact has this email)
            const contactsWithEmail = await ContactPerson.findAll({
              where: { email: digiformaCompany.email },
              include: [{ model: MedicalInstitution, as: 'institution' }],
            })

            if (contactsWithEmail.length > 0) {
              matchingInstitution = contactsWithEmail[0].institution as MedicalInstitution
            }
          }

          // If no match by email, try by name + city
          // TEMPORARILY DISABLED: Name matching is too permissive and creates false positives
          // TODO: Implement fuzzy matching with confidence score (task 24.6)
          /*
          if (!matchingInstitution && digiformaCompany.name && digiformaCompany.address?.city) {
            matchingInstitution = await MedicalInstitution.findOne({
              where: {
                name: { [Op.iLike]: `%${digiformaCompany.name}%` },
              },
            })
          }
          */

          // If found, link them
          if (matchingInstitution) {
            await digiformaCompany.linkToInstitution(matchingInstitution.id)

            // Only update address in initial mode
            if (mode === 'initial') {
              const metadata = digiformaCompany.metadata || {}
              if (digiformaCompany.address?.street && digiformaCompany.address.street !== 'Adresse non renseignée') {
                await matchingInstitution.update({
                  address: {
                    street: digiformaCompany.address.street,
                    city: digiformaCompany.address.city || matchingInstitution.address?.city,
                    state: matchingInstitution.address?.state || 'Non renseigné',
                    zipCode: (metadata.cityCode as string) || matchingInstitution.address?.zipCode || '00000',
                    country: digiformaCompany.address.country || matchingInstitution.address?.country || 'FR',
                  }
                } as any)
              }
            }

            logger.info('Linked Digiforma company to institution', {
              digiformaCompanyId: digiformaCompany.id,
              institutionId: matchingInstitution.id,
              matchType: digiformaCompany.email ? 'email' : 'name',
              addressUpdated: mode === 'initial' && !!digiformaCompany.address?.street
            })
          } else {
            // Create new institution if no match (both modes)
            const metadata = digiformaCompany.metadata || {}

            const newInstitution = await MedicalInstitution.create({
              name: digiformaCompany.name,
              type: InstitutionType.CLINIC, // Default type for Digiforma companies
              address: {
                street: digiformaCompany.address?.street || 'Adresse non renseignée',
                city: digiformaCompany.address?.city || 'Non renseignée',
                state: digiformaCompany.address?.state || 'Non renseigné',
                zipCode: (metadata.cityCode as string) || '00000',
                country: digiformaCompany.address?.country || 'FR',
              },
              siret: digiformaCompany.siret || undefined,
              tags: ['digiforma', 'formation'],
              // Store Digiforma metadata in notes for now
              notes: metadata.note || `Code: ${metadata.code || 'N/A'}, APE: ${metadata.ape || 'N/A'}, Comptabilité: ${metadata.accountingNumber || 'N/A'}`,
            } as any)

            await digiformaCompany.linkToInstitution(newInstitution.id)

            // Contacts will be created in syncContacts() step after merge

            logger.info('Created new institution from Digiforma company', {
              digiformaCompanyId: digiformaCompany.id,
              institutionId: newInstitution.id,
            })
          }
        } catch (error) {
          logger.error('Failed to merge Digiforma company with CRM', {
            digiformaCompanyId: digiformaCompany.id,
            error: (error as Error).message,
          })
          await this.currentSync?.addError(
            'MERGE_FAILED',
            (error as Error).message,
            { digiformaCompanyId: digiformaCompany.id }
          )
        }
      }

      logger.info('Digiforma-CRM merge completed', {
        unlinkedCompanies: unlinkedCompanies.length,
      })
    } catch (error) {
      logger.error('Failed to merge Digiforma data with CRM', { error: (error as Error).message })
      throw error
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    lastSync: DigiformaSync | null
    isRunning: boolean
    stats: {
      totalCompanies: number
      linkedCompanies: number
      unlinkedCompanies: number
    }
  }> {
    const lastSync = await DigiformaSync.getLastSuccessfulSync()
    const runningSync = await DigiformaSync.findOne({
      where: { status: SyncStatus.IN_PROGRESS },
    })

    const totalCompanies = await DigiformaCompany.count()
    const linkedCompanies = await DigiformaCompany.count({
      where: { institutionId: { [Op.not]: null } as any },
    })

    return {
      lastSync,
      isRunning: !!runningSync,
      stats: {
        totalCompanies,
        linkedCompanies,
        unlinkedCompanies: totalCompanies - linkedCompanies,
      },
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit = 50, offset = 0): Promise<{ rows: DigiformaSync[]; count: number }> {
    return await DigiformaSync.getSyncHistory(limit, offset)
  }
}
