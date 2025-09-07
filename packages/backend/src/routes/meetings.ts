import Router from "@koa/router"
import { MeetingController } from "../controllers/MeetingController"
import { CommentController } from "../controllers/CommentController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"
import { validateUUID, validatePagination } from "../middleware/validation"
import { collaborationErrorHandler, addCollaborationErrorContext } from "../middleware/collaborationErrorHandler"
import {
  validateMeetingCreation,
  validateMeetingUpdate,
  validateMeetingParticipant,
  validateMeetingSearch,
  validateCommentCreation,
  validateCommentUpdate,
} from "../middleware/collaborationValidation"

const router = new Router({ prefix: "/api/meetings" })

// All meeting routes require authentication and error handling
router.use(authenticate)
router.use(addCollaborationErrorContext)
router.use(collaborationErrorHandler)

// GET /api/meetings - list with filtering
router.get("/", requirePermission("canViewAllTasks"), validateMeetingSearch, MeetingController.getMeetings)

// GET /api/meetings/:id - get meeting
router.get("/:id", validateUUID, MeetingController.getMeeting)

// POST /api/meetings - create meeting
router.post("/", requirePermission("canCreateTasks"), validateMeetingCreation, MeetingController.createMeeting)

// PUT /api/meetings/:id - update meeting
router.put("/:id", validateUUID, validateMeetingUpdate, MeetingController.updateMeeting)

// DELETE /api/meetings/:id - delete meeting
router.delete("/:id", validateUUID, MeetingController.deleteMeeting)

// Participants
router.get("/:id/participants", validateUUID, validatePagination, MeetingController.getParticipants)
router.post("/:id/participants", validateUUID, validateMeetingParticipant, MeetingController.inviteParticipants)
router.put("/:id/participants/:userId", validateUUID, validateMeetingParticipant, MeetingController.updateParticipantStatus)
router.delete("/:id/participants/:userId", validateUUID, MeetingController.removeParticipant)

// Comments on meetings
router.get("/:meetingId/comments", validateUUID, validatePagination, CommentController.listForMeeting)
router.post("/:meetingId/comments", validateUUID, validateCommentCreation, CommentController.create)
router.put("/:meetingId/comments/:commentId", validateUUID, validateCommentUpdate, CommentController.update)
router.delete("/:meetingId/comments/:commentId", validateUUID, CommentController.remove)

export default router
