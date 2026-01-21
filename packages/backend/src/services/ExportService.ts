import { Op, Sequelize } from "sequelize"
import ExcelJS from 'exceljs'
import { logger } from "../utils/logger"
import {
  MedicalInstitution,
  MedicalProfile,
  ContactPerson,
  User,
  Task,
  Quote,
  Invoice,
  Opportunity,
} from "../models"
import { UserRole } from "../models/User"

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json'
  includeHeaders: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  userId?: string // For filtering by user
  teamMemberIds?: string[] // For team-based filtering
  searchQuery?: string
  institutionType?: string
  complianceStatus?: string
  taskStatus?: string
  quoteStatus?: string
  invoiceStatus?: string
  opportunityStage?: string
  opportunityStatus?: string
  limit?: number // For pagination
  offset?: number // For pagination
  useQueue?: boolean // Use queue system for large exports
}

export interface ExportResult {
  success: boolean
  data?: any[]
  filename?: string
  contentType?: string
  error?: string
  totalRecords?: number
}

export class ExportService {
  /**
   * Export medical institutions with filtering options
   */
  static async exportMedicalInstitutions(options: ExportOptions): Promise<ExportResult> {
    try {
      const whereClause: any = { isActive: true }

      // Apply date range filtering
      if (options.dateRange) {
        whereClause.createdAt = {
          [Op.gte]: options.dateRange.start,
          [Op.lte]: options.dateRange.end,
        }
      }

      // Apply institution type filtering
      if (options.institutionType) {
        whereClause.type = options.institutionType
      }

      // Apply search query
      // SECURITY: Use parameterized queries to prevent SQL injection
      if (options.searchQuery) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${options.searchQuery}%` } },
          Sequelize.where(
            Sequelize.literal(`"address"->>'city'`),
            { [Op.iLike]: `%${options.searchQuery}%` }
          ),
        ] as any
      }

      // Apply team-based filtering
      if (options.teamMemberIds && options.teamMemberIds.length > 0) {
        const teamFilter = {
          [Op.or]: [
            {
              assignedUserId: {
                [Op.in]: options.teamMemberIds,
              },
            },
            {
              assignedUserId: null, // Include unassigned institutions
            },
          ]
        }
        
        // If there's already an Op.or (from search), combine them
        if (whereClause[Op.or]) {
          whereClause[Op.and] = [
            { [Op.or]: whereClause[Op.or] },
            teamFilter
          ]
        } else {
          whereClause[Op.or] = teamFilter[Op.or]
        }
      } else if (options.userId) {
        whereClause.assignedUserId = options.userId
      }

      const institutions = await MedicalInstitution.findAll({
        where: whereClause,
        include: [
          {
            model: MedicalProfile,
            as: "medicalProfile",
            required: false,
          },
          // Optional relational address include (non-required; we fall back to JSONB)
          ...(process.env.USE_RELATIONAL_ADDRESSES === 'true'
            ? [
                {
                  model: (await import('../models')).InstitutionAddress,
                  as: "addressRel",
                  required: false,
                } as any,
              ]
            : []),
          {
            model: ContactPerson,
            as: "contactPersons",
            where: { isActive: true },
            required: false,
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName", "email"],
            required: false,
          },
        ],
        order: [["name", "ASC"]],
        limit: options.limit,
        offset: options.offset,
      })

      const data = institutions.map(institution => {
        // Prefer relational address if present, else fall back to JSONB
        const rel: any = (institution as any).addressRel
        const address = rel || institution.address || institution.getDataValue('address') || {}
        const tags = institution.tags || institution.getDataValue('tags') || []
        
        return {
          id: institution.id || institution.getDataValue('id'),
          name: institution.name || institution.getDataValue('name'),
          type: institution.type || institution.getDataValue('type'),
          street: address.street || address.street || '',
          city: address.city || address.city || '',
          state: address.state || address.state || '',
          zipCode: address.zipCode || address.zipCode || '',
          country: address.country || '',
          fullAddress: institution.getFullAddress(),
          assignedUser: institution.assignedUser 
            ? `${institution.assignedUser.firstName} ${institution.assignedUser.lastName}`
            : null,
          assignedUserEmail: institution.assignedUser?.email || null,
          tags: Array.isArray(tags) ? tags.join(', ') : '',
          isActive: institution.isActive !== undefined ? institution.isActive : institution.getDataValue('isActive'),
          bedCapacity: institution.medicalProfile?.bedCapacity || null,
          surgicalRooms: institution.medicalProfile?.surgicalRooms || null,
          specialties: Array.isArray(institution.medicalProfile?.specialties) ? institution.medicalProfile.specialties.join(', ') : null,
          departments: Array.isArray(institution.medicalProfile?.departments) ? institution.medicalProfile.departments.join(', ') : null,
          equipmentTypes: Array.isArray(institution.medicalProfile?.equipmentTypes) ? institution.medicalProfile.equipmentTypes.join(', ') : null,
          certifications: Array.isArray(institution.medicalProfile?.certifications) ? institution.medicalProfile.certifications.join(', ') : null,
          complianceStatus: institution.medicalProfile?.complianceStatus || null,
          lastAuditDate: institution.medicalProfile?.lastAuditDate || null,
          complianceExpirationDate: institution.medicalProfile?.complianceExpirationDate || null,
          contactCount: institution.contactPersons?.length || 0,
          primaryContact: institution.contactPersons?.find(cp => cp.isPrimary) || null,
          createdAt: institution.createdAt || institution.getDataValue('createdAt'),
          updatedAt: institution.updatedAt || institution.getDataValue('updatedAt'),
        }
      })

      return {
        success: true,
        data,
        totalRecords: data.length,
        filename: `medical-institutions-${new Date().toISOString().split('T')[0]}`,
        contentType: options.format === 'csv' ? 'text/csv' : 
                     options.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                     'application/json',
      }
    } catch (error) {
      logger.error('Error exporting medical institutions:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Export contacts with filtering options
   */
  static async exportContacts(options: ExportOptions): Promise<ExportResult> {
    try {
      const whereClause: any = { isActive: true }

      // Apply date range filtering
      if (options.dateRange) {
        whereClause.createdAt = {
          [Op.gte]: options.dateRange.start,
          [Op.lte]: options.dateRange.end,
        }
      }

      // Apply search query
      if (options.searchQuery) {
        whereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${options.searchQuery}%` } },
          { lastName: { [Op.iLike]: `%${options.searchQuery}%` } },
          { email: { [Op.iLike]: `%${options.searchQuery}%` } },
          { phone: { [Op.iLike]: `%${options.searchQuery}%` } },
        ]
      }

      // Apply team-based filtering
      if (options.teamMemberIds && options.teamMemberIds.length > 0) {
        const teamFilter = {
          [Op.or]: [
            {
              '$institution.assigned_user_id$': {
                [Op.in]: options.teamMemberIds,
              },
            },
            {
              '$institution.assigned_user_id$': null,
            },
          ],
        }
        
        // If there's already an Op.or (from search), combine them
        if (whereClause[Op.or]) {
          whereClause[Op.and] = [
            { [Op.or]: whereClause[Op.or] },
            teamFilter
          ]
          delete whereClause[Op.or]
        } else {
          Object.assign(whereClause, teamFilter)
        }
      } else if (options.userId) {
        whereClause['$institution.assigned_user_id$'] = options.userId
      }

      const contacts = await ContactPerson.findAll({
        where: whereClause,
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            include: [
              {
                model: User,
                as: "assignedUser",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          },
        ],
        order: [["lastName", "ASC"], ["firstName", "ASC"]],
        limit: options.limit,
        offset: options.offset,
      })

      const data = contacts.map(contact => {
        const contactData = contact.toJSON() as any
        const institution = contact.institution
        const institutionData = institution ? institution.toJSON() as any : null
        
        return {
          id: contactData.id,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          title: contactData.title,
          department: contactData.department,
          isPrimary: contactData.isPrimary,
          isActive: contactData.isActive,
          institutionId: contactData.institutionId,
          institutionName: institutionData?.name || null,
          institutionType: institutionData?.type || null,
          institutionCity: institutionData?.address?.city || null,
          institutionState: institutionData?.address?.state || null,
          assignedUser: institutionData?.assignedUser 
            ? `${institutionData.assignedUser.firstName} ${institutionData.assignedUser.lastName}`
            : null,
          assignedUserEmail: institutionData?.assignedUser?.email || null,
          createdAt: contactData.createdAt,
          updatedAt: contactData.updatedAt,
        }
      })

      return {
        success: true,
        data,
        totalRecords: data.length,
        filename: `contacts-${new Date().toISOString().split('T')[0]}`,
        contentType: options.format === 'csv' ? 'text/csv' : 
                     options.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                     'application/json',
      }
    } catch (error) {
      console.error('Error exporting contacts:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Export tasks with filtering options
   */
  static async exportTasks(options: ExportOptions): Promise<ExportResult> {
    try {
      const whereClause: any = {}

      // Apply date range filtering
      if (options.dateRange) {
        whereClause.createdAt = {
          [Op.gte]: options.dateRange.start,
          [Op.lte]: options.dateRange.end,
        }
      }

      // Apply task status filtering
      if (options.taskStatus) {
        whereClause.status = options.taskStatus
      }

      // Apply search query
      if (options.searchQuery) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${options.searchQuery}%` } },
          { description: { [Op.iLike]: `%${options.searchQuery}%` } },
        ]
      }

      // Apply team-based filtering
      if (options.teamMemberIds && options.teamMemberIds.length > 0) {
        const teamFilter = {
          [Op.or]: [
            {
              assigneeId: {
                [Op.in]: options.teamMemberIds,
              },
            },
            {
              creatorId: {
                [Op.in]: options.teamMemberIds,
              },
            },
          ],
        }
        
        // If there's already an Op.or (from search), combine them
        if (whereClause[Op.or]) {
          whereClause[Op.and] = [
            { [Op.or]: whereClause[Op.or] },
            teamFilter
          ]
          delete whereClause[Op.or]
        } else {
          Object.assign(whereClause, teamFilter)
        }
      } else if (options.userId) {
        const userFilter = {
          [Op.or]: [
            { assigneeId: options.userId },
            { creatorId: options.userId },
          ],
        }
        
        // If there's already an Op.or (from search), combine them
        if (whereClause[Op.or]) {
          whereClause[Op.and] = [
            { [Op.or]: whereClause[Op.or] },
            userFilter
          ]
          delete whereClause[Op.or]
        } else {
          Object.assign(whereClause, userFilter)
        }
      }

      const tasks = await Task.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "assignee",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
        order: [["dueDate", "ASC"], ["priority", "DESC"]],
        limit: options.limit,
        offset: options.offset,
      })

      const data = tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        assigneeId: task.assigneeId,
        assignee: task.assignee 
          ? `${task.assignee.firstName} ${task.assignee.lastName}`
          : null,
        assigneeEmail: task.assignee?.email || null,
        creatorId: task.creatorId,
        creator: task.creator 
          ? `${task.creator.firstName} ${task.creator.lastName}`
          : null,
        creatorEmail: task.creator?.email || null,
        institutionId: task.institutionId,
        institutionName: task.institution?.name || null,
        institutionType: task.institution?.type || null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        isOverdue: task.dueDate && new Date() > task.dueDate && task.status !== 'completed',
      }))

      return {
        success: true,
        data,
        totalRecords: data.length,
        filename: `tasks-${new Date().toISOString().split('T')[0]}`,
        contentType: options.format === 'csv' ? 'text/csv' : 
                     options.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                     'application/json',
      }
    } catch (error) {
      console.error('Error exporting tasks:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Export quotes with filtering options
   */
  static async exportQuotes(options: ExportOptions): Promise<ExportResult> {
    try {
      const whereClause: any = {}

      // Apply date range filtering
      if (options.dateRange) {
        whereClause.createdAt = {
          [Op.gte]: options.dateRange.start,
          [Op.lte]: options.dateRange.end,
        }
      }

      // Apply quote status filtering
      if (options.quoteStatus) {
        whereClause.status = options.quoteStatus
      }

      // Apply search query
      if (options.searchQuery) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${options.searchQuery}%` } },
          { description: { [Op.iLike]: `%${options.searchQuery}%` } },
        ]
      }

      // Apply team-based filtering
      if (options.teamMemberIds && options.teamMemberIds.length > 0) {
        whereClause[Op.or] = [
          {
            assignedUserId: {
              [Op.in]: options.teamMemberIds,
            },
          },
        ]
      } else if (options.userId) {
        whereClause.assignedUserId = options.userId
      }

      const quotes = await Quote.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: options.limit,
        offset: options.offset,
      })

      const data = quotes.map(quote => ({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        description: quote.description,
        status: quote.status,
        subtotal: quote.subtotal,
        totalDiscountAmount: quote.totalDiscountAmount,
        totalTaxAmount: quote.totalTaxAmount,
        total: quote.total,
        validUntil: quote.validUntil,
        acceptedAt: quote.acceptedAt,
        rejectedAt: quote.rejectedAt,
        assignedUserId: quote.assignedUserId,
        assignedUser: quote.assignedUser 
          ? `${quote.assignedUser.firstName} ${quote.assignedUser.lastName}`
          : null,
        assignedUserEmail: quote.assignedUser?.email || null,
        institutionId: quote.institutionId,
        institutionName: quote.institution?.name || null,
        institutionType: quote.institution?.type || null,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
        isExpired: quote.validUntil && new Date() > quote.validUntil && quote.status === 'draft',
      }))

      return {
        success: true,
        data,
        totalRecords: data.length,
        filename: `quotes-${new Date().toISOString().split('T')[0]}`,
        contentType: options.format === 'csv' ? 'text/csv' : 
                     options.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                     'application/json',
      }
    } catch (error) {
      console.error('Error exporting quotes:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Export invoices with filtering options
   */
  static async exportInvoices(options: ExportOptions): Promise<ExportResult> {
    try {
      const whereClause: any = {}

      // Apply date range filtering
      if (options.dateRange) {
        whereClause.createdAt = {
          [Op.gte]: options.dateRange.start,
          [Op.lte]: options.dateRange.end,
        }
      }

      // Apply invoice status filtering
      if (options.invoiceStatus) {
        whereClause.status = options.invoiceStatus
      }

      // Apply search query
      if (options.searchQuery) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${options.searchQuery}%` } },
          { description: { [Op.iLike]: `%${options.searchQuery}%` } },
        ]
      }

      // Apply team-based filtering
      if (options.teamMemberIds && options.teamMemberIds.length > 0) {
        whereClause[Op.or] = [
          {
            assignedUserId: {
              [Op.in]: options.teamMemberIds,
            },
          },
        ]
      } else if (options.userId) {
        whereClause.assignedUserId = options.userId
      }

      const invoices = await Invoice.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: options.limit,
        offset: options.offset,
      })

      const data = invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        title: invoice.title,
        description: invoice.description,
        status: invoice.status,
        subtotal: invoice.subtotal,
        totalDiscountAmount: invoice.totalDiscountAmount,
        totalTaxAmount: invoice.totalTaxAmount,
        total: invoice.total,
        dueDate: invoice.dueDate,
        totalPaid: invoice.totalPaid,
        remainingAmount: invoice.remainingAmount,
        assignedUserId: invoice.assignedUserId,
        assignedUser: invoice.assignedUser 
          ? `${invoice.assignedUser.firstName} ${invoice.assignedUser.lastName}`
          : null,
        assignedUserEmail: invoice.assignedUser?.email || null,
        institutionId: invoice.institutionId,
        institutionName: invoice.institution?.name || null,
        institutionType: invoice.institution?.type || null,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        isOverdue: invoice.dueDate && new Date() > invoice.dueDate && invoice.status !== 'paid',
      }))

      return {
        success: true,
        data,
        totalRecords: data.length,
        filename: `invoices-${new Date().toISOString().split('T')[0]}`,
        contentType: options.format === 'csv' ? 'text/csv' : 
                     options.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                     'application/json',
      }
    } catch (error) {
      console.error('Error exporting invoices:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Export opportunities with filtering options
   */
  static async exportOpportunities(options: ExportOptions): Promise<ExportResult> {
    try {
      const whereClause: any = {}

      // Apply date range filtering
      if (options.dateRange) {
        whereClause.createdAt = {
          [Op.gte]: options.dateRange.start,
          [Op.lte]: options.dateRange.end,
        }
      }

      // Apply opportunity stage filtering
      if (options.opportunityStage) {
        whereClause.stage = options.opportunityStage
      }

      // Apply opportunity status filtering
      if (options.opportunityStatus) {
        whereClause.status = options.opportunityStatus
      }

      // Apply search query
      if (options.searchQuery) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${options.searchQuery}%` } },
          { description: { [Op.iLike]: `%${options.searchQuery}%` } },
        ]
      }

      // Apply team-based filtering
      if (options.teamMemberIds && options.teamMemberIds.length > 0) {
        const teamFilter = {
          assignedUserId: {
            [Op.in]: options.teamMemberIds,
          },
        }

        // If there's already an Op.or (from search), combine them
        if (whereClause[Op.or]) {
          whereClause[Op.and] = [
            { [Op.or]: whereClause[Op.or] },
            teamFilter
          ]
          delete whereClause[Op.or]
        } else {
          Object.assign(whereClause, teamFilter)
        }
      } else if (options.userId) {
        whereClause.assignedUserId = options.userId
      }

      const opportunities = await Opportunity.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
          {
            model: ContactPerson,
            as: "contactPerson",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
        order: [["expectedCloseDate", "ASC"]],
        limit: options.limit,
        offset: options.offset,
      })

      const data = opportunities.map(opportunity => ({
        id: opportunity.id,
        name: opportunity.name,
        description: opportunity.description,
        stage: opportunity.stage,
        status: opportunity.status,
        value: opportunity.value,
        probability: opportunity.probability,
        weightedValue: (parseFloat(opportunity.value.toString()) * opportunity.probability) / 100,
        expectedCloseDate: opportunity.expectedCloseDate,
        actualCloseDate: opportunity.actualCloseDate,
        institutionId: opportunity.institutionId,
        institutionName: opportunity.institution?.name || null,
        institutionType: opportunity.institution?.type || null,
        contactPersonId: opportunity.contactPersonId,
        contactPersonName: opportunity.contactPerson
          ? `${opportunity.contactPerson.firstName} ${opportunity.contactPerson.lastName}`
          : null,
        contactPersonEmail: opportunity.contactPerson?.email || null,
        assignedUserId: opportunity.assignedUserId,
        assignedUser: opportunity.assignedUser
          ? `${opportunity.assignedUser.firstName} ${opportunity.assignedUser.lastName}`
          : null,
        assignedUserEmail: opportunity.assignedUser?.email || null,
        tags: Array.isArray(opportunity.tags) ? opportunity.tags.join(', ') : '',
        source: opportunity.source,
        notes: opportunity.notes,
        competitors: Array.isArray(opportunity.competitors) ? opportunity.competitors.join(', ') : '',
        wonReason: opportunity.wonReason,
        lostReason: opportunity.lostReason,
        createdAt: opportunity.createdAt,
        updatedAt: opportunity.updatedAt,
        isOverdue: opportunity.status === 'active' &&
          opportunity.expectedCloseDate &&
          new Date(opportunity.expectedCloseDate) < new Date(),
      }))

      return {
        success: true,
        data,
        totalRecords: data.length,
        filename: `opportunities-${new Date().toISOString().split('T')[0]}`,
        contentType: options.format === 'csv' ? 'text/csv' :
                     options.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                     'application/json',
      }
    } catch (error) {
      console.error('Error exporting opportunities:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Generate CSV content from data
   */
  static generateCSV(data: any[], includeHeaders: boolean = true): string {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows: string[] = []

    if (includeHeaders) {
      csvRows.push(headers.join(','))
    }

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        // Handle nested objects, arrays, and special characters
        if (value === null || value === undefined) {
          return ''
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        }
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
      csvRows.push(values.join(','))
    })

    return csvRows.join('\n')
  }

/**
    * Generate JSON content from data
    */
  static generateJSON(data: any[]): string {
    return JSON.stringify(data, null, 2)
  }

  /**
    * Generate XLSX content from data using ExcelJS
    */
  static async generateXLSX(data: any[], includeHeaders: boolean = true): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Data')

    // Handle empty data case - return valid empty workbook
    if (data.length === 0) {
      const buffer = await workbook.xlsx.writeBuffer()
      return Buffer.from(buffer as ArrayBuffer)
    }

    const headers = Object.keys(data[0])
    
    if (includeHeaders) {
      worksheet.addRow(headers)
    }

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) {
          return ''
        }
        if (typeof value === 'object' && value instanceof Date) {
          return value
        }
        if (typeof value === 'object') {
          return JSON.stringify(value)
        }
        return value
      })
      worksheet.addRow(values)
    })

    // Auto-fit columns for better readability
    worksheet.columns.forEach(column => {
      if (column.header) {
        column.width = Math.max(12, column.header.toString().length + 2)
      }
    })

    // Add header row styling
    if (includeHeaders && worksheet.rowCount > 0) {
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer as ArrayBuffer)
  }

  /**
   * Check user permissions for export
   */
  static async checkExportPermissions(userId: string, exportType: string): Promise<boolean> {
    try {
      const user = await User.findByPk(userId)
      if (!user) return false

      // Super admins can export anything
      if (user.role === UserRole.SUPER_ADMIN) return true

      // Admins can export anything
      if (user.role === UserRole.ADMIN) return true

      // Team admins can export team data
      if (user.role === UserRole.TEAM_ADMIN) {
        // Team admins can export institutions, contacts, tasks, quotes, invoices, opportunities
        return ['institutions', 'contacts', 'tasks', 'quotes', 'invoices', 'opportunities'].includes(exportType)
      }

      // Regular users can only export their own data
      if (user.role === UserRole.USER) {
        return true // But will be filtered by their user ID in export methods
      }

      return false
    } catch (error) {
      logger.error('Error checking export permissions:', { error })
      return false
    }
  }

  /**
   * Queue-based export for large datasets
   * This would integrate with Bull/Agenda or similar queue system
   */
  static async queueExport(options: ExportOptions, exportType: string): Promise<ExportResult> {
    try {
      // For now, return immediate result for small exports
      // In production, this would:
      // 1. Create a job record in database
      // 2. Add job to queue (Bull, Agenda, etc.)
      // 3. Return job ID for status tracking
      // 4. Queue worker would process export and save to storage
      // 5. Notify user when complete
      
      const estimatedRecords = await this.estimateRecordCount(options, exportType)
      
      // Use queue for large exports (>1000 records)
      if (options.useQueue && estimatedRecords > 1000) {
        // TODO: Implement actual queue system
        // For now, fall back to immediate export
        logger.info('Large export requested, queue system not yet implemented', {
          exportType,
          estimatedRecords,
          options
        })
      }

      // For small exports or when queue is not available, process immediately
      switch (exportType) {
        case 'institutions':
          return await this.exportMedicalInstitutions(options)
        case 'contacts':
          return await this.exportContacts(options)
        case 'tasks':
          return await this.exportTasks(options)
        case 'quotes':
          return await this.exportQuotes(options)
        case 'invoices':
          return await this.exportInvoices(options)
        case 'opportunities':
          return await this.exportOpportunities(options)
        default:
          return {
            success: false,
            error: 'Invalid export type'
          }
      }
    } catch (error) {
      logger.error('Error in queueExport:', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Estimate record count for queue decision making
   */
  private static async estimateRecordCount(options: ExportOptions, exportType: string): Promise<number> {
    try {
      // Simple estimation - in production this would be more sophisticated
      const baseCount = 100 // Default estimate
      
      // TODO: Implement actual count queries based on filters
      // This would involve running COUNT queries with the same filters as the export
      
      return baseCount
    } catch (error) {
      logger.warn('Error estimating record count, using default', { error })
      return 100 // Conservative default
    }
  }

  /**
   * Get record counts for each export type
   */
  static async getRecordCounts(userId: string): Promise<any> {
    try {
      const user = await User.findByPk(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Determine team filtering based on user role
      const teamMemberIds = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN 
        ? undefined 
        : [userId]

      // Count medical institutions
      const institutionWhereClause: any = { isActive: true }
      if (teamMemberIds) {
        institutionWhereClause['$assigned_user_id$'] = { [Op.in]: teamMemberIds }
      }
      const institutionCount = await MedicalInstitution.count({ where: institutionWhereClause })

      // Count contact persons
      const contactWhereClause: any = { isActive: true }
      if (teamMemberIds) {
        contactWhereClause['$institution.assigned_user_id$'] = { [Op.in]: teamMemberIds }
      }
      const contactCount = await ContactPerson.count({ 
        where: contactWhereClause,
        include: [{
          model: MedicalInstitution,
          as: "institution",
          attributes: [],
        }]
      })

      // Count tasks
      const taskWhereClause: any = {}
      if (teamMemberIds) {
        taskWhereClause[Op.or] = [
          { assigneeId: { [Op.in]: teamMemberIds } },
          { creatorId: { [Op.in]: teamMemberIds } }
        ]
      }
      const taskCount = await Task.count({ where: taskWhereClause })

      // Count quotes  
      const quoteWhereClause: any = {}
      if (teamMemberIds) {
        quoteWhereClause['$assignedUserId$'] = { [Op.in]: teamMemberIds }
      }
      const quoteCount = await Quote.count({ where: quoteWhereClause })

      // Count invoices
      const invoiceWhereClause: any = {}
      if (teamMemberIds) {
        invoiceWhereClause['$assignedUserId$'] = { [Op.in]: teamMemberIds }
      }
      const invoiceCount = await Invoice.count({ where: invoiceWhereClause })

      // Count opportunities
      const opportunityWhereClause: any = {}
      if (teamMemberIds) {
        opportunityWhereClause.assignedUserId = { [Op.in]: teamMemberIds }
      }
      const opportunityCount = await Opportunity.count({ where: opportunityWhereClause })

      return {
        institutions: institutionCount,
        contacts: contactCount,
        tasks: taskCount,
        quotes: quoteCount,
        invoices: invoiceCount,
        opportunities: opportunityCount,
      }
    } catch (error) {
      logger.error('Error getting record counts:', { error })
      return {
        institutions: 0,
        contacts: 0,
        tasks: 0,
        quotes: 0,
        invoices: 0,
        opportunities: 0,
      }
    }
  }

  /**
   * Get export job status (for queue system)
   */
  static async getExportStatus(jobId: string): Promise<any> {
    // TODO: Implement job status tracking
    // This would query the database for job status
    return {
      jobId,
      status: 'pending', // pending, processing, completed, failed
      progress: 0,
      estimatedCompletion: null,
      downloadUrl: null
    }
  }
}
