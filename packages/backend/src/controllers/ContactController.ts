import Joi from "joi"
import { Op } from "sequelize"
import { Context } from "../types/koa"
import { createError } from "../middleware/errorHandler"
import { ContactPerson, MedicalInstitution, User } from "../models"
import { UserRole } from "../models/User"
import { logger } from "../utils/logger"

// Validation schemas
const contactSchema = Joi.object({
  institutionId: Joi.string().uuid().required().messages({
    "any.required": "Institution ID is required",
    "string.guid": "Invalid institution ID format",
  }),
  firstName: Joi.string().required().trim().min(1).max(50).messages({
    "any.required": "First name is required",
    "string.empty": "First name cannot be empty",
    "string.min": "First name must be at least 1 character long",
    "string.max": "First name must be less than 50 characters",
  }),
  lastName: Joi.string().required().trim().min(1).max(50).messages({
    "any.required": "Last name is required",
    "string.empty": "Last name cannot be empty",
    "string.min": "Last name must be at least 1 character long",
    "string.max": "Last name must be less than 50 characters",
  }),
  email: Joi.string().email().required().messages({
    "any.required": "Email is required",
    "string.email": "Invalid email format",
  }),
  phone: Joi.string().allow("").optional().max(20).pattern(/^[\+]?[1-9][\d]{0,15}$/).messages({
    "string.max": "Phone number must be less than 20 characters",
    "string.pattern.base": "Invalid phone number format",
  }),
  title: Joi.string().allow("").optional().max(100).messages({
    "string.max": "Title must be less than 100 characters",
  }),
  department: Joi.string().allow("").optional().max(100).messages({
    "string.max": "Department must be less than 100 characters",
  }),
  isPrimary: Joi.boolean().default(false),
})

const updateContactSchema = contactSchema.fork(
  ["institutionId", "firstName", "lastName", "email"],
  (schema) => schema.optional()
)

const searchSchema = Joi.object({
  query: Joi.string().optional().trim(),
  institutionId: Joi.string().uuid().optional(),
  department: Joi.string().optional().trim(),
  isPrimary: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid("firstName", "lastName", "email", "title", "department", "createdAt").default("firstName"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc"),
})

export class ContactController {
  /**
   * Get all contacts with filtering and pagination
   * GET /api/contacts
   */
  static async getContacts(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { error, value } = searchSchema.validate(ctx.query)

      if (error) {
        throw createError(error.details[0].message, 400, "VALIDATION_ERROR")
      }

      const { query, institutionId, department, isPrimary, page, limit, sortBy, sortOrder } = value
      const offset = (page - 1) * limit

      // Build where clause based on user permissions and filters
      let whereClause: any = {
        isActive: true,
      }

      // Apply search query
      if (query) {
        whereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${query}%` } },
          { lastName: { [Op.iLike]: `%${query}%` } },
          { email: { [Op.iLike]: `%${query}%` } },
          { title: { [Op.iLike]: `%${query}%` } },
          { department: { [Op.iLike]: `%${query}%` } },
        ]
      }

      // Apply filters
      if (institutionId) {
        whereClause.institutionId = institutionId
      }

      if (department) {
        whereClause.department = { [Op.iLike]: `%${department}%` }
      }

      if (isPrimary !== undefined) {
        whereClause.isPrimary = isPrimary
      }

      // Apply role-based access control
      const includeOptions: any = [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type", "assignedUserId"],
        },
      ]

      // Regular users can only see contacts for institutions assigned to them
      if (user.role === UserRole.USER) {
        includeOptions[0].where = {
          assignedUserId: user.id,
        }
      }
      // Team admins can see contacts for institutions assigned to their team
      else if (user.role === UserRole.TEAM_ADMIN) {
        includeOptions[0].include = [
          {
            model: User,
            as: "assignedUser",
            where: { teamId: user.teamId },
            attributes: [],
          },
        ]
        includeOptions[0].required = false
      }

      const contacts = await ContactPerson.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        limit,
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true,
      })

      ctx.body = {
        success: true,
        data: contacts.rows.map(contact => contact.toJSON()),
        pagination: {
          page,
          limit,
          total: contacts.count,
          totalPages: Math.ceil(contacts.count / limit),
        },
      }
    } catch (error) {
      logger.error("Error in getContacts:", { error, userId: ctx.state.user?.id })
      if (error && typeof error === "object" && "code" in error) {
        throw error
      }
      throw createError("Failed to retrieve contacts", 500, "INTERNAL_ERROR")
    }
  }

  /**
   * Advanced search for contacts
   * GET /api/contacts/search
   */
  static async searchContacts(ctx: Context) {
    // Reuse getContacts logic with search functionality
    await ContactController.getContacts(ctx)
  }

  /**
   * Get a specific contact
   * GET /api/contacts/:id
   */
  static async getContact(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      if (!id) {
        throw createError("Contact ID is required", 400, "VALIDATION_ERROR")
      }

      const includeOptions: any = [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type", "assignedUserId"],
        },
      ]

      // Apply role-based access control
      if (user.role === UserRole.USER) {
        includeOptions[0].where = {
          assignedUserId: user.id,
        }
      } else if (user.role === UserRole.TEAM_ADMIN) {
        includeOptions[0].include = [
          {
            model: User,
            as: "assignedUser",
            where: { teamId: user.teamId },
            attributes: [],
          },
        ]
      }

      const contact = await ContactPerson.findOne({
        where: {
          id,
          isActive: true,
        },
        include: includeOptions,
      })

      if (!contact) {
        throw createError("Contact not found", 404, "CONTACT_NOT_FOUND")
      }

      ctx.body = {
        success: true,
        data: contact.toJSON(),
      }
    } catch (error) {
      logger.error("Error in getContact:", { error, contactId: ctx.params.id, userId: ctx.state.user?.id })
      if (error && typeof error === "object" && "code" in error) {
        throw error
      }
      throw createError("Failed to retrieve contact", 500, "INTERNAL_ERROR")
    }
  }

  /**
   * Create a new contact
   * POST /api/contacts
   */
  static async createContact(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { error, value } = contactSchema.validate(ctx.request.body)

      if (error) {
        throw createError(error.details[0].message, 400, "VALIDATION_ERROR")
      }

      const { institutionId, firstName, lastName, email, phone, title, department, isPrimary } = value

      // Check if institution exists and user has access to it
      const includeOptions: any = []
      let institutionWhere: any = { id: institutionId }

      if (user.role === UserRole.USER) {
        institutionWhere.assignedUserId = user.id
      } else if (user.role === UserRole.TEAM_ADMIN) {
        includeOptions.push({
          model: User,
          as: "assignedUser",
          where: { teamId: user.teamId },
          attributes: [],
        })
      }

      const institution = await MedicalInstitution.findOne({
        where: institutionWhere,
        include: includeOptions,
      })

      if (!institution) {
        throw createError("Institution not found or access denied", 404, "INSTITUTION_NOT_FOUND")
      }

      // Check if email already exists
      const existingContact = await ContactPerson.findByEmail(email)
      if (existingContact) {
        throw createError("A contact with this email already exists", 409, "EMAIL_ALREADY_EXISTS")
      }

      // If setting as primary, ensure no other primary contacts exist for this institution
      if (isPrimary) {
        const existingPrimary = await ContactPerson.findPrimaryContact(institutionId)
        if (existingPrimary) {
          throw createError("A primary contact already exists for this institution", 409, "PRIMARY_CONTACT_EXISTS")
        }
      }

      const contact = await ContactPerson.create({
        institutionId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        title: title?.trim() || null,
        department: department?.trim() || null,
        isPrimary,
      })

      // Fetch the created contact with associations
      const createdContact = await ContactPerson.findByPk(contact.id, {
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      logger.info("Contact created successfully", {
        contactId: contact.id,
        institutionId,
        email,
        createdBy: user.id,
      })

      ctx.status = 201
      ctx.body = {
        success: true,
        message: "Contact created successfully",
        data: createdContact?.toJSON(),
      }
    } catch (error) {
      logger.error("Error in createContact:", { error, userId: ctx.state.user?.id })
      if (error && typeof error === "object" && "code" in error) {
        throw error
      }
      throw createError("Failed to create contact", 500, "INTERNAL_ERROR")
    }
  }

  /**
   * Update a contact
   * PUT /api/contacts/:id
   */
  static async updateContact(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const { error, value } = updateContactSchema.validate(ctx.request.body)

      if (error) {
        throw createError(error.details[0].message, 400, "VALIDATION_ERROR")
      }

      if (!id) {
        throw createError("Contact ID is required", 400, "VALIDATION_ERROR")
      }

      // Find the contact with access control
      const includeOptions: any = [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type", "assignedUserId"],
        },
      ]

      if (user.role === UserRole.USER) {
        includeOptions[0].where = {
          assignedUserId: user.id,
        }
      } else if (user.role === UserRole.TEAM_ADMIN) {
        includeOptions[0].include = [
          {
            model: User,
            as: "assignedUser",
            where: { teamId: user.teamId },
            attributes: [],
          },
        ]
      }

      const contact = await ContactPerson.findOne({
        where: {
          id,
          isActive: true,
        },
        include: includeOptions,
      })

      if (!contact) {
        throw createError("Contact not found", 404, "CONTACT_NOT_FOUND")
      }

      // Check if email is being changed and if it conflicts
      if (value.email && value.email !== contact.email) {
        const existingContact = await ContactPerson.findByEmail(value.email)
        if (existingContact && existingContact.id !== id) {
          throw createError("A contact with this email already exists", 409, "EMAIL_ALREADY_EXISTS")
        }
      }

      // Handle primary contact logic
      if (value.isPrimary && !contact.isPrimary) {
        const existingPrimary = await ContactPerson.findPrimaryContact(contact.institutionId)
        if (existingPrimary && existingPrimary.id !== id) {
          throw createError("A primary contact already exists for this institution", 409, "PRIMARY_CONTACT_EXISTS")
        }
      }

      // Update the contact
      const updateData: any = {}
      if (value.firstName !== undefined) updateData.firstName = value.firstName.trim()
      if (value.lastName !== undefined) updateData.lastName = value.lastName.trim()
      if (value.email !== undefined) updateData.email = value.email.toLowerCase().trim()
      if (value.phone !== undefined) updateData.phone = value.phone?.trim() || null
      if (value.title !== undefined) updateData.title = value.title?.trim() || null
      if (value.department !== undefined) updateData.department = value.department?.trim() || null
      if (value.isPrimary !== undefined) updateData.isPrimary = value.isPrimary

      await contact.update(updateData)

      // Fetch the updated contact
      const updatedContact = await ContactPerson.findByPk(contact.id, {
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      logger.info("Contact updated successfully", {
        contactId: id,
        updatedBy: user.id,
        changes: Object.keys(updateData),
      })

      ctx.body = {
        success: true,
        message: "Contact updated successfully",
        data: updatedContact?.toJSON(),
      }
    } catch (error) {
      logger.error("Error in updateContact:", { error, contactId: ctx.params.id, userId: ctx.state.user?.id })
      if (error && typeof error === "object" && "code" in error) {
        throw error
      }
      throw createError("Failed to update contact", 500, "INTERNAL_ERROR")
    }
  }

  /**
   * Soft delete a contact
   * DELETE /api/contacts/:id
   */
  static async deleteContact(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      if (!id) {
        throw createError("Contact ID is required", 400, "VALIDATION_ERROR")
      }

      // Find the contact with access control
      const includeOptions: any = [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "assignedUserId"],
        },
      ]

      if (user.role === UserRole.USER) {
        includeOptions[0].where = {
          assignedUserId: user.id,
        }
      } else if (user.role === UserRole.TEAM_ADMIN) {
        includeOptions[0].include = [
          {
            model: User,
            as: "assignedUser",
            where: { teamId: user.teamId },
            attributes: [],
          },
        ]
      }

      const contact = await ContactPerson.findOne({
        where: {
          id,
          isActive: true,
        },
        include: includeOptions,
      })

      if (!contact) {
        throw createError("Contact not found", 404, "CONTACT_NOT_FOUND")
      }

      // Soft delete by setting isActive to false
      await contact.update({ isActive: false })

      logger.info("Contact deleted successfully", {
        contactId: id,
        deletedBy: user.id,
        institutionId: contact.institutionId,
      })

      ctx.body = {
        success: true,
        message: "Contact deleted successfully",
      }
    } catch (error) {
      logger.error("Error in deleteContact:", { error, contactId: ctx.params.id, userId: ctx.state.user?.id })
      if (error && typeof error === "object" && "code" in error) {
        throw error
      }
      throw createError("Failed to delete contact", 500, "INTERNAL_ERROR")
    }
  }
}