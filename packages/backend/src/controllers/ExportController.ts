import { Context } from "koa"
import { ExportService, ExportOptions } from "../services/ExportService"
import { UserRole } from "@medical-crm/shared"
import { User } from "../models"
import { logger } from "../utils/logger"

export class ExportController {
  /**
   * Common authentication and permission validation
   */
  private static async validateUserAndPermissions(ctx: Context, exportType: string): Promise<{ user: User; userId: string }> {
    const userId = ctx.state.user?.id
    if (!userId) {
      ctx.status = 401
      ctx.body = { error: "Authentication required" }
      throw new Error("Authentication required")
    }

    const user = await User.findByPk(userId)
    if (!user) {
      ctx.status = 404
      ctx.body = { error: "User not found" }
      throw new Error("User not found")
    }

    const hasPermission = await ExportService.checkExportPermissions(userId, exportType)
    if (!hasPermission) {
      ctx.status = 403
      ctx.body = { error: `Insufficient permissions to export ${exportType}` }
      throw new Error("Insufficient permissions")
    }

    return { user, userId }
  }

  /**
   * Common export options parsing
   */
  private static parseExportOptions(ctx: Context, user: User, additionalOptions: Partial<ExportOptions> = {}): ExportOptions {
    const baseOptions: ExportOptions = {
      format: (ctx.query.format as 'csv' | 'xlsx' | 'json') || 'csv',
      includeHeaders: ctx.query.includeHeaders !== 'false',
      dateRange: ctx.query.startDate && ctx.query.endDate ? {
        start: new Date(ctx.query.startDate as string),
        end: new Date(ctx.query.endDate as string),
      } : undefined,
      searchQuery: ctx.query.search as string,
      limit: ctx.query.limit ? parseInt(ctx.query.limit as string) : undefined,
      offset: ctx.query.offset ? parseInt(ctx.query.offset as string) : undefined,
      teamMemberIds: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TEAM_ADMIN 
        ? undefined
        : [user.id],
    }

    return { ...baseOptions, ...additionalOptions }
  }

  /**
   * Common response handling for export results
   */
  private static async handleExportResult(ctx: Context, result: any, options: ExportOptions, exportType: string) {
    if (!result.success) {
      ctx.status = 500
      ctx.body = { error: result.error }
      return
    }

    ctx.set('Content-Type', result.contentType || 'text/csv')
    ctx.set('Content-Disposition', `attachment; filename="${result.filename || exportType}.${options.format}"`)

    if (options.format === 'csv') {
      const content = ExportService.generateCSV(result.data || [], options.includeHeaders)
      ctx.body = content
    } else if (options.format === 'xlsx') {
      const content = await ExportService.generateXLSX(result.data || [], options.includeHeaders)
      ctx.body = content
    } else {
      const content = ExportService.generateJSON(result.data || [])
      ctx.body = content
    }
  }

  /**
   * Generic export handler
   */
  private static async handleExport(
    ctx: Context, 
    exportType: string, 
    exportFunction: (options: ExportOptions) => Promise<any>,
    additionalOptions: Partial<ExportOptions> = {}
  ) {
    try {
      const { user } = await this.validateUserAndPermissions(ctx, exportType)
      const options = this.parseExportOptions(ctx, user, additionalOptions)
      const result = await exportFunction(options)
      await this.handleExportResult(ctx, result, options, exportType)
    } catch (error) {
      if (ctx.status === 401 || ctx.status === 403 || ctx.status === 404) {
        return // Error already handled
      }
      logger.error(`Error in export${exportType}:`, { error })
      ctx.status = 500
      ctx.body = { error: 'Internal server error during export' }
    }
  }
  /**
   * Export medical institutions
   * GET /api/export/institutions
   */
  static async exportMedicalInstitutions(ctx: Context) {
    return this.handleExport(ctx, 'institutions', ExportService.exportMedicalInstitutions, {
      institutionType: ctx.query.type as string,
    })
  }

  /**
   * Export contacts
   * GET /api/export/contacts
   */
  static async exportContacts(ctx: Context) {
    return this.handleExport(ctx, 'contacts', ExportService.exportContacts)
  }

  /**
   * Export tasks
   * GET /api/export/tasks
   */
  static async exportTasks(ctx: Context) {
    return this.handleExport(ctx, 'tasks', ExportService.exportTasks, {
      taskStatus: ctx.query.status as string,
    })
  }

  /**
   * Export quotes
   * GET /api/export/quotes
   */
  static async exportQuotes(ctx: Context) {
    return this.handleExport(ctx, 'quotes', ExportService.exportQuotes, {
      quoteStatus: ctx.query.status as string,
    })
  }

  /**
   * Export invoices
   * GET /api/export/invoices
   */
  static async exportInvoices(ctx: Context) {
    return this.handleExport(ctx, 'invoices', ExportService.exportInvoices, {
      invoiceStatus: ctx.query.status as string,
    })
  }

/**
   * Queue export for large datasets
   * POST /api/export/queue
   */
  static async queueExport(ctx: Context) {
    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.status = 401
        ctx.body = { error: "Authentication required" }
        return
      }

      const user = await User.findByPk(userId)
      if (!user) {
        ctx.status = 404
        ctx.body = { error: "User not found" }
        return
      }

      const body = ctx.request.body as any
      const { exportType } = body

      // Check permissions
      const hasPermission = await ExportService.checkExportPermissions(userId, exportType)
      if (!hasPermission) {
        ctx.status = 403
        ctx.body = { error: `Insufficient permissions to export ${exportType}` }
        return
      }

      // Parse export options
      const exportOptions: ExportOptions = {
        ...body, // Spread the rest of the body options
        format: (body.format as 'csv' | 'xlsx' | 'json') || 'csv',
        includeHeaders: body.includeHeaders !== false,
        dateRange: body.startDate && body.endDate ? {
          start: new Date(body.startDate),
          end: new Date(body.endDate),
        } : undefined,
        searchQuery: body.search as string,
        limit: body.limit ? parseInt(body.limit) : undefined,
        offset: body.offset ? parseInt(body.offset) : undefined,
        useQueue: body.useQueue || false,
        teamMemberIds: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TEAM_ADMIN 
          ? undefined
          : [userId],
      }

      const result = await ExportService.queueExport(exportOptions, exportType)

      if (!result.success) {
        ctx.status = 500
        ctx.body = { error: result.error }
        return
      }

      // For queue system, would return job ID here
      ctx.body = {
        success: true,
        message: "Export queued successfully",
        jobId: "job-placeholder", // Would be real job ID from queue system
        estimatedRecords: result.totalRecords,
        downloadUrl: result.filename ? `/api/export/download/${result.filename}` : null
      }
    } catch (error) {
      logger.error('Error in queueExport:', { error })
      ctx.status = 500
      ctx.body = { error: 'Internal server error during export queuing' }
    }
  }

  /**
    * Get export job status
    * GET /api/export/status/:jobId
    */
  static async getExportStatus(ctx: Context) {
    try {
      const { jobId } = ctx.params

      const status = await ExportService.getExportStatus(jobId)

      ctx.body = {
        success: true,
        status
      }
    } catch (error) {
      logger.error('Error in getExportStatus:', { error })
      ctx.status = 500
      ctx.body = { error: 'Internal server error' }
    }
  }

  /**
    * Get export metadata (available formats, record counts, etc.)
    * GET /api/export/metadata
    */
  static async getExportMetadata(ctx: Context) {
    try {
      const userId = ctx.state.user?.id
      if (!userId) {
        ctx.status = 401
        ctx.body = { error: "Authentication required" }
        return
      }

      const user = await User.findByPk(userId)
      if (!user) {
        ctx.status = 404
        ctx.body = { error: "User not found" }
        return
      }

      // Return metadata about available exports
      ctx.body = {
        availableExports: [
          {
            type: 'institutions',
            name: 'Medical Institutions',
            description: 'Export medical institutions with profiles and contacts',
            formats: ['csv', 'xlsx', 'json'],
            permissions: await ExportService.checkExportPermissions(userId, 'institutions'),
          },
          {
            type: 'contacts',
            name: 'Contacts',
            description: 'Export contact persons with institution details',
            formats: ['csv', 'xlsx', 'json'],
            permissions: await ExportService.checkExportPermissions(userId, 'contacts'),
          },
          {
            type: 'tasks',
            name: 'Tasks',
            description: 'Export tasks with assignment and status details',
            formats: ['csv', 'xlsx', 'json'],
            permissions: await ExportService.checkExportPermissions(userId, 'tasks'),
          },
          {
            type: 'quotes',
            name: 'Quotes',
            description: 'Export quotes with line items and financial details',
            formats: ['csv', 'xlsx', 'json'],
            permissions: await ExportService.checkExportPermissions(userId, 'quotes'),
          },
          {
            type: 'invoices',
            name: 'Invoices',
            description: 'Export invoices with payments and financial details',
            formats: ['csv', 'xlsx', 'json'],
            permissions: await ExportService.checkExportPermissions(userId, 'invoices'),
          },
        ],
        formats: {
          csv: {
            name: 'CSV (Comma Separated Values)',
            description: 'Standard spreadsheet format compatible with Excel, Google Sheets, etc.',
            mimeType: 'text/csv',
          },
          xlsx: {
            name: 'Excel (XLSX)',
            description: 'Modern Excel format with advanced formatting support.',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          json: {
            name: 'JSON',
            description: 'Structured data format for programmatic processing.',
            mimeType: 'application/json',
          },
        },
      }
    } catch (error) {
      logger.error('Error in getExportMetadata:', { error })
      ctx.status = 500
      ctx.body = { error: 'Internal server error' }
    }
  }
}