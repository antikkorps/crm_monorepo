import { Op, WhereOptions, Sequelize } from "sequelize"
import { InstitutionAddress } from "../models/InstitutionAddress"
import { MedicalInstitution, ContactPerson, Segment } from "../models"
import { SegmentCriteria, SegmentType } from "../models/Segment"
import { MedicalInstitutionSearchFilters } from "@medical-crm/shared"
import { logger } from "../utils/logger"

export class SegmentService {
  /**
   * Apply institution filters from segment criteria
   */
  static async applyInstitutionFilters(
    criteria: SegmentCriteria,
    additionalFilters?: Partial<MedicalInstitutionSearchFilters>
  ): Promise<MedicalInstitution[]> {
    if (!criteria.institutionFilters) {
      // No filters provided -> no results instead of throwing to avoid 500s on legacy/bad data
      return []
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
      // No filters provided -> no results instead of throwing
      logger.warn('applyContactFilters: No contactFilters in criteria')
      return []
    }

    const whereClause: WhereOptions = { isActive: true }
    const institutionWhere: WhereOptions = {}

    const contactFilters = criteria.contactFilters

    logger.info('applyContactFilters: Processing filters', {
      contactFilters,
      criteriaRaw: JSON.stringify(criteria, null, 2)
    })

    // Apply contact-specific filters
    if (contactFilters.role && contactFilters.role.length > 0) {
      whereClause.title = { [Op.in]: contactFilters.role }
      logger.info('applyContactFilters: Applied role filter', {
        roleFilter: contactFilters.role,
        whereTitleClause: whereClause.title
      })
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
    let institutionNestedInclude: any[] | undefined
    if (criteria.institutionFilters) {
      includeInstitution = true
      const instFilters = criteria.institutionFilters

      if (instFilters.type) {
        institutionWhere.type = instFilters.type
      }

      const useRelational = process.env.USE_RELATIONAL_ADDRESSES === 'true'
      if (useRelational && (instFilters.city || instFilters.state)) {
        const addrWhere: any = {}
        if (instFilters.city) addrWhere.city = { [Op.iLike]: `%${instFilters.city}%` }
        if (instFilters.state) addrWhere.state = { [Op.iLike]: `%${instFilters.state}%` }
        institutionNestedInclude = [
          {
            model: InstitutionAddress,
            as: 'addressRel',
            where: addrWhere,
            required: true,
          },
        ]
      } else {
        if (instFilters.city) {
          institutionWhere[Op.and] = [
            ...(institutionWhere[Op.and] || []),
            Sequelize.where(Sequelize.json("institution.address.city"), { [Op.iLike]: `%${instFilters.city}%` }),
          ]
        }
        if (instFilters.state) {
          institutionWhere[Op.and] = [
            ...(institutionWhere[Op.and] || []),
            Sequelize.where(Sequelize.json("institution.address.state"), { [Op.iLike]: `%${instFilters.state}%` }),
          ]
        }
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

    // Always include institution for contacts (for export purposes)
    const institutionInclude = includeInstitution
      ? {
          model: MedicalInstitution,
          as: "institution",
          where: institutionWhere,
          required: true,
          ...(institutionNestedInclude ? { include: institutionNestedInclude } : {}),
        }
      : {
          model: MedicalInstitution,
          as: "institution",
          required: false,  // Don't filter by institution if no institution filters
          attributes: ["id", "name", "type"]  // Only fetch basic info
        }

    const include = [institutionInclude]

    logger.info('applyContactFilters: Executing query', {
      whereClause: JSON.stringify(whereClause, null, 2),
      includeInstitution
    })

    const results = await ContactPerson.findAll({
      where: whereClause,
      include,
      order: [["firstName", "ASC"], ["lastName", "ASC"]],
    })

    logger.info('applyContactFilters: Query results', {
      resultCount: results.length,
      firstResult: results[0] ? {
        id: results[0].id,
        firstName: results[0].firstName,
        lastName: results[0].lastName,
        title: results[0].title,
        department: results[0].department
      } : 'No results'
    })

    return results
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

    logger.info('countSegmentResults called', {
      segmentId: segment.id,
      segmentType: segment.type,
      criteria: JSON.stringify(criteria, null, 2)
    })

    switch (segment.type) {
      case SegmentType.INSTITUTION:
        if (!criteria.institutionFilters) {
          logger.warn('countSegmentResults: No institutionFilters')
          return 0
        }
        const institutions = await MedicalInstitution.searchInstitutions(criteria.institutionFilters)
        logger.info('countSegmentResults: Institution count', { count: institutions.length })
        return institutions.length
      case SegmentType.CONTACT:
        if (!criteria.contactFilters) {
          logger.warn('countSegmentResults: No contactFilters in criteria', {
            criteriaKeys: Object.keys(criteria),
            criteriaRaw: criteria
          })
          return 0
        }
        const contacts = await this.applyContactFilters(criteria)
        logger.info('countSegmentResults: Contact count', { count: contacts.length })
        return contacts.length
      default:
        logger.warn('countSegmentResults: Unknown segment type', { type: segment.type })
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
          whereClause[Op.and] = [
            ...(whereClause[Op.and] || []),
            Sequelize.where(Sequelize.json("address.city"), { [Op.iLike]: `%${value}%` }),
          ]
          break
        case "state":
          whereClause[Op.and] = [
            ...(whereClause[Op.and] || []),
            Sequelize.where(Sequelize.json("address.state"), { [Op.iLike]: `%${value}%` }),
          ]
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

  /**
   * Get engagement metrics (tasks, meetings) for a segment
   */
  static async getEngagementMetrics(segment: Segment): Promise<{
    tasks: {
      total: number
      completed: number
      completionRate: number
    }
    meetings: {
      total: number
      completed: number
      attendanceRate: number
    }
  }> {
    const { Task } = await import("../models/Task")
    const { Meeting } = await import("../models/Meeting")
    const { MeetingParticipant } = await import("../models/MeetingParticipant")
    const { TaskStatus } = await import("../models/Task")
    const { MeetingStatus, ParticipantStatus } = await import("@medical-crm/shared")

    let institutionIds: string[] = []
    let contactIds: string[] = []

    if (segment.type === "institution") {
      const institutions = await this.applyInstitutionFilters(segment.criteria)
      institutionIds = institutions.map(i => i.id)
    } else {
      const contacts = await this.applyContactFilters(segment.criteria)
      contactIds = contacts.map(c => c.id)
    }

    // Get tasks
    const taskWhere: any = {}
    if (institutionIds.length > 0) {
      taskWhere.institutionId = institutionIds
    }
    if (contactIds.length > 0) {
      taskWhere.contactId = contactIds
    }

    const totalTasks = await Task.count({ where: taskWhere })
    const completedTasks = await Task.count({
      where: {
        ...taskWhere,
        status: TaskStatus.COMPLETED
      }
    })

    // Get meetings
    const meetingWhere: any = {}
    if (institutionIds.length > 0) {
      meetingWhere.institutionId = institutionIds
    }

    const totalMeetings = await Meeting.count({ where: meetingWhere })
    const completedMeetings = await Meeting.count({
      where: {
        ...meetingWhere,
        status: MeetingStatus.COMPLETED
      }
    })

    // Calculate attendance rate from participants
    let attendedCount = 0
    let totalParticipants = 0

    if (totalMeetings > 0) {
      const meetings = await Meeting.findAll({
        where: meetingWhere,
        include: [{ model: MeetingParticipant, as: 'participants' }]
      })

      for (const meeting of meetings) {
        if (meeting.participants) {
          totalParticipants += meeting.participants.length
          attendedCount += meeting.participants.filter(
            p => p.status === ParticipantStatus.ACCEPTED
          ).length
        }
      }
    }

    return {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      },
      meetings: {
        total: totalMeetings,
        completed: completedMeetings,
        attendanceRate: totalParticipants > 0 ? (attendedCount / totalParticipants) * 100 : 0
      }
    }
  }

  /**
   * Get top performers (users with most completed tasks) for a segment
   */
  static async getTopPerformers(segment: Segment, limit: number = 5): Promise<Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    avatarSeed?: string
    tasksCompleted: number
  }>> {
    const { Task } = await import("../models/Task")
    const { User } = await import("../models/User")
    const { TaskStatus } = await import("../models/Task")

    let institutionIds: string[] = []
    let contactIds: string[] = []

    if (segment.type === "institution") {
      const institutions = await this.applyInstitutionFilters(segment.criteria)
      institutionIds = institutions.map(i => i.id)
    } else {
      const contacts = await this.applyContactFilters(segment.criteria)
      contactIds = contacts.map(c => c.id)
    }

    // Get tasks
    const taskWhere: any = {}
    if (institutionIds.length > 0) {
      taskWhere.institutionId = institutionIds
    }
    if (contactIds.length > 0) {
      taskWhere.contactId = contactIds
    }

    const tasks = await Task.findAll({
      where: {
        ...taskWhere,
        status: TaskStatus.COMPLETED
      },
      include: [{
        model: User,
        as: 'assignee',
        attributes: ['id', 'firstName', 'lastName', 'email', 'avatarSeed']
      }]
    })

    // Count tasks per user
    const userTaskCounts = new Map<string, { user: any, count: number }>()

    for (const task of tasks) {
      if (task.assignee) {
        const userId = task.assignee.id
        if (userTaskCounts.has(userId)) {
          userTaskCounts.get(userId)!.count++
        } else {
          userTaskCounts.set(userId, { user: task.assignee, count: 1 })
        }
      }
    }

    // Sort by count and return top performers
    const topPerformers = Array.from(userTaskCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ user, count }) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarSeed: user.avatarSeed,
        tasksCompleted: count
      }))

    return topPerformers
  }

  /**
   * Get recent activity for a segment
   */
  static async getRecentActivity(segment: Segment, limit: number = 10): Promise<Array<{
    id: string
    type: 'task' | 'meeting' | 'update'
    action: string
    user: {
      id: string
      firstName: string
      lastName: string
    }
    timestamp: Date
  }>> {
    const { Task } = await import("../models/Task")
    const { Meeting } = await import("../models/Meeting")
    const { User } = await import("../models/User")

    let institutionIds: string[] = []
    let contactIds: string[] = []

    if (segment.type === "institution") {
      const institutions = await this.applyInstitutionFilters(segment.criteria)
      institutionIds = institutions.map(i => i.id)
    } else {
      const contacts = await this.applyContactFilters(segment.criteria)
      contactIds = contacts.map(c => c.id)
    }

    const activities: Array<{
      id: string
      type: 'task' | 'meeting' | 'update'
      action: string
      user: { id: string, firstName: string, lastName: string }
      timestamp: Date
    }> = []

    // Get recent tasks
    const taskWhere: any = {}
    if (institutionIds.length > 0) {
      taskWhere.institutionId = institutionIds
    }
    if (contactIds.length > 0) {
      taskWhere.contactId = contactIds
    }

    const recentTasks = await Task.findAll({
      where: taskWhere,
      include: [{
        model: User,
        as: 'assignee',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [['updatedAt', 'DESC']],
      limit: limit
    })

    for (const task of recentTasks) {
      if (task.assignee) {
        activities.push({
          id: `task-${task.id}`,
          type: 'task',
          action: `completed task: ${task.title}`,
          user: {
            id: task.assignee.id,
            firstName: task.assignee.firstName,
            lastName: task.assignee.lastName
          },
          timestamp: task.updatedAt
        })
      }
    }

    // Get recent meetings
    const meetingWhere: any = {}
    if (institutionIds.length > 0) {
      meetingWhere.institutionId = institutionIds
    }

    const recentMeetings = await Meeting.findAll({
      where: meetingWhere,
      include: [{
        model: User,
        as: 'organizer',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [['updatedAt', 'DESC']],
      limit: limit
    })

    for (const meeting of recentMeetings) {
      if (meeting.organizer) {
        activities.push({
          id: `meeting-${meeting.id}`,
          type: 'meeting',
          action: `scheduled meeting: ${meeting.title}`,
          user: {
            id: meeting.organizer.id,
            firstName: meeting.organizer.firstName,
            lastName: meeting.organizer.lastName
          },
          timestamp: meeting.updatedAt
        })
      }
    }

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }
}
