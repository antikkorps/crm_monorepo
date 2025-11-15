import Router from "@koa/router"
import { NoteController } from "../controllers/NoteController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"
import { validateUUID, validatePagination, validateInstitutionId, validateIdAndUserId } from "../middleware/validation"
import { collaborationErrorHandler, addCollaborationErrorContext } from "../middleware/collaborationErrorHandler"
import {
  validateNoteCreation,
  validateNoteUpdate,
  validateNoteShare,
  validateNoteSearch,
} from "../middleware/collaborationValidation"

const router = new Router({ prefix: "/api/notes" })

// All note routes require authentication and error handling
router.use(authenticate)
router.use(addCollaborationErrorContext)
router.use(collaborationErrorHandler)

// GET /api/notes - Get all notes with filtering
router.get("/", requirePermission("canViewAllTasks"), validateNoteSearch, NoteController.getNotes)

// GET /api/notes/shared-with-me - Get notes shared with current user
router.get("/shared-with-me", NoteController.getSharedNotes)

// GET /api/notes/by-institution/:institutionId - Get notes for specific institution
router.get("/by-institution/:institutionId", validateInstitutionId, validatePagination, NoteController.getNotesByInstitution)

// GET /api/notes/by-tags - Get notes filtered by tags
router.get("/by-tags", NoteController.getNotesByTags)

// GET /api/notes/:id - Get a specific note
router.get("/:id", validateUUID, NoteController.getNote)

// POST /api/notes - Create a new note
router.post("/", requirePermission("canCreateTasks"), validateNoteCreation, NoteController.createNote)

// PUT /api/notes/:id - Update a note
router.put("/:id", validateUUID, validateNoteUpdate, NoteController.updateNote)

// DELETE /api/notes/:id - Delete a note
router.delete("/:id", validateUUID, NoteController.deleteNote)

// POST /api/notes/:id/share - Share a note with users
router.post("/:id/share", validateUUID, validateNoteShare, NoteController.shareNote)

// DELETE /api/notes/:id/share/:userId - Remove share access for a user
router.delete("/:id/share/:userId", validateIdAndUserId, NoteController.removeNoteShare)

// GET /api/notes/:id/shares - Get all shares for a note
router.get("/:id/shares", validateUUID, NoteController.getNoteShares)

export default router
