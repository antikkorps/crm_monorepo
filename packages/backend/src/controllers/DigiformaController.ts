import { Context } from '../types/koa'
import { createError } from '../middleware/errorHandler'
import { DigiformaSettings } from '../models/DigiformaSettings'
import { DigiformaSyncService } from '../services/DigiformaSyncService'
import { DigiformaService } from '../services/DigiformaService'
import { DigiformaMatchingService } from '../services/DigiformaMatchingService'
import { ConsolidatedRevenueService } from '../services/ConsolidatedRevenueService'
import { DigiformaQuote } from '../models/DigiformaQuote'
import { DigiformaInvoice } from '../models/DigiformaInvoice'
import { DigiformaCompany } from '../models/DigiformaCompany'
import { DigiformaInstitutionMapping } from '../models/DigiformaInstitutionMapping'
import { MedicalInstitution } from '../models/MedicalInstitution'
import { logger } from '../utils/logger'
import Joi from 'joi'

/**
 * DigiformaController - Handles all Digiforma-related endpoints
 */
export class DigiformaController {
  /**
   * GET /api/digiforma/settings
   * Get Digiforma configuration
   */
  static async getSettings(ctx: Context) {
    try {
      const settings = await DigiformaSettings.getSettings()

      // Don't send the actual token to the frontend
      ctx.body = {
        success: true,
        data: {
          isConfigured: settings.isConfigured(),
          isEnabled: settings.isEnabled,
          apiUrl: settings.apiUrl,
          autoSyncEnabled: settings.autoSyncEnabled,
          syncFrequency: settings.syncFrequency,
          lastTestDate: settings.lastTestDate,
          lastTestSuccess: settings.lastTestSuccess,
          lastTestMessage: settings.lastTestMessage,
          lastSyncDate: settings.lastSyncDate,
        },
      }
    } catch (error) {
      logger.error('Failed to get Digiforma settings', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/digiforma/settings
   * Update Digiforma configuration
   */
  static async updateSettings(ctx: Context) {
    const schema = Joi.object({
      bearerToken: Joi.string().optional(),
      apiUrl: Joi.string().trim().optional(),
      isEnabled: Joi.boolean().optional(),
      autoSyncEnabled: Joi.boolean().optional(),
      syncFrequency: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
    })

    const { error, value } = schema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR', error.details)
    }

    try {
      const settings = await DigiformaSettings.getSettings()

      // Update bearer token if provided
      if (value.bearerToken) {
        await settings.setBearerToken(value.bearerToken)
      }

      // Update other fields
      const updates: any = {}
      if (value.apiUrl !== undefined) updates.apiUrl = value.apiUrl
      if (value.isEnabled !== undefined) updates.isEnabled = value.isEnabled
      if (value.autoSyncEnabled !== undefined) updates.autoSyncEnabled = value.autoSyncEnabled
      if (value.syncFrequency !== undefined) updates.syncFrequency = value.syncFrequency

      if (Object.keys(updates).length > 0) {
        await settings.update(updates)
      }

      ctx.body = {
        success: true,
        message: 'Digiforma settings updated successfully',
        data: {
          isConfigured: settings.isConfigured(),
          isEnabled: settings.isEnabled,
          apiUrl: settings.apiUrl,
          autoSyncEnabled: settings.autoSyncEnabled,
          syncFrequency: settings.syncFrequency,
        },
      }

      logger.info('Digiforma settings updated', {
        userId: ctx.state.user?.id,
      })
    } catch (error) {
      logger.error('Failed to update Digiforma settings', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/digiforma/test-connection
   * Test connection to Digiforma API
   */
  static async testConnection(ctx: Context) {
    try {
      const settings = await DigiformaSettings.getSettings()

      if (!settings.isConfigured()) {
        throw createError('Digiforma is not configured', 400, 'NOT_CONFIGURED')
      }

      const token = settings.getDecryptedToken()
      const syncService = new DigiformaSyncService(token)

      const result = await syncService.testConnection()

      // Update test results
      await settings.updateTestResults(result.success, result.message)

      ctx.body = {
        success: result.success,
        message: result.message,
      }

      logger.info('Digiforma connection test completed', {
        userId: ctx.state.user?.id,
        success: result.success,
      })
    } catch (error) {
      logger.error('Digiforma connection test failed', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/digiforma/sync
   * Trigger manual synchronization
   */
  static async triggerSync(ctx: Context) {
    const schema = Joi.object({
      mode: Joi.string().valid('initial', 'normal').optional().default('normal'),
    })

    const { error, value } = schema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR', error.details)
    }

    try {
      const settings = await DigiformaSettings.getSettings()

      if (!settings.isConfigured() || !settings.isEnabled) {
        throw createError('Digiforma is not configured or disabled', 400, 'NOT_CONFIGURED')
      }

      // Check if user is superadmin for initial sync
      if (value.mode === 'initial' && ctx.state.user?.role !== 'super_admin') {
        throw createError('Only superadmins can trigger initial sync', 403, 'FORBIDDEN')
      }

      const token = settings.getDecryptedToken()
      const syncService = new DigiformaSyncService(token)

      // Start sync (don't wait for completion)
      const sync = await syncService.startFullSync(ctx.state.user?.id, value.mode)

      // Update last sync date
      await settings.updateLastSync()

      ctx.body = {
        success: true,
        message: `${value.mode === 'initial' ? 'Initial' : 'Normal'} synchronization started`,
        data: {
          syncId: sync.id,
          status: sync.status,
          mode: value.mode,
        },
      }

      logger.info('Digiforma sync triggered', {
        userId: ctx.state.user?.id,
        syncId: sync.id,
        mode: value.mode,
      })
    } catch (error) {
      logger.error('Failed to trigger Digiforma sync', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/digiforma/sync/status
   * Get current sync status
   */
  static async getSyncStatus(ctx: Context) {
    try {
      const settings = await DigiformaSettings.getSettings()

      if (!settings.isConfigured()) {
        // Return empty status instead of error
        ctx.body = {
          success: true,
          data: {
            lastSync: null,
            isRunning: false,
            stats: {
              totalCompanies: 0,
              linkedCompanies: 0,
              unlinkedCompanies: 0,
            },
          },
        }
        return
      }

      const token = settings.getDecryptedToken()
      const syncService = new DigiformaSyncService(token)

      const status = await syncService.getSyncStatus()

      ctx.body = {
        success: true,
        data: status,
      }
    } catch (error) {
      logger.error('Failed to get Digiforma sync status', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/digiforma/sync/history
   * Get sync history
   */
  static async getSyncHistory(ctx: Context) {
    const schema = Joi.object({
      limit: Joi.number().integer().min(1).max(100).default(50),
      offset: Joi.number().integer().min(0).default(0),
    })

    const { error, value } = schema.validate(ctx.query)
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR', error.details)
    }

    try {
      const settings = await DigiformaSettings.getSettings()

      if (!settings.isConfigured()) {
        // Return empty history instead of error
        ctx.body = {
          success: true,
          data: {
            syncs: [],
            pagination: {
              limit: value.limit,
              offset: value.offset,
              total: 0,
            },
          },
        }
        return
      }

      const token = settings.getDecryptedToken()
      const syncService = new DigiformaSyncService(token)

      const history = await syncService.getSyncHistory(value.limit, value.offset)

      ctx.body = {
        success: true,
        data: {
          syncs: history.rows,
          pagination: {
            limit: value.limit,
            offset: value.offset,
            total: history.count,
          },
        },
      }
    } catch (error) {
      logger.error('Failed to get Digiforma sync history', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/digiforma/institutions/:id/company
   * Get Digiforma company info for an institution
   */
  static async getInstitutionCompany(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw createError('Institution ID is required', 400, 'MISSING_ID')
    }

    try {
      const company = await DigiformaCompany.findOne({
        where: { institutionId: id },
      })

      ctx.body = {
        success: true,
        data: {
          company,
        },
      }
    } catch (error) {
      // Don't throw 500 errors - just return null company
      logger.warn('Failed to get Digiforma company for institution (returning null)', {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      ctx.body = { success: true, data: { company: null } }
    }
  }

  /**
   * GET /api/digiforma/institutions/:id/quotes
   * Get Digiforma quotes for an institution (fetched on-demand from Digiforma API)
   */
  static async getInstitutionQuotes(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw createError('Institution ID is required', 400, 'MISSING_ID')
    }

    try {
      const settings = await DigiformaSettings.getSettings()
      if (!settings.isConfigured()) {
        ctx.body = { success: true, data: { quotes: [] } }
        return
      }

      // Find Digiforma company linked to this institution
      const company = await DigiformaCompany.findOne({
        where: { institutionId: id }
      })

      if (!company) {
        ctx.body = { success: true, data: { quotes: [] } }
        return
      }

      // Fetch quotes from Digiforma API
      const token = settings.getDecryptedToken()
      const digiformaService = new DigiformaService(token)

      logger.info('Fetching quotes for company', {
        institutionId: id,
        digiformaCompanyId: company.id,
        digiformaId: company.digiformaId
      })

      const quotes = await digiformaService.fetchQuotesByCompanyId(company.digiformaId)

      logger.info('Fetched quotes', {
        institutionId: id,
        digiformaId: company.digiformaId,
        quotesCount: quotes.length
      })

      // Transform quotes to match expected format
      const transformedQuotes = quotes.map(quote => ({
        id: quote.id,
        quoteNumber: quote.numberStr || quote.number?.toString(),
        totalAmount: (quote.items || []).reduce((sum: number, item: any) => {
          const quantity = parseFloat(item.quantity || 0)
          const unitPrice = parseFloat(item.unitPrice || 0)
          const vat = parseFloat(item.vat || 0)
          return sum + quantity * unitPrice * (1 + vat / 100)
        }, 0),
        status: quote.acceptedAt ? 'accepted' : 'draft',
        createdDate: quote.date || quote.insertedAt,
        acceptedDate: quote.acceptedAt,
        metadata: quote
      }))

      ctx.body = {
        success: true,
        data: {
          quotes: transformedQuotes,
        },
      }
    } catch (error) {
      // Don't throw 500 errors - just return empty quotes
      logger.warn('Failed to get Digiforma quotes for institution (returning empty)', {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      ctx.body = { success: true, data: { quotes: [] } }
    }
  }

  /**
   * GET /api/digiforma/institutions/:id/invoices
   * Get Digiforma invoices for an institution (fetched on-demand from Digiforma API)
   */
  static async getInstitutionInvoices(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw createError('Institution ID is required', 400, 'MISSING_ID')
    }

    try {
      const settings = await DigiformaSettings.getSettings()
      if (!settings.isConfigured()) {
        ctx.body = { success: true, data: { invoices: [] } }
        return
      }

      // Find Digiforma company linked to this institution
      const company = await DigiformaCompany.findOne({
        where: { institutionId: id }
      })

      if (!company) {
        ctx.body = { success: true, data: { invoices: [] } }
        return
      }

      // Fetch invoices from Digiforma API
      const token = settings.getDecryptedToken()
      const digiformaService = new DigiformaService(token)
      const invoices = await digiformaService.fetchInvoicesByCompanyId(company.digiformaId)

      // Transform invoices to match expected format
      const transformedInvoices = invoices.map(invoice => {
        const totalAmount = (invoice.items || []).reduce((sum: number, item: any) => {
          const quantity = parseFloat(item.quantity || 0)
          const unitPrice = parseFloat(item.unitPrice || 0)
          const vat = parseFloat(item.vat || 0)
          return sum + quantity * unitPrice * (1 + vat / 100)
        }, 0)

        const paidAmount = (invoice.invoicePayments || []).reduce((sum: number, payment: any) => {
          return sum + parseFloat(payment.amount || 0)
        }, 0)

        return {
          id: invoice.id,
          invoiceNumber: invoice.numberStr || invoice.number?.toString(),
          totalAmount,
          paidAmount,
          status: paidAmount >= totalAmount && paidAmount > 0 ? 'paid' :
                  paidAmount > 0 ? 'partially_paid' :
                  invoice.date ? 'sent' : 'draft',
          issueDate: invoice.date || invoice.insertedAt,
          paidDate: invoice.invoicePayments?.[0]?.date,
          metadata: invoice
        }
      })

      ctx.body = {
        success: true,
        data: {
          invoices: transformedInvoices,
        },
      }
    } catch (error) {
      // Don't throw 500 errors for Digiforma issues - just return empty data
      // This prevents critical error notifications when Digiforma is not configured
      logger.warn('Failed to get Digiforma invoices for institution (returning empty)', {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      ctx.body = { success: true, data: { invoices: [] } }
    }
  }

  /**
   * GET /api/institutions/:id/revenue/consolidated
   * Get consolidated revenue (audit + formation) for an institution
   */
  static async getInstitutionConsolidatedRevenue(ctx: Context) {
    const { id } = ctx.params

    const schema = Joi.object({
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
    })

    const { error, value } = schema.validate(ctx.query)
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR', error.details)
    }

    if (!id) {
      throw createError('Institution ID is required', 400, 'MISSING_ID')
    }

    try {
      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(
        id,
        value.startDate,
        value.endDate
      )

      ctx.body = {
        success: true,
        data: revenue,
      }

      logger.info('Consolidated revenue retrieved for institution', {
        userId: ctx.state.user?.id,
        institutionId: id,
      })
    } catch (error) {
      // Don't throw 500 errors - return empty revenue data
      logger.warn('Failed to get consolidated revenue for institution (returning empty)', {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      ctx.body = {
        success: true,
        data: {
          audit: { invoiced: 0, paid: 0, pending: 0, count: 0 },
          formation: { invoiced: 0, paid: 0, pending: 0, count: 0 },
          total: { invoiced: 0, paid: 0, pending: 0, count: 0 },
        },
      }
    }
  }

  /**
   * GET /api/dashboard/revenue/consolidated
   * Get global consolidated revenue
   */
  static async getGlobalConsolidatedRevenue(ctx: Context) {
    const schema = Joi.object({
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
    })

    const { error, value } = schema.validate(ctx.query)
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR', error.details)
    }

    try {
      const revenue = await ConsolidatedRevenueService.getGlobalRevenue(
        value.startDate,
        value.endDate
      )

      ctx.body = {
        success: true,
        data: revenue,
      }

      logger.info('Global consolidated revenue retrieved', {
        userId: ctx.state.user?.id,
      })
    } catch (error) {
      // Don't throw 500 errors - return empty revenue data
      logger.warn('Failed to get global consolidated revenue (returning empty)', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      ctx.body = {
        success: true,
        data: {
          audit: { invoiced: 0, paid: 0, pending: 0, count: 0 },
          formation: { invoiced: 0, paid: 0, pending: 0, count: 0 },
          total: { invoiced: 0, paid: 0, pending: 0, count: 0 },
        },
      }
    }
  }

  /**
   * GET /api/dashboard/revenue/evolution
   * Get revenue evolution by month
   */
  static async getRevenueEvolution(ctx: Context) {
    const schema = Joi.object({
      months: Joi.number().integer().min(1).max(24).default(12),
      institutionId: Joi.string().uuid().optional(),
    })

    const { error, value } = schema.validate(ctx.query)
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR', error.details)
    }

    try {
      const evolution = await ConsolidatedRevenueService.getRevenueEvolution(
        value.months,
        value.institutionId
      )

      ctx.body = {
        success: true,
        data: {
          evolution,
        },
      }

      logger.info('Revenue evolution retrieved', {
        userId: ctx.state.user?.id,
        months: value.months,
      })
    } catch (error) {
      // Don't throw 500 errors - return empty evolution data
      logger.warn('Failed to get revenue evolution (returning empty)', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      ctx.body = {
        success: true,
        data: {
          evolution: [],
        },
      }
    }
  }

  /**
   * GET /api/digiforma/unmatched-companies
   * Get list of Digiforma companies without CRM institution match
   */
  static async getUnmatchedCompanies(ctx: Context) {
    try {
      // Find unlinked companies (no institutionId)
      const unlinkedCompanies = await DigiformaCompany.findUnlinked()

      // Filter out companies that have a mapping but are just not linked yet
      const companiesWithoutMapping = []
      for (const company of unlinkedCompanies) {
        const mapping = await DigiformaInstitutionMapping.findByDigiformaCompanyId(company.id)
        if (!mapping) {
          companiesWithoutMapping.push(company)
        }
      }

      ctx.body = {
        success: true,
        data: {
          companies: companiesWithoutMapping,
          count: companiesWithoutMapping.length
        }
      }

      logger.info('Unmatched companies retrieved', {
        userId: ctx.state.user?.id,
        count: companiesWithoutMapping.length
      })
    } catch (error) {
      logger.error('Failed to get unmatched companies', {
        userId: ctx.state.user?.id,
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * GET /api/digiforma/suggested-matches/:companyId
   * Get suggested institution matches for a Digiforma company
   */
  static async getSuggestedMatches(ctx: Context) {
    const { companyId } = ctx.params

    try {
      // Find the company
      const company = await DigiformaCompany.findByPk(companyId)
      if (!company) {
        throw createError('Digiforma company not found', 404, 'COMPANY_NOT_FOUND')
      }

      // Get suggestions from matching service
      const matchingService = new DigiformaMatchingService()
      const suggestions = await matchingService.getSuggestedMatches(company, 10)

      ctx.body = {
        success: true,
        data: {
          company: {
            id: company.id,
            digiformaId: company.digiformaId,
            name: company.name,
            email: company.email,
            address: company.address,
            siret: company.siret,
            accountingNumber: company.metadata?.accountingNumber
          },
          suggestions: suggestions.map(s => ({
            institution: {
              id: s.institution.id,
              name: s.institution.name,
              address: s.institution.address,
              accountingNumber: s.institution.accountingNumber,
              isLocked: s.institution.isLocked
            },
            score: s.score,
            matchCriteria: s.matchCriteria,
            matchType: s.matchType
          }))
        }
      }

      logger.info('Suggested matches retrieved', {
        userId: ctx.state.user?.id,
        companyId,
        suggestionsCount: suggestions.length
      })
    } catch (error) {
      logger.error('Failed to get suggested matches', {
        userId: ctx.state.user?.id,
        companyId,
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * POST /api/digiforma/mappings
   * Create manual mapping between Digiforma company and CRM institution
   */
  static async createManualMapping(ctx: Context) {
    const schema = Joi.object({
      digiformaCompanyId: Joi.string().uuid().required(),
      institutionId: Joi.string().uuid().required(),
      notes: Joi.string().max(1000).optional()
    })

    const { error, value } = schema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR', error.details)
    }

    try {
      // Check if company exists
      const company = await DigiformaCompany.findByPk(value.digiformaCompanyId)
      if (!company) {
        throw createError('Digiforma company not found', 404, 'COMPANY_NOT_FOUND')
      }

      // Check if institution exists
      const institution = await MedicalInstitution.findByPk(value.institutionId)
      if (!institution) {
        throw createError('Institution not found', 404, 'INSTITUTION_NOT_FOUND')
      }

      // Check if mapping already exists
      const existingMapping = await DigiformaInstitutionMapping.findByDigiformaCompanyId(
        value.digiformaCompanyId
      )
      if (existingMapping) {
        throw createError(
          'Mapping already exists for this company',
          400,
          'MAPPING_ALREADY_EXISTS'
        )
      }

      // Create manual mapping
      const mapping = await DigiformaInstitutionMapping.createManualMapping(
        value.digiformaCompanyId,
        value.institutionId,
        ctx.state.user!.id,
        value.notes
      )

      // Link the company to the institution
      await company.linkToInstitution(value.institutionId)

      ctx.body = {
        success: true,
        message: 'Manual mapping created successfully',
        data: {
          mapping: {
            id: mapping.id,
            matchType: mapping.matchType,
            matchScore: mapping.matchScore,
            confirmedBy: mapping.confirmedBy,
            confirmedAt: mapping.confirmedAt,
            notes: mapping.notes
          }
        }
      }

      logger.info('Manual mapping created', {
        userId: ctx.state.user?.id,
        mappingId: mapping.id,
        companyId: value.digiformaCompanyId,
        institutionId: value.institutionId
      })
    } catch (error) {
      logger.error('Failed to create manual mapping', {
        userId: ctx.state.user?.id,
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * DELETE /api/digiforma/mappings/:id
   * Delete a mapping
   */
  static async deleteMapping(ctx: Context) {
    const { id } = ctx.params

    try {
      const mapping = await DigiformaInstitutionMapping.findByPk(id, {
        include: [
          { model: DigiformaCompany, as: 'digiformaCompany' }
        ]
      })

      if (!mapping) {
        throw createError('Mapping not found', 404, 'MAPPING_NOT_FOUND')
      }

      // Unlink the company from institution
      if (mapping.digiformaCompany) {
        await mapping.digiformaCompany.update({ institutionId: undefined })
      }

      // Delete the mapping
      await mapping.destroy()

      ctx.body = {
        success: true,
        message: 'Mapping deleted successfully'
      }

      logger.info('Mapping deleted', {
        userId: ctx.state.user?.id,
        mappingId: id
      })
    } catch (error) {
      logger.error('Failed to delete mapping', {
        userId: ctx.state.user?.id,
        mappingId: id,
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * GET /api/digiforma/fuzzy-matches
   * Get all fuzzy matches that need review
   */
  static async getFuzzyMatches(ctx: Context) {
    try {
      const fuzzyMatches = await DigiformaInstitutionMapping.getFuzzyMatches()

      ctx.body = {
        success: true,
        data: {
          matches: fuzzyMatches.map(m => ({
            id: m.id,
            digiformaCompany: {
              id: m.digiformaCompany?.id,
              name: m.digiformaCompany?.name,
              address: m.digiformaCompany?.address
            },
            institution: {
              id: m.institution?.id,
              name: m.institution?.name,
              address: m.institution?.address
            },
            matchScore: m.matchScore,
            matchCriteria: m.matchCriteria,
            confirmedBy: m.confirmedBy,
            confirmedAt: m.confirmedAt,
            notes: m.notes
          })),
          count: fuzzyMatches.length
        }
      }

      logger.info('Fuzzy matches retrieved', {
        userId: ctx.state.user?.id,
        count: fuzzyMatches.length
      })
    } catch (error) {
      logger.error('Failed to get fuzzy matches', {
        userId: ctx.state.user?.id,
        error: (error as Error).message
      })
      throw error
    }
  }

  /**
   * POST /api/digiforma/mappings/:id/confirm
   * Confirm a fuzzy match
   */
  static async confirmMapping(ctx: Context) {
    const { id } = ctx.params

    try {
      const mapping = await DigiformaInstitutionMapping.findByPk(id)

      if (!mapping) {
        throw createError('Mapping not found', 404, 'MAPPING_NOT_FOUND')
      }

      await mapping.confirm(ctx.state.user!.id)

      ctx.body = {
        success: true,
        message: 'Mapping confirmed successfully',
        data: { mapping }
      }

      logger.info('Mapping confirmed', {
        userId: ctx.state.user?.id,
        mappingId: id
      })
    } catch (error) {
      logger.error('Failed to confirm mapping', {
        userId: ctx.state.user?.id,
        mappingId: id,
        error: (error as Error).message
      })
      throw error
    }
  }
}
