import Router from "koa-router"
import { SystemSettingsController } from "../controllers/SystemSettingsController"
import { authenticate } from "../middleware/auth"

const router = new Router({
  prefix: "/api/settings",
})

/**
 * Public routes (no authentication required)
 */

// GET /api/settings/public - Get public settings (feature flags, etc.)
router.get("/public", SystemSettingsController.getPublicSettings)

/**
 * Protected routes (authentication required, SUPER_ADMIN only)
 */

// Apply authentication to all settings routes below
router.use(authenticate)

// GET /api/settings - Get all settings (SUPER_ADMIN only)
router.get("/", SystemSettingsController.getAllSettings)

// GET /api/settings/category/:category - Get settings by category (SUPER_ADMIN only)
router.get("/category/:category", SystemSettingsController.getSettingsByCategory)

// PUT /api/settings/:key - Update a single setting (SUPER_ADMIN only)
router.put("/:key", SystemSettingsController.updateSetting)

// POST /api/settings/bulk-update - Bulk update settings (SUPER_ADMIN only)
router.post("/bulk-update", SystemSettingsController.bulkUpdateSettings)

export default router
