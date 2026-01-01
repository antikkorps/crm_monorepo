import ExcelJS from 'exceljs'
import { InstanceUpdateOptions, CreateOptions } from 'sequelize'
import { ContactPerson, ContactPersonAttributes } from '../models/ContactPerson'
import { MedicalInstitution } from '../models/MedicalInstitution'
import { logger } from '../utils/logger'
import type { File } from '@koa/multer'

/**
 * Extended options for sync/import operations on instances
 */
interface SyncInstanceUpdateOptions<T> extends InstanceUpdateOptions<T> {
  context?: { isSync: boolean }
}

interface SyncCreateOptions<T> extends CreateOptions<T> {
  context?: { isSync: boolean }
}

interface ImportContactRow {
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  title?: string
  department?: string
  institutionId?: string
  institutionName?: string
}

interface ImportResult {
  created: number
  merged: number
  skipped: number
  errors: Array<{ row: ImportContactRow; error: string }>
  warnings: Array<{ email: string; reason: string }>
}

/**
 * ImportService - Handles Excel/CSV imports with intelligent merge
 *
 * Rules:
 * - New contact → CREATE with dataSource='import'
 * - Existing + unlocked → MERGE (intelligent fusion)
 * - Existing + locked → SKIP (with warning)
 */
export class ImportService {
  /**
   * Import contacts from Excel file
   *
   * @param file - Excel file buffer
   * @param userId - User who triggered import
   * @returns Import statistics
   */
  async importContacts(
    file: File,
    userId: string
  ): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook()
    // @ts-ignore - Type mismatch between @koa/multer Buffer and Node Buffer
    await workbook.xlsx.load(file.buffer)

    const worksheet = workbook.worksheets[0]
    const rows: ImportContactRow[] = []

    // Read rows from worksheet (skip header row)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header

      const rowData: any = {}
      row.eachCell((cell, colNumber) => {
        const header = worksheet.getRow(1).getCell(colNumber).value as string
        rowData[header] = cell.value
      })
      rows.push(rowData)
    })

    const result: ImportResult = {
      created: 0,
      merged: 0,
      skipped: 0,
      errors: [],
      warnings: []
    }

    logger.info('Starting contacts import', {
      fileName: file.originalname,
      totalRows: rows.length,
      userId
    })

    for (const row of rows) {
      try {
        const email = row.email?.trim().toLowerCase()

        // Validation
        if (!email) {
          result.skipped++
          result.warnings.push({
            email: 'N/A',
            reason: 'Missing email'
          })
          continue
        }

        // Find existing contact by email
        const existing = await ContactPerson.findOne({
          where: { email }
        })

        if (existing) {
          // ============================================
          // 🔒 RÈGLE 1 : Contact LOCKED = SKIP
          // ============================================
          if (existing.isLocked) {
            result.skipped++
            result.warnings.push({
              email: existing.email,
              reason: `Contact locked (${existing.lockedReason}), cannot merge`
            })

            logger.info('Contact locked, skipping import', {
              contactId: existing.id,
              email: existing.email,
              lockedReason: existing.lockedReason
            })
            continue
          }

          // ============================================
          // ✅ RÈGLE 2 : Non-locked = MERGE intelligent
          // ============================================
          const mergedData = this.mergeContactData(existing, row, file.originalname, userId)

          // Update avec context sync pour éviter auto-lock
          const updateOptions: SyncInstanceUpdateOptions<ContactPersonAttributes> = {
            context: { isSync: true }
          }

          await existing.update(mergedData, updateOptions)

          result.merged++

          logger.info('Contact merged from Excel import', {
            contactId: existing.id,
            email: existing.email,
            originalSource: existing.dataSource,
            fieldsUpdated: this.getUpdatedFields(existing, mergedData)
          })
        } else {
          // ============================================
          // 🆕 RÈGLE 3 : Nouveau contact = CREATE
          // ============================================

          // Find institution if provided
          let institutionId = row.institutionId

          if (!institutionId && row.institutionName) {
            const institution = await MedicalInstitution.findOne({
              where: { name: row.institutionName }
            })
            institutionId = institution?.id
          }

          if (!institutionId) {
            result.errors.push({
              row,
              error: 'Institution not found (provide institutionId or institutionName)'
            })
            continue
          }

          const createOptions: SyncCreateOptions<ContactPersonAttributes> = {
            context: { isSync: true }
          }

          await ContactPerson.create({
            institutionId,
            firstName: row.firstName || 'Contact',
            lastName: row.lastName || 'Imported',
            email,
            phone: row.phone,
            title: row.title,
            department: row.department,
            isPrimary: false, // Imported contacts are not primary by default

            // Multi-source tracking
            dataSource: 'import',
            isLocked: false,
            externalData: {
              import: {
                source_file: file.originalname,
                import_date: new Date(),
                import_user_id: userId,
                original_data: row
              }
            },
            lastSyncAt: {
              import: new Date()
            }
          }, createOptions)

          result.created++

          logger.info('Contact created from Excel import', {
            email,
            institutionId
          })
        }
      } catch (error) {
        result.errors.push({
          row,
          error: (error as Error).message
        })

        logger.error('Failed to import contact', {
          row,
          error: (error as Error).message
        })
      }
    }

    logger.info('Import completed', {
      fileName: file.originalname,
      ...result
    })

    return result
  }

  /**
   * Merge existing contact data with imported data
   * Strategy: Choose best value (most complete)
   */
  private mergeContactData(
    existing: ContactPerson,
    imported: ImportContactRow,
    sourceFile: string,
    userId: string
  ): Partial<ContactPerson> {
    return {
      // Use chooseBestValue for each field
      firstName: this.chooseBestValue(existing.firstName, imported.firstName),
      lastName: this.chooseBestValue(existing.lastName, imported.lastName),
      phone: this.chooseBestValue(existing.phone, imported.phone),
      title: this.chooseBestValue(existing.title, imported.title),
      department: this.chooseBestValue(existing.department, imported.department),

      // dataSource NE CHANGE JAMAIS (provenance historique)
      // On garde existing.dataSource

      // Add import metadata to externalData
      externalData: {
        ...existing.externalData,
        import: {
          source_file: sourceFile,
          import_date: new Date(),
          import_user_id: userId,
          original_data: imported
        }
      },

      // Update last sync
      lastSyncAt: {
        ...existing.lastSyncAt,
        import: new Date()
      }
    }
  }

  /**
   * Choose best value between existing and new
   * Strategy:
   * - If only one has value → take it
   * - If both have value → take longest/most complete
   */
  private chooseBestValue(existingValue: string | undefined, newValue: string | undefined): string | undefined {
    // Si nouveau a une valeur et ancien non → prendre nouveau
    if (newValue && !existingValue) {
      return newValue
    }

    // Si ancien a une valeur et nouveau non → garder ancien
    if (existingValue && !newValue) {
      return existingValue
    }

    // Si les deux ont une valeur → prendre la plus longue/complète
    if (newValue && existingValue) {
      return newValue.length > existingValue.length ? newValue : existingValue
    }

    return existingValue
  }

  /**
   * Get list of fields that were updated
   */
  private getUpdatedFields(existing: ContactPerson, merged: Partial<ContactPerson>): string[] {
    const updated: string[] = []

    if (merged.firstName && merged.firstName !== existing.firstName) updated.push('firstName')
    if (merged.lastName && merged.lastName !== existing.lastName) updated.push('lastName')
    if (merged.phone && merged.phone !== existing.phone) updated.push('phone')
    if (merged.title && merged.title !== existing.title) updated.push('title')
    if (merged.department && merged.department !== existing.department) updated.push('department')

    return updated
  }

  /**
   * Generate Excel template for import
   */
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Contacts')

    // Add headers
    worksheet.columns = [
      { header: 'email', key: 'email', width: 30 },
      { header: 'firstName', key: 'firstName', width: 20 },
      { header: 'lastName', key: 'lastName', width: 20 },
      { header: 'phone', key: 'phone', width: 15 },
      { header: 'title', key: 'title', width: 25 },
      { header: 'department', key: 'department', width: 20 },
      { header: 'institutionId', key: 'institutionId', width: 40 },
      { header: 'institutionName', key: 'institutionName', width: 50 }
    ]

    // Add example row
    worksheet.addRow({
      email: 'exemple@hopital.fr',
      firstName: 'Jean',
      lastName: 'Dupont',
      phone: '0123456789',
      title: 'Directeur Médical',
      department: 'Direction',
      institutionId: 'uuid-de-institution',
      institutionName: 'Hôpital Exemple (optionnel si institutionId fourni)'
    })

    // Style header row
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}
