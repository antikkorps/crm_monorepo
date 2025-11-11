import { Context } from "koa"
import { SystemSettings } from "../models/SystemSettings"
import { User, UserRole } from "../models/User"
import logger from "../utils/logger"

export class SystemSettingsController {
  /**
   * Get public settings (no auth required)
   * GET /api/settings/public
   */
  static async getPublicSettings(ctx: Context): Promise<void> {
    try {
      const settings = await SystemSettings.getPublicSettings()

      ctx.status = 200
      ctx.body = {
        success: true,
        data: settings,
      }
    } catch (error) {
      logger.error("Error fetching public settings:", error)
      ctx.status = 500
      ctx.body = {
        success: false,
        error: "Failed to fetch public settings",
      }
    }
  }

  /**
   * Get all settings (SUPER_ADMIN only)
   * GET /api/settings
   */
  static async getAllSettings(ctx: Context): Promise<void> {
    try {
      const user = ctx.state.user as User

      // Only SUPER_ADMIN can access all settings
      if (user.role !== UserRole.SUPER_ADMIN) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Only SUPER_ADMIN can access system settings",
        }
        return
      }

      const settings = await SystemSettings.findAll({
        order: [
          ["category", "ASC"],
          ["key", "ASC"],
        ],
      })

      ctx.status = 200
      ctx.body = {
        success: true,
        data: settings,
      }
    } catch (error) {
      logger.error("Error fetching settings:", error)
      ctx.status = 500
      ctx.body = {
        success: false,
        error: "Failed to fetch settings",
      }
    }
  }

  /**
   * Get settings by category (SUPER_ADMIN only)
   * GET /api/settings/category/:category
   */
  static async getSettingsByCategory(ctx: Context): Promise<void> {
    try {
      const user = ctx.state.user as User
      const { category } = ctx.params

      // Only SUPER_ADMIN can access settings
      if (user.role !== UserRole.SUPER_ADMIN) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Only SUPER_ADMIN can access system settings",
        }
        return
      }

      const settings = await SystemSettings.getSettingsByCategory(category)

      ctx.status = 200
      ctx.body = {
        success: true,
        data: settings,
      }
    } catch (error) {
      logger.error("Error fetching settings by category:", error)
      ctx.status = 500
      ctx.body = {
        success: false,
        error: "Failed to fetch settings",
      }
    }
  }

  /**
   * Update a setting (SUPER_ADMIN only)
   * PUT /api/settings/:key
   */
  static async updateSetting(ctx: Context): Promise<void> {
    try {
      const user = ctx.state.user as User
      const { key } = ctx.params
      const { value } = ctx.request.body as any

      // Only SUPER_ADMIN can update settings
      if (user.role !== UserRole.SUPER_ADMIN) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Only SUPER_ADMIN can update system settings",
        }
        return
      }

      const setting = await SystemSettings.findOne({ where: { key } })

      if (!setting) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: `Setting with key '${key}' not found`,
        }
        return
      }

      await setting.update({
        value,
        updatedBy: user.id,
      })

      logger.info(`Setting '${key}' updated by ${user.email}`, {
        oldValue: setting.value,
        newValue: value,
      })

      ctx.status = 200
      ctx.body = {
        success: true,
        data: setting,
      }
    } catch (error) {
      logger.error("Error updating setting:", error)
      ctx.status = 500
      ctx.body = {
        success: false,
        error: "Failed to update setting",
      }
    }
  }

  /**
   * Bulk update settings (SUPER_ADMIN only)
   * POST /api/settings/bulk-update
   */
  static async bulkUpdateSettings(ctx: Context): Promise<void> {
    try {
      const user = ctx.state.user as User
      const { settings } = ctx.request.body as { settings: Array<{ key: string; value: any }> }

      // Only SUPER_ADMIN can update settings
      if (user.role !== UserRole.SUPER_ADMIN) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: "Only SUPER_ADMIN can update system settings",
        }
        return
      }

      if (!Array.isArray(settings)) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: "Settings must be an array",
        }
        return
      }

      // Perform updates concurrently to avoid N+1 query performance issues
      const results = await Promise.all(
        settings.map(async ({ key, value }) => {
          const setting = await SystemSettings.findOne({ where: { key } })
          if (setting) {
            await setting.update({
              value,
              updatedBy: user.id,
            })
            logger.info(`Setting '${key}' updated by ${user.email}`)
            return { success: true, key, setting }
          }
          logger.warn(`Setting '${key}' not found, skipping`)
          return { success: false, key, error: 'Setting not found' }
        })
      )

      const updatedSettings = results.filter(r => r.success).map(r => r.setting)
      const failedKeys = results.filter(r => !r.success).map(r => ({ key: r.key, error: r.error }))

      ctx.status = 200
      ctx.body = {
        success: true,
        data: updatedSettings,
        ...(failedKeys.length > 0 && {
          warnings: `${failedKeys.length} setting(s) not found`,
          failedKeys
        }),
      }
    } catch (error) {
      logger.error("Error bulk updating settings:", error)
      ctx.status = 500
      ctx.body = {
        success: false,
        error: "Failed to bulk update settings",
      }
    }
  }
}
