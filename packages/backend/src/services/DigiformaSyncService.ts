import { Op } from 'sequelize'
import { DigiformaService } from './DigiformaService'
import { DigiformaSync, SyncStatus, SyncType } from '../models/DigiformaSync'
import { DigiformaCompany } from '../models/DigiformaCompany'
import { DigiformaContact } from '../models/DigiformaContact'
import { DigiformaQuote } from '../models/DigiformaQuote'
import { DigiformaInvoice } from '../models/DigiformaInvoice'
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
   */
  async startFullSync(triggeredBy?: string): Promise<DigiformaSync> {
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

      // Step 1: Sync companies
      logger.info('Starting Digiforma companies sync', { syncId: this.currentSync.id })
      await this.syncCompanies()

      // Step 2: Sync contacts (if available in API)
      logger.info('Starting Digiforma contacts sync', { syncId: this.currentSync.id })
      await this.syncContacts()

      // Step 3: Sync quotes (if available in API)
      logger.info('Starting Digiforma quotes sync', { syncId: this.currentSync.id })
      await this.syncQuotes()

      // Step 4: Sync invoices
      logger.info('Starting Digiforma invoices sync', { syncId: this.currentSync.id })
      await this.syncInvoices()

      // Step 5: Merge with CRM data
      logger.info('Starting Digiforma-CRM merge', { syncId: this.currentSync.id })
      await this.mergeWithCRM()

      // Complete sync
      const finalStatus =
        this.currentSync.errors.length > 0 ? SyncStatus.PARTIAL : SyncStatus.SUCCESS
      await this.currentSync.complete(finalStatus)

      logger.info('Digiforma sync completed', {
        syncId: this.currentSync.id,
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
          const existing = await DigiformaCompany.findByDigiformaId(company.id)

          const companyData = {
            digiformaId: company.id,
            name: company.name,
            email: company.email || undefined,
            phone: undefined, // Not in current API schema
            address: {
              city: company.city || undefined,
              country: company.country || undefined,
            },
            siret: undefined,
            website: undefined,
            lastSyncAt: new Date(),
            metadata: {
              opca: company.opca || undefined,
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
   * Sync contacts from Digiforma
   * TODO: Implement when Digiforma provides contacts endpoint
   */
  private async syncContacts(): Promise<void> {
    try {
      // For now, we'll skip this as we don't have the Digiforma contacts API structure yet
      logger.info('Skipping contacts sync - API structure not yet implemented')
    } catch (error) {
      logger.error('Failed to sync Digiforma contacts', { error: (error as Error).message })
      await this.currentSync?.addError('CONTACTS_SYNC_FAILED', (error as Error).message)
    }
  }

  /**
   * Sync quotes from Digiforma
   * TODO: Implement when Digiforma provides quotes endpoint
   */
  private async syncQuotes(): Promise<void> {
    try {
      // For now, we'll skip this as we don't have the Digiforma quotes API structure yet
      logger.info('Skipping quotes sync - API structure not yet implemented')
    } catch (error) {
      logger.error('Failed to sync Digiforma quotes', { error: (error as Error).message })
      await this.currentSync?.addError('QUOTES_SYNC_FAILED', (error as Error).message)
    }
  }

  /**
   * Sync invoices from Digiforma
   * TODO: Implement when Digiforma provides invoices endpoint
   */
  private async syncInvoices(): Promise<void> {
    try {
      // For now, we'll skip this as we don't have the Digiforma invoices API structure yet
      logger.info('Skipping invoices sync - API structure not yet implemented')
    } catch (error) {
      logger.error('Failed to sync Digiforma invoices', { error: (error as Error).message })
      await this.currentSync?.addError('INVOICES_SYNC_FAILED', (error as Error).message)
    }
  }

  /**
   * Merge Digiforma data with CRM (companies → institutions, contacts → contact persons)
   */
  private async mergeWithCRM(): Promise<void> {
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
          if (!matchingInstitution && digiformaCompany.name && digiformaCompany.address?.city) {
            matchingInstitution = await MedicalInstitution.findOne({
              where: {
                name: { [Op.iLike]: `%${digiformaCompany.name}%` },
              },
            })
          }

          // If found, link them
          if (matchingInstitution) {
            await digiformaCompany.linkToInstitution(matchingInstitution.id)
            logger.info('Linked Digiforma company to institution', {
              digiformaCompanyId: digiformaCompany.id,
              institutionId: matchingInstitution.id,
              matchType: digiformaCompany.email ? 'email' : 'name',
            })
          } else {
            // Create new institution if no match
            const newInstitution = await MedicalInstitution.create({
              name: digiformaCompany.name,
              type: InstitutionType.CLINIC, // Default type for Digiforma companies
              address: {
                street: '',
                city: digiformaCompany.address?.city || '',
                state: '',
                zipCode: '',
                country: digiformaCompany.address?.country || 'FR',
              },
              tags: ['digiforma', 'formation'],
            })

            await digiformaCompany.linkToInstitution(newInstitution.id)

            // Create contact person if email exists
            if (digiformaCompany.email) {
              await ContactPerson.create({
                institutionId: newInstitution.id,
                firstName: '',
                lastName: digiformaCompany.name,
                email: digiformaCompany.email,
                isPrimary: true,
              })
            }

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
