import { Op } from "sequelize"
import {
  MedicalInstitution,
  MedicalProfile,
  ContactPerson,
  User,
  Task,
  Note,
  Meeting,
  Call,
  Reminder,
  Quote,
  Invoice,
} from "../models"
import { UserRole } from "@medical-crm/shared"

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
      if (options.searchQuery) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${options.searchQuery}%` } },
          { 'address.city': { [Op.iLike]: `%${options.searchQuery}%` } },
        ]
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
      })

      const data = institutions.map(institution => {
        const address = institution.address || institution.getDataValue('address') || {}
        const tags = institution.tags || institution.getDataValue('tags') || []
        
        return {
          id: institution.id || institution.getDataValue('id'),
          name: institution.name || institution.getDataValue('name'),
          type: institution.type || institution.getDataValue('type'),
          street: address.street || '',
          city: address.city || '',
          state: address.state || '',
          zipCode: address.zipCode || '',
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
      console.error('Error exporting medical institutions:', error)
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
        whereClause[Op.or] = [
          {
            '$institution.assignedUserId$': {
              [Op.in]: options.teamMemberIds,
            },
          },
          {
            '$institution.assignedUserId$': null,
          },
        ]
      } else if (options.userId) {
        whereClause['$institution.assignedUserId$'] = options.userId
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
      })

      const data = contacts.map(contact => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        title: contact.title,
        department: contact.department,
        isPrimary: contact.isPrimary,
        isActive: contact.isActive,
        institutionId: contact.institutionId,
        institutionName: contact.institution?.name || null,
        institutionType: contact.institution?.type || null,
        institutionCity: contact.institution?.address.city || null,
        institutionState: contact.institution?.address.state || null,
        assignedUser: contact.institution?.assignedUser 
          ? `${contact.institution.assignedUser.firstName} ${contact.institution.assignedUser.lastName}`
          : null,
        assignedUserEmail: contact.institution?.assignedUser?.email || null,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      }))

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
        whereClause[Op.or] = [
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
        ]
      } else if (options.userId) {
        whereClause[Op.or] = [
          { assigneeId: options.userId },
          { creatorId: options.userId },
        ]
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
   * Check user permissions for export
   */
  static async checkExportPermissions(userId: string, exportType: string): Promise<boolean> {
    try {
      const user = await User.findByPk(userId)
      if (!user) return false

      // Super admins can export anything
      if (user.role === UserRole.SUPER_ADMIN) return true

      // Team admins can export team data
      if (user.role === UserRole.TEAM_ADMIN) {
        // Team admins can export institutions, contacts, tasks, quotes, invoices
        return ['institutions', 'contacts', 'tasks', 'quotes', 'invoices'].includes(exportType)
      }

      // Regular users can only export their own data
      if (user.role === UserRole.USER) {
        return true // But will be filtered by their user ID in export methods
      }

      return false
    } catch (error) {
      console.error('Error checking export permissions:', error)
      return false
    }
  }
}