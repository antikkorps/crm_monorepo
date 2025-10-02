import { Context } from '../types/koa'
import { createError } from '../middleware/errorHandler'
import { DigiformaSettings } from '../models/DigiformaSettings'
import { DigiformaSyncService } from '../services/DigiformaSyncService'
import { ConsolidatedRevenueService } from '../services/ConsolidatedRevenueService'
import { DigiformaQuote } from '../models/DigiformaQuote'
import { DigiformaInvoice } from '../models/DigiformaInvoice'
import { DigiformaCompany } from '../models/DigiformaCompany'
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
      apiUrl: Joi.string().uri().optional(),
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
    try {
      const settings = await DigiformaSettings.getSettings()

      if (!settings.isConfigured() || !settings.isEnabled) {
        throw createError('Digiforma is not configured or disabled', 400, 'NOT_CONFIGURED')
      }

      const token = settings.getDecryptedToken()
      const syncService = new DigiformaSyncService(token)

      // Start sync (don't wait for completion)
      const sync = await syncService.startFullSync(ctx.state.user?.id)

      // Update last sync date
      await settings.updateLastSync()

      ctx.body = {
        success: true,
        message: 'Synchronization started',
        data: {
          syncId: sync.id,
          status: sync.status,
        },
      }

      logger.info('Digiforma sync triggered', {
        userId: ctx.state.user?.id,
        syncId: sync.id,
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
        throw createError('Digiforma is not configured', 400, 'NOT_CONFIGURED')
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
        throw createError('Digiforma is not configured', 400, 'NOT_CONFIGURED')
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
      logger.error('Failed to get Digiforma company for institution', {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/digiforma/institutions/:id/quotes
   * Get Digiforma quotes for an institution
   */
  static async getInstitutionQuotes(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw createError('Institution ID is required', 400, 'MISSING_ID')
    }

    try {
      const quotes = await DigiformaQuote.getByInstitution(id)

      ctx.body = {
        success: true,
        data: {
          quotes,
        },
      }
    } catch (error) {
      logger.error('Failed to get Digiforma quotes for institution', {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/digiforma/institutions/:id/invoices
   * Get Digiforma invoices for an institution
   */
  static async getInstitutionInvoices(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw createError('Institution ID is required', 400, 'MISSING_ID')
    }

    try {
      const invoices = await DigiformaInvoice.getByInstitution(id)

      ctx.body = {
        success: true,
        data: {
          invoices,
        },
      }
    } catch (error) {
      logger.error('Failed to get Digiforma invoices for institution', {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
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
      logger.error('Failed to get consolidated revenue for institution', {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
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
      logger.error('Failed to get global consolidated revenue', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
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
      logger.error('Failed to get revenue evolution', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }
}
