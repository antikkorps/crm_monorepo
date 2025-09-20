import Router from "@koa/router"
import { CatalogController } from "../controllers/CatalogController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/catalog" })

// Apply authentication middleware to all routes
router.use(authenticate)

// Catalog routes
router.get("/", requirePermission("canViewCatalogItems"), CatalogController.getAll)
router.get("/categories", requirePermission("canViewCatalogItems"), CatalogController.getCategories)
router.get("/search", requirePermission("canViewCatalogItems"), CatalogController.search)
router.get("/:id", requirePermission("canViewCatalogItems"), CatalogController.getById)
router.post("/", requirePermission("canCreateCatalogItems"), CatalogController.create)
router.put("/:id", requirePermission("canEditCatalogItems"), CatalogController.update)
router.patch("/:id/toggle", requirePermission("canEditCatalogItems"), CatalogController.toggleActive)
router.delete("/:id", requirePermission("canDeleteCatalogItems"), CatalogController.delete)

export default router