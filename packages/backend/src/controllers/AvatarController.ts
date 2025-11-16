import { Context } from "koa"
import { AvatarService } from "../services/AvatarService"
import { User } from "../models/User"
import { logger } from "../utils/logger"

/**
 * AvatarController
 *
 * Handles avatar-related operations:
 * - Serving locally stored avatar SVG files
 * - Generating avatars on-the-fly if missing
 * - Avatar regeneration
 */
export class AvatarController {
  /**
   * GET /api/avatars/:filename
   * Serve avatar SVG file
   * Filename format: {userId}-{style}.svg
   */
  static async getAvatar(ctx: Context) {
    try {
      const { filename } = ctx.params

      // Validate filename format
      if (!filename || !filename.endsWith(".svg")) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: "Invalid filename format. Expected: {userId}-{style}.svg",
        }
        return
      }

      // Extract userId and style from filename
      const match = filename.match(/^(.+)-([^-]+)\.svg$/)
      if (!match) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: "Invalid filename format. Expected: {userId}-{style}.svg",
        }
        return
      }

      const [, userId, style] = match

      // Validate style
      if (!AvatarService.isValidStyle(style)) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: `Invalid avatar style: ${style}`,
          availableStyles: AvatarService.getAvailableStyles(),
        }
        return
      }

      // Get user to retrieve avatar seed
      const user = await User.findByPk(userId)
      if (!user) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "User not found",
        }
        return
      }

      // Get avatar content (generates if missing)
      const svgContent = await AvatarService.getAvatarContent(userId, user.avatarSeed, style)

      // Set headers
      ctx.type = "image/svg+xml"
      ctx.set("Cache-Control", "public, max-age=86400") // Cache for 24 hours
      ctx.set("Content-Disposition", `inline; filename="${filename}"`)

      ctx.body = svgContent
    } catch (error: any) {
      logger.error("Failed to serve avatar", {
        error: error.message,
        filename: ctx.params.filename,
      })

      ctx.status = error.status || 500
      ctx.body = {
        success: false,
        error: error.message || "Failed to generate avatar",
      }
    }
  }

  /**
   * POST /api/avatars/:userId/regenerate
   * Regenerate user's avatar
   */
  static async regenerateAvatar(ctx: Context) {
    try {
      const { userId } = ctx.params
      const { style } = ctx.request.body as { style?: string }

      // Get user
      const user = await User.findByPk(userId)
      if (!user) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "User not found",
        }
        return
      }

      // Validate style if provided
      const avatarStyle = style || user.avatarStyle
      if (!AvatarService.isValidStyle(avatarStyle)) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: `Invalid avatar style: ${avatarStyle}`,
          availableStyles: AvatarService.getAvailableStyles(),
        }
        return
      }

      // Regenerate avatar
      await AvatarService.regenerateAvatar(userId, user.avatarSeed, avatarStyle)

      ctx.body = {
        success: true,
        message: "Avatar regenerated successfully",
        url: AvatarService.getLocalAvatarUrl(userId, avatarStyle),
      }
    } catch (error: any) {
      logger.error("Failed to regenerate avatar", {
        error: error.message,
        userId: ctx.params.userId,
      })

      ctx.status = error.status || 500
      ctx.body = {
        success: false,
        error: error.message || "Failed to regenerate avatar",
      }
    }
  }
}

export default AvatarController
