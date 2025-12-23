import { Context } from 'koa'
import { ImportService } from '../services/ImportService'
import { logger } from '../utils/logger'

/**
 * ImportController - Handles Excel/CSV imports
 */
export class ImportController {
  /**
   * POST /api/import/contacts
   * Import contacts from Excel file
   */
  static async importContacts(ctx: Context): Promise<void> {
    try {
      const file = ctx.request.file

      if (!file) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: 'No file uploaded'
        }
        return
      }

      // Validate file type
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv'
      ]

      if (!allowedMimeTypes.includes(file.mimetype)) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV file.'
        }
        return
      }

      if (!ctx.state.user) {
        ctx.status = 401
        ctx.body = {
          success: false,
          error: 'Unauthorized'
        }
        return
      }

      const userId = ctx.state.user.id
      const importService = new ImportService()

      const result = await importService.importContacts(file, userId)

      ctx.status = 200
      ctx.body = {
        success: true,
        message: 'Import completed',
        data: {
          created: result.created,
          merged: result.merged,
          skipped: result.skipped,
          total: result.created + result.merged + result.skipped,
          errors: result.errors,
          warnings: result.warnings
        }
      }

      logger.info('Contacts import completed', {
        userId,
        fileName: file.originalname,
        result
      })
    } catch (error) {
      logger.error('Failed to import contacts', {
        error: (error as Error).message,
        stack: (error as Error).stack
      })

      ctx.status = 500
      ctx.body = {
        success: false,
        error: 'Failed to import contacts',
        message: (error as Error).message
      }
    }
  }

  /**
   * GET /api/import/contacts/template
   * Download Excel template for contacts import
   */
  static async downloadTemplate(ctx: Context): Promise<void> {
    try {
      if (!ctx.state.user) {
        ctx.status = 401
        ctx.body = {
          success: false,
          error: 'Unauthorized'
        }
        return
      }

      const importService = new ImportService()
      const templateBuffer = await importService.generateTemplate()

      ctx.status = 200
      ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      ctx.set('Content-Disposition', 'attachment; filename="contacts_import_template.xlsx"')
      ctx.body = templateBuffer

      logger.info('Template downloaded', {
        userId: ctx.state.user.id
      })
    } catch (error) {
      logger.error('Failed to generate template', {
        error: (error as Error).message
      })

      ctx.status = 500
      ctx.body = {
        success: false,
        error: 'Failed to generate template'
      }
    }
  }
}
