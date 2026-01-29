import {
  BillingType,
  EngagementLetterCreateRequest,
  EngagementLetterMemberRequest,
  EngagementLetterSearchFilters,
  EngagementLetterStatistics,
  EngagementLetterStatus,
  EngagementLetterUpdateRequest,
  MissionType,
} from "@medical-crm/shared"
import { Op, Transaction } from "sequelize"
import { sequelize } from "../config/database"
import { createError } from "../middleware/errorHandler"
import { EngagementLetter } from "../models/EngagementLetter"
import { EngagementLetterMember } from "../models/EngagementLetterMember"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { User } from "../models/User"

export class EngagementLetterService {
  /**
   * Create a new engagement letter with optional members
   */
  public static async createLetter(
    data: EngagementLetterCreateRequest,
    userId: string
  ): Promise<EngagementLetter> {
    const transaction = await sequelize.transaction()

    try {
      // Validate institution exists
      const institution = await MedicalInstitution.findByPk(data.institutionId)
      if (!institution) {
        throw createError("Medical institution not found", 404, "INSTITUTION_NOT_FOUND")
      }

      // Validate user exists
      const user = await User.findByPk(userId)
      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND")
      }

      // Create the engagement letter
      const { members, ...letterData } = data
      const createData = {
        ...letterData,
        assignedUserId: userId,
        templateId: data.templateId || undefined,
      }

      const letter = await EngagementLetter.createLetter(createData)

      // Create members if provided
      if (members && members.length > 0) {
        for (let i = 0; i < members.length; i++) {
          const memberData = members[i]
          await EngagementLetterMember.create(
            {
              engagementLetterId: letter.id,
              userId: memberData.userId || undefined,
              name: memberData.name,
              role: memberData.role,
              qualification: memberData.qualification,
              dailyRate: memberData.dailyRate,
              estimatedDays: memberData.estimatedDays,
              isLead: memberData.isLead ?? false,
              orderIndex: i,
            },
            { transaction }
          )
        }

        // Recalculate total
        await letter.recalculateTotal(transaction)
      }

      await transaction.commit()

      // Return the complete letter with members
      return this.getLetterById(letter.id)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Get engagement letter by ID with all associations
   */
  public static async getLetterById(letterId: string): Promise<EngagementLetter> {
    const letter = await EngagementLetter.findByPk(letterId, {
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: EngagementLetterMember,
          as: "members",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "email"],
            },
          ],
          order: [["orderIndex", "ASC"]],
        },
      ],
    })

    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    return letter
  }

  /**
   * Get engagement letters with filtering and pagination
   */
  public static async getLetters(
    filters: EngagementLetterSearchFilters = {},
    userId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    letters: EngagementLetter[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }> {
    const { search, status, missionType, institutionId, dateFrom, dateTo } = filters

    // Build where clause
    const whereClause: any = {}

    // Add search filter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { scope: { [Op.iLike]: `%${search}%` } },
        { letterNumber: { [Op.iLike]: `%${search}%` } },
      ]
    }

    // Add status filter
    if (status) {
      whereClause.status = status
    }

    // Add mission type filter
    if (missionType) {
      whereClause.missionType = missionType
    }

    // Add institution filter
    if (institutionId) {
      whereClause.institutionId = institutionId
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) {
        whereClause.createdAt[Op.gte] = dateFrom
      }
      if (dateTo) {
        whereClause.createdAt[Op.lte] = dateTo
      }
    }

    // Add user filter if provided
    if (userId) {
      whereClause.assignedUserId = userId
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Get letters and total count
    const { rows: letters, count: total } = await EngagementLetter.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })

    const totalPages = Math.ceil(total / limit)

    return {
      letters,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  /**
   * Update engagement letter details
   */
  public static async updateLetter(
    letterId: string,
    data: EngagementLetterUpdateRequest,
    userId: string
  ): Promise<EngagementLetter> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    // Check if user can modify this letter
    if (!(await this.canUserModifyLetter(letter, userId))) {
      throw createError(
        "Insufficient permissions to modify this engagement letter",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if letter can be modified
    if (!letter.canBeModified()) {
      throw createError(
        "Engagement letter cannot be modified in its current state",
        400,
        "LETTER_NOT_MODIFIABLE"
      )
    }

    const transaction = await sequelize.transaction()
    try {
      // Update letter fields
      const updateData: any = {}

      if (data.templateId !== undefined) {
        updateData.templateId = data.templateId || undefined
      }
      if (data.title !== undefined) {
        updateData.title = data.title
      }
      if (data.missionType !== undefined) {
        updateData.missionType = data.missionType
      }
      if (data.scope !== undefined) {
        updateData.scope = data.scope
      }
      if (data.objectives !== undefined) {
        updateData.objectives = data.objectives
      }
      if (data.deliverables !== undefined) {
        updateData.deliverables = data.deliverables
      }
      if (data.startDate !== undefined) {
        updateData.startDate = data.startDate
      }
      if (data.endDate !== undefined) {
        updateData.endDate = data.endDate
      }
      if (data.estimatedHours !== undefined) {
        updateData.estimatedHours = data.estimatedHours
      }
      if (data.billingType !== undefined) {
        updateData.billingType = data.billingType
      }
      if (data.rate !== undefined) {
        updateData.rate = data.rate
      }
      if (data.totalDays !== undefined) {
        updateData.totalDays = data.totalDays
      }
      if (data.travelExpenses !== undefined) {
        updateData.travelExpenses = data.travelExpenses
      }
      if (data.estimatedTotal !== undefined) {
        updateData.estimatedTotal = data.estimatedTotal
      }
      if (data.vatRate !== undefined) {
        updateData.vatRate = data.vatRate
      }
      if (data.showVat !== undefined) {
        updateData.showVat = data.showVat
      }
      if (data.validUntil !== undefined) {
        updateData.validUntil = data.validUntil
      }
      if (data.termsAndConditions !== undefined) {
        updateData.termsAndConditions = data.termsAndConditions
      }
      if (data.clientComments !== undefined) {
        updateData.clientComments = data.clientComments
      }
      if (data.internalNotes !== undefined) {
        updateData.internalNotes = data.internalNotes
      }

      await letter.update(updateData, { transaction })

      await transaction.commit()
      return this.getLetterById(letterId)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Delete engagement letter
   */
  public static async deleteLetter(letterId: string, userId: string): Promise<void> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    // Check if user can modify this letter
    if (!(await this.canUserModifyLetter(letter, userId))) {
      throw createError(
        "Insufficient permissions to delete this engagement letter",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if letter can be deleted (only draft letters)
    if (letter.status !== EngagementLetterStatus.DRAFT) {
      throw createError(
        "Only draft engagement letters can be deleted",
        400,
        "LETTER_NOT_DELETABLE"
      )
    }

    await letter.destroy()
  }

  /**
   * Send engagement letter to client
   */
  public static async sendLetter(
    letterId: string,
    userId: string
  ): Promise<EngagementLetter> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    // Check if user can modify this letter
    if (!(await this.canUserModifyLetter(letter, userId))) {
      throw createError(
        "Insufficient permissions to send this engagement letter",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    await letter.send()
    return this.getLetterById(letterId)
  }

  /**
   * Accept engagement letter
   */
  public static async acceptLetter(
    letterId: string,
    clientComments?: string
  ): Promise<EngagementLetter> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    await letter.accept(clientComments)
    return this.getLetterById(letterId)
  }

  /**
   * Reject engagement letter
   */
  public static async rejectLetter(
    letterId: string,
    clientComments?: string
  ): Promise<EngagementLetter> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    await letter.reject(clientComments)
    return this.getLetterById(letterId)
  }

  /**
   * Complete engagement letter
   */
  public static async completeLetter(
    letterId: string,
    userId: string
  ): Promise<EngagementLetter> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    // Check if user can modify this letter
    if (!(await this.canUserModifyLetter(letter, userId))) {
      throw createError(
        "Insufficient permissions to complete this engagement letter",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    await letter.complete()
    return this.getLetterById(letterId)
  }

  /**
   * Cancel engagement letter
   */
  public static async cancelLetter(
    letterId: string,
    userId: string
  ): Promise<EngagementLetter> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    // Check if user can modify this letter
    if (!(await this.canUserModifyLetter(letter, userId))) {
      throw createError(
        "Insufficient permissions to cancel this engagement letter",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    await letter.cancel()
    return this.getLetterById(letterId)
  }

  // ===== Member Management =====

  /**
   * Get members for an engagement letter
   */
  public static async getMembers(
    letterId: string
  ): Promise<EngagementLetterMember[]> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    return EngagementLetterMember.findByEngagementLetter(letterId)
  }

  /**
   * Add member to engagement letter
   */
  public static async addMember(
    letterId: string,
    memberData: EngagementLetterMemberRequest,
    userId: string
  ): Promise<EngagementLetterMember> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    // Check if user can modify this letter
    if (!(await this.canUserModifyLetter(letter, userId))) {
      throw createError(
        "Insufficient permissions to modify this engagement letter",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if letter can be modified
    if (!letter.canBeModified()) {
      throw createError(
        "Engagement letter cannot be modified in its current state",
        400,
        "LETTER_NOT_MODIFIABLE"
      )
    }

    const transaction = await sequelize.transaction()

    try {
      // Create the member
      const member = await EngagementLetterMember.createMember(
        {
          engagementLetterId: letterId,
          userId: memberData.userId || undefined,
          name: memberData.name,
          role: memberData.role,
          qualification: memberData.qualification,
          dailyRate: memberData.dailyRate,
          estimatedDays: memberData.estimatedDays,
          isLead: memberData.isLead ?? false,
        },
        transaction
      )

      // Recalculate letter total
      await letter.recalculateTotal(transaction)

      await transaction.commit()
      return member
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Update member
   */
  public static async updateMember(
    letterId: string,
    memberId: string,
    memberData: Partial<EngagementLetterMemberRequest>,
    userId: string
  ): Promise<EngagementLetterMember> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    const member = await EngagementLetterMember.findOne({
      where: { id: memberId, engagementLetterId: letterId },
    })
    if (!member) {
      throw createError("Member not found", 404, "MEMBER_NOT_FOUND")
    }

    // Check if user can modify this letter
    if (!(await this.canUserModifyLetter(letter, userId))) {
      throw createError(
        "Insufficient permissions to modify this engagement letter",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if letter can be modified
    if (!letter.canBeModified()) {
      throw createError(
        "Engagement letter cannot be modified in its current state",
        400,
        "LETTER_NOT_MODIFIABLE"
      )
    }

    const transaction = await sequelize.transaction()

    try {
      // Update the member
      const updateData: any = {}
      if (memberData.userId !== undefined) {
        updateData.userId = memberData.userId || undefined
      }
      if (memberData.name !== undefined) {
        updateData.name = memberData.name
      }
      if (memberData.role !== undefined) {
        updateData.role = memberData.role
      }
      if (memberData.qualification !== undefined) {
        updateData.qualification = memberData.qualification
      }
      if (memberData.dailyRate !== undefined) {
        updateData.dailyRate = memberData.dailyRate
      }
      if (memberData.estimatedDays !== undefined) {
        updateData.estimatedDays = memberData.estimatedDays
      }
      if (memberData.isLead !== undefined) {
        updateData.isLead = memberData.isLead
      }

      await member.update(updateData, { transaction })

      // Recalculate letter total
      await letter.recalculateTotal(transaction)

      await transaction.commit()
      return member
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Remove member
   */
  public static async removeMember(
    letterId: string,
    memberId: string,
    userId: string
  ): Promise<void> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    const member = await EngagementLetterMember.findOne({
      where: { id: memberId, engagementLetterId: letterId },
    })
    if (!member) {
      throw createError("Member not found", 404, "MEMBER_NOT_FOUND")
    }

    // Check if user can modify this letter
    if (!(await this.canUserModifyLetter(letter, userId))) {
      throw createError(
        "Insufficient permissions to modify this engagement letter",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if letter can be modified
    if (!letter.canBeModified()) {
      throw createError(
        "Engagement letter cannot be modified in its current state",
        400,
        "LETTER_NOT_MODIFIABLE"
      )
    }

    const transaction = await sequelize.transaction()

    try {
      await member.destroy({ transaction })

      // Recalculate letter total
      await letter.recalculateTotal(transaction)

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  /**
   * Reorder members
   */
  public static async reorderMembers(
    letterId: string,
    memberIds: string[],
    userId: string
  ): Promise<EngagementLetterMember[]> {
    const letter = await EngagementLetter.findByPk(letterId)
    if (!letter) {
      throw createError("Engagement letter not found", 404, "ENGAGEMENT_LETTER_NOT_FOUND")
    }

    // Check if user can modify this letter
    if (!(await this.canUserModifyLetter(letter, userId))) {
      throw createError(
        "Insufficient permissions to modify this engagement letter",
        403,
        "INSUFFICIENT_PERMISSIONS"
      )
    }

    // Check if letter can be modified
    if (!letter.canBeModified()) {
      throw createError(
        "Engagement letter cannot be modified in its current state",
        400,
        "LETTER_NOT_MODIFIABLE"
      )
    }

    // Validate all member IDs belong to this letter
    const existingMembers = await EngagementLetterMember.findAll({
      where: { engagementLetterId: letterId },
      attributes: ["id"],
    })

    const existingMemberIds = existingMembers.map((m) => m.id)
    const invalidMemberIds = memberIds.filter((id) => !existingMemberIds.includes(id))

    if (invalidMemberIds.length > 0) {
      throw createError("Invalid member IDs provided", 400, "INVALID_MEMBER_IDS")
    }

    if (memberIds.length !== existingMemberIds.length) {
      throw createError(
        "All members must be included in reorder",
        400,
        "INCOMPLETE_MEMBER_LIST"
      )
    }

    await EngagementLetterMember.reorderMembers(letterId, memberIds)

    return EngagementLetterMember.findByEngagementLetter(letterId)
  }

  // ===== Statistics =====

  /**
   * Get engagement letter statistics
   */
  public static async getStatistics(
    userId?: string
  ): Promise<EngagementLetterStatistics> {
    const whereClause: any = {}
    if (userId) {
      whereClause.assignedUserId = userId
    }

    const [
      total,
      draftCount,
      sentCount,
      acceptedCount,
      rejectedCount,
      cancelledCount,
      completedCount,
      auditCount,
      conseilCount,
      formationCount,
      autreCount,
      totalAcceptedValue,
    ] = await Promise.all([
      EngagementLetter.count({ where: whereClause }),
      EngagementLetter.count({ where: { ...whereClause, status: EngagementLetterStatus.DRAFT } }),
      EngagementLetter.count({ where: { ...whereClause, status: EngagementLetterStatus.SENT } }),
      EngagementLetter.count({ where: { ...whereClause, status: EngagementLetterStatus.ACCEPTED } }),
      EngagementLetter.count({ where: { ...whereClause, status: EngagementLetterStatus.REJECTED } }),
      EngagementLetter.count({ where: { ...whereClause, status: EngagementLetterStatus.CANCELLED } }),
      EngagementLetter.count({ where: { ...whereClause, status: EngagementLetterStatus.COMPLETED } }),
      EngagementLetter.count({ where: { ...whereClause, missionType: MissionType.AUDIT } }),
      EngagementLetter.count({ where: { ...whereClause, missionType: MissionType.CONSEIL } }),
      EngagementLetter.count({ where: { ...whereClause, missionType: MissionType.FORMATION } }),
      EngagementLetter.count({ where: { ...whereClause, missionType: MissionType.AUTRE } }),
      EngagementLetter.sum("estimatedTotal", {
        where: { ...whereClause, status: EngagementLetterStatus.ACCEPTED },
      }) || 0,
    ])

    // Calculate acceptance rate
    const totalResponded = acceptedCount + rejectedCount
    const acceptanceRate = totalResponded > 0 ? (acceptedCount / totalResponded) * 100 : null

    // Calculate average response time (simplified - would need more complex query in production)
    // For now, return null as calculating this requires access to sentAt and acceptedAt/rejectedAt
    const averageResponseTime: number | null = null

    return {
      total,
      byStatus: {
        [EngagementLetterStatus.DRAFT]: draftCount,
        [EngagementLetterStatus.SENT]: sentCount,
        [EngagementLetterStatus.ACCEPTED]: acceptedCount,
        [EngagementLetterStatus.REJECTED]: rejectedCount,
        [EngagementLetterStatus.CANCELLED]: cancelledCount,
        [EngagementLetterStatus.COMPLETED]: completedCount,
      },
      byMissionType: {
        [MissionType.AUDIT]: auditCount,
        [MissionType.CONSEIL]: conseilCount,
        [MissionType.FORMATION]: formationCount,
        [MissionType.AUTRE]: autreCount,
      },
      totalAcceptedValue: parseFloat(totalAcceptedValue.toString()),
      averageResponseTime,
      acceptanceRate: acceptanceRate !== null ? Math.round(acceptanceRate * 100) / 100 : null,
    }
  }

  // ===== Helpers =====

  /**
   * Get letters by institution
   */
  public static async getLettersByInstitution(
    institutionId: string
  ): Promise<EngagementLetter[]> {
    return EngagementLetter.findByInstitution(institutionId)
  }

  /**
   * Get letters by status
   */
  public static async getLettersByStatus(
    status: EngagementLetterStatus
  ): Promise<EngagementLetter[]> {
    return EngagementLetter.findByStatus(status)
  }

  /**
   * Validate engagement letter data
   */
  public static validateLetterData(
    data: EngagementLetterCreateRequest | EngagementLetterUpdateRequest
  ): void {
    if ("title" in data && (!data.title || data.title.trim().length === 0)) {
      throw createError("Engagement letter title is required", 400, "VALIDATION_ERROR")
    }

    if (
      "validUntil" in data &&
      data.validUntil &&
      new Date(data.validUntil) <= new Date()
    ) {
      throw createError("Valid until date must be in the future", 400, "VALIDATION_ERROR")
    }

    if ("startDate" in data && "endDate" in data && data.startDate && data.endDate) {
      if (new Date(data.endDate) < new Date(data.startDate)) {
        throw createError("End date must be after start date", 400, "VALIDATION_ERROR")
      }
    }

    if ("rate" in data && data.rate !== undefined && data.rate < 0) {
      throw createError("Rate cannot be negative", 400, "VALIDATION_ERROR")
    }

    if ("estimatedHours" in data && data.estimatedHours !== undefined && data.estimatedHours < 0) {
      throw createError("Estimated hours cannot be negative", 400, "VALIDATION_ERROR")
    }
  }

  /**
   * Validate member data
   */
  public static validateMemberData(data: EngagementLetterMemberRequest): void {
    if (!data.name || data.name.trim().length === 0) {
      throw createError("Member name is required", 400, "VALIDATION_ERROR")
    }

    if (!data.role || data.role.trim().length === 0) {
      throw createError("Member role is required", 400, "VALIDATION_ERROR")
    }

    if (data.dailyRate !== undefined && data.dailyRate < 0) {
      throw createError("Daily rate cannot be negative", 400, "VALIDATION_ERROR")
    }

    if (data.estimatedDays !== undefined && data.estimatedDays < 0) {
      throw createError("Estimated days cannot be negative", 400, "VALIDATION_ERROR")
    }
  }

  /**
   * Check if user can modify engagement letter
   */
  private static async canUserModifyLetter(
    letter: EngagementLetter,
    userId: string
  ): Promise<boolean> {
    // Get user to check role
    const user = await User.findByPk(userId)
    if (!user) return false

    // Super admins, team admins, and managers can modify any letter
    if (
      user.role === "super_admin" ||
      user.role === "team_admin" ||
      user.role === "manager"
    ) {
      return true
    }

    // Otherwise, only the assigned user can modify the letter
    return letter.assignedUserId === userId
  }
}

export default EngagementLetterService
