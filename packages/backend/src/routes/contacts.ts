import Router from "@koa/router"
import { ContactController } from "../controllers/ContactController"
import { authenticate } from "../middleware/auth"

const router = new Router({ prefix: "/api/contacts" })

router.post("/", authenticate, ContactController.create)

router.get("/", authenticate, ContactController.list)

router.get("/:id", authenticate, ContactController.get)

router.put("/:id", authenticate, ContactController.update)

router.delete("/:id", authenticate, ContactController.delete)

export default router
