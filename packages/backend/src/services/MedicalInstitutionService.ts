import { MedicalInstitution, MedicalProfile, ContactPerson, User } from "../models"
import { createError } from "../middleware/errorHandler"
import { NotificationService } from "./NotificationService"
import { ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import { logger } from "../utils/logger"

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
  static async deleteInstitution(id: string, userId: string): Promise<void> {
    try {
      const institution = await MedicalInstitution.findByPk(id)

      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // Soft delete by setting isActive to false
      await institution.update({ isActive: false })

      logger.info("Medical institution deleted", {
        userId,
        institutionId: id,
        institutionName: institution.name,
      })
    } catch (error) {
      logger.error("Failed to delete medical institution", {
        userId,
        institutionId: id,
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
}
