import { Context } from "koa"
import { Segment, User, Team } from "../models"
import { SegmentCriteria, SegmentType, SegmentVisibility } from "../models/Segment"
import { SegmentService } from "../services/SegmentService"
import { BulkOperationService, BulkOperationOptions } from "../services/BulkOperationService"

export class SegmentController {
  /**
   * Get all segments visible to the current user
   */
  static async getSegments(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { type, visibility } = ctx.query

      let whereClause: any = {}

      // Filter by type if specified
      if (type && Object.values(SegmentType).includes(type as SegmentType)) {
        whereClause.type = type
      }

      // Filter by visibility if specified
      if (visibility && Object.values(SegmentVisibility).includes(visibility as SegmentVisibility)) {
        whereClause.visibility = visibility
      }

      const segments = await Segment.findVisibleToUser(user.id, user.teamId)

      // Apply additional filters
      let filteredSegments = segments
      if (whereClause.type) {
        filteredSegments = filteredSegments.filter(s => s.type === whereClause.type)
      }
      if (whereClause.visibility) {
        filteredSegments = filteredSegments.filter(s => s.visibility === whereClause.visibility)
      }

      // Add statistics for each segment
      const segmentsWithStats = await Promise.all(
        filteredSegments.map(async (segment) => {
          const stats = await SegmentService.getSegmentStats(segment)
          return {
            ...segment.toJSON(),
            stats,
          }
        })
      )

      ctx.body = {
        success: true,
        data: segmentsWithStats,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Get a specific segment by ID
   */
  static async getSegment(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const segment = await Segment.findByPk(id, {
        include: [
          {
            model: User,
            as: "owner",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: Team,
            as: "team",
            attributes: ["id", "name"],
          },
        ],
      })

      if (!segment) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "Segment not found",
        }
        return
      }

      if (!segment.isVisibleTo(user.id, user.teamId)) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Access denied",
        }
        return
      }

      const stats = await SegmentService.getSegmentStats(segment)

      ctx.body = {
        success: true,
        data: {
          ...segment.toJSON(),
          stats,
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Create a new segment
   */
  static async createSegment(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { name, description, type, criteria, visibility, teamId } = ctx.request.body as {
        name: string
        description?: string
        type: SegmentType
        criteria: SegmentCriteria
        visibility?: SegmentVisibility
        teamId?: string
      }

      // Validate required fields
      if (!name || !type || !criteria) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: "Name, type, and criteria are required",
        }
        return
      }

      // Validate segment criteria
      SegmentService.validateSegmentCriteria(type, criteria)

      // Validate visibility permissions
      if (visibility === SegmentVisibility.TEAM && !teamId) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: "Team ID is required for team segments",
        }
        return
      }

      if (visibility === SegmentVisibility.TEAM && teamId !== user.teamId) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Cannot create segment for a different team",
        }
        return
      }

      const segment = await Segment.createSegment(
        {
          name,
          description,
          type,
          criteria,
          visibility: visibility || SegmentVisibility.PRIVATE,
          teamId: visibility === SegmentVisibility.TEAM ? teamId : undefined,
        },
        user.id
      )

      ctx.status = 201
      ctx.body = {
        success: true,
        data: segment,
      }
    } catch (error) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Update an existing segment
   */
  static async updateSegment(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const updates = ctx.request.body as Partial<{
        name: string
        description?: string
        criteria: SegmentCriteria
        visibility: SegmentVisibility
        teamId?: string
      }>

      const segment = await Segment.findByPk(id)

      if (!segment) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "Segment not found",
        }
        return
      }

      if (!segment.canEdit(user.id, user.teamId)) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Access denied",
        }
        return
      }

      // Validate criteria if being updated
      if (updates.criteria) {
        SegmentService.validateSegmentCriteria(segment.type, updates.criteria)
      }

      // Validate visibility permissions
      if (updates.visibility === SegmentVisibility.TEAM && updates.teamId !== user.teamId) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Cannot change segment to a different team",
        }
        return
      }

      await segment.update(updates)

      ctx.body = {
        success: true,
        data: segment,
      }
    } catch (error) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Delete a segment
   */
  static async deleteSegment(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const segment = await Segment.findByPk(id)

      if (!segment) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "Segment not found",
        }
        return
      }

      if (!segment.canEdit(user.id, user.teamId)) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Access denied",
        }
        return
      }

      await segment.destroy()

      ctx.body = {
        success: true,
        message: "Segment deleted successfully",
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Get segment results (filtered data)
   */
  static async getSegmentResults(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const { limit, offset, ...additionalFilters } = ctx.query

      const segment = await Segment.findByPk(id)

      if (!segment) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "Segment not found",
        }
        return
      }

      if (!segment.isVisibleTo(user.id, user.teamId)) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Access denied",
        }
        return
      }

      const results = await SegmentService.getSegmentResults(segment, additionalFilters)

      // Apply pagination if specified
      let paginatedResults = results
      if (limit) {
        const start = parseInt(offset as string) || 0
        const end = start + parseInt(limit as string)
        paginatedResults = results.slice(start, end)
      }

      ctx.body = {
        success: true,
        data: paginatedResults,
        meta: {
          total: results.length,
          limit: limit ? parseInt(limit as string) : results.length,
          offset: offset ? parseInt(offset as string) : 0,
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Duplicate a segment
   */
  static async duplicateSegment(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const { name } = ctx.request.body as { name: string }

      const originalSegment = await Segment.findByPk(id)

      if (!originalSegment) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "Segment not found",
        }
        return
      }

      if (!originalSegment.isVisibleTo(user.id, user.teamId)) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Access denied",
        }
        return
      }

      const duplicatedSegment = await Segment.createSegment(
        {
          name: name || `${originalSegment.name} (Copy)`,
          description: originalSegment.description,
          type: originalSegment.type,
          criteria: originalSegment.criteria,
          visibility: SegmentVisibility.PRIVATE, // Duplicates are private by default
        },
        user.id
      )

      ctx.status = 201
      ctx.body = {
        success: true,
        data: duplicatedSegment,
      }
    } catch (error) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Get bulk operation preview
   */
  static async getBulkOperationPreview(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const { operationType } = ctx.query

      if (!operationType) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: "Operation type is required",
        }
        return
      }

      const preview = await BulkOperationService.getBulkOperationPreview(
        id,
        operationType as any,
        user.id
      )

      ctx.body = {
        success: true,
        data: preview,
      }
    } catch (error) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Execute bulk operation on segment
   */
  static async executeBulkOperation(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const operationOptions = ctx.request.body as Omit<BulkOperationOptions, "segmentId" | "userId">

      const bulkOptions: BulkOperationOptions = {
        segmentId: id,
        userId: user.id,
        ...operationOptions,
      }

      // Validate options
      BulkOperationService.validateBulkOperationOptions(bulkOptions)

      const result = await BulkOperationService.executeBulkOperation(bulkOptions)

      ctx.body = {
        success: true,
        data: result,
      }
    } catch (error) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Get segment analytics and statistics
   */
  static async getSegmentAnalytics(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const segment = await Segment.findByPk(id)

      if (!segment) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "Segment not found",
        }
        return
      }

      if (!segment.isVisibleTo(user.id, user.teamId)) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Access denied",
        }
        return
      }

      const analytics = await SegmentService.getSegmentAnalytics(segment)

      // Get additional analytics based on segment type
      let additionalAnalytics = {}

      if (segment.type === "institution") {
        additionalAnalytics = await SegmentService.getInstitutionAnalytics(segment)
      } else {
        additionalAnalytics = await SegmentService.getContactAnalytics(segment)
      }

      ctx.body = {
        success: true,
        data: {
          ...analytics,
          ...additionalAnalytics,
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Get segment comparison with other segments
   */
  static async compareSegments(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { ids } = ctx.query

      if (!ids || typeof ids !== "string") {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: "Segment IDs are required",
        }
        return
      }

      const segmentIds = ids.split(",")

      const segments = await Segment.findAll({
        where: {
          id: segmentIds,
        },
      })

      // Filter segments user can access
      const accessibleSegments = segments.filter(s => s.isVisibleTo(user.id, user.teamId))

      if (accessibleSegments.length === 0) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "No accessible segments found",
        }
        return
      }

      // Get analytics for each segment
      const comparisons = await Promise.all(
        accessibleSegments.map(async (segment) => {
          const analytics = await SegmentService.getSegmentAnalytics(segment)
          return {
            id: segment.id,
            name: segment.name,
            type: segment.type,
            ...analytics,
          }
        })
      )

      ctx.body = {
        success: true,
        data: comparisons,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }
}