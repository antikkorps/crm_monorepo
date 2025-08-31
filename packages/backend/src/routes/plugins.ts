import Router from "@koa/router"
import { Context } from "koa"
import { PluginService } from "../services/PluginService"
import { AuthService } from "../services/AuthService"
import { User } from "../models/User"
import { createError } from "../middleware/errorHandler"
import { logger } from "../utils/logger"

const router = new Router({ prefix: "/api/plugins" })

/**
 * CIRCULAR DEPENDENCY ISSUE & SOLUTION
 * 
 * Problem: Using the standard auth middleware (import { auth } from "../middleware/auth")
 * creates a circular dependency that causes the application to hang during startup.
 * 
 * Root Cause: 
 * routes/plugins.ts -> middleware/auth.ts -> services/AuthService.ts -> models/User.ts
 * The circular dependency occurs when the auth middleware is applied to plugin routes.
 * 
 * Solution: 
 * Instead of using the shared auth middleware, we implement inline authentication
 * directly in this file using AuthService methods. This breaks the circular dependency
 * while maintaining the same authentication and authorization logic.
 * 
 * Note: This is a workaround specifically for plugin routes. Other routes can continue
 * using the standard auth middleware without issues.
 */

// Inline auth helper to avoid circular dependency
const authenticatePluginRequest = async (ctx: Context) => {
  const authHeader = ctx.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError("Authorization header required", 401, "UNAUTHORIZED")
  }

  const token = authHeader.substring(7)
  try {
    const payload = AuthService.verifyAccessToken(token)
    const user = await User.findByPk(payload.userId)
    
    if (!user) {
      throw createError("Invalid token", 401, "UNAUTHORIZED")
    }

    // Check if user can manage plugins (ADMIN, MANAGER, or SUPER_ADMIN)
    if (!["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(user.role.toUpperCase())) {
      throw createError("Insufficient permissions", 403, "FORBIDDEN")
    }

    return user
  } catch (error) {
    throw createError("Invalid token", 401, "UNAUTHORIZED")
  }
}

// Get all plugins
router.get("/", async (ctx: Context) => {
  try {
    // Authenticate request
    await authenticatePluginRequest(ctx)
    
    const pluginService = PluginService.getInstance()
    const pluginManager = pluginService.getPluginManager()
    const plugins = pluginManager.registry.getAll()
    const stats = pluginManager.registry.getStats()
    
    ctx.body = {
      plugins,
      stats,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    logger.error("Failed to get plugins", {
      error: error instanceof Error ? error.message : String(error),
    })
    throw createError("Failed to retrieve plugins", 500, "PLUGIN_LIST_ERROR")
  }
})

// Get specific plugin
router.get("/:name", async (ctx: Context) => {
  try {
    // Authenticate request
    await authenticatePluginRequest(ctx)
    
    const { name } = ctx.params
    const pluginService = PluginService.getInstance()
    const pluginManager = pluginService.getPluginManager()
    const plugin = pluginManager.registry.get(name)

    if (!plugin) {
      throw createError(`Plugin '${name}' not found`, 404, "PLUGIN_NOT_FOUND")
    }

    ctx.body = {
      plugin,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === "PLUGIN_NOT_FOUND") {
      throw error
    }

    logger.error("Failed to get plugin", {
      pluginName: ctx.params.name,
      error: error instanceof Error ? error.message : String(error),
    })
    throw createError("Failed to retrieve plugin", 500, "PLUGIN_GET_ERROR")
  }
})

// Install plugin
router.post("/install", async (ctx: Context) => {
  try {
    // Authenticate request
    const user = await authenticatePluginRequest(ctx)
    
    const { pluginPath } = ctx.request.body as { pluginPath: string }

    if (!pluginPath) {
      throw createError("Plugin path is required", 400, "MISSING_PLUGIN_PATH")
    }

    const pluginService = PluginService.getInstance()
    const pluginManager = pluginService.getPluginManager()
    const instance = await pluginManager.install(pluginPath)

    ctx.status = 201
    ctx.body = {
      message: "Plugin installed successfully",
      plugin: instance,
      timestamp: new Date().toISOString(),
    }

    logger.info("Plugin installed via API", {
      pluginName: instance.manifest.name,
      pluginPath,
      user: user.email,
    })
  } catch (error) {
    logger.error("Failed to install plugin", {
      pluginPath: ctx.request.body?.pluginPath,
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof Error && error.message.includes("already installed")) {
      throw createError(error.message, 409, "PLUGIN_ALREADY_INSTALLED")
    }

    throw createError("Failed to install plugin", 500, "PLUGIN_INSTALL_ERROR", {
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router