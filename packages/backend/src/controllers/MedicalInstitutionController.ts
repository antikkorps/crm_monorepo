import { ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import Joi from "joi"
import { Op, literal } from "sequelize"
import { sequelize } from "../config/database"
import { Context } from "../types/koa"
import { createError } from "../middleware/errorHandler"
import { ContactPerson, MedicalInstitution, MedicalProfile, User } from "../models"
import { TaskStatus } from "../models/Task"
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

  /**
   * GET /api/institutions/:id/collaboration
   * Get collaboration data for a specific institution
   */
  static async getCollaborationData(ctx: Context) {
    try {
      const institutionId = ctx.params.id
      const user = ctx.state.user as User

      // Get collaboration data in parallel
      const [notes, meetings, calls, reminders, tasks] = await Promise.all([
        // Get notes related to this institution
        import("../models/Note").then(({ Note }) =>
          Note.findByInstitution(institutionId)
        ),
        // Get meetings related to this institution
        import("../models/Meeting").then(({ Meeting }) =>
          Meeting.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "organizer",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            order: [["createdAt", "DESC"]],
          })
        ),
        // Get calls related to this institution
        import("../models/Call").then(({ Call }) =>
          Call.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            order: [["createdAt", "DESC"]],
          })
        ),
        // Get reminders related to this institution
        import("../models/Reminder").then(({ Reminder }) =>
          Reminder.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            // Reminder model uses "reminderDate"
            order: [["reminderDate", "ASC"]],
          })
        ),
        // Get tasks related to this institution
        import("../models/Task").then(({ Task }) =>
          Task.findAll({
            where: { institutionId },
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
            ],
            order: [["createdAt", "DESC"]],
          })
        ),
      ])

      // Get summary statistics
      const stats = {
        totalNotes: notes.length,
        totalMeetings: meetings.length,
        totalCalls: calls.length,
        totalReminders: reminders.length,
        totalTasks: tasks.length,
        upcomingMeetings: meetings.filter(m => new Date(m.startDate) > new Date()).length,
        pendingReminders: reminders.filter(r => !r.isCompleted && new Date(r.reminderDate) > new Date()).length,
        openTasks: tasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED).length,
      }

      ctx.body = {
        stats,
        recentNotes: notes.slice(0, 5),
        upcomingMeetings: meetings
          .filter(m => new Date(m.startDate) > new Date())
          .slice(0, 5),
        recentCalls: calls.slice(0, 5),
        pendingReminders: reminders
          .filter(r => !r.isCompleted)
          .slice(0, 5),
        openTasks: tasks
          .filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED)
          .slice(0, 10),
      }

      logger.info("Collaboration data retrieved", {
        userId: user.id,
        institutionId,
        stats,
      })
    } catch (error) {
      logger.error("Failed to get collaboration data", {
        userId: ctx.state.user?.id,
        institutionId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * GET /api/institutions/:id/timeline
   * Get timeline of all interactions for a specific institution
   */
  static async getTimeline(ctx: Context) {
    try {
      const institutionId = ctx.params.id
      const user = ctx.state.user as User
      const { limit = 50, offset = 0, startDate, endDate } = ctx.query

      const whereClause: any = { institutionId }
      
      // Add date filtering if provided
      if (startDate || endDate) {
        whereClause.createdAt = {}
        if (startDate) {
          whereClause.createdAt.$gte = new Date(startDate as string)
        }
        if (endDate) {
          whereClause.createdAt.$lte = new Date(endDate as string)
        }
      }

      // Get all interactions for this institution
      const [notes, meetings, calls, reminders, tasks] = await Promise.all([
        import("../models/Note").then(({ Note }) =>
          Note.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "creator",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
        import("../models/Meeting").then(({ Meeting }) =>
          Meeting.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "organizer",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
        import("../models/Call").then(({ Call }) =>
          Call.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
        import("../models/Reminder").then(({ Reminder }) =>
          Reminder.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
        import("../models/Task").then(({ Task }) =>
          Task.findAll({
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
            ],
          })
        ),
      ])

      // Combine all interactions into a timeline
      const timelineItems: any[] = []

      // Add notes to timeline
      notes.forEach(note => {
        timelineItems.push({
          id: note.id,
          type: 'note',
          title: note.title,
          description: note.content.slice(0, 200) + (note.content.length > 200 ? '...' : ''),
          user: note.creator,
          createdAt: note.createdAt,
          metadata: {
            tags: note.tags,
            isPrivate: note.isPrivate,
          },
        })
      })

      // Add meetings to timeline
      meetings.forEach(meeting => {
        timelineItems.push({
          id: meeting.id,
          type: 'meeting',
          title: meeting.title,
          description: meeting.description || '',
          user: meeting.organizer,
          createdAt: meeting.createdAt,
          metadata: {
            startDate: meeting.startDate,
            endDate: meeting.endDate,
            location: meeting.location,
            status: meeting.status,
          },
        })
      })

      // Add calls to timeline
      calls.forEach(call => {
        timelineItems.push({
          id: call.id,
          type: 'call',
          title: `Call to ${call.phoneNumber}`,
          description: call.summary || '',
          user: call.user,
          createdAt: call.createdAt,
          metadata: {
            phoneNumber: call.phoneNumber,
            duration: call.duration,
            callType: call.callType,
          },
        })
      })

      // Add reminders to timeline
      reminders.forEach(reminder => {
        timelineItems.push({
          id: reminder.id,
          type: 'reminder',
          title: reminder.title,
          description: reminder.description || '',
          user: reminder.user,
          createdAt: reminder.createdAt,
          metadata: {
            dueDate: reminder.reminderDate,
            priority: reminder.priority,
            isCompleted: reminder.isCompleted,
          },
        })
      })

      // Add tasks to timeline
      tasks.forEach(task => {
        timelineItems.push({
          id: task.id,
          type: 'task',
          title: task.title,
          description: task.description || '',
          user: task.creator,
          assignee: task.assignee,
          createdAt: task.createdAt,
          metadata: {
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
          },
        })
      })

      // Sort by creation date (most recent first)
      timelineItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Apply pagination
      const total = timelineItems.length
      const paginatedItems = timelineItems.slice(Number(offset), Number(offset) + Number(limit))

      ctx.body = {
        items: paginatedItems,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total,
        },
      }

      logger.info("Timeline retrieved", {
        userId: user.id,
        institutionId,
        totalItems: total,
        itemsReturned: paginatedItems.length,
      })
    } catch (error) {
      logger.error("Failed to get timeline", {
        userId: ctx.state.user?.id,
        institutionId: ctx.params.id,
        error: (error as Error).message,
      })
      throw error
    }
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
        throw createError("Search query is required", 400, "QUERY_REQUIRED")
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
}
