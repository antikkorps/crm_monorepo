import Router from "@koa/router"
import { ContactController } from "../controllers/ContactController"
import { authenticate } from "../middleware/auth"
import {
  addPermissionsToContext,
  requirePermission,
} from "../middleware/permissions"

const router = new Router({ prefix: "/api/contacts" })

// Apply authentication middleware to all routes
router.use(authenticate)

// Add user permissions to context for all routes
router.use(addPermissionsToContext())

// GET /api/contacts - Get all contacts with filtering and pagination
router.get(
  "/",
  requirePermission("canViewAllContacts"),
  ContactController.getContacts
)

// GET /api/contacts/search - Advanced search for contacts
router.get(
  "/search",
  requirePermission("canViewAllContacts"),
  ContactController.searchContacts
)

// GET /api/contacts/:id - Get a specific contact
router.get(
  "/:id",
  requirePermission("canViewAllContacts"),
  ContactController.getContact
)

// POST /api/contacts - Create a new contact
router.post(
  "/",
  requirePermission("canCreateContacts"),
  ContactController.createContact
)

// PUT /api/contacts/:id - Update a contact
router.put(
  "/:id",
  requirePermission("canEditAllContacts"),
  ContactController.updateContact
)

// DELETE /api/contacts/:id - Soft delete a contact
router.delete(
  "/:id",
  requirePermission("canDeleteContacts"),
  ContactController.deleteContact
)

export default router