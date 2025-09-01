import Router from "@koa/router"
import { MeetingController } from "../controllers/MeetingController"
import { CommentController } from "../controllers/CommentController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/meetings" })

// All meeting routes require authentication
router.use(authenticate)

// GET /api/meetings - list with filtering
router.get("/", requirePermission("canViewAllTasks"), MeetingController.getMeetings)

// GET /api/meetings/:id - get meeting
router.get("/:id", MeetingController.getMeeting)

// POST /api/meetings - create meeting
router.post("/", requirePermission("canCreateTasks"), MeetingController.createMeeting)

// PUT /api/meetings/:id - update meeting
router.put("/:id", MeetingController.updateMeeting)

// DELETE /api/meetings/:id - delete meeting
router.delete("/:id", MeetingController.deleteMeeting)

// Participants
router.get("/:id/participants", MeetingController.getParticipants)
router.post("/:id/participants", MeetingController.inviteParticipants)
router.put("/:id/participants/:userId", MeetingController.updateParticipantStatus)
router.delete("/:id/participants/:userId", MeetingController.removeParticipant)

// Comments on meetings
router.get("/:meetingId/comments", CommentController.listForMeeting)
router.post("/:meetingId/comments", CommentController.create)
router.put("/:meetingId/comments/:commentId", CommentController.update)
router.delete("/:meetingId/comments/:commentId", CommentController.remove)

export default router
