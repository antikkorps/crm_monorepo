import { ReminderPriority } from "@medical-crm/shared"
import { Reminder } from "../models/Reminder"
import { User } from "../models/User"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Context, Next } from "../types/koa"
import { createError } from "../utils/logger"
import { ReminderNotificationService } from "../services/ReminderNotificationService"

export class ReminderController {
  /**
   * Get all reminders with optional filtering
   */
  public static async getReminders(ctx: Context, _next: Next): Promise<void> {
    try {
      const {
        userId,
        institutionId,
        priority,
        isCompleted,
        reminderDateFrom,
        reminderDateTo,
        overdue,
        teamMemberIds,
        search,
        limit = 50,
        offset = 0,
      } = ctx.query

      const filters: any = {}

      if (userId) filters.userId = userId
      if (institutionId) filters.institutionId = institutionId
      if (priority) filters.priority = priority
      if (isCompleted !== undefined) filters.isCompleted = isCompleted === "true"
      if (overdue !== undefined) filters.overdue = overdue === "true"
      if (search) filters.search = search

      if (teamMemberIds) {
        filters.teamMemberIds = Array.isArray(teamMemberIds) 
          ? teamMemberIds 
          : [teamMemberIds]
      }

      if (reminderDateFrom) {
        filters.reminderDateFrom = new Date(reminderDateFrom as string)
      }

      if (reminderDateTo) {
        filters.reminderDateTo = new Date(reminderDateTo as string)
      }

      const reminders = await Reminder.searchReminders(filters)

      // Apply pagination
      const paginatedReminders = reminders.slice(
        Number.parseInt(offset as string),
        Number.parseInt(offset as string) + Number.parseInt(limit as string)
      )

      ctx.body = {
        success: true,
        data: paginatedReminders,
        pagination: {
          total: reminders.length,
          limit: Number.parseInt(limit as string),
          offset: Number.parseInt(offset as string),
        },
      }
    } catch (error: any) {
      throw createError("Failed to fetch reminders", 500, "FETCH_REMINDERS_ERROR", { error })
    }
  }

  /**
   * Get reminder by ID
   */
  public static async getReminder(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const reminder = await Reminder.findByPk(id, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      if (!reminder) {
        throw createError("Reminder not found", 404, "REMINDER_NOT_FOUND")
      }

      ctx.body = {
        success: true,
        data: reminder,
      }
    } catch (error: any) {
      if (error.status === 404) {
        throw error
      }
      throw createError("Failed to fetch reminder", 500, "FETCH_REMINDER_ERROR", { error })
    }
  }

  /**
   * Create a new reminder
   */
  public static async createReminder(ctx: Context, _next: Next): Promise<void> {
    try {
      const {
        title,
        description,
        reminderDate,
        userId: bodyUserId,
        institutionId,
        priority = ReminderPriority.MEDIUM,
      } = ctx.request.body as {
        title: string
        description?: string
        reminderDate: string
        userId?: string
        institutionId?: string
        priority?: ReminderPriority
      }

      // Use authenticated user if userId not provided
      const authenticatedUser = ctx.state.user as User
      const userId = bodyUserId || authenticatedUser?.id

      // Validate required fields
      if (!title || !reminderDate || !userId) {
        throw createError("Missing required fields", 400, "MISSING_REQUIRED_FIELDS")
      }

      // Validate priority
      if (!Object.values(ReminderPriority).includes(priority)) {
        throw createError("Invalid priority", 400, "INVALID_PRIORITY")
      }

      // Validate reminder date
      const parsedReminderDate = new Date(reminderDate)
      if (isNaN(parsedReminderDate.getTime())) {
        throw createError("Invalid reminder date", 400, "INVALID_REMINDER_DATE")
      }

      const reminder = await Reminder.create({
        title,
        description,
        reminderDate: parsedReminderDate,
        userId,
        institutionId,
        priority,
        isCompleted: false,
      })

      // Reload with associations
      await reminder.reload({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      // Send notification
      const notificationService = ReminderNotificationService.getInstance()
      await notificationService.notifyReminderCreated(reminder)

      ctx.status = 201
      ctx.body = {
        success: true,
        data: reminder,
      }
    } catch (error: any) {
      if (error.status === 400) {
        throw error
      }
      throw createError("Failed to create reminder", 500, "CREATE_REMINDER_ERROR", { error })
    }
  }

  /**
   * Update a reminder
   */
  public static async updateReminder(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const updateData = ctx.request.body as Partial<{
        title: string
        description?: string
        reminderDate: string
        priority: ReminderPriority
        isCompleted: boolean
        institutionId?: string
      }>

      // Create a properly typed update object
      const typedUpdateData: Partial<{
        title?: string
        description?: string
        reminderDate?: Date
        priority?: ReminderPriority
        isCompleted?: boolean
        institutionId?: string
      }> = {}

      const reminder = await Reminder.findByPk(id)

      if (!reminder) {
        throw createError("Reminder not found", 404, "REMINDER_NOT_FOUND")
      }

      // Copy over simple fields
      if (updateData.title !== undefined) typedUpdateData.title = updateData.title
      if (updateData.description !== undefined) typedUpdateData.description = updateData.description
      if (updateData.isCompleted !== undefined) typedUpdateData.isCompleted = updateData.isCompleted
      if (updateData.institutionId !== undefined) typedUpdateData.institutionId = updateData.institutionId

      // Validate and convert reminder date if provided
      if (updateData.reminderDate) {
        const parsedDate = new Date(updateData.reminderDate)
        if (isNaN(parsedDate.getTime())) {
          throw createError("Invalid reminder date", 400, "INVALID_REMINDER_DATE")
        }
        typedUpdateData.reminderDate = parsedDate
      }

      // Validate priority if provided
      if (updateData.priority) {
        if (!Object.values(ReminderPriority).includes(updateData.priority)) {
          throw createError("Invalid priority", 400, "INVALID_PRIORITY")
        }
        typedUpdateData.priority = updateData.priority
      }

      // Validate reminder data before update
      if (Object.keys(typedUpdateData).length > 0) {
        Reminder.validateReminderData(typedUpdateData as any)
      }

      await reminder.update(typedUpdateData)

      // Reload with associations
      await reminder.reload({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      ctx.body = {
        success: true,
        data: reminder,
      }
    } catch (error: any) {
      if (error.status === 404 || error.status === 400) {
        throw error
      }
      throw createError("Failed to update reminder", 500, "UPDATE_REMINDER_ERROR", { error })
    }
  }

  /**
   * Delete a reminder
   */
  public static async deleteReminder(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const reminder = await Reminder.findByPk(id)

      if (!reminder) {
        throw createError("Reminder not found", 404, "REMINDER_NOT_FOUND")
      }

      await reminder.destroy()

      ctx.status = 204
    } catch (error: any) {
      if (error.status === 404) {
        throw error
      }
      throw createError("Failed to delete reminder", 500, "DELETE_REMINDER_ERROR", { error })
    }
  }

  /**
   * Mark reminder as completed
   */
  public static async markCompleted(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const reminder = await Reminder.findByPk(id)

      if (!reminder) {
        throw createError("Reminder not found", 404, "REMINDER_NOT_FOUND")
      }

      await reminder.markAsCompleted()

      // Reload with associations
      await reminder.reload({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      // Send notification
      const notificationService = ReminderNotificationService.getInstance()
      await notificationService.notifyReminderCompleted(reminder)

      ctx.body = {
        success: true,
        data: reminder,
      }
    } catch (error: any) {
      if (error.status === 404) {
        throw error
      }
      throw createError("Failed to mark reminder as completed", 500, "MARK_COMPLETED_ERROR", { error })
    }
  }

  /**
   * Mark reminder as incomplete
   */
  public static async markIncomplete(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params

      const reminder = await Reminder.findByPk(id)

      if (!reminder) {
        throw createError("Reminder not found", 404, "REMINDER_NOT_FOUND")
      }

      await reminder.markAsIncomplete()

      // Reload with associations
      await reminder.reload({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      ctx.body = {
        success: true,
        data: reminder,
      }
    } catch (error: any) {
      if (error.status === 404) {
        throw error
      }
      throw createError("Failed to mark reminder as incomplete", 500, "MARK_INCOMPLETE_ERROR", { error })
    }
  }

  /**
   * Snooze reminder by specified minutes
   */
  public static async snoozeReminder(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const { minutes } = ctx.request.body as { minutes: number }

      if (!minutes || typeof minutes !== "number" || minutes <= 0) {
        throw createError("Invalid snooze duration", 400, "INVALID_SNOOZE_DURATION")
      }

      const reminder = await Reminder.findByPk(id)

      if (!reminder) {
        throw createError("Reminder not found", 404, "REMINDER_NOT_FOUND")
      }

      await reminder.snooze(minutes)

      // Reload with associations
      await reminder.reload({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      // Send notification
      const notificationService = ReminderNotificationService.getInstance()
      await notificationService.notifyReminderSnoozed(reminder, minutes)

      ctx.body = {
        success: true,
        data: reminder,
      }
    } catch (error: any) {
      if (error.status === 404 || error.status === 400) {
        throw error
      }
      throw createError("Failed to snooze reminder", 500, "SNOOZE_REMINDER_ERROR", { error })
    }
  }

  /**
   * Reschedule reminder to new date
   */
  public static async rescheduleReminder(ctx: Context, _next: Next): Promise<void> {
    try {
      const { id } = ctx.params
      const { reminderDate } = ctx.request.body as { reminderDate: string }

      if (!reminderDate) {
        throw createError("Missing new reminder date", 400, "MISSING_REMINDER_DATE")
      }

      const parsedDate = new Date(reminderDate)
      if (isNaN(parsedDate.getTime())) {
        throw createError("Invalid reminder date", 400, "INVALID_REMINDER_DATE")
      }

      const reminder = await Reminder.findByPk(id)

      if (!reminder) {
        throw createError("Reminder not found", 404, "REMINDER_NOT_FOUND")
      }

      const oldDate = new Date(reminder.reminderDate)
      await reminder.reschedule(parsedDate)

      // Reload with associations
      await reminder.reload({
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      // Send notification
      const notificationService = ReminderNotificationService.getInstance()
      await notificationService.notifyReminderRescheduled(reminder, oldDate)

      ctx.body = {
        success: true,
        data: reminder,
      }
    } catch (error: any) {
      if (error.status === 404 || error.status === 400) {
        throw error
      }
      throw createError("Failed to reschedule reminder", 500, "RESCHEDULE_REMINDER_ERROR", { error })
    }
  }

  /**
   * Get reminders by user ID
   */
  public static async getRemindersByUser(ctx: Context, _next: Next): Promise<void> {
    try {
      const { userId } = ctx.params

      const reminders = await Reminder.findByUser(userId)

      ctx.body = {
        success: true,
        data: reminders,
      }
    } catch (error: any) {
      throw createError("Failed to fetch user reminders", 500, "FETCH_USER_REMINDERS_ERROR", { error })
    }
  }

  /**
   * Get reminders by institution ID
   */
  public static async getRemindersByInstitution(ctx: Context, _next: Next): Promise<void> {
    try {
      const { institutionId } = ctx.params

      const reminders = await Reminder.findByInstitution(institutionId)

      ctx.body = {
        success: true,
        data: reminders,
      }
    } catch (error: any) {
      throw createError("Failed to fetch institution reminders", 500, "FETCH_INSTITUTION_REMINDERS_ERROR", { error })
    }
  }

  /**
   * Get reminders by priority
   */
  public static async getRemindersByPriority(ctx: Context, _next: Next): Promise<void> {
    try {
      const { priority } = ctx.params

      if (!Object.values(ReminderPriority).includes(priority as ReminderPriority)) {
        throw createError("Invalid priority", 400, "INVALID_PRIORITY")
      }

      const reminders = await Reminder.findByPriority(priority as ReminderPriority)

      ctx.body = {
        success: true,
        data: reminders,
      }
    } catch (error: any) {
      if (error.status === 400) {
        throw error
      }
      throw createError("Failed to fetch reminders by priority", 500, "FETCH_PRIORITY_REMINDERS_ERROR", { error })
    }
  }

  /**
   * Get completed reminders
   */
  public static async getCompletedReminders(ctx: Context, _next: Next): Promise<void> {
    try {
      const { userId } = ctx.query

      const reminders = await Reminder.findCompleted(userId as string)

      ctx.body = {
        success: true,
        data: reminders,
      }
    } catch (error: any) {
      throw createError("Failed to fetch completed reminders", 500, "FETCH_COMPLETED_REMINDERS_ERROR", { error })
    }
  }

  /**
   * Get pending reminders
   */
  public static async getPendingReminders(ctx: Context, _next: Next): Promise<void> {
    try {
      const { userId } = ctx.query

      const reminders = await Reminder.findPending(userId as string)

      ctx.body = {
        success: true,
        data: reminders,
      }
    } catch (error: any) {
      throw createError("Failed to fetch pending reminders", 500, "FETCH_PENDING_REMINDERS_ERROR", { error })
    }
  }

  /**
   * Get overdue reminders
   */
  public static async getOverdueReminders(ctx: Context, _next: Next): Promise<void> {
    try {
      const { userId } = ctx.query

      const reminders = await Reminder.findOverdueReminders(userId as string)

      ctx.body = {
        success: true,
        data: reminders,
      }
    } catch (error: any) {
      throw createError("Failed to fetch overdue reminders", 500, "FETCH_OVERDUE_REMINDERS_ERROR", { error })
    }
  }

  /**
   * Get upcoming reminders
   */
  public static async getUpcomingReminders(ctx: Context, _next: Next): Promise<void> {
    try {
      const { userId, hoursAhead = 24 } = ctx.query

      const parsedHours = Number.parseInt(hoursAhead as string)
      if (isNaN(parsedHours) || parsedHours <= 0) {
        throw createError("Invalid hours ahead value", 400, "INVALID_HOURS_AHEAD")
      }

      const reminders = await Reminder.findUpcomingReminders(userId as string, parsedHours)

      ctx.body = {
        success: true,
        data: reminders,
      }
    } catch (error: any) {
      if (error.status === 400) {
        throw error
      }
      throw createError("Failed to fetch upcoming reminders", 500, "FETCH_UPCOMING_REMINDERS_ERROR", { error })
    }
  }

  /**
   * Get reminders by date range
   */
  public static async getRemindersByDateRange(ctx: Context, _next: Next): Promise<void> {
    try {
      const { startDate, endDate, userId } = ctx.query

      if (!startDate || !endDate) {
        throw createError("Start date and end date are required", 400, "MISSING_DATE_RANGE")
      }

      const start = new Date(startDate as string)
      const end = new Date(endDate as string)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw createError("Invalid date format", 400, "INVALID_DATE_FORMAT")
      }

      if (start > end) {
        throw createError("Start date must be before end date", 400, "INVALID_DATE_RANGE")
      }

      const reminders = await Reminder.findByDateRange(start, end, userId as string)

      ctx.body = {
        success: true,
        data: reminders,
      }
    } catch (error: any) {
      if (error.status === 400) {
        throw error
      }
      throw createError("Failed to fetch reminders by date range", 500, "FETCH_DATE_RANGE_REMINDERS_ERROR", { error })
    }
  }
}