import Router from "@koa/router"
import { FilterOptionsController } from "../controllers/FilterOptionsController"
import { requireAuth } from "../middleware/auth"

const router = new Router({ prefix: "/api/filter-options" })

// Contact filter options
router.get("/contacts/roles", requireAuth, FilterOptionsController.getContactRoles)
router.get("/contacts/departments", requireAuth, FilterOptionsController.getContactDepartments)
router.get("/contacts/titles", requireAuth, FilterOptionsController.getContactTitles)

// Institution filter options
router.get("/institutions/types", requireAuth, FilterOptionsController.getInstitutionTypes)
router.get("/institutions/specialties", requireAuth, FilterOptionsController.getSpecialties)
router.get("/institutions/cities", requireAuth, FilterOptionsController.getCities)
router.get("/institutions/states", requireAuth, FilterOptionsController.getStates)

export default router