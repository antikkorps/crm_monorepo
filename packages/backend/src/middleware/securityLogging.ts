import { Context, Next } from "koa"
import { SecurityLogService } from "../services/SecurityLogService"
import { SecurityLogResource } from "../models/SecurityLog"

/**
 * Middleware to automatically log failed authorization attempts
 */
export const securityLoggingMiddleware = async (ctx: Context, next: Next) => {
  try {
    await next()

    // Log 403 Forbidden responses (permission denied)
    if (ctx.status === 403) {
      const resource = extractResourceFromPath(ctx.path)
      const resourceId = extractResourceIdFromPath(ctx.path)

      await SecurityLogService.logPermissionDenied(
        ctx,
        resource,
        resourceId,
        "Access forbidden"
      ).catch((err) => {
        // Don't fail the request if logging fails
        console.error("Failed to log permission denied:", err)
      })
    }
  } catch (error) {
    // Log the error but don't prevent it from being thrown
    throw error
  }
}

/**
 * Extract resource type from URL path
 */
function extractResourceFromPath(path: string): SecurityLogResource {
  if (path.includes("/institutions")) return SecurityLogResource.INSTITUTION
  if (path.includes("/invoices")) return SecurityLogResource.INVOICE
  if (path.includes("/quotes")) return SecurityLogResource.QUOTE
  if (path.includes("/payments")) return SecurityLogResource.PAYMENT
  if (path.includes("/users")) return SecurityLogResource.USER
  if (path.includes("/teams")) return SecurityLogResource.TEAM
  if (path.includes("/tasks")) return SecurityLogResource.TASK
  if (path.includes("/meetings")) return SecurityLogResource.MEETING
  if (path.includes("/notes")) return SecurityLogResource.NOTE
  if (path.includes("/webhooks")) return SecurityLogResource.WEBHOOK
  if (path.includes("/contacts")) return SecurityLogResource.CONTACT_PERSON
  if (path.includes("/templates")) return SecurityLogResource.DOCUMENT_TEMPLATE
  if (path.includes("/catalog")) return SecurityLogResource.CATALOG_ITEM
  if (path.includes("/segments")) return SecurityLogResource.SEGMENT

  return SecurityLogResource.USER // Default fallback
}

/**
 * Extract resource ID from URL path (if present)
 */
function extractResourceIdFromPath(path: string): string | undefined {
  // Match UUID pattern in path
  const uuidRegex =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  const match = path.match(uuidRegex)
  return match ? match[0] : undefined
}
