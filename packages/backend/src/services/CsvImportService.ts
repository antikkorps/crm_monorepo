import { CommercialStatus, ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import { ContactPerson, MedicalInstitution, MedicalProfile } from "../models"
import { logger } from "../utils/logger"
import { CsvMatchingService, type MatchInput } from "./CsvMatchingService"
import { DigiformaService } from "./DigiformaService"

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

export interface CsvPreviewRow {
  rowNumber: number
  name: string
  accountingNumber?: string
  city?: string
  matchStatus: 'exact' | 'fuzzy' | 'none'
  matchConfidence?: number
  matchType?: string
  existingInstitutionId?: string
  existingInstitutionName?: string
  sageStatus: 'linked' | 'not_linked'
  hasErrors: boolean
  errors: Array<{ field?: string; message: string }>
}

export interface CsvPreviewResult {
  totalRows: number
  validRows: number
  invalidRows: number
  preview: CsvPreviewRow[]
  errors: Array<{ row: number; field?: string; message: string }>
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
    name: ["name", "institution_name", "institutionName", "institution name", "nom", "nom_etablissement", "raison_sociale"],
    type: ["type", "institution_type", "institutionType", "hospital type", "type_institution", "type_etablissement"],
    // Expected format: alphanumeric code (e.g., "CLI001", "C12345") matching the accounting system's customer/client number
    // This is the PRIMARY matching key across Sage, CSV, Digiforma, and CRM
    accountingNumber: ["accountingNumber", "accounting_number", "numero_client", "client_number", "numero_comptable", "code_comptable", "accounting_id"],
    street: ["street", "address", "street_address", "street address", "adresse", "rue"],
    city: ["city", "ville"],
    state: ["state", "province", "etat", "departement", "département"],
    zipCode: ["zipCode", "zip_code", "postal_code", "zip", "zip code", "code_postal", "code postal"],
    country: ["country", "pays"],
    bedCapacity: ["bedCapacity", "bed_capacity", "beds", "capacite_lits", "capacité_lits", "nb_lits"],
    surgicalRooms: ["surgicalRooms", "surgical_rooms", "salles_operation", "salles_operatoires", "salles d'opération"],
    specialties: ["specialties", "medical_specialties", "specialites", "spécialités"],
    departments: ["departments", "departements", "départements", "services"],
    equipmentTypes: ["equipmentTypes", "equipment_types", "equipment", "types_equipements", "equipements", "équipements"],
    certifications: ["certifications"],
    complianceStatus: ["complianceStatus", "compliance_status", "statut_conformite", "statut conformité"],
    lastAuditDate: ["lastAuditDate", "last_audit_date", "audit_date", "date_dernier_audit", "date dernier audit"],
    complianceExpirationDate: ["complianceExpirationDate", "compliance_expiration_date", "expiration_date", "date_expiration_conformite", "date expiration conformité"],
    complianceNotes: ["complianceNotes", "compliance_notes", "notes_conformite", "notes conformité"],
    tags: ["tags", "etiquettes", "étiquettes"],
    contactFirstName: ["contactFirstName", "contact_first_name", "first_name", "prenom_contact", "prénom_contact", "prenom", "prénom"],
    contactLastName: ["contactLastName", "contact_last_name", "last_name", "nom_contact", "nom"],
    contactEmail: ["contactEmail", "contact_email", "email", "email_contact", "courriel_contact"],
    contactPhone: ["contactPhone", "contact_phone", "phone", "telephone_contact", "téléphone_contact", "telephone", "téléphone"],
    contactTitle: ["contactTitle", "contact_title", "title", "fonction_contact", "titre_contact"],
    contactDepartment: ["contactDepartment", "contact_department", "departement_contact", "département_contact", "service_contact"],
    contactIsPrimary: ["contactIsPrimary", "contact_is_primary", "is_primary", "contact_principal", "est_principal", "principal"],
    // Commercial fields
    finess: ["finess", "numero_finess", "n_finess", "finess_number"],
    groupName: ["groupName", "group_name", "groupe", "nom_groupe", "group"],
    commercialStatus: ["commercialStatus", "commercial_status", "statut", "type_client", "prospect_client", "statut_commercial"],
    mainPhone: ["mainPhone", "main_phone", "standard", "telephone_standard", "téléphone_standard", "tel_standard"],
    // Medical profile activity fields
    staffCount: ["staffCount", "staff_count", "nombre_agents", "nb_agents", "effectif", "personnel"],
    endoscopyRooms: ["endoscopyRooms", "endoscopy_rooms", "salles_endo", "salle_endo", "salles_endoscopie", "nb_salles_endo"],
    surgicalInterventions: ["surgicalInterventions", "surgical_interventions", "nb_inter_chir", "interventions_chir", "interventions_chirurgicales"],
    endoscopyInterventions: ["endoscopyInterventions", "endoscopy_interventions", "nb_inter_endo", "interventions_endo", "interventions_endoscopie"]
  }

  static getMedicalInstitutionTemplate(): string {
    return [
      "name,type,street,city,state,zipCode,country,accountingNumber,bedCapacity,surgicalRooms,specialties,contactFirstName,contactLastName,contactEmail,contactPhone,contactTitle,contactIsPrimary",
      "Hôpital Saint-Louis,PUBLIC_HOSPITAL,1 Avenue Claude Vellefaux,Paris,Île-de-France,75010,France,CLI001,650,25,Dermatologie;Hématologie,Jean,Dupont,jean.dupont@aphp.fr,0142494949,Directeur,true",
      "Clinique des Lilas,PRIVATE_CLINIC,41 Avenue du Maréchal Juin,Les Lilas,Île-de-France,93260,France,CLI002,120,8,Orthopédie,Marie,Martin,marie.martin@cliniquelilas.fr,0143622222,Cadre de santé,true"
    ].join("\n")
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

    // Auto-detect delimiter: if more semicolons than commas in header, use semicolon
    const firstLine = lines[0]
    const commaCount = (firstLine.match(/,/g) || []).length
    const semicolonCount = (firstLine.match(/;/g) || []).length
    const delimiter = semicolonCount > commaCount ? ';' : ','

    logger.info(`CSV delimiter detected: "${delimiter}" (commas: ${commaCount}, semicolons: ${semicolonCount})`)

    const headers = this.parseCsvLine(firstLine, delimiter).map(h => h.trim())
    const rows: ParsedRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i], delimiter)
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

  private static parseCsvLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
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

      // Validate FINESS number (exactly 9 digits)
      if (row.data.finess && !/^\d{9}$/.test(row.data.finess)) {
        errors.push({
          field: 'finess',
          message: 'FINESS must be exactly 9 digits'
        })
      }

      // Validate commercial status
      if (row.data.commercialStatus && !Object.values(CommercialStatus).includes(row.data.commercialStatus as CommercialStatus)) {
        errors.push({
          field: 'commercialStatus',
          message: `Invalid commercial status: ${row.data.commercialStatus}. Must be 'prospect' or 'client'`
        })
      }

      // Validate numeric activity fields
      if (row.data.staffCount && isNaN(Number(row.data.staffCount))) {
        errors.push({
          field: 'staffCount',
          message: 'staffCount must be a number'
        })
      }

      if (row.data.endoscopyRooms && isNaN(Number(row.data.endoscopyRooms))) {
        errors.push({
          field: 'endoscopyRooms',
          message: 'endoscopyRooms must be a number'
        })
      }

      if (row.data.surgicalInterventions && isNaN(Number(row.data.surgicalInterventions))) {
        errors.push({
          field: 'surgicalInterventions',
          message: 'surgicalInterventions must be a number'
        })
      }

      if (row.data.endoscopyInterventions && isNaN(Number(row.data.endoscopyInterventions))) {
        errors.push({
          field: 'endoscopyInterventions',
          message: 'endoscopyInterventions must be a number'
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

    // Initialize Digiforma service once for all rows (performance optimization)
    const digiformaToken = process.env.DIGIFORMA_BEARER_TOKEN
    const digiformaEnabled = digiformaToken && process.env.DIGIFORMA_INTEGRATION_ENABLED === 'true'
    const digiformaService = digiformaEnabled ? new DigiformaService(digiformaToken!) : null

    for (const row of rows) {
      try {
        // Check for duplicates
        const existingInstitution = await this.findDuplicateInstitution(row.data, digiformaService)
        
        if (existingInstitution) {
          duplicatesFound++

          // When a duplicate institution is found, we may still want to add/update contacts from this row
          const hasContactData = !!(row.data.contactFirstName || row.data.contactLastName || row.data.contactEmail || row.data.contactPhone)

          if (options.mergeDuplicates) {
            await this.mergeInstitution(existingInstitution, row.data)
            // Upsert contact if present
            if (hasContactData) {
              await this.upsertContact(existingInstitution, row.data, true)
            }
            duplicatesMerged++
            successes.push(existingInstitution)
            importedInstitutions.push(existingInstitution)
            continue
          }

          if (options.skipDuplicates) {
            // Skip creating a new institution but still append contact if provided
            if (hasContactData) {
              await this.upsertContact(existingInstitution, row.data, false)
              successes.push(existingInstitution)
              importedInstitutions.push(existingInstitution)
            }
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

  private static async upsertContact(institution: MedicalInstitution, data: Record<string, string>, allowUpdate: boolean): Promise<void> {
    const institutionId = institution.id || institution.getDataValue('id')
    if (!institutionId) return

    const { ContactPerson } = await import('../models')

    // Define a simple duplicate strategy: prefer email, fallback to (firstName+lastName+phone)
    let existing: any = null
    if (data.contactEmail) {
      existing = await ContactPerson.findOne({ where: { institutionId, email: data.contactEmail } })
    }
    if (!existing && (data.contactFirstName || data.contactLastName) && data.contactPhone) {
      existing = await ContactPerson.findOne({
        where: {
          institutionId,
          firstName: data.contactFirstName || '',
          lastName: data.contactLastName || '',
          phone: data.contactPhone,
        },
      })
    }

    // Normalize isPrimary
    const isPrimary = data.contactIsPrimary === 'true' || data.contactIsPrimary === '1' || (!data.contactIsPrimary ? false : false)

    if (existing) {
      if (allowUpdate) {
        await existing.update({
          firstName: data.contactFirstName || existing.getDataValue('firstName'),
          lastName: data.contactLastName || existing.getDataValue('lastName'),
          email: data.contactEmail || existing.getDataValue('email'),
          phone: data.contactPhone || existing.getDataValue('phone'),
          title: data.contactTitle || existing.getDataValue('title'),
          department: data.contactDepartment || existing.getDataValue('department'),
          isPrimary: typeof data.contactIsPrimary !== 'undefined' ? isPrimary : existing.getDataValue('isPrimary'),
        })
      }
      return
    }

    // Create new contact
    await ContactPerson.create({
      institutionId,
      firstName: data.contactFirstName || '',
      lastName: data.contactLastName || '',
      email: data.contactEmail,
      phone: data.contactPhone,
      title: data.contactTitle,
      department: data.contactDepartment,
      isPrimary,
    })
  }

  private static async findDuplicateInstitution(
    data: Record<string, string>,
    digiformaService: DigiformaService | null = null
  ): Promise<MedicalInstitution | null> {
    // Multi-criteria matching strategy:
    // 1. Priority 1: Digiforma accountingNumber match (if available)
    // 2. Priority 2: Digiforma name + city match (if available)
    // 3. Priority 3: Local database name + address match

    if (digiformaService) {
      try {

        // Priority 1: Search by accountingNumber (PRIMARY matching method)
        if (data.accountingNumber) {
          logger.info('CSV Import: Searching Digiforma by accountingNumber', {
            accountingNumber: data.accountingNumber,
            institutionName: data.name
          })

          const digiformaCompany = await digiformaService.searchCompanyByAccountingNumber(
            data.accountingNumber
          )

          if (digiformaCompany) {
            logger.info('CSV Import: Found match in Digiforma by accountingNumber', {
              accountingNumber: data.accountingNumber,
              digiformaId: digiformaCompany.id,
              digiformaName: digiformaCompany.name
            })

            // Check if this Digiforma company already exists in local CRM
            // Search by digiformaId (Digiforma company ID stored in CRM)
            const localInstitution = await MedicalInstitution.findOne({
              where: { digiformaId: digiformaCompany.id }
            })

            if (localInstitution) {
              logger.info('CSV Import: Found existing CRM institution linked to Digiforma', {
                crmId: localInstitution.id,
                digiformaId: digiformaCompany.id
              })
              return localInstitution
            }

            // Institution exists in Digiforma but not in CRM - not a duplicate, will be created
            logger.info('CSV Import: Digiforma company exists but not yet in CRM', {
              digiformaId: digiformaCompany.id,
              digiformaName: digiformaCompany.name
            })
            return null
          }

          logger.info('CSV Import: No match found in Digiforma by accountingNumber', {
            accountingNumber: data.accountingNumber
          })
        }

        // Priority 2: Search by name + city as fallback
        if (data.name && data.city) {
          logger.info('CSV Import: Searching Digiforma by name and city', {
            name: data.name,
            city: data.city
          })

          const digiformaCompany = await digiformaService.searchCompanyByName(
            data.name,
            data.city
          )

          if (digiformaCompany) {
            logger.info('CSV Import: Found match in Digiforma by name+city', {
              digiformaId: digiformaCompany.id,
              digiformaName: digiformaCompany.name,
              digiformaAccountingNumber: digiformaCompany.accountingNumber
            })

            // Check if exists in local CRM
            const localInstitution = await MedicalInstitution.findOne({
              where: { digiformaId: digiformaCompany.id }
            })

            if (localInstitution) {
              logger.info('CSV Import: Found existing CRM institution linked to Digiforma', {
                crmId: localInstitution.id,
                digiformaId: digiformaCompany.id
              })
              return localInstitution
            }

            return null
          }

          logger.info('CSV Import: No match found in Digiforma by name+city', {
            name: data.name,
            city: data.city
          })
        }
      } catch (error) {
        // Log Digiforma errors but don't fail import - fall back to local search
        logger.warn('CSV Import: Digiforma search failed, falling back to local search', {
          error: (error as Error).message,
          institutionName: data.name
        })
      }
    }

    // Priority 3: Local database search using smart multi-criteria matching
    // Use CsvMatchingService for sophisticated matching with fuzzy logic
    logger.info('CSV Import: Performing local database search with multi-criteria matching', {
      name: data.name,
      accountingNumber: data.accountingNumber,
      city: data.city
    })

    const matchInput: MatchInput = {
      name: data.name,
      accountingNumber: data.accountingNumber,
      address: {
        street: data.street,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country
      }
    }

    const matchResult = await CsvMatchingService.findBestMatch(matchInput)

    if (matchResult.matched) {
      logger.info('CSV Import: Found local match', {
        matchType: matchResult.matchType,
        confidence: matchResult.confidence,
        institutionId: matchResult.institution!.id,
        institutionName: matchResult.institution!.name,
        details: matchResult.details
      })

      // Log suggestions for manual review if confidence is not 100%
      if (matchResult.confidence < 100 && matchResult.suggestions && matchResult.suggestions.length > 0) {
        logger.info('CSV Import: Alternative matches available for manual review', {
          primaryMatch: {
            id: matchResult.institution!.id,
            name: matchResult.institution!.name,
            confidence: matchResult.confidence
          },
          suggestions: matchResult.suggestions.map(s => ({
            id: s.id,
            name: s.name
          }))
        })
      }

      return matchResult.institution!
    }

    logger.info('CSV Import: No match found in local database', {
      name: data.name,
      city: data.city,
      suggestionCount: matchResult.suggestions?.length || 0
    })

    // Log potential suggestions for the user to review
    if (matchResult.suggestions && matchResult.suggestions.length > 0) {
      logger.info('CSV Import: Potential matches found but below confidence threshold', {
        inputName: data.name,
        inputCity: data.city,
        suggestions: matchResult.suggestions.map(s => ({
          id: s.id,
          name: s.name,
          city: (s.address as any)?.city
        }))
      })
    }

    return null
  }

  private static async mergeInstitution(existing: MedicalInstitution, data: Record<string, string>): Promise<void> {
    // Update institution with new data
    const currentName = existing.name || existing.getDataValue('name')
    const currentType = existing.type || existing.getDataValue('type')
    const currentAddress = existing.address || existing.getDataValue('address')
    const currentTags = existing.tags || existing.getDataValue('tags')

      await existing.update({
        name: data.name || currentName,
        type: (data.type as unknown as InstitutionType) || currentType,
      address: {
        ...currentAddress,
        street: data.street || currentAddress.street,
        city: data.city || currentAddress.city,
        state: data.state || currentAddress.state,
        zipCode: data.zipCode || currentAddress.zipCode,
        country: data.country || currentAddress.country
      },
      tags: data.tags ? data.tags.split(',').map(t => t.trim()) : currentTags,
      // Commercial fields
      finess: data.finess || existing.getDataValue('finess'),
      groupName: data.groupName || existing.getDataValue('groupName'),
      commercialStatus: (data.commercialStatus as CommercialStatus) || existing.getDataValue('commercialStatus'),
      mainPhone: data.mainPhone || existing.getDataValue('mainPhone')
    })
    
    // Update medical profile if medical data exists
    const hasMedicalData = data.bedCapacity || data.surgicalRooms || data.specialties || data.departments ||
      data.equipmentTypes || data.certifications || data.complianceStatus ||
      data.staffCount || data.endoscopyRooms || data.surgicalInterventions || data.endoscopyInterventions

    if (hasMedicalData) {
      const institutionId = existing.id || existing.getDataValue('id')
      const existingProfile = await MedicalProfile.findOne({ where: { institutionId } })

      if (existingProfile) {
        // Update existing medical profile
        await existingProfile.update({
          bedCapacity: data.bedCapacity ? Number.parseInt(data.bedCapacity) : existingProfile.getDataValue('bedCapacity'),
          surgicalRooms: data.surgicalRooms ? Number.parseInt(data.surgicalRooms) : existingProfile.getDataValue('surgicalRooms'),
          specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()) : existingProfile.getDataValue('specialties'),
          departments: data.departments ? data.departments.split(',').map(d => d.trim()) : existingProfile.getDataValue('departments'),
          equipmentTypes: data.equipmentTypes ? data.equipmentTypes.split(',').map(e => e.trim()) : existingProfile.getDataValue('equipmentTypes'),
          certifications: data.certifications ? data.certifications.split(',').map(c => c.trim()) : existingProfile.getDataValue('certifications'),
          complianceStatus: (data.complianceStatus as unknown as ComplianceStatus) || existingProfile.getDataValue('complianceStatus'),
          lastAuditDate: data.lastAuditDate ? new Date(data.lastAuditDate) : existingProfile.getDataValue('lastAuditDate'),
          complianceExpirationDate: data.complianceExpirationDate ? new Date(data.complianceExpirationDate) : existingProfile.getDataValue('complianceExpirationDate'),
          complianceNotes: data.complianceNotes || existingProfile.getDataValue('complianceNotes'),
          // Activity metrics
          staffCount: data.staffCount ? Number.parseInt(data.staffCount) : existingProfile.getDataValue('staffCount'),
          endoscopyRooms: data.endoscopyRooms ? Number.parseInt(data.endoscopyRooms) : existingProfile.getDataValue('endoscopyRooms'),
          surgicalInterventions: data.surgicalInterventions ? Number.parseInt(data.surgicalInterventions) : existingProfile.getDataValue('surgicalInterventions'),
          endoscopyInterventions: data.endoscopyInterventions ? Number.parseInt(data.endoscopyInterventions) : existingProfile.getDataValue('endoscopyInterventions')
        })
      } else {
        // Create new medical profile
        await MedicalProfile.create({
          institutionId,
          bedCapacity: data.bedCapacity ? Number.parseInt(data.bedCapacity) : undefined,
          surgicalRooms: data.surgicalRooms ? Number.parseInt(data.surgicalRooms) : undefined,
          specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()) : [],
          departments: data.departments ? data.departments.split(',').map(d => d.trim()) : [],
          equipmentTypes: data.equipmentTypes ? data.equipmentTypes.split(',').map(e => e.trim()) : [],
          certifications: data.certifications ? data.certifications.split(',').map(c => c.trim()) : [],
          complianceStatus: data.complianceStatus as ComplianceStatus || ComplianceStatus.PENDING_REVIEW,
          lastAuditDate: data.lastAuditDate ? new Date(data.lastAuditDate) : undefined,
          complianceExpirationDate: data.complianceExpirationDate ? new Date(data.complianceExpirationDate) : undefined,
          complianceNotes: data.complianceNotes,
          // Activity metrics
          staffCount: data.staffCount ? Number.parseInt(data.staffCount) : undefined,
          endoscopyRooms: data.endoscopyRooms ? Number.parseInt(data.endoscopyRooms) : undefined,
          surgicalInterventions: data.surgicalInterventions ? Number.parseInt(data.surgicalInterventions) : undefined,
          endoscopyInterventions: data.endoscopyInterventions ? Number.parseInt(data.endoscopyInterventions) : undefined
        })
      }
    }
  }

  private static async createInstitution(data: Record<string, string>, assignedUserId?: string): Promise<MedicalInstitution> {
    // Create institution with dataSource='import' to track origin
    // Note: afterCreate hook will auto-lock with lockedReason='manual_creation'
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
      assignedUserId,
      dataSource: 'import',
      lastSyncAt: { import: new Date() },
      // Commercial fields
      finess: data.finess || undefined,
      groupName: data.groupName || undefined,
      commercialStatus: (data.commercialStatus as CommercialStatus) || CommercialStatus.PROSPECT,
      mainPhone: data.mainPhone || undefined
    })

    // Create medical profile if relevant data exists
    const hasMedicalData = data.bedCapacity || data.surgicalRooms || data.specialties ||
      data.staffCount || data.endoscopyRooms || data.surgicalInterventions || data.endoscopyInterventions

    if (hasMedicalData) {
      const institutionId = institution.id || institution.getDataValue('id') || (institution as any).dataValues?.id

      if (!institutionId) {
        throw new Error('Institution ID is required for MedicalProfile creation')
      }

      await MedicalProfile.create({
        institutionId,
        bedCapacity: data.bedCapacity ? Number.parseInt(data.bedCapacity) : undefined,
        surgicalRooms: data.surgicalRooms ? Number.parseInt(data.surgicalRooms) : undefined,
        specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()) : [],
        departments: data.departments ? data.departments.split(',').map(d => d.trim()) : [],
        equipmentTypes: data.equipmentTypes ? data.equipmentTypes.split(',').map(e => e.trim()) : [],
        certifications: data.certifications ? data.certifications.split(',').map(c => c.trim()) : [],
        complianceStatus: data.complianceStatus as ComplianceStatus || ComplianceStatus.PENDING_REVIEW,
        lastAuditDate: data.lastAuditDate ? new Date(data.lastAuditDate) : undefined,
        complianceExpirationDate: data.complianceExpirationDate ? new Date(data.complianceExpirationDate) : undefined,
        complianceNotes: data.complianceNotes,
        // Activity metrics
        staffCount: data.staffCount ? Number.parseInt(data.staffCount) : undefined,
        endoscopyRooms: data.endoscopyRooms ? Number.parseInt(data.endoscopyRooms) : undefined,
        surgicalInterventions: data.surgicalInterventions ? Number.parseInt(data.surgicalInterventions) : undefined,
        endoscopyInterventions: data.endoscopyInterventions ? Number.parseInt(data.endoscopyInterventions) : undefined
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

  /**
   * Preview CSV import with detailed matching status for each row
   */
  static async previewCsvData(csvData: string): Promise<CsvPreviewResult> {
    const parsedRows = this.parseCsv(csvData)
    const validatedRows = await this.validateRows(parsedRows)

    const preview: CsvPreviewRow[] = []

    for (const row of validatedRows) {
      const hasErrors = row.errors.length > 0

      // Default preview row
      const previewRow: CsvPreviewRow = {
        rowNumber: row.row,
        name: row.data.name || '(empty)',
        accountingNumber: row.data.accountingNumber,
        city: row.data.city,
        matchStatus: 'none',
        sageStatus: row.data.accountingNumber ? 'linked' : 'not_linked',
        hasErrors,
        errors: row.errors
      }

      // Skip matching analysis if row has validation errors
      if (hasErrors) {
        preview.push(previewRow)
        continue
      }

      // Perform matching analysis
      try {
        const matchInput: MatchInput = {
          name: row.data.name,
          accountingNumber: row.data.accountingNumber,
          address: {
            street: row.data.street,
            city: row.data.city,
            state: row.data.state,
            zipCode: row.data.zipCode,
            country: row.data.country
          }
        }

        const matchResult = await CsvMatchingService.findBestMatch(matchInput)

        if (matchResult.matched && matchResult.institution) {
          previewRow.matchStatus = matchResult.matchType === 'accountingNumber' || matchResult.matchType === 'exactNameAddress' ? 'exact' : 'fuzzy'
          previewRow.matchConfidence = matchResult.confidence
          previewRow.matchType = matchResult.matchType
          previewRow.existingInstitutionId = matchResult.institution.id
          previewRow.existingInstitutionName = matchResult.institution.name
        } else {
          // No match found - will be created
          previewRow.matchStatus = 'none'
        }
      } catch (error) {
        logger.warn('Error during preview matching', {
          row: row.row,
          error: (error as Error).message
        })
      }

      preview.push(previewRow)
    }

    const allErrors = validatedRows.flatMap(row =>
      row.errors.map(error => ({
        row: row.row,
        field: error.field,
        message: error.message
      }))
    )

    return {
      totalRows: parsedRows.length,
      validRows: validatedRows.filter(r => r.errors.length === 0).length,
      invalidRows: validatedRows.filter(r => r.errors.length > 0).length,
      preview,
      errors: allErrors
    }
  }

  static generateCsvTemplate(): string {
    const headers = [
      'name', 'type', 'accountingNumber', 'street', 'city', 'state', 'zipCode', 'country',
      // Commercial fields
      'finess', 'groupName', 'commercialStatus', 'mainPhone',
      // Medical profile fields
      'bedCapacity', 'surgicalRooms', 'specialties', 'departments',
      'equipmentTypes', 'certifications', 'complianceStatus',
      'lastAuditDate', 'complianceExpirationDate', 'complianceNotes',
      // Activity metrics
      'staffCount', 'endoscopyRooms', 'surgicalInterventions', 'endoscopyInterventions',
      // Contact and tags
      'tags',
      'contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone',
      'contactTitle', 'contactDepartment', 'contactIsPrimary'
    ].join(',')

    // Quote any value that contains commas or quotes to avoid column shifts in spreadsheet apps
    const esc = (v: string) => (/,|"|\n/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)

    // First institution with primary contact
    const row1Values = [
      'CHU Exemple', 'public_hospital', 'CLI001', '1 Avenue de la Santé', 'Paris', 'Île-de-France', '75013', 'France',
      // Commercial fields
      '750000001', 'AP-HP', 'client', '+33145678900',
      // Medical profile fields
      '800', '12', 'cardiologie,neurologie,oncologie', 'urgences,réanimation,bloc opératoire',
      'irm,scanner,robot chirurgical', 'has,iso_9001', 'compliant',
      '2024-06-15', '2027-06-15', 'Certification renouvelée',
      // Activity metrics
      '2500', '4', '15000', '8000',
      // Contact and tags
      'chu,public,ile-de-france',
      'Marie', 'Dupont', 'marie.dupont@chu-exemple.fr', '+33145678901',
      'Directrice des Achats', 'Direction', 'true'
    ]

    // Same institution (same accountingNumber) with second contact - shows how to add multiple contacts
    const row2Values = [
      'CHU Exemple', 'public_hospital', 'CLI001', '1 Avenue de la Santé', 'Paris', 'Île-de-France', '75013', 'France',
      // Commercial fields (can be empty on duplicate rows)
      '', '', '', '',
      // Medical profile fields (can be empty on duplicate rows)
      '', '', '', '',
      '', '', '',
      '', '', '',
      // Activity metrics (can be empty on duplicate rows)
      '', '', '', '',
      // Contact and tags
      '',
      'Pierre', 'Martin', 'pierre.martin@chu-exemple.fr', '+33145678902',
      'Pharmacien Chef', 'Pharmacie', 'false'
    ]

    // Second institution with one contact
    const row3Values = [
      'Clinique du Soleil', 'private_clinic', 'CLI002', '25 Boulevard des Soins', 'Lyon', 'Auvergne-Rhône-Alpes', '69003', 'France',
      // Commercial fields
      '690000123', 'Groupe Ramsay', 'prospect', '+33478123456',
      // Medical profile fields
      '120', '6', 'orthopédie,chirurgie digestive', 'bloc opératoire,soins intensifs',
      'arthroscopie,coelioscopie', 'iso_9001', 'pending_review',
      '2023-11-01', '2026-11-01', 'En attente audit HAS',
      // Activity metrics
      '350', '2', '4500', '1200',
      // Contact and tags
      'clinique,privé,rhone-alpes',
      'Sophie', 'Bernard', 'sophie.bernard@clinique-soleil.fr', '+33478123457',
      'Cadre de Santé', 'Direction des Soins', 'true'
    ]

    const row1 = row1Values.map(esc).join(',')
    const row2 = row2Values.map(esc).join(',')
    const row3 = row3Values.map(esc).join(',')

    return `${headers}\n${row1}\n${row2}\n${row3}`
  }
}
