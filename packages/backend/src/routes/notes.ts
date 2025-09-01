import Router from "@koa/router"
import { NoteController } from "../controllers/NoteController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/notes" })

// All note routes require authentication
router.use(authenticate)

// GET /api/notes - Get all notes with filtering
router.get("/", requirePermission("canViewAllTasks"), NoteController.getNotes)

// GET /api/notes/shared-with-me - Get notes shared with current user
router.get("/shared-with-me", NoteController.getSharedNotes)

// GET /api/notes/by-institution/:institutionId - Get notes for specific institution
router.get("/by-institution/:institutionId", NoteController.getNotesByInstitution)

// GET /api/notes/by-tags - Get notes filtered by tags
router.get("/by-tags", NoteController.getNotesByTags)

// GET /api/notes/:id - Get a specific note
router.get("/:id", NoteController.getNote)

// POST /api/notes - Create a new note
router.post("/", requirePermission("canCreateTasks"), NoteController.createNote)

// PUT /api/notes/:id - Update a note
router.put("/:id", NoteController.updateNote)

// DELETE /api/notes/:id - Delete a note
router.delete("/:id", NoteController.deleteNote)

// POST /api/notes/:id/share - Share a note with users
router.post("/:id/share", NoteController.shareNote)

// DELETE /api/notes/:id/share/:userId - Remove share access for a user
router.delete("/:id/share/:userId", NoteController.removeNoteShare)

// GET /api/notes/:id/shares - Get all shares for a note
router.get("/:id/shares", NoteController.getNoteShares)

export default router
