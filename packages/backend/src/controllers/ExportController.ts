import { Context } from "koa"
import { ExportService, ExportOptions } from "../services/ExportService"
import { UserRole } from "@medical-crm/shared"
import { User } from "../models"

export class ExportController {
  /**
   * Export medical institutions
   * GET /api/export/institutions
   */
  static async exportMedicalInstitutions(ctx: Context) {
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

      // Check permissions
      const hasPermission = await ExportService.checkExportPermissions(userId, 'institutions')
      if (!hasPermission) {
        ctx.status = 403
        ctx.body = { error: "Insufficient permissions to export institutions" }
        return
      }

      // Parse export options from query
      const options: ExportOptions = {
        format: (ctx.query.format as 'csv' | 'xlsx' | 'json') || 'csv',
        includeHeaders: ctx.query.includeHeaders !== 'false',
        dateRange: ctx.query.startDate && ctx.query.endDate ? {
          start: new Date(ctx.query.startDate as string),
          end: new Date(ctx.query.endDate as string),
        } : undefined,
        searchQuery: ctx.query.search as string,
        institutionType: ctx.query.type as string,
        teamMemberIds: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TEAM_ADMIN 
          ? undefined // Team admins and super admins can see all team data
          : [userId], // Regular users can only see their own data
      }

      const result = await ExportService.exportMedicalInstitutions(options)

      if (!result.success) {
        ctx.status = 500
        ctx.body = { error: result.error }
        return
      }

      // Set response headers for file download
      ctx.set('Content-Type', result.contentType || 'text/csv')
      ctx.set('Content-Disposition', `attachment; filename="${result.filename || 'export'}.${options.format}"`)

      // Generate and send file content
      let content: string
      if (options.format === 'csv') {
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
      } else if (options.format === 'xlsx') {
        // For now, return CSV as XLSX would require additional library
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
        ctx.set('Content-Type', 'text/csv') // Override for now
      } else {
        content = ExportService.generateJSON(result.data || [])
      }

      ctx.body = content
    } catch (error) {
      console.error('Error in exportMedicalInstitutions:', error)
      ctx.status = 500
      ctx.body = { error: 'Internal server error during export' }
    }
  }

  /**
   * Export contacts
   * GET /api/export/contacts
   */
  static async exportContacts(ctx: Context) {
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

      // Check permissions
      const hasPermission = await ExportService.checkExportPermissions(userId, 'contacts')
      if (!hasPermission) {
        ctx.status = 403
        ctx.body = { error: "Insufficient permissions to export contacts" }
        return
      }

      // Parse export options from query
      const options: ExportOptions = {
        format: (ctx.query.format as 'csv' | 'xlsx' | 'json') || 'csv',
        includeHeaders: ctx.query.includeHeaders !== 'false',
        dateRange: ctx.query.startDate && ctx.query.endDate ? {
          start: new Date(ctx.query.startDate as string),
          end: new Date(ctx.query.endDate as string),
        } : undefined,
        searchQuery: ctx.query.search as string,
        teamMemberIds: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TEAM_ADMIN 
          ? undefined
          : [userId],
      }

      const result = await ExportService.exportContacts(options)

      if (!result.success) {
        ctx.status = 500
        ctx.body = { error: result.error }
        return
      }

      // Set response headers for file download
      ctx.set('Content-Type', result.contentType || 'text/csv')
      ctx.set('Content-Disposition', `attachment; filename="${result.filename || 'export'}.${options.format}"`)

      // Generate and send file content
      let content: string
      if (options.format === 'csv') {
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
      } else if (options.format === 'xlsx') {
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
        ctx.set('Content-Type', 'text/csv') // Override for now
      } else {
        content = ExportService.generateJSON(result.data || [])
      }

      ctx.body = content
    } catch (error) {
      console.error('Error in exportContacts:', error)
      ctx.status = 500
      ctx.body = { error: 'Internal server error during export' }
    }
  }

  /**
   * Export tasks
   * GET /api/export/tasks
   */
  static async exportTasks(ctx: Context) {
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

      // Check permissions
      const hasPermission = await ExportService.checkExportPermissions(userId, 'tasks')
      if (!hasPermission) {
        ctx.status = 403
        ctx.body = { error: "Insufficient permissions to export tasks" }
        return
      }

      // Parse export options from query
      const options: ExportOptions = {
        format: (ctx.query.format as 'csv' | 'xlsx' | 'json') || 'csv',
        includeHeaders: ctx.query.includeHeaders !== 'false',
        dateRange: ctx.query.startDate && ctx.query.endDate ? {
          start: new Date(ctx.query.startDate as string),
          end: new Date(ctx.query.endDate as string),
        } : undefined,
        searchQuery: ctx.query.search as string,
        taskStatus: ctx.query.status as string,
        teamMemberIds: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TEAM_ADMIN 
          ? undefined
          : [userId],
      }

      const result = await ExportService.exportTasks(options)

      if (!result.success) {
        ctx.status = 500
        ctx.body = { error: result.error }
        return
      }

      // Set response headers for file download
      ctx.set('Content-Type', result.contentType || 'text/csv')
      ctx.set('Content-Disposition', `attachment; filename="${result.filename || 'export'}.${options.format}"`)

      // Generate and send file content
      let content: string
      if (options.format === 'csv') {
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
      } else if (options.format === 'xlsx') {
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
        ctx.set('Content-Type', 'text/csv') // Override for now
      } else {
        content = ExportService.generateJSON(result.data || [])
      }

      ctx.body = content
    } catch (error) {
      console.error('Error in exportTasks:', error)
      ctx.status = 500
      ctx.body = { error: 'Internal server error during export' }
    }
  }

  /**
   * Export quotes
   * GET /api/export/quotes
   */
  static async exportQuotes(ctx: Context) {
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

      // Check permissions
      const hasPermission = await ExportService.checkExportPermissions(userId, 'quotes')
      if (!hasPermission) {
        ctx.status = 403
        ctx.body = { error: "Insufficient permissions to export quotes" }
        return
      }

      // Parse export options from query
      const options: ExportOptions = {
        format: (ctx.query.format as 'csv' | 'xlsx' | 'json') || 'csv',
        includeHeaders: ctx.query.includeHeaders !== 'false',
        dateRange: ctx.query.startDate && ctx.query.endDate ? {
          start: new Date(ctx.query.startDate as string),
          end: new Date(ctx.query.endDate as string),
        } : undefined,
        searchQuery: ctx.query.search as string,
        quoteStatus: ctx.query.status as string,
        teamMemberIds: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TEAM_ADMIN 
          ? undefined
          : [userId],
      }

      const result = await ExportService.exportQuotes(options)

      if (!result.success) {
        ctx.status = 500
        ctx.body = { error: result.error }
        return
      }

      // Set response headers for file download
      ctx.set('Content-Type', result.contentType || 'text/csv')
      ctx.set('Content-Disposition', `attachment; filename="${result.filename || 'export'}.${options.format}"`)

      // Generate and send file content
      let content: string
      if (options.format === 'csv') {
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
      } else if (options.format === 'xlsx') {
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
        ctx.set('Content-Type', 'text/csv') // Override for now
      } else {
        content = ExportService.generateJSON(result.data || [])
      }

      ctx.body = content
    } catch (error) {
      console.error('Error in exportQuotes:', error)
      ctx.status = 500
      ctx.body = { error: 'Internal server error during export' }
    }
  }

  /**
   * Export invoices
   * GET /api/export/invoices
   */
  static async exportInvoices(ctx: Context) {
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

      // Check permissions
      const hasPermission = await ExportService.checkExportPermissions(userId, 'invoices')
      if (!hasPermission) {
        ctx.status = 403
        ctx.body = { error: "Insufficient permissions to export invoices" }
        return
      }

      // Parse export options from query
      const options: ExportOptions = {
        format: (ctx.query.format as 'csv' | 'xlsx' | 'json') || 'csv',
        includeHeaders: ctx.query.includeHeaders !== 'false',
        dateRange: ctx.query.startDate && ctx.query.endDate ? {
          start: new Date(ctx.query.startDate as string),
          end: new Date(ctx.query.endDate as string),
        } : undefined,
        searchQuery: ctx.query.search as string,
        invoiceStatus: ctx.query.status as string,
        teamMemberIds: user.role === UserRole.SUPER_ADMIN || user.role === UserRole.TEAM_ADMIN 
          ? undefined
          : [userId],
      }

      const result = await ExportService.exportInvoices(options)

      if (!result.success) {
        ctx.status = 500
        ctx.body = { error: result.error }
        return
      }

      // Set response headers for file download
      ctx.set('Content-Type', result.contentType || 'text/csv')
      ctx.set('Content-Disposition', `attachment; filename="${result.filename || 'export'}.${options.format}"`)

      // Generate and send file content
      let content: string
      if (options.format === 'csv') {
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
      } else if (options.format === 'xlsx') {
        content = ExportService.generateCSV(result.data || [], options.includeHeaders)
        ctx.set('Content-Type', 'text/csv') // Override for now
      } else {
        content = ExportService.generateJSON(result.data || [])
      }

      ctx.body = content
    } catch (error) {
      console.error('Error in exportInvoices:', error)
      ctx.status = 500
      ctx.body = { error: 'Internal server error during export' }
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
      console.error('Error in getExportMetadata:', error)
      ctx.status = 500
      ctx.body = { error: 'Internal server error' }
    }
  }
}