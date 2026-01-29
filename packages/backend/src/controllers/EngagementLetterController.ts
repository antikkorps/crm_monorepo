import {
  EngagementLetterCreateRequest,
  EngagementLetterMemberRequest,
  EngagementLetterSearchFilters,
  EngagementLetterStatus,
  EngagementLetterUpdateRequest,
  MissionType,
} from "@medical-crm/shared"
import { User, UserRole } from "../models/User"
import { EngagementLetterService } from "../services/EngagementLetterService"
import { Context } from "../types/koa"
import { BadRequestError, NotFoundError } from "../utils/AppError"

export class EngagementLetterController {
  // GET /api/engagement-letters - Get all engagement letters with optional filtering
  static async getLetters(ctx: Context) {
    const user = ctx.state.user as User
    const {
      institutionId,
      status,
      missionType,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
    } = ctx.query

    // Build filters
    const filters: EngagementLetterSearchFilters = {}

    if (institutionId) filters.institutionId = institutionId as string
    if (status) filters.status = status as EngagementLetterStatus
    if (missionType) filters.missionType = missionType as MissionType
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string)
    if (dateTo) filters.dateTo = new Date(dateTo as string)
    if (search) filters.search = search as string

    // Determine user filter based on role
    const userId = user.role === UserRole.SUPER_ADMIN ? undefined : user.id

    const result = await EngagementLetterService.getLetters(
      filters,
      userId,
      Number(page),
      Number(limit)
    )

    ctx.body = {
      success: true,
      data: result.letters,
      meta: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
    }
  }

  // GET /api/engagement-letters/statistics - Get statistics
  static async getStatistics(ctx: Context) {
    const user = ctx.state.user as User

    // Determine user filter based on role
    const userId = user.role === UserRole.SUPER_ADMIN ? undefined : user.id

    const statistics = await EngagementLetterService.getStatistics(userId)

    ctx.body = {
      success: true,
      data: statistics,
    }
  }

  // GET /api/engagement-letters/institution/:institutionId - Get letters by institution
  static async getLettersByInstitution(ctx: Context) {
    const { institutionId } = ctx.params

    const letters = await EngagementLetterService.getLettersByInstitution(institutionId)

    ctx.body = {
      success: true,
      data: letters,
    }
  }

  // GET /api/engagement-letters/status/:status - Get letters by status
  static async getLettersByStatus(ctx: Context) {
    const { status } = ctx.params

    const letters = await EngagementLetterService.getLettersByStatus(
      status as EngagementLetterStatus
    )

    ctx.body = {
      success: true,
      data: letters,
    }
  }

  // GET /api/engagement-letters/:id - Get a specific engagement letter
  static async getLetter(ctx: Context) {
    const { id } = ctx.params

    const letter = await EngagementLetterService.getLetterById(id)

    if (!letter) {
      throw new NotFoundError("Engagement letter not found")
    }

    ctx.body = {
      success: true,
      data: letter,
    }
  }

  // POST /api/engagement-letters - Create a new engagement letter
  static async createLetter(ctx: Context) {
    const user = ctx.state.user as User
    const letterData = ctx.request.body as EngagementLetterCreateRequest

    // Validate required fields
    if (
      !letterData.institutionId ||
      !letterData.title ||
      !letterData.missionType ||
      !letterData.billingType ||
      !letterData.validUntil
    ) {
      throw new BadRequestError(
        "Institution ID, title, mission type, billing type, and valid until date are required",
        "VALIDATION_ERROR"
      )
    }

    // Validate letter data
    EngagementLetterService.validateLetterData(letterData)

    const letter = await EngagementLetterService.createLetter(letterData, user.id)

    ctx.status = 201
    ctx.body = {
      success: true,
      data: letter,
    }
  }

  // PUT /api/engagement-letters/:id - Update an engagement letter
  static async updateLetter(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const updateData = ctx.request.body as EngagementLetterUpdateRequest

    // Validate update data
    EngagementLetterService.validateLetterData(updateData)

    const letter = await EngagementLetterService.updateLetter(id, updateData, user.id)

    ctx.body = {
      success: true,
      data: letter,
    }
  }

  // DELETE /api/engagement-letters/:id - Delete an engagement letter
  static async deleteLetter(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    await EngagementLetterService.deleteLetter(id, user.id)

    ctx.body = {
      success: true,
      message: "Engagement letter deleted successfully",
    }
  }

  // PUT /api/engagement-letters/:id/send - Send engagement letter to client
  static async sendLetter(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    const letter = await EngagementLetterService.sendLetter(id, user.id)

    ctx.body = {
      success: true,
      data: letter,
      message: "Engagement letter sent successfully",
    }
  }

  // PUT /api/engagement-letters/:id/accept - Accept engagement letter (client action)
  static async acceptLetter(ctx: Context) {
    const { id } = ctx.params
    const { clientComments } = ctx.request.body as { clientComments?: string }

    const letter = await EngagementLetterService.acceptLetter(id, clientComments)

    ctx.body = {
      success: true,
      data: letter,
      message: "Engagement letter accepted successfully",
    }
  }

  // PUT /api/engagement-letters/:id/reject - Reject engagement letter (client action)
  static async rejectLetter(ctx: Context) {
    const { id } = ctx.params
    const { clientComments } = ctx.request.body as { clientComments?: string }

    const letter = await EngagementLetterService.rejectLetter(id, clientComments)

    ctx.body = {
      success: true,
      data: letter,
      message: "Engagement letter rejected",
    }
  }

  // PUT /api/engagement-letters/:id/complete - Mark engagement letter as completed
  static async completeLetter(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    const letter = await EngagementLetterService.completeLetter(id, user.id)

    ctx.body = {
      success: true,
      data: letter,
      message: "Engagement letter marked as completed",
    }
  }

  // PUT /api/engagement-letters/:id/cancel - Cancel engagement letter
  static async cancelLetter(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params

    const letter = await EngagementLetterService.cancelLetter(id, user.id)

    ctx.body = {
      success: true,
      data: letter,
      message: "Engagement letter cancelled",
    }
  }

  // ===== Member Management =====

  // GET /api/engagement-letters/:id/members - Get members for a letter
  static async getMembers(ctx: Context) {
    const { id } = ctx.params

    const members = await EngagementLetterService.getMembers(id)

    ctx.body = {
      success: true,
      data: members,
    }
  }

  // POST /api/engagement-letters/:id/members - Add a member
  static async addMember(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const memberData = ctx.request.body as EngagementLetterMemberRequest

    // Validate required fields
    if (!memberData.name || !memberData.role) {
      throw new BadRequestError("Member name and role are required", "VALIDATION_ERROR")
    }

    // Validate member data
    EngagementLetterService.validateMemberData(memberData)

    const member = await EngagementLetterService.addMember(id, memberData, user.id)

    ctx.status = 201
    ctx.body = {
      success: true,
      data: member,
    }
  }

  // PUT /api/engagement-letters/:id/members/:memberId - Update a member
  static async updateMember(ctx: Context) {
    const user = ctx.state.user as User
    const { id, memberId } = ctx.params
    const memberData = ctx.request.body as Partial<EngagementLetterMemberRequest>

    const member = await EngagementLetterService.updateMember(
      id,
      memberId,
      memberData,
      user.id
    )

    ctx.body = {
      success: true,
      data: member,
    }
  }

  // DELETE /api/engagement-letters/:id/members/:memberId - Remove a member
  static async removeMember(ctx: Context) {
    const user = ctx.state.user as User
    const { id, memberId } = ctx.params

    await EngagementLetterService.removeMember(id, memberId, user.id)

    ctx.body = {
      success: true,
      message: "Member removed successfully",
    }
  }

  // PUT /api/engagement-letters/:id/members/reorder - Reorder members
  static async reorderMembers(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const { memberIds } = ctx.request.body as { memberIds: string[] }

    if (!memberIds || !Array.isArray(memberIds)) {
      throw new BadRequestError("memberIds array is required", "VALIDATION_ERROR")
    }

    const members = await EngagementLetterService.reorderMembers(id, memberIds, user.id)

    ctx.body = {
      success: true,
      data: members,
    }
  }

  // ===== PDF Generation =====

  // GET /api/engagement-letters/:id/pdf - Generate and download PDF
  static async generatePdf(ctx: Context) {
    const user = ctx.state.user as User
    const { id } = ctx.params
    const { templateId } = ctx.query

    // Get the letter first to ensure it exists
    const letter = await EngagementLetterService.getLetterById(id)

    if (!letter) {
      throw new NotFoundError("Engagement letter not found")
    }

    // Import PdfService dynamically to avoid circular dependencies
    const { PdfService } = await import("../services/PdfService")

    const pdfResult = await PdfService.generateEngagementLetterPdf(
      id,
      user.id,
      templateId as string | undefined
    )

    // Set response headers for PDF download
    ctx.set("Content-Type", "application/pdf")
    ctx.set(
      "Content-Disposition",
      `attachment; filename="${letter.letterNumber}.pdf"`
    )
    ctx.body = pdfResult.buffer
  }

  // GET /api/engagement-letters/:id/versions - Get document versions
  static async getVersions(ctx: Context) {
    const { id } = ctx.params

    try {
      const { DocumentVersionType } = await import("../models/DocumentVersion")
      const { PdfService } = await import("../services/PdfService")

      const pdfService = new PdfService()
      const versions = await pdfService.getDocumentVersions(
        id,
        DocumentVersionType.ENGAGEMENT_LETTER_PDF
      )
      await pdfService.cleanup()

      ctx.body = {
        success: true,
        data: versions,
      }
    } catch (error: any) {
      ctx.throw(500, {
        success: false,
        message: "Failed to fetch engagement letter versions",
        error: error.message,
      })
    }
  }
}

export default EngagementLetterController
