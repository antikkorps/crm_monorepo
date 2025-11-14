import { Context } from '../types/koa'
import { createError } from '../middleware/errorHandler'
import { SageSettings } from '../models/SageSettings'
import { SageService } from '../services/SageService'
import { logger } from '../utils/logger'
import Joi from 'joi'

/**
 * SageController - Handles all Sage accounting integration endpoints
 *
 * Provides API endpoints for:
 * - Sage settings management (CRUD)
 * - Connection testing
 * - Manual sync triggers
 * - Sync status and history
 *
 * TODO: Implement actual sync functionality once Sage API is integrated
 */
export class SageController {
  /**
   * GET /api/sage/settings
   * Get Sage configuration
   */
  static async getSettings(ctx: Context) {
    try {
      const settings = await SageSettings.getSettings()

      // Don't send the actual API key to the frontend
      ctx.body = {
        success: true,
        data: {
          isConfigured: settings.isConfigured(),
          isEnabled: settings.isEnabled,
          apiUrl: settings.apiUrl,
          companyId: settings.companyId,
          autoSyncEnabled: settings.autoSyncEnabled,
          syncFrequency: settings.syncFrequency,
          lastTestDate: settings.lastTestDate,
          lastTestSuccess: settings.lastTestSuccess,
          lastTestMessage: settings.lastTestMessage,
          lastSyncDate: settings.lastSyncDate,
          lastCustomersSync: settings.lastCustomersSync,
          lastInvoicesSync: settings.lastInvoicesSync,
          lastPaymentsSync: settings.lastPaymentsSync,
        },
      }
    } catch (error) {
      logger.error('Failed to get Sage settings', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/sage/settings
   * Update Sage configuration
   */
  static async updateSettings(ctx: Context) {
    const schema = Joi.object({
      apiKey: Joi.string().optional(),
      apiUrl: Joi.string().trim().optional(),
      companyId: Joi.string().trim().optional(),
      isEnabled: Joi.boolean().optional(),
      autoSyncEnabled: Joi.boolean().optional(),
      syncFrequency: Joi.string().valid('hourly', 'daily', 'weekly').optional(),
    })

    const { error, value } = schema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, 'VALIDATION_ERROR', error.details)
    }

    try {
      const settings = await SageSettings.getSettings()

      // Update API key if provided (will be encrypted)
      if (value.apiKey) {
        await settings.setApiKey(value.apiKey)
      }

      // Update other fields
      const updates: any = {}
      if (value.apiUrl !== undefined) updates.apiUrl = value.apiUrl
      if (value.companyId !== undefined) updates.companyId = value.companyId
      if (value.isEnabled !== undefined) updates.isEnabled = value.isEnabled
      if (value.autoSyncEnabled !== undefined) updates.autoSyncEnabled = value.autoSyncEnabled
      if (value.syncFrequency !== undefined) updates.syncFrequency = value.syncFrequency

      if (Object.keys(updates).length > 0) {
        await settings.update(updates)
      }

      ctx.body = {
        success: true,
        message: 'Sage settings updated successfully',
        data: {
          isConfigured: settings.isConfigured(),
          isEnabled: settings.isEnabled,
          apiUrl: settings.apiUrl,
          companyId: settings.companyId,
          autoSyncEnabled: settings.autoSyncEnabled,
          syncFrequency: settings.syncFrequency,
        },
      }

      logger.info('Sage settings updated', {
        userId: ctx.state.user?.id,
      })
    } catch (error) {
      logger.error('Failed to update Sage settings', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/sage/test-connection
   * Test connection to Sage API
   *
   * TODO: Implement actual Sage API connection test
   */
  static async testConnection(ctx: Context) {
    try {
      const settings = await SageSettings.getSettings()

      if (!settings.isConfigured()) {
        throw createError('Sage settings are not configured', 400, 'NOT_CONFIGURED')
      }

      // Create service instance and test connection
      const service = await SageService.fromSettings()
      const testResult = await service.testConnection()

      // Update test results in settings
      await settings.updateTestResults(testResult.success, testResult.message)

      ctx.body = {
        success: true,
        data: testResult,
      }

      logger.info('Sage connection test completed', {
        userId: ctx.state.user?.id,
        success: testResult.success,
      })
    } catch (error) {
      logger.error('Sage connection test failed', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })

      // Still update settings with failure
      try {
        const settings = await SageSettings.getSettings()
        await settings.updateTestResults(false, (error as Error).message)
      } catch (e) {
        // Ignore errors when updating test results
      }

      throw error
    }
  }

  /**
   * POST /api/sage/sync/customers
   * Manually trigger customer sync from Sage
   *
   * TODO: Implement actual Sage customer sync
   */
  static async syncCustomers(ctx: Context) {
    try {
      const service = await SageService.fromSettings()
      const result = await service.syncCustomers()

      const hasErrors = result.errors.length > 0

      ctx.body = {
        success: !hasErrors,
        message: hasErrors ? 'Customer sync completed with errors' : 'Customer sync completed successfully',
        data: result,
      }

      logger.info('Sage customer sync completed', {
        userId: ctx.state.user?.id,
        result,
      })
    } catch (error) {
      logger.error('Sage customer sync failed', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/sage/sync/invoices
   * Manually trigger invoice sync from Sage
   *
   * TODO: Implement actual Sage invoice sync
   */
  static async syncInvoices(ctx: Context) {
    try {
      const service = await SageService.fromSettings()
      const result = await service.syncInvoices()

      const hasErrors = result.errors.length > 0

      ctx.body = {
        success: !hasErrors,
        message: hasErrors ? 'Invoice sync completed with errors' : 'Invoice sync completed successfully',
        data: result,
      }

      logger.info('Sage invoice sync completed', {
        userId: ctx.state.user?.id,
        result,
      })
    } catch (error) {
      logger.error('Sage invoice sync failed', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/sage/sync/payments
   * Manually trigger payment sync from Sage
   *
   * TODO: Implement actual Sage payment sync
   */
  static async syncPayments(ctx: Context) {
    try {
      const service = await SageService.fromSettings()
      const result = await service.syncPayments()

      const hasErrors = result.errors.length > 0

      ctx.body = {
        success: !hasErrors,
        message: hasErrors ? 'Payment sync completed with errors' : 'Payment sync completed successfully',
        data: result,
      }

      logger.info('Sage payment sync completed', {
        userId: ctx.state.user?.id,
        result,
      })
    } catch (error) {
      logger.error('Sage payment sync failed', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/sage/sync/all
   * Manually trigger complete sync (customers, invoices, payments)
   *
   * TODO: Implement syncAll method in SageService
   * Call syncCustomers(), syncInvoices(), and syncPayments() sequentially
   */
  static async syncAll(ctx: Context) {
    try {
      const service = await SageService.fromSettings()

      // Call each sync method sequentially
      const customers = await service.syncCustomers()
      const invoices = await service.syncInvoices()
      const payments = await service.syncPayments()

      const results = { customers, invoices, payments }
      const hasErrors = customers.errors.length > 0 || invoices.errors.length > 0 || payments.errors.length > 0

      ctx.body = {
        success: !hasErrors,
        message: hasErrors ? 'Full sync completed with some errors' : 'Full sync completed successfully',
        data: results,
      }

      logger.info('Sage full sync completed', {
        userId: ctx.state.user?.id,
        results,
      })
    } catch (error) {
      logger.error('Sage full sync failed', {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }
}
