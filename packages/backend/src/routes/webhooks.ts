import Router from "@koa/router"
import { WebhookController } from "../controllers/WebhookController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({
  prefix: "/api/webhooks",
})

// All webhook routes require authentication and webhook management permissions
router.use(authenticate)
router.use(requirePermission("canManageWebhooks"))

// Webhook CRUD operations
router.get("/", WebhookController.getWebhooks)
router.post("/", WebhookController.createWebhook)
router.get("/events", WebhookController.getWebhookEvents)
router.post("/retry-failed", WebhookController.retryFailedWebhooks)

router.get("/:id", WebhookController.getWebhook)
router.put("/:id", WebhookController.updateWebhook)
router.delete("/:id", WebhookController.deleteWebhook)

// Webhook testing and management
router.post("/:id/test", WebhookController.testWebhook)
router.post("/:id/reset", WebhookController.resetWebhook)

// Webhook logs
router.get("/:id/logs", WebhookController.getWebhookLogs)

export default router
