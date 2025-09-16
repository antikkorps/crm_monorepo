import {
  TaskCreateRequest,
  TaskSearchFilters,
  TaskUpdateRequest,
} from "@medical-crm/shared"
import { Context } from "../types/koa"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Task, TaskPriority, TaskStatus } from "../models/Task"
import { User } from "../models/User"
import { NotificationService } from "../services/NotificationService"

export class TaskController {
  // GET /api/tasks - Get all tasks with optional filtering
  static async getTasks(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const {
        assigneeId,
        creatorId,
        institutionId,
        status,
        priority,
        overdue,
        dueDateFrom,
        dueDateTo,
        search,
        page = 1,
        limit = 50,
      } = ctx.query

      // Build filters based on user permissions and query parameters
      const filters: TaskSearchFilters = {}

      // Apply role-based filtering
      if (user.role === "user") {
        // Regular users can only see tasks they're involved in
        filters.teamMemberIds = [user.id]
      } else if (user.role === "team_admin" && user.teamId) {
        // Team admins can see tasks for their team members
        const teamMembers = await User.findByTeam(user.teamId)
        filters.teamMemberIds = teamMembers.map((member) => member.id)
      }
      // Super admins can see all tasks (no additional filtering)

      // Apply query filters
      if (assigneeId) filters.assigneeId = assigneeId as string
      if (creatorId) filters.creatorId = creatorId as string
      if (institutionId) filters.institutionId = institutionId as string
      if (status) filters.status = status as TaskStatus
      if (priority) filters.priority = priority as TaskPriority
      if (overdue === "true") filters.overdue = true
      if (dueDateFrom) filters.dueDateFrom = new Date(dueDateFrom as string)
      if (dueDateTo) filters.dueDateTo = new Date(dueDateTo as string)
      if (search) filters.search = search as string

      const tasks = await Task.searchTasks(filters)

      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit)
      const endIndex = startIndex + Number(limit)
      const paginatedTasks = tasks.slice(startIndex, endIndex)

      ctx.body = {
        success: true,
        data: paginatedTasks,
        meta: {
          total: tasks.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(tasks.length / Number(limit)),
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "TASK_FETCH_ERROR",
          message: "Failed to fetch tasks",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/tasks/:id - Get a specific task
  static async getTask(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const task = await Task.findByPk(id)

      if (!task) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task not found",
          },
        }
        return
      }

      // Check permissions
      const canAccess = await TaskController.canAccessTask(user, task)
      if (!canAccess) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to access this task",
          },
        }
        return
      }

      ctx.body = {
        success: true,
        data: task,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "TASK_FETCH_ERROR",
          message: "Failed to fetch task",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/tasks - Create a new task
  static async createTask(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const taskData = ctx.request.body as TaskCreateRequest

      // Validate required fields
      if (!taskData.title || !taskData.assigneeId) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Title and assigneeId are required",
          },
        }
        return
      }

      // Verify assignee exists and user has permission to assign to them
      const assignee = await User.findByPk(taskData.assigneeId)
      if (!assignee) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "INVALID_ASSIGNEE",
            message: "Assignee not found",
          },
        }
        return
      }

      // Check assignment permissions
      const canAssign = await TaskController.canAssignToUser(user, assignee)
      if (!canAssign) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to assign tasks to this user",
          },
        }
        return
      }

      // Verify institution exists if provided
      if (taskData.institutionId) {
        const institution = await MedicalInstitution.findByPk(taskData.institutionId)
        if (!institution) {
          ctx.status = 400
          ctx.body = {
            success: false,
            error: {
              code: "INVALID_INSTITUTION",
              message: "Institution not found",
            },
          }
          return
        }
      }

      const task = await Task.create({
        title: taskData.title,
        description: taskData.description,
        status: TaskStatus.TODO,
        priority: taskData.priority || TaskPriority.MEDIUM,
        assigneeId: taskData.assigneeId,
        creatorId: user.id,
        institutionId: taskData.institutionId,
        contactId: taskData.contactId,
        dueDate: taskData.dueDate,
      })

      // Fetch the created task
      const createdTask = await Task.findByPk(task.id)

      // Send notification to assignee if different from creator
      if (taskData.assigneeId !== user.id) {
        const notificationSvc = NotificationService.getInstance()
        await notificationSvc.notifyTaskAssigned(taskData.assigneeId, createdTask, user)
      }

      ctx.status = 201
      ctx.body = {
        success: true,
        data: createdTask,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "TASK_CREATE_ERROR",
          message: "Failed to create task",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // PUT /api/tasks/:id - Update a task
  static async updateTask(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const updateData = ctx.request.body as TaskUpdateRequest

      const task = await Task.findByPk(id)
      if (!task) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task not found",
          },
        }
        return
      }

      // Check permissions
      const canEdit = await TaskController.canEditTask(user, task)
      if (!canEdit) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to edit this task",
          },
        }
        return
      }

      // Validate assignee if being changed
      if (updateData.assigneeId && updateData.assigneeId !== task.assigneeId) {
        const newAssignee = await User.findByPk(updateData.assigneeId)
        if (!newAssignee) {
          ctx.status = 400
          ctx.body = {
            success: false,
            error: {
              code: "INVALID_ASSIGNEE",
              message: "Assignee not found",
            },
          }
          return
        }

        const canAssign = await TaskController.canAssignToUser(user, newAssignee)
        if (!canAssign) {
          ctx.status = 403
          ctx.body = {
            success: false,
            error: {
              code: "INSUFFICIENT_PERMISSIONS",
              message: "You don't have permission to assign tasks to this user",
            },
          }
          return
        }
      }

      // Validate institution if being changed
      if (updateData.institutionId && updateData.institutionId !== task.institutionId) {
        const institution = await MedicalInstitution.findByPk(updateData.institutionId)
        if (!institution) {
          ctx.status = 400
          ctx.body = {
            success: false,
            error: {
              code: "INVALID_INSTITUTION",
              message: "Institution not found",
            },
          }
          return
        }
      }

      // Store old values for notifications
      const oldStatus = task.status
      const oldAssigneeId = task.assigneeId

      // Update the task
      await task.update({
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.description !== undefined && {
          description: updateData.description,
        }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.priority && { priority: updateData.priority }),
        ...(updateData.assigneeId && { assigneeId: updateData.assigneeId }),
        ...(updateData.institutionId !== undefined && {
          institutionId: updateData.institutionId,
        }),
        ...(updateData.contactId !== undefined && {
          contactId: updateData.contactId,
        }),
        ...(updateData.dueDate !== undefined && { dueDate: updateData.dueDate }),
      })

      // Fetch the updated task
      const updatedTask = await Task.findByPk(task.id)

      const notificationSvc = NotificationService.getInstance()

      // Send notification for status change
      if (updateData.status && updateData.status !== oldStatus) {
        await notificationSvc.notifyTaskStatusChanged(
          updatedTask,
          oldStatus,
          updateData.status,
          user
        )
      }

      // Send notification for assignee change
      if (updateData.assigneeId && updateData.assigneeId !== oldAssigneeId) {
        await notificationSvc.notifyTaskAssigned(updateData.assigneeId, updatedTask, user)
      }

      ctx.body = {
        success: true,
        data: updatedTask,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "TASK_UPDATE_ERROR",
          message: "Failed to update task",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // DELETE /api/tasks/:id - Delete a task
  static async deleteTask(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const task = await Task.findByPk(id)
      if (!task) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task not found",
          },
        }
        return
      }

      // Check permissions
      const canDelete = await TaskController.canDeleteTask(user, task)
      if (!canDelete) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to delete this task",
          },
        }
        return
      }

      await task.destroy()

      ctx.body = {
        success: true,
        message: "Task deleted successfully",
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "TASK_DELETE_ERROR",
          message: "Failed to delete task",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/tasks/assigned/:userId - Get tasks assigned to a specific user
  static async getAssignedTasks(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { userId } = ctx.params

      // Check if user can view tasks for this user
      const targetUser = await User.findByPk(userId)
      if (!targetUser) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        }
        return
      }

      const canView = await TaskController.canViewUserTasks(user, targetUser)
      if (!canView) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to view tasks for this user",
          },
        }
        return
      }

      const tasks = await Task.findByAssignee(userId)

      ctx.body = {
        success: true,
        data: tasks,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "TASK_FETCH_ERROR",
          message: "Failed to fetch assigned tasks",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // Permission helper methods
  private static async canAccessTask(user: User, task: Task): Promise<boolean> {
    // Super admins can access all tasks
    if (user.role === "super_admin") return true

    // Users can access tasks they created or are assigned to
    if (task.assigneeId === user.id || task.creatorId === user.id) return true

    // Team admins can access tasks for their team members
    if (user.role === "team_admin" && user.teamId) {
      const assignee = await User.findByPk(task.assigneeId)
      const creator = await User.findByPk(task.creatorId)

      if (
        (assignee && assignee.teamId === user.teamId) ||
        (creator && creator.teamId === user.teamId)
      ) {
        return true
      }
    }

    return false
  }

  private static async canEditTask(user: User, task: Task): Promise<boolean> {
    // Super admins can edit all tasks
    if (user.role === "super_admin") return true

    // Team admins can edit tasks for their team members
    if (user.role === "team_admin" && user.teamId) {
      const assignee = await User.findByPk(task.assigneeId)
      const creator = await User.findByPk(task.creatorId)

      if (
        (assignee && assignee.teamId === user.teamId) ||
        (creator && creator.teamId === user.teamId)
      ) {
        return true
      }
    }

    // Users can edit tasks they created or are assigned to
    if (task.assigneeId === user.id || task.creatorId === user.id) return true

    return false
  }

  private static async canDeleteTask(user: User, task: Task): Promise<boolean> {
    // Super admins can delete all tasks
    if (user.role === "super_admin") return true

    // Team admins can delete tasks for their team members
    if (user.role === "team_admin" && user.teamId) {
      const assignee = await User.findByPk(task.assigneeId)
      const creator = await User.findByPk(task.creatorId)

      if (
        (assignee && assignee.teamId === user.teamId) ||
        (creator && creator.teamId === user.teamId)
      ) {
        return true
      }
    }

    // Users can only delete tasks they created
    if (task.creatorId === user.id) return true

    return false
  }

  private static async canAssignToUser(user: User, assignee: User): Promise<boolean> {
    // Super admins can assign to anyone
    if (user.role === "super_admin") return true

    // Team admins can assign to their team members
    if (user.role === "team_admin" && user.teamId === assignee.teamId) return true

    // Users can assign to themselves
    if (user.id === assignee.id) return true

    return false
  }

  private static async canViewUserTasks(user: User, targetUser: User): Promise<boolean> {
    // Super admins can view all user tasks
    if (user.role === "super_admin") return true

    // Team admins can view tasks for their team members
    if (user.role === "team_admin" && user.teamId === targetUser.teamId) return true

    // Users can view their own tasks
    if (user.id === targetUser.id) return true

    return false
  }
}
