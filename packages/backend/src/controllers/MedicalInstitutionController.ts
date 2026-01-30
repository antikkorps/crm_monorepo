import { CommercialStatus, ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import Joi from "joi"
import { Op, literal } from "sequelize"
import { sequelize } from "../config/database"
import { ContactPerson, InstitutionAddress, MedicalInstitution, MedicalProfile, User } from "../models"
import { TaskStatus } from "../models/Task"
import { CsvImportService } from "../services/CsvImportService"
import { InstitutionRevenueService } from "../services/InstitutionRevenueService"
import { MedicalInstitutionAnalyticsService } from "../services/MedicalInstitutionAnalyticsService"
import { MedicalInstitutionService } from "../services/MedicalInstitutionService"
import { Context } from "../types/koa"
import { BadRequestError, NotFoundError } from "../utils/AppError"
import { logger } from "../utils/logger"

// Temporary interface for file uploads
interface FileUpload {
  originalFilename?: string
  filepath: string
  size: number
  mimetype?: string
}

interface ContextWithFiles extends Context {
  request: Context["request"] & {
    files?: {
      file?: FileUpload | FileUpload[]
    }
  }
}

// Validation schemas
const addressSchema = Joi.object({
  street: Joi.string().required().trim().messages({
    "any.required": "Street address is required",
    "string.empty": "Street address cannot be empty",
  }),
  city: Joi.string().required().trim().messages({
    "any.required": "City is required",
    "string.empty": "City cannot be empty",
  }),
  state: Joi.string().required().trim().messages({
    "any.required": "State is required",
    "string.empty": "State cannot be empty",
  }),
  zipCode: Joi.string().required().trim().messages({
    "any.required": "ZIP code is required",
    "string.empty": "ZIP code cannot be empty",
  }),
  country: Joi.string().required().trim().messages({
    "any.required": "Country is required",
    "string.empty": "Country cannot be empty",
  }),
})

const medicalProfileSchema = Joi.object({
  bedCapacity: Joi.number().integer().min(0).max(10000).optional(),
  surgicalRooms: Joi.number().integer().min(0).max(1000).optional(),
  specialties: Joi.array().items(Joi.string().trim()).default([]),
  departments: Joi.array().items(Joi.string().trim()).default([]),
  equipmentTypes: Joi.array().items(Joi.string().trim()).default([]),
  certifications: Joi.array().items(Joi.string().trim()).default([]),
  complianceStatus: Joi.string()
    .valid(...Object.values(ComplianceStatus))
    .default(ComplianceStatus.PENDING_REVIEW),
  lastAuditDate: Joi.date().optional(),
  complianceExpirationDate: Joi.date().optional(),
  complianceNotes: Joi.string().max(2000).optional(),
  // Activity metrics
  staffCount: Joi.number().integer().min(0).max(100000).allow(null).optional(),
  endoscopyRooms: Joi.number().integer().min(0).max(1000).allow(null).optional(),
  surgicalInterventions: Joi.number().integer().min(0).allow(null).optional(),
  endoscopyInterventions: Joi.number().integer().min(0).allow(null).optional(),
})

const contactPersonSchema = Joi.object({
  firstName: Joi.string().required().trim().max(50).messages({
    "any.required": "First name is required",
    "string.empty": "First name cannot be empty",
  }),
  lastName: Joi.string().required().trim().max(50).messages({
    "any.required": "Last name is required",
    "string.empty": "Last name cannot be empty",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),
  title: Joi.string().max(100).optional(),
  department: Joi.string().max(100).optional(),
  isPrimary: Joi.boolean().default(false),
})

const createInstitutionSchema = Joi.object({
  name: Joi.string().required().trim().max(255).messages({
    "any.required": "Institution name is required",
    "string.empty": "Institution name cannot be empty",
  }),
  type: Joi.string()
    .valid(...Object.values(InstitutionType))
    .required()
    .messages({
      "any.required": "Institution type is required",
      "any.only": "Invalid institution type",
    }),
  address: addressSchema.required(),
  accountingNumber: Joi.string().trim().max(50).optional(),
  digiformaId: Joi.string().trim().max(100).optional(),
  assignedUserId: Joi.string().uuid().optional(),
  tags: Joi.array().items(Joi.string().trim()).default([]),
  medicalProfile: medicalProfileSchema.required(),
  contactPersons: Joi.array().items(contactPersonSchema).default([]),
})

const updateInstitutionSchema = Joi.object({
  name: Joi.string().trim().max(255).optional(),
  type: Joi.string()
    .valid(...Object.values(InstitutionType))
    .optional(),
  address: addressSchema.optional(),
  accountingNumber: Joi.string().trim().max(50).allow(null).optional(),
  digiformaId: Joi.string().trim().max(100).allow(null).optional(),
  assignedUserId: Joi.string().uuid().allow(null).optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  isActive: Joi.boolean().optional(),
})

const updateMedicalProfileSchema = medicalProfileSchema.fork(
  [
    "bedCapacity",
    "surgicalRooms",
    "specialties",
    "departments",
    "equipmentTypes",
    "certifications",
    "complianceStatus",
    "staffCount",
    "endoscopyRooms",
    "surgicalInterventions",
    "endoscopyInterventions",
  ],
  (schema) => schema.optional()
)

/**
 * Fix encoding issues in CSV data
 * Handles Latin-1/Windows-1252 encoded files and converts them to UTF-8
 */
function fixCsvEncoding(buffer: Buffer): string {
  // Remove UTF-8 BOM if present
  let data = buffer
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    data = buffer.slice(3)
  }

  // Try UTF-8 first
  let text = data.toString('utf8')

  // Check for replacement characters or mojibake patterns (indicates encoding issues)
  // Common pattern: UTF-8 decoding of Latin-1 produces Ã followed by special chars
  const hasMojibake = text.includes('\uFFFD') || /Ã[\x80-\xBF]/.test(text)

  if (hasMojibake) {
    // Try Latin-1 (ISO-8859-1) which is compatible with Windows-1252 for most chars
    text = data.toString('latin1')
    logger.info('CSV encoding detected as Latin-1, converted to UTF-8')
  }

  return text
}

const searchSchema = Joi.object({
  name: Joi.string().trim().optional(),
  type: Joi.string()
    .valid(...Object.values(InstitutionType))
    .optional(),
  city: Joi.string().trim().optional(),
  state: Joi.string().trim().optional(),
  accountingNumber: Joi.string().trim().max(50).optional(),
  digiformaId: Joi.string().trim().max(100).optional(),
  assignedUserId: Joi.string().uuid().optional(),
  specialties: Joi.alternatives()
    .try(Joi.string().trim(), Joi.array().items(Joi.string().trim()))
    .optional(),
  minBedCapacity: Joi.number().integer().min(0).optional(),
  maxBedCapacity: Joi.number().integer().min(0).optional(),
  minSurgicalRooms: Joi.number().integer().min(0).optional(),
  maxSurgicalRooms: Joi.number().integer().min(0).optional(),
  complianceStatus: Joi.string()
    .valid(...Object.values(ComplianceStatus))
    .optional(),
  commercialStatus: Joi.string()
    .valid(...Object.values(CommercialStatus))
    .optional(),
  groupName: Joi.string().trim().optional(),
  tags: Joi.alternatives()
    .try(Joi.string().trim(), Joi.array().items(Joi.string().trim()))
    .optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(-1).max(100).default(20),
  sortBy: Joi.string().valid("name", "type", "createdAt", "updatedAt").default("name"),
  sortOrder: Joi.string().uppercase().valid("ASC", "DESC").default("ASC"),
})

export class MedicalInstitutionController {
  /**
   * GET /api/institutions
   * Get all medical institutions with optional filtering and pagination
   */
  static async getInstitutions(ctx: Context) {
    const { error, value } = searchSchema.validate(ctx.query)
    if (error) {
      throw new BadRequestError(error.details[0].message, error.details)
    }

    const {
      name,
      type,
      city,
      state,
      accountingNumber,
      digiformaId,
      assignedUserId,
      specialties,
      minBedCapacity,
      maxBedCapacity,
      minSurgicalRooms,
      maxSurgicalRooms,
      complianceStatus,
      commercialStatus,
      groupName,
      tags,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    } = value

    // Build search filters
    const filters: any = {}

    if (name) {
      filters.name = name
    }
    if (type) {
      filters.type = type
    }
    if (city) {
      filters.city = city
    }
    if (state) {
      filters.state = state
    }
    if (accountingNumber) {
      filters.accountingNumber = accountingNumber
    }
    if (digiformaId) {
      filters.digiformaId = digiformaId
    }
    if (assignedUserId) {
      filters.assignedUserId = assignedUserId
    }
    if (isActive !== undefined) {
      filters.isActive = isActive
    }
    if (commercialStatus) {
      filters.commercialStatus = commercialStatus
    }
    if (groupName) {
      filters.groupName = groupName
    }

    // Apply team-based filtering if required
    const institutionFilter = ctx.state.institutionFilter
    if (institutionFilter?.filterByAssignment) {
      const user = ctx.state.user as User

      if (user.role === "user") {
        // Regular users can only see institutions assigned to them
        filters.assignedUserId = user.id
      } else if (user.role === "team_admin" && user.teamId) {
        // Team admins can see institutions assigned to their team members
        // We'll need to get team member IDs first
        const teamMembers = await User.findAll({
          where: { teamId: user.teamId },
          attributes: ["id"],
        })
        const teamMemberIds = teamMembers.map((member) => member.id)

        // Include institutions assigned to team members or unassigned
        filters.teamMemberIds = teamMemberIds
      }
    }

    // Handle array filters
    if (specialties) {
      filters.specialties = Array.isArray(specialties) ? specialties : [specialties]
    }
    if (tags) {
      filters.tags = Array.isArray(tags) ? tags : [tags]
    }

    // Handle capacity filters
    if (minBedCapacity !== undefined) {
      filters.minBedCapacity = minBedCapacity
    }
    if (maxBedCapacity !== undefined) {
      filters.maxBedCapacity = maxBedCapacity
    }
    if (minSurgicalRooms !== undefined) {
      filters.minSurgicalRooms = minSurgicalRooms
    }
    if (maxSurgicalRooms !== undefined) {
      filters.maxSurgicalRooms = maxSurgicalRooms
    }
    if (complianceStatus) {
      filters.complianceStatus = complianceStatus
    }

    // Build Sequelize where clause and includes for efficient database-level pagination
    const whereClause: any = {}
    const profileWhere: any = {}
    const useRelational = process.env.USE_RELATIONAL_ADDRESSES === "true"
    const include: any[] = []

    // Apply isActive filter only if explicitly set
    // Si non fourni, on montre toutes les institutions (actives + inactives)
    if (filters.isActive !== undefined) {
      whereClause.isActive = filters.isActive
    }

    // Basic filters
    if (filters.name) {
      whereClause.name = {
        [Op.iLike]: `%${filters.name}%`,
      }
    }

    if (filters.type) {
      whereClause.type = filters.type
    }

    if (filters.accountingNumber) {
      whereClause.accountingNumber = {
        [Op.iLike]: `%${filters.accountingNumber}%`,
      }
    }

    if (filters.digiformaId) {
      whereClause.digiformaId = {
        [Op.iLike]: `%${filters.digiformaId}%`,
      }
    }

    // Address filters (city, state)
    // Use relational address model if enabled, otherwise use JSON fields
    if (useRelational && (filters.city || filters.state)) {
      const addressWhere: any = {}
      if (filters.city) {
        addressWhere.city = { [Op.iLike]: `%${filters.city}%` }
      }
      if (filters.state) {
        addressWhere.state = { [Op.iLike]: `%${filters.state}%` }
      }
      include.push({
        model: InstitutionAddress,
        as: "addressRel",
        where: addressWhere,
        required: true,
      })
    } else {
      // Use JSON path queries for embedded address
      if (filters.city) {
        whereClause[Op.and] = [
          ...(whereClause[Op.and] || []),
          sequelize.where(sequelize.json("address.city") as any, { [Op.iLike]: `%${filters.city}%` }),
        ]
      }

      if (filters.state) {
        whereClause[Op.and] = [
          ...(whereClause[Op.and] || []),
          sequelize.where(sequelize.json("address.state") as any, { [Op.iLike]: `%${filters.state}%` }),
        ]
      }
    }

    if (filters.assignedUserId) {
      whereClause.assignedUserId = filters.assignedUserId
    }

    if (filters.commercialStatus) {
      whereClause.commercialStatus = filters.commercialStatus
    }

    if (filters.groupName) {
      whereClause.groupName = {
        [Op.iLike]: `%${filters.groupName}%`,
      }
    }

    // Team-based filtering
    if (filters.teamMemberIds && filters.teamMemberIds.length > 0) {
      whereClause[Op.or] = [
        {
          assignedUserId: {
            [Op.in]: filters.teamMemberIds,
          },
        },
        {
          assignedUserId: null,
        },
      ]
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClause.tags = {
        [Op.overlap]: filters.tags.map((tag: string) => tag.toLowerCase()),
      }
    }

    // Medical profile filters
    if (filters.specialties && filters.specialties.length > 0) {
      profileWhere.specialties = {
        [Op.overlap]: filters.specialties.map((s: string) => s.toLowerCase()),
      }
    }

    if (filters.minBedCapacity !== undefined) {
      profileWhere.bedCapacity = { [Op.gte]: filters.minBedCapacity }
    }
    if (filters.maxBedCapacity !== undefined) {
      profileWhere.bedCapacity = {
        ...profileWhere.bedCapacity,
        [Op.lte]: filters.maxBedCapacity,
      }
    }

    if (filters.minSurgicalRooms !== undefined) {
      profileWhere.surgicalRooms = {
        [Op.gte]: filters.minSurgicalRooms,
      }
    }
    if (filters.maxSurgicalRooms !== undefined) {
      profileWhere.surgicalRooms = {
        ...profileWhere.surgicalRooms,
        [Op.lte]: filters.maxSurgicalRooms,
      }
    }

    if (complianceStatus) {
      profileWhere.complianceStatus = complianceStatus
    }

    // Build include for medical profile
    const includeProfile =
      Object.keys(profileWhere).length > 0
        ? {
            model: MedicalProfile,
            as: "medicalProfile",
            where: profileWhere,
          }
        : {
            model: MedicalProfile,
            as: "medicalProfile",
          }

    include.push(includeProfile)
    include.push({
      model: ContactPerson,
      as: "contactPersons",
      where: { isActive: true },
      required: false,
    })
    include.push({
      model: User,
      as: "assignedUser",
      attributes: ["id", "firstName", "lastName", "email"],
      required: false,
    })

    // Execute query with pagination at database level
    const queryOptions: any = {
      where: whereClause,
      include,
      order: [[sortBy, sortOrder]],
      distinct: true, // Important for correct count with joins
    }

    // Apply pagination (unless limit is -1, which means "all")
    if (limit !== -1) {
      queryOptions.limit = limit
      queryOptions.offset = (page - 1) * limit
    }

    const { rows: institutions, count: total } = await MedicalInstitution.findAndCountAll(queryOptions)

    ctx.body = {
      success: true,
      data: {
        institutions,
        pagination: {
          page,
          limit,
          total,
          totalPages: limit === -1 ? 1 : Math.ceil(total / limit),
        },
      },
    }

    logger.info("Medical institutions retrieved", {
      userId: ctx.state.user?.id,
      filters,
      count: total,
    })
  }

  /**
   * GET /api/institutions/:id
   * Get a specific medical institution by ID
   */
  static async getInstitution(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const institution = await MedicalInstitutionService.getInstitutionById(id)

    if (!institution) {
      throw new NotFoundError(`Institution with ID ${id} not found`)
    }

    ctx.body = {
      success: true,
      data: {
        institution,
      },
    }

    logger.info("Medical institution retrieved", {
      userId: ctx.state.user?.id,
      institutionId: id,
    })
  }

  /**
   * POST /api/institutions
   * Create a new medical institution
   */
  static async createInstitution(ctx: Context) {
    const { error, value } = createInstitutionSchema.validate(ctx.request.body)
    if (error) {
      throw new BadRequestError(error.details[0].message, error.details)
    }

    const user = ctx.state.user as User
    const institution = await MedicalInstitutionService.createInstitution(
      value,
      user.id
    )

    ctx.status = 201
    ctx.body = {
      success: true,
      message: "Medical institution created successfully",
      data: {
        institution,
      },
    }
  }

  /**
   * PUT /api/institutions/:id
   * Update a medical institution
   */
  static async updateInstitution(ctx: Context) {
    const { id } = ctx.params
    const { error, value } = updateInstitutionSchema.validate(ctx.request.body)

    if (error) {
      throw new BadRequestError(error.details[0].message, error.details)
    }

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const user = ctx.state.user as User
    const institution = await MedicalInstitutionService.updateInstitution(
      id,
      value,
      user.id
    )

    ctx.body = {
      success: true,
      message: "Medical institution updated successfully",
      data: {
        institution,
      },
    }
  }

  /**
   * PUT /api/institutions/:id/medical-profile
   * Update medical profile for an institution
   */
  static async updateMedicalProfile(ctx: Context) {
    const { id } = ctx.params
    const { error, value } = updateMedicalProfileSchema.validate(ctx.request.body)

    if (error) {
      throw new BadRequestError(error.details[0].message, error.details)
    }

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const user = ctx.state.user as User
    const medicalProfile = await MedicalInstitutionService.updateMedicalProfile(
      id,
      value,
      user.id
    )

    ctx.body = {
      success: true,
      message: "Medical profile updated successfully",
      data: {
        medicalProfile,
      },
    }
  }

  /**
   * DELETE /api/institutions/:id
   * Soft delete a medical institution
   */
  static async deleteInstitution(ctx: Context) {
    const { id } = ctx.params
    const force = ctx.query.force === 'true'

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const user = ctx.state.user as User
    await MedicalInstitutionService.deleteInstitution(id, user.id, force)

    ctx.body = {
      success: true,
      message: force
        ? "Medical institution permanently deleted"
        : "Medical institution deleted successfully",
    }
  }

  /**
   * POST /api/institutions/:id/contacts
   * Add a contact person to an institution
   */
  static async addContactPerson(ctx: Context) {
    const { id } = ctx.params
    const { error, value } = contactPersonSchema.validate(ctx.request.body)

    if (error) {
      throw new BadRequestError(error.details[0].message, error.details)
    }

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const user = ctx.state.user as User
    const contactPerson = await MedicalInstitutionService.addContactPerson(
      id,
      value,
      user.id
    )

    ctx.status = 201
    ctx.body = {
      success: true,
      message: "Contact person added successfully",
      data: {
        contactPerson,
      },
    }
  }

  /**
   * GET /api/institutions/search
   * Advanced search for medical institutions
   */
  static async searchInstitutions(ctx: Context) {
    const { error, value } = searchSchema.validate(ctx.query)
    if (error) {
      throw new BadRequestError(error.details[0].message, error.details)
    }

    // Use the same logic as getInstitutions but with more advanced search capabilities
    return MedicalInstitutionController.getInstitutions(ctx)
  }

  /**
   * POST /api/institutions/import
   * Import medical institutions from CSV
   * TODO: Implement file upload middleware
   */
  static async importFromCsv(ctx: ContextWithFiles) {
    const importOptionsSchema = Joi.object({
      skipDuplicates: Joi.boolean().default(true),
      mergeDuplicates: Joi.boolean().default(false),
      duplicateCheckFields: Joi.array()
        .items(Joi.string().valid("name", "email", "phone"))
        .default(["name"]),
      validateOnly: Joi.boolean().default(false),
    })

    // Validate options from query parameters
    const { error: optionsError, value: options } = importOptionsSchema.validate(
      ctx.query
    )
    if (optionsError) {
      throw new BadRequestError(
        optionsError.details[0].message,
        optionsError.details
      )
    }

    // Support both multer (ctx.file) and koa-body (ctx.request.files)
    const hasMulterFile = (ctx as any).file
    const file = hasMulterFile
      ? (ctx as any).file
      : (Array.isArray(ctx.request.files?.file)
        ? ctx.request.files?.file?.[0]
        : ctx.request.files?.file)

    if (!file) {
      throw new BadRequestError("CSV file is required")
    }

    const fileName = file.originalname || file.originalFilename
    const mime = file.mimetype
    if (!(fileName?.toLowerCase().endsWith(".csv") || mime === "text/csv" || mime === "application/vnd.ms-excel")) {
      throw new BadRequestError("File must be a CSV file")
    }

    // Read file content with encoding detection
    let csvData = ""
    if (hasMulterFile && file.buffer) {
      csvData = fixCsvEncoding(file.buffer)
    } else if ((file as any).filepath) {
      const fs = await import("fs")
      const buffer = await fs.promises.readFile((file as any).filepath)
      csvData = fixCsvEncoding(buffer)
    } else {
      throw new BadRequestError("Unable to read uploaded file")
    }

    // Import institutions
    const result = await CsvImportService.importMedicalInstitutions(csvData, {
      ...options,
      assignedUserId: ctx.state.user?.id,
    })

    ctx.body = {
      success: result.success,
      message: result.success
        ? "CSV import completed successfully"
        : "CSV import completed with errors",
      data: result,
    }

    logger.info("CSV import completed", {
      userId: ctx.state.user?.id,
      result: {
        totalRows: result.totalRows,
        successfulImports: result.successfulImports,
        failedImports: result.failedImports,
        duplicatesFound: result.duplicatesFound,
      },
    })
  }

  /**
   * GET /api/institutions/import/template
   * Download CSV template for medical institutions
   */
  static async downloadCsvTemplate(ctx: Context) {
    try {
      const template = CsvImportService.generateCsvTemplate()

      ctx.set("Content-Type", "text/csv")
      ctx.set(
        "Content-Disposition",
        "attachment; filename=medical_institutions_template.csv"
      )
      ctx.body = template

      logger.info("CSV template downloaded", {
        userId: ctx.state.user?.id,
      })
    } catch (error) {
      logger.error("Failed to generate CSV template", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/institutions/import/validate
   * Validate CSV data without importing
   */
  static async validateCsv(ctx: ContextWithFiles) {
    // Support both multer (ctx.file) and koa-body (ctx.request.files)
    const hasMulterFile = (ctx as any).file
    const file = hasMulterFile
      ? (ctx as any).file
      : (Array.isArray(ctx.request.files?.file)
        ? ctx.request.files?.file?.[0]
        : ctx.request.files?.file)
    
    if (!file) {
      throw new BadRequestError("CSV file is required", "FILE_REQUIRED")
    }

    const fileName = file.originalname || file.originalFilename
    const mime = file.mimetype
    if (!(fileName?.toLowerCase().endsWith(".csv") || mime === "text/csv" || mime === "application/vnd.ms-excel")) {
      throw new BadRequestError("File must be a CSV file", "INVALID_FILE_TYPE")
    }

    // Read file content with encoding detection
    let csvData = ""
    if (hasMulterFile && file.buffer) {
      csvData = fixCsvEncoding(file.buffer)
    } else if ((file as any).filepath) {
      const fs = await import("fs")
      const buffer = await fs.promises.readFile((file as any).filepath)
      csvData = fixCsvEncoding(buffer)
    } else {
      throw new BadRequestError("Unable to read uploaded file", "FILE_READ_ERROR")
    }

    // Validate CSV data
    const result = await CsvImportService.validateCsvData(csvData)

    ctx.body = {
      success: true,
      message: "CSV validation completed",
      data: {
        isValid: result.errors.length === 0,
        totalRows: result.totalRows,
        errors: result.errors,
        duplicatesFound: result.duplicatesFound,
      },
    }

    logger.info("CSV validation completed", {
      userId: ctx.state.user?.id,
      filename: file.originalFilename,
      isValid: result.errors.length === 0,
      totalRows: result.totalRows,
      errorCount: result.errors.length,
    })
  }

  /**
   * POST /api/institutions/import/preview
   * Preview CSV import with detailed matching information
   */
  static async previewCsv(ctx: ContextWithFiles) {
    // Support both multer (ctx.file) and koa-body (ctx.request.files)
    const hasMulterFile = (ctx as any).file
    const file = hasMulterFile
      ? (ctx as any).file
      : (Array.isArray(ctx.request.files?.file)
        ? ctx.request.files?.file?.[0]
        : ctx.request.files?.file)

    if (!file) {
      throw new BadRequestError("CSV file is required", "FILE_REQUIRED")
    }

    const fileName = file.originalname || file.originalFilename
    const mime = file.mimetype
    if (!(fileName?.toLowerCase().endsWith(".csv") || mime === "text/csv" || mime === "application/vnd.ms-excel")) {
      throw new BadRequestError("File must be a CSV file", "INVALID_FILE_TYPE")
    }

    // Read file content with encoding detection
    let csvData = ""
    if (hasMulterFile && file.buffer) {
      csvData = fixCsvEncoding(file.buffer)
    } else if ((file as any).filepath) {
      const fs = await import("fs")
      const buffer = await fs.promises.readFile((file as any).filepath)
      csvData = fixCsvEncoding(buffer)
    } else {
      throw new BadRequestError("Unable to read uploaded file", "FILE_READ_ERROR")
    }

    // Generate preview with matching information
      const result = await CsvImportService.previewCsvData(csvData)

      ctx.body = {
        success: true,
        message: "CSV preview generated",
        data: result,
      }

      logger.info("CSV preview generated", {
        userId: ctx.state.user?.id,
        filename: fileName,
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
      })
  }


  /**
   * GET /api/institutions/search/unified
   * Unified search across institutions, tasks, and collaboration features
   */
  static async unifiedSearch(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { 
        q: query, 
        type, 
        limit = 20, 
        offset = 0,
        institutionId,
        startDate,
        endDate,
        scope: rawScope
      } = ctx.query

      if (!query) {
        throw new BadRequestError("Search query is required", "QUERY_REQUIRED")
      }

      const searchTerm = String(query).trim()
      const searchLimit = Math.min(Number(limit), 100) // Max 100 results
      const searchOffset = Number(offset)

      // Apply team filtering based on user permissions
      const teamFilter = ctx.state.teamFilter || {
        userId: user.id,
        teamId: user.teamId,
        role: user.role,
      }

      // Determine requested scope (own | team | all) constrained by role
      const requestedScope = typeof rawScope === 'string' ? rawScope.toLowerCase() : undefined
      // Defaults per role
      let effectiveScope: 'own' | 'team' | 'all' = 'own'
      if (user.role === 'super_admin') effectiveScope = 'all'
      else if (user.role === 'team_admin') effectiveScope = 'team'
      // Apply requested scope if allowed
      if (requestedScope === 'own') effectiveScope = 'own'
      else if (requestedScope === 'team') {
        effectiveScope = user.role === 'user' ? 'own' : 'team'
      } else if (requestedScope === 'all') {
        effectiveScope = user.role === 'super_admin' ? 'all' : (user.role === 'team_admin' ? 'team' : 'own')
      }

      const useAll = effectiveScope === 'all'
      const useTeam = effectiveScope === 'team'

      // Resolve team members if team scope is active
      let teamMemberIds: string[] | null = null
      if (useTeam && teamFilter.teamId) {
        const teamMembers = await User.findByTeam(teamFilter.teamId)
        teamMemberIds = teamMembers.map((m) => m.id)
        if (teamMemberIds.length === 0) teamMemberIds = [teamFilter.userId]
      }

      const results: any = {
        institutions: [],
        tasks: [],
        notes: [],
        meetings: [],
        calls: [],
        reminders: [],
      }

      // Search institutions
      if (!type || type === 'institutions') {
        const institutions = await MedicalInstitution.findAll({
          where: {
            name: { [Op.iLike]: `%${searchTerm}%` },
            ...(institutionId && { id: institutionId }),
          },
          include: [
            {
              model: User,
              as: "assignedUser",
              attributes: ["id", "firstName", "lastName", "email"],
            },
          ],
          limit: searchLimit,
          offset: searchOffset,
        })

        results.institutions = institutions.map(inst => ({
          id: inst.id,
          type: 'institution',
          title: inst.name,
          subtitle: `${inst.type} - ${inst.getFullAddress()}`,
          assignedUser: inst.assignedUser,
          createdAt: inst.createdAt,
        }))
      }

      // Search tasks
      if (!type || type === 'tasks') {
        const { Task } = await import("../models/Task")
        const taskWhere: any = {
          [Op.or]: [
            { title: { [Op.iLike]: `%${searchTerm}%` } },
            { description: { [Op.iLike]: `%${searchTerm}%` } },
          ],
          ...(institutionId && { institutionId }),
        }

        // Apply team filtering for tasks
        if (!useAll) {
          if (teamMemberIds) {
            taskWhere[Op.and] = [
              taskWhere,
              {
                [Op.or]: [
                  { assigneeId: { [Op.in]: teamMemberIds } },
                  { creatorId: { [Op.in]: teamMemberIds } },
                ],
              },
            ]
          } else {
            taskWhere[Op.and] = [
              taskWhere,
              {
                [Op.or]: [
                  { assigneeId: teamFilter.userId },
                  { creatorId: teamFilter.userId },
                ],
              },
            ]
          }
        }

        const tasks = await Task.findAll({
          where: taskWhere,
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
              attributes: ["id", "name"],
            },
          ],
          limit: searchLimit,
          offset: searchOffset,
        })

        results.tasks = tasks.map(task => ({
          id: task.id,
          type: 'task',
          title: task.title,
          subtitle: task.description || '',
          assignee: task.assignee,
          creator: task.creator,
          institution: task.institution,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
        }))
      }

      // Search notes
      if (!type || type === 'notes') {
        const { Note } = await import("../models/Note")
        const noteWhere: any = {}

        // Search filters
        noteWhere[Op.or] = [
          { title: { [Op.iLike]: `%${searchTerm}%` } },
          { content: { [Op.iLike]: `%${searchTerm}%` } },
          { tags: { [Op.overlap]: [searchTerm] } as any },
        ]
        if (institutionId) noteWhere.institutionId = institutionId

        // Access control
        if (useAll) {
          // No additional restrictions
        } else if (teamMemberIds) {
          // Team admins: public notes, own notes, team-created public notes, or notes shared with them
          const teamIdsList = teamMemberIds.map((id) => `'${id}'`).join(", ")
          noteWhere[Op.and] = [
            noteWhere,
            {
              [Op.or]: [
                { creatorId: teamFilter.userId },
                { isPrivate: false },
                { creatorId: { [Op.in]: teamMemberIds }, isPrivate: false } as any,
                {
                  id: {
                    [Op.in]: literal(`(SELECT note_id FROM note_shares WHERE user_id = '${teamFilter.userId}')`),
                  },
                },
              ],
            },
          ]
        } else {
          // Regular users: own notes, public, or shared with them
          noteWhere[Op.and] = [
            noteWhere,
            {
              [Op.or]: [
                { creatorId: teamFilter.userId },
                { isPrivate: false },
                {
                  id: {
                    [Op.in]: literal(`(SELECT note_id FROM note_shares WHERE user_id = '${teamFilter.userId}')`),
                  },
                },
              ],
            },
          ]
        }

        const notes = await Note.findAll({
          where: noteWhere,
          include: [
            { model: User, as: "creator", attributes: ["id", "firstName", "lastName", "email"] },
            { model: MedicalInstitution, as: "institution", attributes: ["id", "name"] },
          ],
          limit: searchLimit,
          offset: searchOffset,
          order: [["createdAt", "DESC"]],
        })

        results.notes = notes.map(note => ({
          id: note.id,
          type: 'note',
          title: note.title,
          subtitle: note.content.slice(0, 100) + (note.content.length > 100 ? '...' : ''),
          creator: (note as any).creator,
          institution: (note as any).institution,
          tags: (note as any).tags,
          isPrivate: (note as any).isPrivate,
          createdAt: (note as any).createdAt,
        }))
      }

      // Search meetings
      if (!type || type === 'meetings') {
        const { Meeting } = await import("../models/Meeting")
        const meetingWhere: any = {
          [Op.or]: [
            { title: { [Op.iLike]: `%${searchTerm}%` } },
            { description: { [Op.iLike]: `%${searchTerm}%` } },
          ],
          ...(institutionId && { institutionId }),
        }

        // Access control
        if (useAll) {
          // No additional restriction
        } else if (teamMemberIds) {
          const idsList = teamMemberIds.map((id) => `'${id}'`).join(", ")
          meetingWhere[Op.and] = [
            meetingWhere,
            {
              [Op.or]: [
                { organizerId: { [Op.in]: teamMemberIds } },
                {
                  id: {
                    [Op.in]: literal(`(SELECT meeting_id FROM meeting_participants WHERE user_id IN (${idsList}))`),
                  },
                },
              ],
            },
          ]
        } else {
          meetingWhere[Op.and] = [
            meetingWhere,
            {
              [Op.or]: [
                { organizerId: teamFilter.userId },
                {
                  id: {
                    [Op.in]: literal(`(SELECT meeting_id FROM meeting_participants WHERE user_id = '${teamFilter.userId}')`),
                  },
                },
              ],
            },
          ]
        }

        const meetings = await Meeting.findAll({
          where: meetingWhere,
          include: [
            {
              model: User,
              as: "organizer",
              attributes: ["id", "firstName", "lastName", "email"],
            },
            {
              model: MedicalInstitution,
              as: "institution",
              attributes: ["id", "name"],
            },
          ],
          limit: searchLimit,
          offset: searchOffset,
        })

        results.meetings = meetings.map(meeting => ({
          id: meeting.id,
          type: 'meeting',
          title: meeting.title,
          subtitle: meeting.description || '',
          organizer: meeting.organizer,
          institution: meeting.institution,
          startDate: meeting.startDate,
          endDate: meeting.endDate,
          status: meeting.status,
          createdAt: meeting.createdAt,
        }))
      }

      // Search calls
      if (!type || type === 'calls') {
        const { Call } = await import("../models/Call")
        
        const calls = await Call.findAll({
          where: {
            [Op.or]: [
              { phoneNumber: { [Op.iLike]: `%${searchTerm}%` } },
              { summary: { [Op.iLike]: `%${searchTerm}%` } },
            ],
            ...(institutionId && { institutionId }),
            ...(
              useAll
                ? {}
                : teamMemberIds
                  ? { userId: { [Op.in]: teamMemberIds } }
                  : { userId: teamFilter.userId }
            ),
          },
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "email"],
            },
            {
              model: MedicalInstitution,
              as: "institution",
              attributes: ["id", "name"],
            },
          ],
          limit: searchLimit,
          offset: searchOffset,
        })

        results.calls = calls.map(call => ({
          id: call.id,
          type: 'call',
          title: `Call to ${call.phoneNumber}`,
          subtitle: call.summary || '',
          user: call.user,
          institution: call.institution,
          phoneNumber: call.phoneNumber,
          duration: call.duration,
          callType: call.callType,
          createdAt: call.createdAt,
        }))
      }

      // Search reminders
      if (!type || type === 'reminders') {
        const { Reminder } = await import("../models/Reminder")
        
        const reminders = await Reminder.findAll({
          where: {
            [Op.or]: [
              { title: { [Op.iLike]: `%${searchTerm}%` } },
              { description: { [Op.iLike]: `%${searchTerm}%` } },
            ],
            ...(institutionId && { institutionId }),
            ...(
              useAll
                ? {}
                : teamMemberIds
                  ? { userId: { [Op.in]: teamMemberIds } }
                  : { userId: teamFilter.userId }
            ),
          },
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "email"],
            },
            {
              model: MedicalInstitution,
              as: "institution",
              attributes: ["id", "name"],
            },
          ],
          limit: searchLimit,
          offset: searchOffset,
        })

        results.reminders = reminders.map(reminder => ({
          id: reminder.id,
          type: 'reminder',
          title: reminder.title,
          subtitle: reminder.description || '',
          user: reminder.user,
          institution: reminder.institution,
          dueDate: reminder.reminderDate,
          priority: reminder.priority,
          isCompleted: reminder.isCompleted,
          createdAt: reminder.createdAt,
        }))
      }

      // Calculate totals
      const totals = {
        institutions: results.institutions.length,
        tasks: results.tasks.length,
        notes: results.notes.length,
        meetings: results.meetings.length,
        calls: results.calls.length,
        reminders: results.reminders.length,
      }

      const totalResults = Object.values(totals).reduce((sum, count) => sum + count, 0)

      ctx.body = {
        query: searchTerm,
        results,
        totals,
        totalResults,
        pagination: {
          limit: searchLimit,
          offset: searchOffset,
        },
      }

      logger.info("Unified search completed", {
        userId: user.id,
        query: searchTerm,
        totalResults,
        totals,
      })
    } catch (error) {
      logger.error("Unified search failed", {
        userId: ctx.state.user?.id,
        query: ctx.query.q,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/institutions/import/template
   * Download CSV template for medical institutions
   */
  static async getImportTemplate(ctx: Context) {
    const template = CsvImportService.getMedicalInstitutionTemplate()

    ctx.set("Content-Type", "text/csv")
    ctx.set("Content-Disposition", 'attachment; filename="institutions_import_template.csv"')
    ctx.body = template
  }


  /**
   * GET /api/institutions/:id/stats
   * Get statistics for a medical institution
   */
  static async getInstitutionStats(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const user = ctx.state.user as User
    const collaborationData = await MedicalInstitutionAnalyticsService.getCollaborationData(id, user.id)

    ctx.body = {
      success: true,
      data: collaborationData.stats,
    }
  }

  /**
   * GET /api/institutions/:id/revenue
   * Get revenue analytics for a medical institution
   */
  static async getInstitutionRevenue(ctx: Context) {
    const { id } = ctx.params
    const { period, startDate, endDate } = ctx.query

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const revenue = await InstitutionRevenueService.getRevenueAnalytics(id, {
      period: period as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    } as any)

    ctx.body = {
      success: true,
      data: revenue,
    }
  }

  /**
   * GET /api/institutions/:id/activity
   * Get activity timeline for a medical institution
   */
  static async getInstitutionActivity(ctx: Context) {
    const { id } = ctx.params
    const { page = 1, limit = 20, startDate, endDate } = ctx.query

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const user = ctx.state.user as User
    const activity = await MedicalInstitutionAnalyticsService.getTimeline({
      institutionId: id,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      userId: user.id,
    })

    ctx.body = {
      success: true,
      data: activity,
    }
  }

  /**
   * GET /api/institutions/:id/contacts
   * Get all contact persons for an institution
   */
  static async getInstitutionContacts(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const contacts = await MedicalInstitutionService.getInstitutionContacts(id)

    ctx.body = {
      success: true,
      data: contacts,
    }
  }

  /**
   * GET /api/institutions/:id/documents
   * Get all documents for an institution
   */
  static async getInstitutionDocuments(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const documents = await MedicalInstitutionService.getInstitutionDocuments(id)

    ctx.body = {
      success: true,
      data: documents,
    }
  }

  /**
   * GET /api/institutions/:id/tasks
   * Get all tasks for an institution
   */
  static async getInstitutionTasks(ctx: Context) {
    const { id } = ctx.params
    const { status } = ctx.query

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const tasks = await MedicalInstitutionService.getInstitutionTasks(
      id,
      status as TaskStatus
    )

    ctx.body = {
      success: true,
      data: tasks,
    }
  }

  /**
   * GET /api/institutions/:id/notes
   * Get all notes for an institution
   */
  static async getInstitutionNotes(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const notes = await MedicalInstitutionService.getInstitutionNotes(id)

    ctx.body = {
      success: true,
      data: notes,
    }
  }

  /**
   * GET /api/institutions/:id/audit-log
   * Get audit log for an institution
   */
  static async getInstitutionAuditLog(ctx: Context) {
    const { id } = ctx.params
    const { page = 1, limit = 20 } = ctx.query

    if (!id) {
      throw new BadRequestError("Institution ID is required")
    }

    const auditLog = await MedicalInstitutionService.getInstitutionAuditLog(id, {
      page: Number(page),
      limit: Number(limit),
    })

    ctx.body = {
      success: true,
      data: auditLog,
    }
  }

  /**
   * GET /api/institutions/:id/revenue
   * Get comprehensive revenue analytics for an institution
   */
  static async getRevenueAnalytics(ctx: Context) {
    try {
      const { id } = ctx.params
      const { months, includePaymentHistory } = ctx.query

      const analytics = await InstitutionRevenueService.getRevenueAnalytics(id, {
        months: months ? parseInt(months as string, 10) : 12,
        includePaymentHistory: includePaymentHistory === "true",
      })

      ctx.body = {
        success: true,
        data: analytics,
      }

      logger.info("Revenue analytics retrieved", {
        userId: ctx.state.user?.id,
        institutionId: id,
        totalRevenue: analytics.summary.totalRevenue,
      })
    } catch (error) {
      logger.error("Failed to retrieve revenue analytics", {
        userId: ctx.state.user?.id,
        institutionId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/institutions/:id/health-score
   * Get health score for an institution
   */
  static async getHealthScore(ctx: Context) {
    try {
      const { id } = ctx.params

      const { InstitutionHealthScoreService } = await import("../services/InstitutionHealthScoreService")
      const healthScore = await InstitutionHealthScoreService.calculateHealthScore(id)

      ctx.body = {
        success: true,
        data: healthScore,
      }

      logger.info("Health score retrieved", {
        userId: ctx.state.user?.id,
        institutionId: id,
        score: healthScore.total,
        level: healthScore.level,
      })
    } catch (error) {
      logger.error("Failed to retrieve health score", {
        userId: ctx.state.user?.id,
        institutionId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/institutions/:id/lead-score
   * Get lead score for an institution
   */
  static async getLeadScore(ctx: Context) {
    try {
      const { id } = ctx.params

      const { InstitutionInsightsService } = await import("../services/InstitutionInsightsService")
      const leadScore = await InstitutionInsightsService.calculateLeadScore(id)

      ctx.body = {
        success: true,
        data: leadScore,
      }

      logger.info("Lead score retrieved", {
        userId: ctx.state.user?.id,
        institutionId: id,
        score: leadScore.score,
        level: leadScore.level,
      })
    } catch (error) {
      logger.error("Failed to retrieve lead score", {
        userId: ctx.state.user?.id,
        institutionId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/institutions/:id/next-actions
   * Get recommended next best actions for an institution
   */
  static async getNextActions(ctx: Context) {
    try {
      const { id } = ctx.params

      const { InstitutionInsightsService } = await import("../services/InstitutionInsightsService")
      const actions = await InstitutionInsightsService.getNextBestActions(id)

      ctx.body = {
        success: true,
        data: actions,
      }

      logger.info("Next actions retrieved", {
        userId: ctx.state.user?.id,
        institutionId: id,
        actionCount: actions.length,
      })
    } catch (error) {
      logger.error("Failed to retrieve next actions", {
        userId: ctx.state.user?.id,
        institutionId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/institutions/hot-leads
   * Get list of hot leads
   */
  static async getHotLeads(ctx: Context) {
    try {
      const { limit = 20 } = ctx.query

      const { InstitutionInsightsService } = await import("../services/InstitutionInsightsService")
      const hotLeads = await InstitutionInsightsService.getHotLeads(parseInt(limit as string, 10))

      ctx.body = {
        success: true,
        data: hotLeads,
      }

      logger.info("Hot leads retrieved", {
        userId: ctx.state.user?.id,
        count: hotLeads.length,
      })
    } catch (error) {
      logger.error("Failed to retrieve hot leads", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/institutions/:id/collaboration
   * Get collaboration data for a specific institution
   */
  static async getCollaborationData(ctx: Context) {
    const institutionId = ctx.params.id
    const user = ctx.state.user as User

    const data = await MedicalInstitutionAnalyticsService.getCollaborationData(
      institutionId,
      user.id
    )

    ctx.body = data
  }

  /**
   * GET /api/institutions/:id/timeline
   * Get timeline of all interactions for a specific institution
   */
  static async getTimeline(ctx: Context) {
    const institutionId = ctx.params.id
    const user = ctx.state.user as User
    const { limit = 50, offset = 0, startDate, endDate } = ctx.query

    const data = await MedicalInstitutionAnalyticsService.getTimeline({
      institutionId,
      limit: Number(limit),
      offset: Number(offset),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      userId: user.id,
    })

    ctx.body = data
  }
}
