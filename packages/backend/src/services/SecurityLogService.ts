import { Context } from "koa"
import {
  SecurityLog,
  SecurityLogAction,
  SecurityLogResource,
  SecurityLogStatus,
} from "../models/SecurityLog"

export class SecurityLogService {
  /**
   * Extract IP address from Koa context
   */
  private static getIpAddress(ctx: Context): string {
    // Check for proxy headers first
    const forwardedFor = ctx.request.headers["x-forwarded-for"]
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
      return ips.split(",")[0].trim()
    }

    // Check for real IP header
    const realIp = ctx.request.headers["x-real-ip"]
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp
    }

    // Fallback to connection IP
    return ctx.request.ip || "unknown"
  }

  /**
   * Extract user agent from Koa context
   */
  private static getUserAgent(ctx: Context): string {
    const userAgent = ctx.request.headers["user-agent"]
    return (Array.isArray(userAgent) ? userAgent[0] : userAgent) || "unknown"
  }

  /**
   * Log a security event from a Koa context
   */
  static async logFromContext(
    ctx: Context,
    action: SecurityLogAction,
    resource: SecurityLogResource,
    resourceId?: string,
    status: SecurityLogStatus = SecurityLogStatus.SUCCESS,
    details?: string
  ): Promise<SecurityLog> {
    const userId = ctx.state.user?.id

    return SecurityLog.logEvent({
      userId,
      action,
      resource,
      resourceId,
      ipAddress: this.getIpAddress(ctx),
      userAgent: this.getUserAgent(ctx),
      status,
      details,
    })
  }

  /**
   * Log authentication success
   */
  static async logAuthSuccess(ctx: Context, userId: string): Promise<SecurityLog> {
    return this.logFromContext(
      ctx,
      SecurityLogAction.AUTH_LOGIN,
      SecurityLogResource.USER,
      userId,
      SecurityLogStatus.SUCCESS,
      "User logged in successfully"
    )
  }

  /**
   * Log authentication failure
   */
  static async logAuthFailure(
    ctx: Context,
    email: string,
    reason: string
  ): Promise<SecurityLog> {
    return SecurityLog.logEvent({
      userId: undefined, // No user ID for failed login
      action: SecurityLogAction.AUTH_FAILED,
      resource: SecurityLogResource.USER,
      ipAddress: this.getIpAddress(ctx),
      userAgent: this.getUserAgent(ctx),
      status: SecurityLogStatus.FAILURE,
      details: `Failed login attempt for ${email}: ${reason}`,
    })
  }

  /**
   * Log permission denied
   */
  static async logPermissionDenied(
    ctx: Context,
    resource: SecurityLogResource,
    resourceId?: string,
    reason?: string
  ): Promise<SecurityLog> {
    return this.logFromContext(
      ctx,
      SecurityLogAction.PERMISSION_DENIED,
      resource,
      resourceId,
      SecurityLogStatus.FAILURE,
      reason || "Permission denied"
    )
  }

  /**
   * Log data read access (for sensitive resources)
   */
  static async logDataRead(
    ctx: Context,
    resource: SecurityLogResource,
    resourceId?: string
  ): Promise<SecurityLog> {
    return this.logFromContext(
      ctx,
      SecurityLogAction.DATA_READ,
      resource,
      resourceId,
      SecurityLogStatus.SUCCESS
    )
  }

  /**
   * Log data creation
   */
  static async logDataCreate(
    ctx: Context,
    resource: SecurityLogResource,
    resourceId: string
  ): Promise<SecurityLog> {
    return this.logFromContext(
      ctx,
      SecurityLogAction.DATA_CREATE,
      resource,
      resourceId,
      SecurityLogStatus.SUCCESS,
      `Created ${resource} with ID ${resourceId}`
    )
  }

  /**
   * Log data update
   */
  static async logDataUpdate(
    ctx: Context,
    resource: SecurityLogResource,
    resourceId: string,
    changes?: string
  ): Promise<SecurityLog> {
    return this.logFromContext(
      ctx,
      SecurityLogAction.DATA_UPDATE,
      resource,
      resourceId,
      SecurityLogStatus.SUCCESS,
      changes ? `Updated ${resource}: ${changes}` : undefined
    )
  }

  /**
   * Log data deletion
   */
  static async logDataDelete(
    ctx: Context,
    resource: SecurityLogResource,
    resourceId: string
  ): Promise<SecurityLog> {
    return this.logFromContext(
      ctx,
      SecurityLogAction.DATA_DELETE,
      resource,
      resourceId,
      SecurityLogStatus.SUCCESS,
      `Deleted ${resource} with ID ${resourceId}`
    )
  }

  /**
   * Log data export
   */
  static async logDataExport(
    ctx: Context,
    resource: SecurityLogResource,
    details?: string
  ): Promise<SecurityLog> {
    return this.logFromContext(
      ctx,
      SecurityLogAction.DATA_EXPORT,
      resource,
      undefined,
      SecurityLogStatus.SUCCESS,
      details || `Exported ${resource} data`
    )
  }

  /**
   * Log logout
   */
  static async logLogout(ctx: Context): Promise<SecurityLog> {
    return this.logFromContext(
      ctx,
      SecurityLogAction.AUTH_LOGOUT,
      SecurityLogResource.USER,
      ctx.state.user?.id,
      SecurityLogStatus.SUCCESS,
      "User logged out"
    )
  }
}
