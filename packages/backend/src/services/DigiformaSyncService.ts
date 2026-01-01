import { Op, InstanceUpdateOptions, CreateOptions } from 'sequelize'
import { DigiformaService } from './DigiformaService'
import { DigiformaMatchingService } from './DigiformaMatchingService'
import { DigiformaSync, SyncStatus, SyncType } from '../models/DigiformaSync'
import { DigiformaCompany } from '../models/DigiformaCompany'
import { DigiformaContact } from '../models/DigiformaContact'
import { DigiformaQuote, DigiformaQuoteStatus } from '../models/DigiformaQuote'
import { DigiformaInvoice, DigiformaInvoiceStatus } from '../models/DigiformaInvoice'
import { DigiformaInstitutionMapping, MatchType } from '../models/DigiformaInstitutionMapping'
import { MedicalInstitution, MedicalInstitutionAttributes } from '../models/MedicalInstitution'
import { ContactPerson, ContactPersonAttributes } from '../models/ContactPerson'
import { logger } from '../utils/logger'
import { InstitutionType } from '@medical-crm/shared'

/**
 * Extended options for sync operations on instances
 * Adds 'context' field to track whether operation is from sync or manual
 */
interface SyncInstanceUpdateOptions<T> extends InstanceUpdateOptions<T> {
  context?: { isSync: boolean }
}

interface SyncCreateOptions<T> extends CreateOptions<T> {
  context?: { isSync: boolean }
}

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
  private matchingService: DigiformaMatchingService
  private currentSync: DigiformaSync | null = null

  constructor(bearerToken: string) {
    this.digiformaService = new DigiformaService(bearerToken)
    this.matchingService = new DigiformaMatchingService()
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
   * Sync contacts from Digiforma companies metadata with LOCK PROTECTION
   *
   * Rules:
   * - LOCKED contacts: Skip CRM field updates, only update externalData
   * - NON-LOCKED digiforma contacts: Allow updates (mode=initial)
   * - NEW contacts: Create with dataSource='digiforma'
   *
   * @param mode - 'initial' updates all contacts, 'normal' only creates new ones
   */
  private async syncContacts(mode: 'initial' | 'normal' = 'normal'): Promise<void> {
    try {
      // Get all companies with contacts in metadata
      const companies = await DigiformaCompany.findAll({
        include: [{ model: MedicalInstitution, as: 'institution' }]
      })

      let lockedSkipped = 0
      let externalDataUpdated = 0

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

          // Sync contacts for this institution
          for (let i = 0; i < contacts.length; i++) {
            const digiformaContact = contacts[i]

            if (!digiformaContact.email) {
              continue // Skip contacts without email
            }

            try {
              const email = digiformaContact.email.trim().toLowerCase()

              // Check if contact already exists
              const existing = await ContactPerson.findOne({
                where: {
                  institutionId: company.institutionId,
                  email
                }
              })

              if (existing) {
                // ============================================
                // 🔒 RÈGLE 1 : Contact LOCKED = READ-ONLY
                // ============================================
                if (existing.isLocked) {
                  logger.info('Contact locked, skipping CRM fields update', {
                    contactId: existing.id,
                    email: existing.email,
                    lockedReason: existing.lockedReason,
                    lockedAt: existing.lockedAt
                  })

                  // Update ONLY external_data (read-only metadata)
                  const updateOptions: SyncInstanceUpdateOptions<ContactPersonAttributes> = {
                    context: { isSync: true } // CRITICAL: Mark as sync to avoid triggering auto-lock
                  }

                  await existing.update({
                    externalData: {
                      ...existing.externalData,
                      digiforma: {
                        id: digiformaContact.id || '',
                        firstname: digiformaContact.firstname,
                        lastname: digiformaContact.lastname,
                        phone: digiformaContact.phone,
                        position: digiformaContact.position,
                        title: digiformaContact.title,
                        lastSync: new Date()
                      }
                    },
                    lastSyncAt: {
                      ...existing.lastSyncAt,
                      digiforma: new Date()
                    }
                  }, updateOptions)

                  lockedSkipped++
                  externalDataUpdated++
                  continue // ← SKIP CRM fields update
                }

                // ============================================
                // ✅ RÈGLE 2 : Non-locked + source Digiforma = UPDATE OK
                // ============================================
                if (existing.dataSource === 'digiforma' && mode === 'initial') {
                  const updateOptions: SyncInstanceUpdateOptions<ContactPersonAttributes> = {
                    context: { isSync: true } // Prevent auto-lock
                  }

                  await existing.update({
                    firstName: digiformaContact.firstname || existing.firstName,
                    lastName: digiformaContact.lastname || existing.lastName,
                    phone: digiformaContact.phone || existing.phone,
                    title: digiformaContact.position || digiformaContact.title || existing.title,
                    isPrimary: i === 0 && !existing.isPrimary,
                    externalData: {
                      ...existing.externalData,
                      digiforma: {
                        id: digiformaContact.id || '',
                        firstname: digiformaContact.firstname,
                        lastname: digiformaContact.lastname,
                        phone: digiformaContact.phone,
                        position: digiformaContact.position,
                        title: digiformaContact.title,
                        lastSync: new Date()
                      }
                    },
                    lastSyncAt: {
                      ...existing.lastSyncAt,
                      digiforma: new Date()
                    }
                  }, updateOptions)

                  logger.info('Updated non-locked Digiforma contact', {
                    contactId: existing.id,
                    email: existing.email
                  })
                }
                // In normal mode, skip existing contacts
              } else {
                // ============================================
                // 🆕 RÈGLE 3 : Nouveau contact = Créer depuis Digiforma
                // ============================================
                const createOptions: SyncCreateOptions<ContactPersonAttributes> = {
                  context: { isSync: true } // Prevent auto-lock on creation
                }

                await ContactPerson.create({
                  institutionId: company.institutionId,
                  firstName: digiformaContact.firstname || 'Contact',
                  lastName: digiformaContact.lastname || company.name,
                  email: email,
                  phone: digiformaContact.phone,
                  title: digiformaContact.position || digiformaContact.title,
                  isPrimary: i === 0,

                  // Multi-source tracking
                  dataSource: 'digiforma', // ← Source initiale
                  isLocked: false, // ← Pas encore locked
                  externalData: {
                    digiforma: {
                      id: digiformaContact.id || '',
                      firstname: digiformaContact.firstname,
                      lastname: digiformaContact.lastname,
                      phone: digiformaContact.phone,
                      position: digiformaContact.position,
                      title: digiformaContact.title,
                      lastSync: new Date()
                    }
                  },
                  lastSyncAt: {
                    digiforma: new Date()
                  }
                }, createOptions)

                this.currentSync!.contactsSynced++
                logger.info('Created new contact from Digiforma', {
                  email,
                  institutionId: company.institutionId
                })
              }
            } catch (error) {
              logger.error('Failed to sync contact', {
                companyId: company.id,
                contactEmail: digiformaContact.email,
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

      logger.info('Digiforma contacts sync completed', {
        synced: this.currentSync!.contactsSynced,
        lockedSkipped,
        externalDataUpdated
      })
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
   * Merge Digiforma data with CRM (companies → institutions) with INTELLIGENT MATCHING
   *
   * Matching priority:
   * 1. Check existing manual mapping
   * 2. accountingNumber (100%)
   * 3. SIRET (100%)
   * 4. email (100%)
   * 5. Fuzzy match name + city (70-99%)
   * 6. Fuzzy match name + zipcode (70-99%)
   *
   * Rules:
   * - LOCKED institutions: Skip CRM field updates, only update externalData
   * - NON-LOCKED digiforma institutions: Allow updates (mode=initial)
   * - NEW institutions: Create with dataSource='digiforma'
   *
   * @param mode - 'initial' updates existing institutions, 'normal' only creates new ones
   */
  private async mergeWithCRM(mode: 'initial' | 'normal' = 'normal'): Promise<void> {
    try {
      // Find unlinked Digiforma companies
      const unlinkedCompanies = await DigiformaCompany.findUnlinked()

      let lockedSkipped = 0
      let externalDataUpdated = 0
      let autoMatched = 0
      let fuzzyMatched = 0
      let newCreated = 0

      for (const digiformaCompany of unlinkedCompanies) {
        try {
          let matchingInstitution: MedicalInstitution | null = null
          let matchResult: { score: number; matchCriteria: string; matchType: 'auto' | 'fuzzy' } | null = null

          // ============================================
          // STEP 1: Check if manual mapping already exists
          // ============================================
          const existingMapping = await DigiformaInstitutionMapping.findByDigiformaCompanyId(
            digiformaCompany.id
          )

          if (existingMapping) {
            matchingInstitution = existingMapping.institution as MedicalInstitution
            logger.info('Using existing manual mapping', {
              digiformaCompanyId: digiformaCompany.id,
              institutionId: matchingInstitution.id,
              matchType: existingMapping.matchType
            })
          } else {
            // ============================================
            // STEP 2: Use intelligent matching service
            // ============================================
            const match = await this.matchingService.findBestMatch(digiformaCompany)

            if (match) {
              matchingInstitution = match.institution
              matchResult = {
                score: match.score,
                matchCriteria: match.matchCriteria,
                matchType: match.matchType
              }

              // Create mapping record
              await DigiformaInstitutionMapping.create({
                digiformaCompanyId: digiformaCompany.id,
                institutionId: matchingInstitution.id,
                matchType: match.matchType === 'auto' ? MatchType.AUTO : MatchType.FUZZY,
                matchScore: match.score,
                matchCriteria: match.matchCriteria
              })

              if (match.matchType === 'auto') {
                autoMatched++
              } else {
                fuzzyMatched++
              }

              logger.info('Created new mapping from intelligent match', {
                digiformaCompanyId: digiformaCompany.id,
                institutionId: matchingInstitution.id,
                score: match.score,
                criteria: match.matchCriteria,
                type: match.matchType
              })
            }
          }

          // ============================================
          // STEP 3: Process match or create new institution
          // ============================================
          if (matchingInstitution) {
            // Link company to institution
            await digiformaCompany.linkToInstitution(matchingInstitution.id)

            const metadata = digiformaCompany.metadata || {}

            // ============================================
            // 🔒 RÈGLE 1 : Institution LOCKED = READ-ONLY
            // ============================================
            if (matchingInstitution.isLocked) {
              logger.info('Institution locked, skipping CRM fields update', {
                institutionId: matchingInstitution.id,
                name: matchingInstitution.name,
                lockedReason: matchingInstitution.lockedReason,
                lockedAt: matchingInstitution.lockedAt
              })

              // Update ONLY externalData (read-only metadata)
              const updateOptions: SyncInstanceUpdateOptions<MedicalInstitutionAttributes> = {
                context: { isSync: true }
              }

              await matchingInstitution.update({
                externalData: {
                  ...matchingInstitution.externalData,
                  digiforma: {
                    id: digiformaCompany.digiformaId || '',
                    name: digiformaCompany.name,
                    siret: digiformaCompany.siret,
                    accountingNumber: metadata.accountingNumber as string,
                    ape: metadata.ape as string,
                    code: metadata.code as string,
                    note: metadata.note as string,
                    lastSync: new Date()
                  }
                },
                lastSyncAt: {
                  ...matchingInstitution.lastSyncAt,
                  digiforma: new Date()
                }
              }, updateOptions)

              lockedSkipped++
              externalDataUpdated++
            } else if (mode === 'initial' && digiformaCompany.address?.street && digiformaCompany.address.street !== 'Adresse non renseignée') {
              // ============================================
              // ✅ RÈGLE 2 : Non-locked + source Digiforma = UPDATE OK
              // ============================================
              const updateOptions: SyncInstanceUpdateOptions<MedicalInstitutionAttributes> = {
                context: { isSync: true }
              }

              // Update accounting number if present in Digiforma and missing in CRM
              const updates: Partial<MedicalInstitutionAttributes> = {
                address: {
                  street: digiformaCompany.address.street,
                  city: digiformaCompany.address.city || matchingInstitution.address?.city || 'Non renseignée',
                  state: matchingInstitution.address?.state || 'Non renseigné',
                  zipCode: (metadata.cityCode as string) || matchingInstitution.address?.zipCode || '00000',
                  country: digiformaCompany.address.country || matchingInstitution.address?.country || 'FR',
                },
                externalData: {
                  ...matchingInstitution.externalData,
                  digiforma: {
                    id: digiformaCompany.digiformaId || '',
                    name: digiformaCompany.name,
                    siret: digiformaCompany.siret,
                    accountingNumber: metadata.accountingNumber as string,
                    ape: metadata.ape as string,
                    code: metadata.code as string,
                    note: metadata.note as string,
                    lastSync: new Date()
                  }
                },
                lastSyncAt: {
                  ...matchingInstitution.lastSyncAt,
                  digiforma: new Date()
                }
              }

              // Add accounting number if missing
              if (metadata.accountingNumber && !matchingInstitution.accountingNumber) {
                updates.accountingNumber = metadata.accountingNumber as string
              }

              await matchingInstitution.update(updates, updateOptions)

              logger.info('Updated non-locked Digiforma institution', {
                institutionId: matchingInstitution.id,
                name: matchingInstitution.name
              })
            }

            logger.info('Linked Digiforma company to institution', {
              digiformaCompanyId: digiformaCompany.id,
              institutionId: matchingInstitution.id,
              matchType: matchResult?.matchCriteria || 'existing_mapping',
              matchScore: matchResult?.score || 100,
              locked: matchingInstitution.isLocked
            })
          } else {
            // ============================================
            // 🆕 RÈGLE 3 : Nouvelle institution = Créer depuis Digiforma
            // ============================================
            const metadata = digiformaCompany.metadata || {}

            const createOptions: SyncCreateOptions<MedicalInstitutionAttributes> = {
              context: { isSync: true } // Prevent auto-lock on creation
            }

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
              accountingNumber: metadata.accountingNumber as string || undefined,
              tags: ['digiforma', 'formation'],

              // Multi-source tracking
              dataSource: 'digiforma', // ← Source initiale
              isLocked: false, // ← Pas encore locked
              externalData: {
                digiforma: {
                  id: digiformaCompany.digiformaId || '',
                  name: digiformaCompany.name,
                  siret: digiformaCompany.siret,
                  accountingNumber: metadata.accountingNumber as string,
                  ape: metadata.ape as string,
                  code: metadata.code as string,
                  note: metadata.note as string,
                  lastSync: new Date()
                }
              },
              lastSyncAt: {
                digiforma: new Date()
              }
            }, createOptions)

            await digiformaCompany.linkToInstitution(newInstitution.id)

            // Create auto mapping for new institution
            await DigiformaInstitutionMapping.create({
              digiformaCompanyId: digiformaCompany.id,
              institutionId: newInstitution.id,
              matchType: MatchType.AUTO,
              matchScore: 100,
              matchCriteria: 'new_institution'
            })

            newCreated++

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
        autoMatched,
        fuzzyMatched,
        newCreated,
        lockedSkipped,
        externalDataUpdated
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
