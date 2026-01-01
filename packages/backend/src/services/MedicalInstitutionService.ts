import { ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import { createError } from "../middleware/errorHandler"
import { ContactPerson, MedicalInstitution, MedicalProfile, Note, Task, User } from "../models"
import { logger } from "../utils/logger"
import { NotificationService } from "./NotificationService"

/**
 * Medical Institution Service
 * Handles core CRUD operations for medical institutions
 */
export class MedicalInstitutionService {
  /**
   * Create a new medical institution with profile and contacts
   */
  static async createInstitution(
    data: {
      name: string
      type: InstitutionType
      address: any
      accountingNumber?: string
      digiformaId?: string
      assignedUserId?: string
      tags?: string[]
      medicalProfile: any
      contactPersons?: any[]
    },
    userId: string
  ): Promise<MedicalInstitution> {
    const { medicalProfile, contactPersons, ...institutionData } = data

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
      const completeInstitution = await this.getInstitutionById(institution.id)

      // Send notification to team
      const user = await User.findByPk(userId)
      if (user) {
        const notificationSvc = NotificationService.getInstance()
        await notificationSvc.notifyInstitutionCreated(completeInstitution, user)
      }

      logger.info("Medical institution created", {
        userId,
        institutionId: institution.id,
        institutionName: institution.name,
      })

      return completeInstitution
    } catch (error) {
      logger.error("Failed to create medical institution", {
        userId,
        error: (error as Error).message,
        institutionData,
      })
      throw error
    }
  }

  /**
   * Get institution by ID with all associations
   */
  static async getInstitutionById(id: string): Promise<MedicalInstitution> {
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

    return institution
  }

  /**
   * Update institution
   */
  static async updateInstitution(
    id: string,
    data: Partial<{
      name: string
      type: InstitutionType
      address: any
      accountingNumber: string
      digiformaId: string
      assignedUserId: string
      tags: string[]
      isActive: boolean
    }>,
    userId: string
  ): Promise<MedicalInstitution> {
    try {
      const institution = await MedicalInstitution.findByPk(id)

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // Track changes for notifications
      const changes = Object.keys(data)

      // Update institution
      await institution.update(data)

      // Fetch updated institution with associations
      const updatedInstitution = await this.getInstitutionById(id)

      // Send notification about the update
      const user = await User.findByPk(userId)
      if (user) {
        const notificationSvc = NotificationService.getInstance()
        await notificationSvc.notifyInstitutionUpdated(updatedInstitution, user, changes)
      }

      logger.info("Medical institution updated", {
        userId,
        institutionId: id,
        changes: data,
      })

      return updatedInstitution
    } catch (error) {
      logger.error("Failed to update medical institution", {
        userId,
        institutionId: id,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Soft delete institution (set isActive to false)
   */
  static async deleteInstitution(id: string, userId: string, force: boolean = false): Promise<void> {
    try {
      const institution = await MedicalInstitution.findByPk(id)

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      if (force) {
        // Vérifier si l'institution est verrouillée (contient des données CRM enrichies)
        if (institution.isLocked) {
          throw createError(
            "Impossible de supprimer définitivement cette institution. Elle contient des données enrichies CRM (notes, réunions, modifications manuelles) et ne peut être que désactivée.",
            403,
            "LOCKED_INSTITUTION_DELETE_FORBIDDEN"
          )
        }

        // Hard delete: suppression définitive (uniquement pour les non-locked)
        await institution.destroy({ force: true })
        logger.warn("Medical institution permanently deleted", {
          userId,
          institutionId: id,
          institutionName: institution.name,
          isLocked: institution.isLocked,
        })
      } else {
        // Soft delete by setting isActive to false
        await institution.update({ isActive: false })
        logger.info("Medical institution soft deleted", {
          userId,
          institutionId: id,
          institutionName: institution.name,
          isLocked: institution.isLocked,
        })
      }
    } catch (error) {
      logger.error("Failed to delete medical institution", {
        userId,
        institutionId: id,
        force,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Update medical profile for an institution
   */
  static async updateMedicalProfile(
    institutionId: string,
    data: Partial<{
      bedCapacity: number
      surgicalRooms: number
      specialties: string[]
      departments: string[]
      equipmentTypes: string[]
      certifications: string[]
      complianceStatus: ComplianceStatus
      lastAuditDate: Date
      complianceExpirationDate: Date
      complianceNotes: string
    }>,
    userId: string
  ): Promise<MedicalProfile> {
    try {
      const institution = await MedicalInstitution.findByPk(institutionId)

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // Find and update medical profile
      const medicalProfile = await MedicalProfile.findOne({
        where: { institutionId },
      })

      if (!medicalProfile) {
        throw createError("Medical profile not found", 404, "MEDICAL_PROFILE_NOT_FOUND")
      }

      await medicalProfile.update(data)

      logger.info("Medical profile updated", {
        userId,
        institutionId,
        changes: data,
      })

      return medicalProfile
    } catch (error) {
      logger.error("Failed to update medical profile", {
        userId,
        institutionId,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Add a contact person to an institution
   */
  static async addContactPerson(
    institutionId: string,
    data: {
      firstName: string
      lastName: string
      email: string
      phone?: string
      title?: string
      department?: string
      isPrimary?: boolean
    },
    userId: string
  ): Promise<ContactPerson> {
    try {
      const institution = await MedicalInstitution.findByPk(institutionId)

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // If this is set as primary, remove primary status from others
      if (data.isPrimary) {
        await ContactPerson.update(
          { isPrimary: false },
          {
            where: {
              institutionId,
              isActive: true,
            },
          }
        )
      }

      // Create contact person
      const contactPerson = await ContactPerson.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        title: data.title,
        department: data.department,
        isPrimary: data.isPrimary || false,
        institutionId,
      })

      logger.info("Contact person added", {
        userId,
        institutionId,
        contactPersonId: contactPerson.id,
      })

      return contactPerson
    } catch (error) {
      logger.error("Failed to add contact person", {
        userId,
        institutionId,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Get all contact persons for an institution
   */
  static async getInstitutionContacts(institutionId: string): Promise<ContactPerson[]> {
    return ContactPerson.findAll({
      where: { institutionId, isActive: true },
    })
  }

  /**
   * Get all tasks for an institution
   */
  static async getInstitutionTasks(institutionId: string, status?: string): Promise<Task[]> {
    const where: any = { institutionId }
    if (status) {
      where.status = status
    }
    return Task.findAll({
      where,
      include: [
        {
          model: User,
          as: "assignee",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["dueDate", "ASC"]],
    })
  }

  /**
   * Get all notes for an institution
   */
  static async getInstitutionNotes(institutionId: string): Promise<Note[]> {
    return Note.findAll({
      where: { institutionId },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  /**
   * Get all documents for an institution
   * TODO: Implement Document model
   */
  static async getInstitutionDocuments(institutionId: string): Promise<any[]> {
    // Placeholder until Document model is implemented
    return []
  }

  /**
   * Get audit log for an institution
   * TODO: Implement AuditLog model
   */
  static async getInstitutionAuditLog(institutionId: string, options: { page: number; limit: number }): Promise<any> {
    // Placeholder until AuditLog model is implemented
    return {
      rows: [],
      count: 0,
    }
  }
}
