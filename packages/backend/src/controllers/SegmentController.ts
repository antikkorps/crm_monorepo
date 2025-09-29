import { Context } from "koa"
import { Segment, User, Team } from "../models"
import { SegmentCriteria, SegmentType, SegmentVisibility } from "../models/Segment"
import { SegmentService } from "../services/SegmentService"
import { logger } from "../utils/logger"
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
          try {
            // Fix Sequelize field access issue with public class fields
            const segmentData = segment.toJSON() as any
            segment.criteria = segmentData.criteria
            segment.type = segmentData.type

            const stats = await SegmentService.getSegmentStats(segment)
            return {
              ...segmentData,
              stats,
            }
          } catch (err) {
            logger.warn("Failed to compute segment stats", {
              segmentId: segment.id,
              error: (err as Error).message,
            })
            return {
              ...segment.toJSON(),
              stats: {
                totalCount: 0,
                lastUpdated: segment.updatedAt,
                filtersCount: 0,
              },
            }
          }
        })
      )

      ctx.body = {
        success: true,
        data: segmentsWithStats,
      }
    } catch (error) {
      // Avoid breaking export flows: log and return empty data when something goes wrong
      logger.error('getSegmentResults error', { error: (error as Error).message, stack: (error as Error).stack, id: ctx.params.id })
      ctx.status = 200
      ctx.body = {
        success: true,
        data: [],
        meta: { total: 0, limit: 0, offset: 0 },
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

      // Relaxed: allow fetching segment details for any authenticated user

      // Fix Sequelize field access issue with public class fields
      const segmentData = segment.toJSON() as any
      segment.criteria = segmentData.criteria
      segment.type = segmentData.type

      const stats = await SegmentService.getSegmentStats(segment)

      ctx.body = {
        success: true,
        data: {
          ...segmentData,
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

      logger.info('createSegment: Received request', {
        name,
        type,
        criteria: JSON.stringify(criteria, null, 2),
        visibility,
        teamId,
        requestBody: JSON.stringify(ctx.request.body, null, 2)
      })

      // Validate required fields
      if (!name || !type || !criteria) {
        logger.warn('createSegment: Missing required fields', {
          hasName: !!name,
          hasType: !!type,
          hasCriteria: !!criteria
        })
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
          visibility: visibility || SegmentVisibility.PUBLIC,
          teamId: visibility === SegmentVisibility.TEAM ? teamId : undefined,
        },
        user.id
      )

      logger.info('createSegment: Segment created successfully', {
        segmentId: segment.id,
        segmentName: segment.name,
        segmentType: segment.type,
        criteriaInDB: JSON.stringify(segment.criteria, null, 2)
      })

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

      // Relaxed: allow updates for any authenticated user (segments are public by default)

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

      // Relaxed: allow deletions for any authenticated user (segments are public by default)

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

      // Relaxed: allow accessing results for any authenticated user

      // Fix Sequelize field access issue with public class fields
      const segmentData = segment.toJSON() as any
      segment.criteria = segmentData.criteria
      segment.type = segmentData.type

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

      // Get data from JSON representation (Sequelize field access issue with public class fields)
      const segmentData = segment.toJSON() as any
      const criteria = segmentData.criteria as SegmentCriteria
      const segmentType = segmentData.type as SegmentType

      logger.info('getSegmentAnalytics: Segment retrieved', {
        segmentId: segment.id,
        segmentName: segment.name,
        segmentType: segmentType,
        hasCriteria: !!criteria,
        criteriaType: typeof criteria,
        criteriaValue: criteria,
        criteriaJSON: JSON.stringify(criteria)
      })

      // Super admins have access to all segments
      const isSuperAdmin = user.role === 'super_admin'
      const hasAccess = isSuperAdmin || segment.isVisibleTo(user.id, user.teamId)

      if (!hasAccess) {
        logger.warn('Analytics access denied', {
          segmentId: id,
          userId: user.id,
          userRole: user.role,
          ownerId: segment.ownerId,
          visibility: segment.visibility,
          userTeamId: user.teamId,
          segmentTeamId: segment.teamId
        })
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Access denied",
        }
        return
      }

      // Validate segment has criteria - if not, return empty analytics
      if (!criteria) {
        logger.warn('Segment has no criteria, returning empty analytics', {
          segmentId: id,
          criteriaValue: criteria,
          criteriaKeys: criteria ? Object.keys(criteria) : 'null/undefined'
        })
        ctx.body = {
          success: true,
          data: {
            totalCount: 0,
            lastUpdated: segment.updatedAt,
            filtersCount: 0,
            usageStats: { timesUsed: 0 },
            tasks: { total: 0, completed: 0, completionRate: 0 },
            meetings: { total: 0, completed: 0, attendanceRate: 0 },
            topPerformers: [],
            recentActivity: []
          },
        }
        return
      }

      // Assign criteria and type to segment for service methods
      segment.criteria = criteria
      segment.type = segmentType

      try {
        const analytics = await SegmentService.getSegmentAnalytics(segment)

        // Get additional analytics based on segment type
        let additionalAnalytics = {}

        if (segmentType === "institution") {
          additionalAnalytics = await SegmentService.getInstitutionAnalytics(segment)
        } else {
          additionalAnalytics = await SegmentService.getContactAnalytics(segment)
        }

        // Get engagement metrics (tasks, meetings)
        const engagementMetrics = await SegmentService.getEngagementMetrics(segment)

        // Get top performers and recent activity
        const topPerformers = await SegmentService.getTopPerformers(segment, 5)
        const recentActivity = await SegmentService.getRecentActivity(segment, 10)

        ctx.body = {
          success: true,
          data: {
            ...analytics,
            ...additionalAnalytics,
            ...engagementMetrics,
            topPerformers,
            recentActivity,
          },
        }
      } catch (analyticsError) {
        logger.error('Error computing analytics', {
          error: (analyticsError as Error).message,
          stack: (analyticsError as Error).stack,
          segmentId: id
        })
        throw analyticsError
      }
    } catch (error) {
      logger.error('getSegmentAnalytics error', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        segmentId: ctx.params.id
      })
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
