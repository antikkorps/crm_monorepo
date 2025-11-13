import Router from "@koa/router"
import { HealthController } from "../controllers/HealthController"

const router = new Router()

/**
 * Health Check Routes
 *
 * These endpoints are used for monitoring, load balancers, and orchestration systems
 */

// Basic health check - lightweight, quick response
router.get("/health", HealthController.basic)

// Detailed health check - includes database and service checks
router.get("/health/detailed", HealthController.detailed)

// Kubernetes/Docker readiness probe
router.get("/health/ready", HealthController.ready)

// Kubernetes/Docker liveness probe
router.get("/health/live", HealthController.live)

export default router
