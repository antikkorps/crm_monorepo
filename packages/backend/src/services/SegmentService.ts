import { Op, WhereOptions } from "sequelize"
import { MedicalInstitution, ContactPerson, Segment } from "../models"
import { SegmentCriteria, SegmentType } from "../models/Segment"
import { MedicalInstitutionSearchFilters } from "@medical-crm/shared"

export class SegmentService {
  /**
   * Apply institution filters from segment criteria
   */
  static async applyInstitutionFilters(
    criteria: SegmentCriteria,
    additionalFilters?: Partial<MedicalInstitutionSearchFilters>
  ): Promise<MedicalInstitution[]> {
    if (!criteria.institutionFilters) {
      throw new Error("Institution filters are required for institution segments")
    }

    const filters = { ...criteria.institutionFilters, ...additionalFilters }
    return MedicalInstitution.searchInstitutions(filters)
  }

  /**
   * Apply contact filters from segment criteria
   */
  static async applyContactFilters(
    criteria: SegmentCriteria,
    additionalFilters?: any
  ): Promise<ContactPerson[]> {
    if (!criteria.contactFilters) {
      throw new Error("Contact filters are required for contact segments")
    }

    const whereClause: WhereOptions = { isActive: true }
    const institutionWhere: WhereOptions = {}

    const contactFilters = criteria.contactFilters

    // Apply contact-specific filters
    if (contactFilters.role && contactFilters.role.length > 0) {
      whereClause.title = { [Op.in]: contactFilters.role }
    }

    if (contactFilters.department && contactFilters.department.length > 0) {
      whereClause.department = { [Op.in]: contactFilters.department }
    }

    if (contactFilters.isPrimary !== undefined) {
      whereClause.isPrimary = contactFilters.isPrimary
    }

    if (contactFilters.hasPhone) {
      whereClause.phone = { [Op.ne]: null }
    }

    if (contactFilters.hasEmail) {
      whereClause.email = { [Op.ne]: null }
    }

    // Apply institution filters if specified
    let includeInstitution = false
    if (criteria.institutionFilters) {
      includeInstitution = true
      const instFilters = criteria.institutionFilters

      if (instFilters.type) {
        institutionWhere.type = instFilters.type
      }

      if (instFilters.city) {
        institutionWhere["address.city"] = { [Op.iLike]: `%${instFilters.city}%` }
      }

      if (instFilters.state) {
        institutionWhere["address.state"] = { [Op.iLike]: `%${instFilters.state}%` }
      }

      if (instFilters.assignedUserId) {
        institutionWhere.assignedUserId = instFilters.assignedUserId
      }

      if (instFilters.specialties && instFilters.specialties.length > 0) {
        // This would require joining with MedicalProfile
        // For now, we'll handle this in a separate query
      }
    }

    // Apply combined filters
    if (criteria.combinedFilters) {
      const combined = criteria.combinedFilters

      if (combined.hasActiveContacts) {
        // This requires a subquery to check if institution has active contacts
        // We'll handle this with a separate approach
      }

      if (combined.createdDateRange) {
        const { from, to } = combined.createdDateRange
        if (from) whereClause.createdAt = { [Op.gte]: from }
        if (to) whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: to }
      }

      if (combined.updatedDateRange) {
        const { from, to } = combined.updatedDateRange
        if (from) whereClause.updatedAt = { [Op.gte]: from }
        if (to) whereClause.updatedAt = { ...whereClause.updatedAt, [Op.lte]: to }
      }
    }

    // Apply additional filters
    if (additionalFilters) {
      Object.assign(whereClause, additionalFilters)
    }

    const include = includeInstitution
      ? [
          {
            model: MedicalInstitution,
            as: "institution",
            where: institutionWhere,
            required: true,
          },
        ]
      : []

    return ContactPerson.findAll({
      where: whereClause,
      include,
      order: [["firstName", "ASC"], ["lastName", "ASC"]],
    })
  }

  /**
   * Get filtered results based on segment type
   */
  static async getSegmentResults(
    segment: Segment,
    additionalFilters?: any
  ): Promise<MedicalInstitution[] | ContactPerson[]> {
    const criteria = segment.criteria

    switch (segment.type) {
      case SegmentType.INSTITUTION:
        return this.applyInstitutionFilters(criteria, additionalFilters)
      case SegmentType.CONTACT:
        return this.applyContactFilters(criteria, additionalFilters)
      default:
        throw new Error(`Unsupported segment type: ${segment.type}`)
    }
  }

  /**
   * Count results for a segment without fetching all data
   */
  static async countSegmentResults(segment: Segment): Promise<number> {
    const criteria = segment.criteria

    switch (segment.type) {
      case SegmentType.INSTITUTION:
        if (!criteria.institutionFilters) return 0
        const institutions = await MedicalInstitution.searchInstitutions(criteria.institutionFilters)
        return institutions.length
      case SegmentType.CONTACT:
        if (!criteria.contactFilters) return 0
        const contacts = await this.applyContactFilters(criteria)
        return contacts.length
      default:
        return 0
    }
  }

  /**
   * Validate segment criteria
   */
  static validateSegmentCriteria(type: SegmentType, criteria: SegmentCriteria): void {
    if (type === SegmentType.INSTITUTION) {
      if (!criteria.institutionFilters) {
        throw new Error("Institution segments require institution filters")
      }
    } else if (type === SegmentType.CONTACT) {
      if (!criteria.contactFilters) {
        throw new Error("Contact segments require contact filters")
      }
    }

    // Additional validation can be added here
  }

  /**
   * Create dynamic where clause from filters
   */
  static buildWhereClause(filters: any): WhereOptions {
    const whereClause: WhereOptions = {}

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) return

      switch (key) {
        case "name":
          whereClause.name = { [Op.iLike]: `%${value}%` }
          break
        case "type":
          whereClause.type = value
          break
        case "city":
          whereClause["address.city"] = { [Op.iLike]: `%${value}%` }
          break
        case "state":
          whereClause["address.state"] = { [Op.iLike]: `%${value}%` }
          break
        case "assignedUserId":
          whereClause.assignedUserId = value
          break
        case "isActive":
          whereClause.isActive = value
          break
        case "tags":
          if (Array.isArray(value) && value.length > 0) {
            whereClause.tags = { [Op.overlap]: value.map((tag: string) => tag.toLowerCase()) }
          }
          break
        case "specialties":
          if (Array.isArray(value) && value.length > 0) {
            // This would need to be handled in the include section for MedicalProfile
          }
          break
        case "minBedCapacity":
          // This would need to be handled in the include section for MedicalProfile
          break
        case "maxBedCapacity":
          // This would need to be handled in the include section for MedicalProfile
          break
        case "minSurgicalRooms":
          // This would need to be handled in the include section for MedicalProfile
          break
        case "maxSurgicalRooms":
          // This would need to be handled in the include section for MedicalProfile
          break
        default:
          // Handle other filters as direct equality
          whereClause[key] = value
      }
    })

    return whereClause
  }

  /**
   * Get segment statistics
   */
  static async getSegmentStats(segment: Segment): Promise<{
    totalCount: number
    lastUpdated: Date
    filtersCount: number
  }> {
    const totalCount = await this.countSegmentResults(segment)
    const filtersCount = this.countFiltersInCriteria(segment.criteria)

    return {
      totalCount,
      lastUpdated: segment.updatedAt,
      filtersCount,
    }
  }

  /**
   * Count the number of active filters in criteria
   */
  private static countFiltersInCriteria(criteria: SegmentCriteria): number {
    let count = 0

    if (criteria.institutionFilters) {
      count += Object.values(criteria.institutionFilters).filter(
        (value) => value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : value !== "")
      ).length
    }

    if (criteria.contactFilters) {
      count += Object.values(criteria.contactFilters).filter(
        (value) => value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true)
      ).length
    }

    if (criteria.combinedFilters) {
      count += Object.values(criteria.combinedFilters).filter(
        (value) => value !== undefined && value !== null
      ).length
    }

    return count
  }

  /**
   * Get detailed analytics for a segment
   */
  static async getSegmentAnalytics(segment: Segment): Promise<{
    totalCount: number
    lastUpdated: Date
    filtersCount: number
    usageStats: {
      timesUsed: number
      lastUsed?: Date
    }
  }> {
    const totalCount = await this.countSegmentResults(segment)
    const filtersCount = this.countFiltersInCriteria(segment.criteria)

    // For now, return basic stats (could be extended with usage tracking)
    return {
      totalCount,
      lastUpdated: segment.updatedAt,
      filtersCount,
      usageStats: {
        timesUsed: 0, // Would need a usage tracking table
      },
    }
  }

  /**
   * Get institution-specific analytics
   */
  static async getInstitutionAnalytics(segment: Segment): Promise<{
    institutionStats: {
      byType: Record<string, number>
      byState: Record<string, number>
      bySpecialty: Record<string, number>
      averageBedCapacity: number
      averageSurgicalRooms: number
    }
  }> {
    if (segment.type !== "institution") {
      throw new Error("Segment must be of institution type")
    }

    const institutions = await this.applyInstitutionFilters(segment.criteria)

    const stats = {
      byType: {} as Record<string, number>,
      byState: {} as Record<string, number>,
      bySpecialty: {} as Record<string, number>,
      totalBedCapacity: 0,
      totalSurgicalRooms: 0,
      institutionCount: institutions.length,
    }

    for (const institution of institutions) {
      // Count by type
      const type = institution.type
      stats.byType[type] = (stats.byType[type] || 0) + 1

      // Count by state
      const state = institution.address.state
      stats.byState[state] = (stats.byState[state] || 0) + 1

      // Get medical profile for specialties and capacity
      const profile = institution.medicalProfile
      if (profile) {
        // Count by specialties
        for (const specialty of profile.specialties) {
          stats.bySpecialty[specialty] = (stats.bySpecialty[specialty] || 0) + 1
        }

        // Sum capacities
        if (profile.bedCapacity) {
          stats.totalBedCapacity += profile.bedCapacity
        }
        if (profile.surgicalRooms) {
          stats.totalSurgicalRooms += profile.surgicalRooms
        }
      }
    }

    return {
      institutionStats: {
        byType: stats.byType,
        byState: stats.byState,
        bySpecialty: stats.bySpecialty,
        averageBedCapacity: stats.institutionCount > 0 ? stats.totalBedCapacity / stats.institutionCount : 0,
        averageSurgicalRooms: stats.institutionCount > 0 ? stats.totalSurgicalRooms / stats.institutionCount : 0,
      },
    }
  }

  /**
   * Get contact-specific analytics
   */
  static async getContactAnalytics(segment: Segment): Promise<{
    contactStats: {
      byRole: Record<string, number>
      byDepartment: Record<string, number>
      primaryContacts: number
      withPhone: number
      withEmail: number
    }
  }> {
    if (segment.type !== "contact") {
      throw new Error("Segment must be of contact type")
    }

    const contacts = await this.applyContactFilters(segment.criteria)

    const stats = {
      byRole: {} as Record<string, number>,
      byDepartment: {} as Record<string, number>,
      primaryContacts: 0,
      withPhone: 0,
      withEmail: 0,
    }

    for (const contact of contacts) {
      // Count by role/title
      if (contact.title) {
        stats.byRole[contact.title] = (stats.byRole[contact.title] || 0) + 1
      }

      // Count by department
      if (contact.department) {
        stats.byDepartment[contact.department] = (stats.byDepartment[contact.department] || 0) + 1
      }

      // Count primary contacts
      if (contact.isPrimary) {
        stats.primaryContacts++
      }

      // Count contacts with phone/email
      if (contact.phone) {
        stats.withPhone++
      }
      if (contact.email) {
        stats.withEmail++
      }
    }

    return {
      contactStats: stats,
    }
  }
}