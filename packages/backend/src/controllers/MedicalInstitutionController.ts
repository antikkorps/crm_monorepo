import { ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import Joi from "joi"
import { Context } from "../types/koa"
import { createError } from "../middleware/errorHandler"
import { ContactPerson, MedicalInstitution, MedicalProfile, User } from "../models"
import { CsvImportService } from "../services/CsvImportService"
import { NotificationService } from "../services/NotificationService"
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
  ],
  (schema) => schema.optional()
)

const searchSchema = Joi.object({
  name: Joi.string().trim().optional(),
  type: Joi.string()
    .valid(...Object.values(InstitutionType))
    .optional(),
  city: Joi.string().trim().optional(),
  state: Joi.string().trim().optional(),
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
  tags: Joi.alternatives()
    .try(Joi.string().trim(), Joi.array().items(Joi.string().trim()))
    .optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid("name", "type", "createdAt", "updatedAt").default("name"),
  sortOrder: Joi.string().valid("ASC", "DESC").default("ASC"),
})

export class MedicalInstitutionController {
  /**
   * GET /api/institutions
   * Get all medical institutions with optional filtering and pagination
   */
  static async getInstitutions(ctx: Context) {
    const { error, value } = searchSchema.validate(ctx.query)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    const {
      name,
      type,
      city,
      state,
      assignedUserId,
      specialties,
      minBedCapacity,
      maxBedCapacity,
      minSurgicalRooms,
      maxSurgicalRooms,
      complianceStatus,
      tags,
      isActive,
      page,
      limit,
      sortBy,
      sortOrder,
    } = value

    // Build search filters
    const filters: any = {}

    try {
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
      if (assignedUserId) {
        filters.assignedUserId = assignedUserId
      }
      if (isActive !== undefined) {
        filters.isActive = isActive
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

      // Search institutions
      const institutions = await MedicalInstitution.searchInstitutions(filters)

      // Apply pagination and sorting
      const offset = (page - 1) * limit
      const sortedInstitutions = institutions
        .sort((a, b) => {
          const aValue = a[sortBy as keyof typeof a] as any
          const bValue = b[sortBy as keyof typeof b] as any

          if (sortOrder === "DESC") {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
          }
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        })
        .slice(offset, offset + limit)

      ctx.body = {
        success: true,
        data: {
          institutions: sortedInstitutions,
          pagination: {
            page,
            limit,
            total: institutions.length,
            totalPages: Math.ceil(institutions.length / limit),
          },
        },
      }

      logger.info("Medical institutions retrieved", {
        userId: ctx.state.user?.id,
        filters,
        count: sortedInstitutions.length,
      })
    } catch (error) {
      logger.error("Failed to retrieve medical institutions", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
        filters,
      })
      throw error
    }
  }

  /**
   * GET /api/institutions/:id
   * Get a specific medical institution by ID
   */
  static async getInstitution(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw createError("Institution ID is required", 400, "MISSING_ID")
    }

    try {
      const institution = await MedicalInstitution.findByPk(id, {
        include: [
          {
            model: MedicalProfile,
            as: "medicalProfile",
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
      })

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
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
    } catch (error) {
      logger.error("Failed to retrieve medical institution", {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * POST /api/institutions
   * Create a new medical institution
   */
  static async createInstitution(ctx: Context) {
    const { error, value } = createInstitutionSchema.validate(ctx.request.body)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    const { medicalProfile, contactPersons, ...institutionData } = value

    try {
      // Create institution
      const institution = await MedicalInstitution.create(institutionData)

      // Create medical profile
      await MedicalProfile.create({
        ...medicalProfile,
        institutionId: institution.id,
      })

      // Create contact persons
      if (contactPersons && contactPersons.length > 0) {
        // Ensure only one primary contact
        let hasPrimary = false
        const processedContacts = contactPersons.map((contact: any) => {
          if (contact.isPrimary && hasPrimary) {
            contact.isPrimary = false
          } else if (contact.isPrimary) {
            hasPrimary = true
          }
          return {
            ...contact,
            institutionId: institution.id,
          }
        })

        await ContactPerson.bulkCreate(processedContacts)
      }

      // Fetch the complete institution with associations
      const completeInstitution = await MedicalInstitution.findByPk(institution.id, {
        include: [
          {
            model: MedicalProfile,
            as: "medicalProfile",
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
      })

      // Send notification to team
      const user = ctx.state.user as User
      const notificationSvc = NotificationService.getInstance()
      await notificationSvc.notifyInstitutionCreated(completeInstitution, user)

      ctx.status = 201
      ctx.body = {
        success: true,
        message: "Medical institution created successfully",
        data: {
          institution: completeInstitution,
        },
      }

      logger.info("Medical institution created", {
        userId: ctx.state.user?.id,
        institutionId: institution.id,
        institutionName: institution.name,
      })
    } catch (error) {
      logger.error("Failed to create medical institution", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
        institutionData,
      })
      throw error
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
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    if (!id) {
      throw createError("Institution ID is required", 400, "MISSING_ID")
    }

    try {
      const institution = await MedicalInstitution.findByPk(id)

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // Track changes for notifications
      const changes = Object.keys(value)

      // Update institution
      await institution.update(value)

      // Fetch updated institution with associations
      const updatedInstitution = await MedicalInstitution.findByPk(id, {
        include: [
          {
            model: MedicalProfile,
            as: "medicalProfile",
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
      })

      // Send notification about the update
      const user = ctx.state.user as User
      const notificationSvc = NotificationService.getInstance()
      await notificationSvc.notifyInstitutionUpdated(updatedInstitution, user, changes)

      ctx.body = {
        success: true,
        message: "Medical institution updated successfully",
        data: {
          institution: updatedInstitution,
        },
      }

      logger.info("Medical institution updated", {
        userId: ctx.state.user?.id,
        institutionId: id,
        changes: value,
      })
    } catch (error) {
      logger.error("Failed to update medical institution", {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
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
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    if (!id) {
      throw createError("Institution ID is required", 400, "MISSING_ID")
    }

    try {
      const institution = await MedicalInstitution.findByPk(id)

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // Find and update medical profile
      const medicalProfile = await MedicalProfile.findOne({
        where: { institutionId: id },
      })

      if (!medicalProfile) {
        throw createError("Medical profile not found", 404, "MEDICAL_PROFILE_NOT_FOUND")
      }

      await medicalProfile.update(value)

      ctx.body = {
        success: true,
        message: "Medical profile updated successfully",
        data: {
          medicalProfile,
        },
      }

      logger.info("Medical profile updated", {
        userId: ctx.state.user?.id,
        institutionId: id,
        changes: value,
      })
    } catch (error) {
      logger.error("Failed to update medical profile", {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * DELETE /api/institutions/:id
   * Soft delete a medical institution
   */
  static async deleteInstitution(ctx: Context) {
    const { id } = ctx.params

    if (!id) {
      throw createError("Institution ID is required", 400, "MISSING_ID")
    }

    try {
      const institution = await MedicalInstitution.findByPk(id)

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // Soft delete by setting isActive to false
      await institution.update({ isActive: false })

      ctx.body = {
        success: true,
        message: "Medical institution deleted successfully",
      }

      logger.info("Medical institution deleted", {
        userId: ctx.state.user?.id,
        institutionId: id,
        institutionName: institution.name,
      })
    } catch (error) {
      logger.error("Failed to delete medical institution", {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
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
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
    }

    if (!id) {
      throw createError("Institution ID is required", 400, "MISSING_ID")
    }

    try {
      const institution = await MedicalInstitution.findByPk(id)

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // If this is set as primary, remove primary status from others
      if (value.isPrimary) {
        await ContactPerson.update(
          { isPrimary: false },
          {
            where: {
              institutionId: id,
              isActive: true,
            },
          }
        )
      }

      // Create contact person
      const contactPerson = await ContactPerson.create({
        ...value,
        institutionId: id,
      })

      ctx.status = 201
      ctx.body = {
        success: true,
        message: "Contact person added successfully",
        data: {
          contactPerson,
        },
      }

      logger.info("Contact person added", {
        userId: ctx.state.user?.id,
        institutionId: id,
        contactPersonId: contactPerson.id,
      })
    } catch (error) {
      logger.error("Failed to add contact person", {
        userId: ctx.state.user?.id,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/institutions/search
   * Advanced search for medical institutions
   */
  static async searchInstitutions(ctx: Context) {
    const { error, value } = searchSchema.validate(ctx.query)
    if (error) {
      throw createError(error.details[0].message, 400, "VALIDATION_ERROR", error.details)
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
      throw createError(
        optionsError.details[0].message,
        400,
        "VALIDATION_ERROR",
        optionsError.details
      )
    }

    // Check if file is provided
    if (!ctx.request.files || !ctx.request.files.file) {
      throw createError("CSV file is required", 400, "FILE_REQUIRED")
    }

    const file = Array.isArray(ctx.request.files.file)
      ? ctx.request.files.file[0]
      : ctx.request.files.file

    if (!file) {
      throw createError("CSV file is required", 400, "FILE_REQUIRED")
    }

    // Validate file type
    if (!file.originalFilename?.endsWith(".csv") && file.mimetype !== "text/csv") {
      throw createError("File must be a CSV file", 400, "INVALID_FILE_TYPE")
    }

    try {
      // Read file content
      const fs = await import("fs")
      const csvData = fs.readFileSync(file.filepath, "utf8")

      // Import institutions
      const result = await CsvImportService.importMedicalInstitutions(csvData, {
        ...options,
        userId: ctx.state.user?.id,
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
    } catch (error) {
      logger.error("CSV import failed", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
        filename: file.originalFilename,
      })
      throw error
    }
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
    // Check if file is provided
    if (!ctx.request.files || !ctx.request.files.file) {
      throw createError("CSV file is required", 400, "FILE_REQUIRED")
    }

    const file = Array.isArray(ctx.request.files.file)
      ? ctx.request.files.file[0]
      : ctx.request.files.file

    if (!file) {
      throw createError("CSV file is required", 400, "FILE_REQUIRED")
    }

    // Validate file type
    if (!file.originalFilename?.endsWith(".csv") && file.mimetype !== "text/csv") {
      throw createError("File must be a CSV file", 400, "INVALID_FILE_TYPE")
    }

    try {
      // Read file content
      const fs = await import("fs")
      const csvData = fs.readFileSync(file.filepath, "utf8")

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
    } catch (error) {
      logger.error("CSV validation failed", {
        userId: ctx.state.user?.id,
        error: (error as Error).message,
        filename: file.originalFilename,
      })
      throw error
    }
  }
}
