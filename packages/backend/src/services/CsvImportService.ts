import { ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import { ContactPerson, MedicalInstitution, MedicalProfile, User } from "../models"
import { logger } from "../utils/logger"

export interface CsvImportResult {
  success: boolean
  totalRows: number
  successfulImports: number
  failedImports: number
  duplicatesFound: number
  duplicatesMerged?: number
  importedInstitutions?: any[]
  errors: Array<{ row: number; field?: string; message: string }>
}

export interface CsvValidationResult {
  errors: Array<{ row: number; field?: string; message: string }>
  totalRows: number
  duplicatesFound: number
}

export interface CsvImportOptions {
  validateOnly?: boolean
  skipDuplicates?: boolean
  mergeDuplicates?: boolean
  assignedUserId?: string
}

interface ParsedRow {
  row: number
  data: Record<string, string>
  errors: Array<{ field?: string; message: string }>
}

export class CsvImportService {
  private static readonly REQUIRED_FIELDS = ["name", "type", "street", "city", "state", "zipCode", "country"]
  
  private static readonly FIELD_MAPPINGS: Record<string, string[]> = {
    name: ["name", "institution_name", "institutionName", "institution name"],
    type: ["type", "institution_type", "institutionType", "hospital type"],
    street: ["street", "address", "street_address", "street address"],
    city: ["city"],
    state: ["state", "province"],
    zipCode: ["zipCode", "zip_code", "postal_code", "zip", "zip code"],
    country: ["country"],
    bedCapacity: ["bedCapacity", "bed_capacity", "beds"],
    surgicalRooms: ["surgicalRooms", "surgical_rooms"],
    specialties: ["specialties", "medical_specialties"],
    departments: ["departments"],
    equipmentTypes: ["equipmentTypes", "equipment_types", "equipment"],
    certifications: ["certifications"],
    complianceStatus: ["complianceStatus", "compliance_status"],
    lastAuditDate: ["lastAuditDate", "last_audit_date", "audit_date"],
    complianceExpirationDate: ["complianceExpirationDate", "compliance_expiration_date", "expiration_date"],
    complianceNotes: ["complianceNotes", "compliance_notes"],
    tags: ["tags"],
    contactFirstName: ["contactFirstName", "contact_first_name", "first_name"],
    contactLastName: ["contactLastName", "contact_last_name", "last_name"],
    contactEmail: ["contactEmail", "contact_email", "email"],
    contactPhone: ["contactPhone", "contact_phone", "phone"],
    contactTitle: ["contactTitle", "contact_title", "title"],
    contactDepartment: ["contactDepartment", "contact_department"],
    contactIsPrimary: ["contactIsPrimary", "contact_is_primary", "is_primary"]
  }

  static async importMedicalInstitutions(
    csvData: string,
    options: CsvImportOptions = {}
  ): Promise<CsvImportResult> {
    try {
      logger.info("Starting CSV import", { options })

      // Parse CSV
      const parsedRows = this.parseCsv(csvData)
      const totalRows = parsedRows.length

      if (totalRows === 0) {
        return {
          success: true,
          totalRows: 0,
          successfulImports: 0,
          failedImports: 0,
          duplicatesFound: 0,
          errors: []
        }
      }

      // Validate rows
      const validatedRows = await this.validateRows(parsedRows)
      const validRows = validatedRows.filter(row => row.errors.length === 0)
      const invalidRows = validatedRows.filter(row => row.errors.length > 0)

      // Collect all errors
      const allErrors = invalidRows.flatMap(row => 
        row.errors.map(error => ({
          row: row.row,
          field: error.field,
          message: error.message
        }))
      )

      // If validation only, return results
      if (options.validateOnly) {
        return {
          success: allErrors.length === 0,
          totalRows,
          successfulImports: validRows.length,
          failedImports: invalidRows.length,
          duplicatesFound: 0,
          errors: allErrors
        }
      }

      // Process imports
      const importResult = await this.processImports(validRows, options)

      return {
        success: allErrors.length === 0 && importResult.failures.length === 0,
        totalRows,
        successfulImports: importResult.successes.length,
        failedImports: invalidRows.length + importResult.failures.length,
        duplicatesFound: importResult.duplicatesFound,
        duplicatesMerged: importResult.duplicatesMerged,
        importedInstitutions: importResult.importedInstitutions,
        errors: [...allErrors, ...importResult.failures.map(f => ({
          row: f.row,
          message: f.error
        }))]
      }

    } catch (error) {
      logger.error("CSV import failed", { error: (error as Error).message })
      return {
        success: false,
        totalRows: 0,
        successfulImports: 0,
        failedImports: 0,
        duplicatesFound: 0,
        errors: [{ row: 0, message: `Import failed: ${(error as Error).message}` }]
      }
    }
  }

  private static parseCsv(csvData: string): ParsedRow[] {
    const lines = csvData.trim().split('\n')
    if (lines.length <= 1) {
      return []
    }

    const headers = lines[0].split(',').map(h => h.trim())
    const rows: ParsedRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i])
      const data: Record<string, string> = {}
      
      // Map headers to standardized field names
      headers.forEach((header, index) => {
        const value = values[index] || ''
        const standardField = this.getStandardFieldName(header)
        if (standardField) {
          data[standardField] = value.trim()
        }
      })

      rows.push({
        row: i + 1,
        data,
        errors: []
      })
    }

    return rows
  }

  private static parseCsvLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current)
    return result
  }

  private static getStandardFieldName(header: string): string | null {
    const normalizedHeader = header.toLowerCase().trim()
    
    for (const [standardField, variations] of Object.entries(this.FIELD_MAPPINGS)) {
      if (variations.some(variation => variation.toLowerCase() === normalizedHeader)) {
        return standardField
      }
    }
    
    return null
  }

  private static async validateRows(rows: ParsedRow[]): Promise<ParsedRow[]> {
    return rows.map(row => {
      const errors: Array<{ field?: string; message: string }> = []

      // Check required fields
      for (const field of this.REQUIRED_FIELDS) {
        if (!row.data[field] || row.data[field].trim() === '') {
          errors.push({
            field,
            message: `${field} is required`
          })
        }
      }

      // Validate institution type
      if (row.data.type && !Object.values(InstitutionType).includes(row.data.type as InstitutionType)) {
        errors.push({
          field: 'type',
          message: `Invalid institution type: ${row.data.type}`
        })
      }

      // Validate numeric fields
      if (row.data.bedCapacity && isNaN(Number(row.data.bedCapacity))) {
        errors.push({
          field: 'bedCapacity',
          message: 'bedCapacity must be a number'
        })
      }

      if (row.data.surgicalRooms && isNaN(Number(row.data.surgicalRooms))) {
        errors.push({
          field: 'surgicalRooms',
          message: 'surgicalRooms must be a number'
        })
      }

      // Validate dates
      if (row.data.lastAuditDate && !this.isValidDate(row.data.lastAuditDate)) {
        errors.push({
          field: 'lastAuditDate',
          message: 'lastAuditDate must be a valid date (YYYY-MM-DD)'
        })
      }

      if (row.data.complianceExpirationDate && !this.isValidDate(row.data.complianceExpirationDate)) {
        errors.push({
          field: 'complianceExpirationDate',
          message: 'complianceExpirationDate must be a valid date (YYYY-MM-DD)'
        })
      }

      // Validate email
      if (row.data.contactEmail && !this.isValidEmail(row.data.contactEmail)) {
        errors.push({
          field: 'contactEmail',
          message: 'Invalid email format'
        })
      }

      // Validate compliance status
      if (row.data.complianceStatus && !Object.values(ComplianceStatus).includes(row.data.complianceStatus as ComplianceStatus)) {
        errors.push({
          field: 'complianceStatus',
          message: `Invalid compliance status: ${row.data.complianceStatus}`
        })
      }

      return {
        ...row,
        errors
      }
    })
  }

  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private static async processImports(rows: ParsedRow[], options: CsvImportOptions) {
    const successes: any[] = []
    const failures: Array<{ row: number; error: string }> = []
    const importedInstitutions: any[] = []
    let duplicatesFound = 0
    let duplicatesMerged = 0

    for (const row of rows) {
      try {
        // Check for duplicates
        const existingInstitution = await this.findDuplicateInstitution(row.data)
        
        if (existingInstitution) {
          duplicatesFound++
          
          if (options.skipDuplicates) {
            continue
          } else if (options.mergeDuplicates) {
            await this.mergeInstitution(existingInstitution, row.data)
            duplicatesMerged++
            successes.push(existingInstitution)
            importedInstitutions.push(existingInstitution)
            continue
          }
        }

        // Create new institution
        const institution = await this.createInstitution(row.data, options.assignedUserId)
        successes.push(institution)
        importedInstitutions.push(institution)

      } catch (error) {
        failures.push({
          row: row.row,
          error: (error as Error).message
        })
      }
    }

    return {
      successes,
      failures,
      importedInstitutions,
      duplicatesFound,
      duplicatesMerged
    }
  }

  private static async findDuplicateInstitution(data: Record<string, string>): Promise<MedicalInstitution | null> {
    // Check for duplicate by name and address
    // In test environment, use simpler approach to avoid JSONB operator issues
    if (process.env.NODE_ENV === 'test') {
      const allInstitutions = await MedicalInstitution.findAll({
        where: { name: data.name }
      })
      
      return allInstitutions.find(inst => {
        const address = inst.address || inst.getDataValue('address')
        return address?.street === data.street && address?.city === data.city
      }) || null
    }
    
    // In production, use JSONB operators
    return await MedicalInstitution.findOne({
      where: {
        name: data.name,
        'address.street': data.street,
        'address.city': data.city
      }
    })
  }

  private static async mergeInstitution(existing: MedicalInstitution, data: Record<string, string>): Promise<void> {
    // Update institution with new data
    const currentName = existing.name || existing.getDataValue('name')
    const currentType = existing.type || existing.getDataValue('type')
    const currentAddress = existing.address || existing.getDataValue('address')
    const currentTags = existing.tags || existing.getDataValue('tags')
    
    await existing.update({
      name: data.name || currentName,
      type: data.type || currentType,
      address: {
        ...currentAddress,
        street: data.street || currentAddress.street,
        city: data.city || currentAddress.city,
        state: data.state || currentAddress.state,
        zipCode: data.zipCode || currentAddress.zipCode,
        country: data.country || currentAddress.country
      },
      tags: data.tags ? data.tags.split(',').map(t => t.trim()) : currentTags
    })
    
    // Update medical profile if medical data exists
    if (data.bedCapacity || data.surgicalRooms || data.specialties || data.departments || data.equipmentTypes || data.certifications || data.complianceStatus) {
      const institutionId = existing.id || existing.getDataValue('id')
      const existingProfile = await MedicalProfile.findOne({ where: { institutionId } })
      
      if (existingProfile) {
        // Update existing medical profile
        await existingProfile.update({
          bedCapacity: data.bedCapacity ? parseInt(data.bedCapacity) : existingProfile.getDataValue('bedCapacity'),
          surgicalRooms: data.surgicalRooms ? parseInt(data.surgicalRooms) : existingProfile.getDataValue('surgicalRooms'),
          specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()) : existingProfile.getDataValue('specialties'),
          departments: data.departments ? data.departments.split(',').map(d => d.trim()) : existingProfile.getDataValue('departments'),
          equipmentTypes: data.equipmentTypes ? data.equipmentTypes.split(',').map(e => e.trim()) : existingProfile.getDataValue('equipmentTypes'),
          certifications: data.certifications ? data.certifications.split(',').map(c => c.trim()) : existingProfile.getDataValue('certifications'),
          complianceStatus: data.complianceStatus || existingProfile.getDataValue('complianceStatus'),
          lastAuditDate: data.lastAuditDate ? new Date(data.lastAuditDate) : existingProfile.getDataValue('lastAuditDate'),
          complianceExpirationDate: data.complianceExpirationDate ? new Date(data.complianceExpirationDate) : existingProfile.getDataValue('complianceExpirationDate'),
          complianceNotes: data.complianceNotes || existingProfile.getDataValue('complianceNotes')
        })
      } else {
        // Create new medical profile
        await MedicalProfile.create({
          institutionId,
          bedCapacity: data.bedCapacity ? parseInt(data.bedCapacity) : undefined,
          surgicalRooms: data.surgicalRooms ? parseInt(data.surgicalRooms) : undefined,
          specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()) : [],
          departments: data.departments ? data.departments.split(',').map(d => d.trim()) : [],
          equipmentTypes: data.equipmentTypes ? data.equipmentTypes.split(',').map(e => e.trim()) : [],
          certifications: data.certifications ? data.certifications.split(',').map(c => c.trim()) : [],
          complianceStatus: data.complianceStatus as ComplianceStatus || ComplianceStatus.PENDING_REVIEW,
          lastAuditDate: data.lastAuditDate ? new Date(data.lastAuditDate) : undefined,
          complianceExpirationDate: data.complianceExpirationDate ? new Date(data.complianceExpirationDate) : undefined,
          complianceNotes: data.complianceNotes
        })
      }
    }
  }

  private static async createInstitution(data: Record<string, string>, assignedUserId?: string): Promise<MedicalInstitution> {
    // Create institution
    const institution = await MedicalInstitution.create({
      name: data.name,
      type: data.type as InstitutionType,
      address: {
        street: data.street,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country
      },
      tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
      assignedUserId
    })

    // Create medical profile if relevant data exists
    if (data.bedCapacity || data.surgicalRooms || data.specialties) {
      const institutionId = institution.id || institution.getDataValue('id') || (institution as any).dataValues?.id
      
      if (!institutionId) {
        throw new Error('Institution ID is required for MedicalProfile creation')
      }
      
      const medicalProfile = await MedicalProfile.create({
        institutionId,
        bedCapacity: data.bedCapacity ? parseInt(data.bedCapacity) : undefined,
        surgicalRooms: data.surgicalRooms ? parseInt(data.surgicalRooms) : undefined,
        specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()) : [],
        departments: data.departments ? data.departments.split(',').map(d => d.trim()) : [],
        equipmentTypes: data.equipmentTypes ? data.equipmentTypes.split(',').map(e => e.trim()) : [],
        certifications: data.certifications ? data.certifications.split(',').map(c => c.trim()) : [],
        complianceStatus: data.complianceStatus as ComplianceStatus || ComplianceStatus.PENDING_REVIEW,
        lastAuditDate: data.lastAuditDate ? new Date(data.lastAuditDate) : undefined,
        complianceExpirationDate: data.complianceExpirationDate ? new Date(data.complianceExpirationDate) : undefined,
        complianceNotes: data.complianceNotes
      })
    }

    // Create contact person if contact data exists
    if (data.contactFirstName || data.contactLastName) {
      const institutionId = institution.id || institution.getDataValue('id') || (institution as any).dataValues?.id
      
      await ContactPerson.create({
        institutionId,
        firstName: data.contactFirstName || '',
        lastName: data.contactLastName || '',
        email: data.contactEmail,
        phone: data.contactPhone,
        title: data.contactTitle,
        department: data.contactDepartment,
        isPrimary: data.contactIsPrimary === 'true' || data.contactIsPrimary === '1' || !data.contactIsPrimary
      })
    }

    return institution
  }

  static async validateCsvData(csvData: string): Promise<CsvValidationResult> {
    const parsedRows = this.parseCsv(csvData)
    const validatedRows = await this.validateRows(parsedRows)
    
    const errors = validatedRows.flatMap(row => 
      row.errors.map(error => ({
        row: row.row,
        field: error.field,
        message: error.message
      }))
    )

    return {
      errors,
      totalRows: parsedRows.length,
      duplicatesFound: 0 // Would need to implement duplicate detection for validation
    }
  }

  static generateCsvTemplate(): string {
    const headers = [
      'name', 'type', 'street', 'city', 'state', 'zipCode', 'country',
      'bedCapacity', 'surgicalRooms', 'specialties', 'departments', 
      'equipmentTypes', 'certifications', 'complianceStatus',
      'lastAuditDate', 'complianceExpirationDate', 'complianceNotes', 'tags',
      'contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone',
      'contactTitle', 'contactDepartment', 'contactIsPrimary'
    ].join(',')

    const exampleRow = [
      'General Hospital', 'hospital', '123 Medical Center Dr', 'Healthcare City', 'CA', '90210', 'US',
      '150', '8', 'cardiology,neurology', 'emergency,icu',
      'mri,ct_scan', 'jcaho,iso_9001', 'compliant',
      '2024-01-15', '2025-01-15', 'All requirements met', 'cardiology,emergency',
      'John', 'Doe', 'john.doe@hospital.com', '+1234567890',
      'Chief Medical Officer', 'Administration', 'true'
    ].join(',')

    return `${headers}\n${exampleRow}`
  }
}
