import { Context } from "koa"
import { ContactPerson } from "../models/ContactPerson"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { logger } from "../utils/logger"
import { Op } from "sequelize"

export class FilterOptionsController {
  /**
   * Get available roles for contact filters
   */
  static async getContactRoles(ctx: Context) {
    try {
      const contacts = await ContactPerson.findAll({
        attributes: ['title'],
        raw: true
      })

      const uniqueRoles = [...new Set(contacts.map((c: any) => c.title).filter(Boolean))]

      ctx.body = {
        success: true,
        data: uniqueRoles.sort()
      }
    } catch (error) {
      logger.error('Error fetching contact roles', { error })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get available departments for contact filters
   */
  static async getContactDepartments(ctx: Context) {
    try {
      const contacts = await ContactPerson.findAll({
        attributes: ['department'],
        raw: true
      })

      const uniqueDepartments = [...new Set(contacts.map((c: any) => c.department).filter(Boolean))]

      ctx.body = {
        success: true,
        data: uniqueDepartments.sort()
      }
    } catch (error) {
      logger.error('Error fetching contact departments', { error })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get available titles for contact filters
   */
  static async getContactTitles(ctx: Context) {
    try {
      const contacts = await ContactPerson.findAll({
        attributes: ['title'],
        raw: true
      })

      const uniqueTitles = [...new Set(contacts.map((c: any) => c.title).filter(Boolean))]

      ctx.body = {
        success: true,
        data: uniqueTitles.sort()
      }
    } catch (error) {
      logger.error('Error fetching contact titles', { error })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get available institution types
   */
  static async getInstitutionTypes(ctx: Context) {
    try {
      const institutions = await MedicalInstitution.findAll({
        attributes: ['type'],
        raw: true
      })

      const uniqueTypes = [...new Set(institutions.map((i: any) => i.type).filter(Boolean))]

      ctx.body = {
        success: true,
        data: uniqueTypes.sort()
      }
    } catch (error) {
      logger.error('Error fetching institution types', { error })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get available specialties
   */
  static async getSpecialties(ctx: Context) {
    try {
      const institutions = await MedicalInstitution.findAll({
        attributes: ['medicalProfile'],
        raw: true
      })

      const specialties = new Set<string>()

      for (const inst of institutions) {
        if (inst.medicalProfile && Array.isArray(inst.medicalProfile.specialties)) {
          inst.medicalProfile.specialties.forEach((s: string) => specialties.add(s))
        }
      }

      ctx.body = {
        success: true,
        data: Array.from(specialties).sort()
      }
    } catch (error) {
      logger.error('Error fetching specialties', { error })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get available cities
   */
  static async getCities(ctx: Context) {
    try {
      const institutions = await MedicalInstitution.findAll({
        attributes: ['address'],
        raw: true
      })

      const cities = new Set<string>()

      for (const inst of institutions) {
        if (inst.address && inst.address.city) {
          cities.add(inst.address.city)
        }
      }

      ctx.body = {
        success: true,
        data: Array.from(cities).sort()
      }
    } catch (error) {
      logger.error('Error fetching cities', { error })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * Get available states
   */
  static async getStates(ctx: Context) {
    try {
      const institutions = await MedicalInstitution.findAll({
        attributes: ['address'],
        raw: true
      })

      const states = new Set<string>()

      for (const inst of institutions) {
        if (inst.address && inst.address.state) {
          states.add(inst.address.state)
        }
      }

      ctx.body = {
        success: true,
        data: Array.from(states).sort()
      }
    } catch (error) {
      logger.error('Error fetching states', { error })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message
      }
    }
  }
}