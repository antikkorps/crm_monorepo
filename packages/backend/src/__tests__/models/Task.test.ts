import { sequelize } from "../../config/database"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Task, TaskPriority, TaskStatus } from "../../models/Task"
import { User, UserRole } from "../../models/User"

describe("Task Model", () => {
  let testUser1: User
  let testUser2: User
  let testInstitution: MedicalInstitution

  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  beforeEach(async () => {
    // Create test users
    testUser1 = await User.create({
      email: "creator@test.com",
      passwordHash: "hashedpassword",
      firstName: "John",
      lastName: "Creator",
      role: UserRole.USER,
      avatarSeed: "test-seed-1",
      isActive: true,
    })

    testUser2 = await User.create({
      email: "assignee@test.com",
      passwordHash: "hashedpassword",
      firstName: "Jane",
      lastName: "Assignee",
      role: UserRole.USER,
      avatarSeed: "test-seed-2",
      isActive: true,
    })

    // For SQLite testing, we'll skip MedicalInstitution creation
    // since it uses PostgreSQL-specific features
    testInstitution = null as any
  })

  afterEach(async () => {
    await Task.destroy({ where: {} })
    await User.destroy({ where: {} })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  describe("Task Creation", () => {
    it("should create a task with required fields", async () => {
      const task = await Task.create({
        title: "Test Task",
        description: "This is a test task",
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        assigneeId: testUser2.id,
        creatorId: testUser1.id,
        institutionId: testInstitution.id,
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
      })

      expect(task.id).toBeDefined()
      expect(task.title).toBe("Test Task")
      expect(task.description).toBe("This is a test task")
      expect(task.status).toBe(TaskStatus.TODO)
      expect(task.priority).toBe(TaskPriority.MEDIUM)
      expect(task.assigneeId).toBe(testUser2.id)
      expect(task.creatorId).toBe(testUser1.id)
      expect(task.institutionId).toBe(testInstitution.id)
      expect(task.dueDate).toBeDefined()
      expect(task.completedAt).toBeNull()
      expect(task.createdAt).toBeDefined()
      expect(task.updatedAt).toBeDefined()
    })

    it("should create a task with minimal required fields", async () => {
      const task = await Task.create({
        title: "Minimal Task",
        assigneeId: testUser2.id,
        creatorId: testUser1.id,
      })

      expect(task.title).toBe("Minimal Task")
      expect(task.status).toBe(TaskStatus.TODO) // Default value
      expect(task.priority).toBe(TaskPriority.MEDIUM) // Default value
      expect(task.description).toBeNull()
      expect(task.institutionId).toBeNull()
      expect(task.dueDate).toBeNull()
    })

    it("should fail to create task without required fields", async () => {
      await expect(
        Task.create({
          title: "Invalid Task",
          // Missing assigneeId and creatorId
        } as any)
      ).rejects.toThrow()
    })

    it("should fail to create task with empty title", async () => {
      await expect(
        Task.create({
          title: "",
          assigneeId: testUser2.id,
          creatorId: testUser1.id,
        })
      ).rejects.toThrow()
    })

    it("should fail to create task with due date in the past", async () => {
      await expect(
        Task.create({
          title: "Past Due Task",
          assigneeId: testUser2.id,
          creatorId: testUser1.id,
          dueDate: new Date(Date.now() - 86400000), // Yesterday
        })
      ).rejects.toThrow("Due date cannot be in the past")
    })
  })

  describe("Task Instance Methods", () => {
    let task: Task

    beforeEach(async () => {
      task = await Task.create({
        title: "Test Task",
        assigneeId: testUser2.id,
        creatorId: testUser1.id,
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
      })
    })

    it("should correctly identify overdue tasks", async () => {
      // Task with future due date should not be overdue
      expect(task.isOverdue()).toBe(false)

      // Update task to have past due date
      await task.update({
        dueDate: new Date(Date.now() - 86400000), // Yesterday
      })
      expect(task.isOverdue()).toBe(true)

      // Completed tasks should not be overdue
      await task.update({ status: TaskStatus.COMPLETED })
      expect(task.isOverdue()).toBe(false)
    })

    it("should calculate days until due correctly", () => {
      const daysUntilDue = task.getDaysUntilDue()
      expect(daysUntilDue).toBe(1) // Tomorrow

      // Task without due date should return null
      task.dueDate = undefined
      expect(task.getDaysUntilDue()).toBeNull()
    })

    it("should mark task as completed", async () => {
      await task.markAsCompleted()
      expect(task.status).toBe(TaskStatus.COMPLETED)
      expect(task.completedAt).toBeDefined()
    })

    it("should mark task as in progress", async () => {
      await task.markAsInProgress()
      expect(task.status).toBe(TaskStatus.IN_PROGRESS)
    })

    it("should mark task as cancelled", async () => {
      await task.markAsCancelled()
      expect(task.status).toBe(TaskStatus.CANCELLED)
    })

    it("should reassign task", async () => {
      await task.reassign(testUser1.id)
      expect(task.assigneeId).toBe(testUser1.id)
    })

    it("should update priority", async () => {
      await task.updatePriority(TaskPriority.HIGH)
      expect(task.priority).toBe(TaskPriority.HIGH)
    })

    it("should update due date", async () => {
      const newDueDate = new Date(Date.now() + 172800000) // Day after tomorrow
      await task.updateDueDate(newDueDate)
      expect(task.dueDate).toEqual(newDueDate)

      // Should be able to clear due date
      await task.updateDueDate(null)
      expect(task.dueDate).toBeUndefined()
    })

    it("should include computed properties in JSON", () => {
      const json = task.toJSON()
      expect(json.isOverdue).toBeDefined()
      expect(json.daysUntilDue).toBeDefined()
    })
  })

  describe("Task Static Methods", () => {
    let task1: Task
    let task2: Task
    let task3: Task

    beforeEach(async () => {
      task1 = await Task.create({
        title: "Task 1",
        assigneeId: testUser2.id,
        creatorId: testUser1.id,
        institutionId: testInstitution.id,
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 86400000),
      })

      task2 = await Task.create({
        title: "Task 2",
        assigneeId: testUser1.id,
        creatorId: testUser2.id,
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.LOW,
      })

      task3 = await Task.create({
        title: "Task 3",
        assigneeId: testUser2.id,
        creatorId: testUser1.id,
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.URGENT,
        dueDate: new Date(Date.now() - 86400000), // Yesterday (overdue)
      })
    })

    it("should find tasks by assignee", async () => {
      const tasks = await Task.findByAssignee(testUser2.id)
      expect(tasks).toHaveLength(2)
      expect(tasks.map((t) => t.id)).toContain(task1.id)
      expect(tasks.map((t) => t.id)).toContain(task3.id)
    })

    it("should find tasks by creator", async () => {
      const tasks = await Task.findByCreator(testUser1.id)
      expect(tasks).toHaveLength(2)
      expect(tasks.map((t) => t.id)).toContain(task1.id)
      expect(tasks.map((t) => t.id)).toContain(task3.id)
    })

    it("should find tasks by institution", async () => {
      const tasks = await Task.findByInstitution(testInstitution.id)
      expect(tasks).toHaveLength(1)
      expect(tasks[0].id).toBe(task1.id)
    })

    it("should find tasks by status", async () => {
      const todoTasks = await Task.findByStatus(TaskStatus.TODO)
      expect(todoTasks).toHaveLength(1)
      expect(todoTasks[0].id).toBe(task1.id)

      const inProgressTasks = await Task.findByStatus(TaskStatus.IN_PROGRESS)
      expect(inProgressTasks).toHaveLength(1)
      expect(inProgressTasks[0].id).toBe(task2.id)
    })

    it("should find overdue tasks", async () => {
      const overdueTasks = await Task.findOverdueTasks()
      expect(overdueTasks).toHaveLength(0) // task3 is completed, so not overdue

      // Create an overdue task that's not completed
      await Task.create({
        title: "Overdue Task",
        assigneeId: testUser2.id,
        creatorId: testUser1.id,
        status: TaskStatus.TODO,
        dueDate: new Date(Date.now() - 86400000),
      })

      const overdueTasks2 = await Task.findOverdueTasks()
      expect(overdueTasks2).toHaveLength(1)
    })

    it("should find tasks by team members", async () => {
      const teamMemberIds = [testUser1.id, testUser2.id]
      const tasks = await Task.findByTeamMembers(teamMemberIds)
      expect(tasks).toHaveLength(3) // All tasks involve these users
    })

    it("should search tasks with filters", async () => {
      // Search by assignee
      let tasks = await Task.searchTasks({ assigneeId: testUser2.id })
      expect(tasks).toHaveLength(2)

      // Search by status
      tasks = await Task.searchTasks({ status: TaskStatus.TODO })
      expect(tasks).toHaveLength(1)

      // Search by priority
      tasks = await Task.searchTasks({ priority: TaskPriority.HIGH })
      expect(tasks).toHaveLength(1)

      // Search by text
      tasks = await Task.searchTasks({ search: "Task 1" })
      expect(tasks).toHaveLength(1)
      expect(tasks[0].id).toBe(task1.id)
    })
  })

  describe("Task Validation", () => {
    it("should validate task assignment", () => {
      expect(() => {
        Task.validateTaskAssignment("", "creator-id")
      }).toThrow("Both assignee and creator are required")

      expect(() => {
        Task.validateTaskAssignment("assignee-id", "")
      }).toThrow("Both assignee and creator are required")

      // Should not throw for valid assignment
      expect(() => {
        Task.validateTaskAssignment("assignee-id", "creator-id")
      }).not.toThrow()

      // Should allow self-assignment
      expect(() => {
        Task.validateTaskAssignment("user-id", "user-id")
      }).not.toThrow()
    })

    it("should validate due date", () => {
      const pastDate = new Date(Date.now() - 86400000)
      const futureDate = new Date(Date.now() + 86400000)

      expect(() => {
        Task.validateDueDate(pastDate)
      }).toThrow("Due date cannot be in the past")

      expect(() => {
        Task.validateDueDate(futureDate)
      }).not.toThrow()

      expect(() => {
        Task.validateDueDate(undefined)
      }).not.toThrow()
    })

    it("should validate status transitions", () => {
      // Valid transitions
      expect(() => {
        Task.validateStatusTransition(TaskStatus.TODO, TaskStatus.IN_PROGRESS)
      }).not.toThrow()

      expect(() => {
        Task.validateStatusTransition(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)
      }).not.toThrow()

      expect(() => {
        Task.validateStatusTransition(TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS)
      }).not.toThrow()

      // Invalid transitions
      expect(() => {
        Task.validateStatusTransition(TaskStatus.TODO, TaskStatus.COMPLETED)
      }).toThrow("Invalid status transition")

      expect(() => {
        Task.validateStatusTransition(TaskStatus.COMPLETED, TaskStatus.TODO)
      }).toThrow("Invalid status transition")
    })
  })

  describe("Task Hooks", () => {
    it("should automatically set completedAt when status changes to completed", async () => {
      const task = await Task.create({
        title: "Test Task",
        assigneeId: testUser2.id,
        creatorId: testUser1.id,
      })

      expect(task.completedAt).toBeNull()

      await task.update({ status: TaskStatus.COMPLETED })
      expect(task.completedAt).toBeDefined()
    })

    it("should clear completedAt when status changes from completed", async () => {
      const task = await Task.create({
        title: "Test Task",
        assigneeId: testUser2.id,
        creatorId: testUser1.id,
        status: TaskStatus.COMPLETED,
      })

      expect(task.completedAt).toBeDefined()

      await task.update({ status: TaskStatus.IN_PROGRESS })
      expect(task.completedAt).toBeUndefined()
    })

    it("should validate status transitions on update", async () => {
      const task = await Task.create({
        title: "Test Task",
        assigneeId: testUser2.id,
        creatorId: testUser1.id,
        status: TaskStatus.TODO,
      })

      // Valid transition should work
      await expect(task.update({ status: TaskStatus.IN_PROGRESS })).resolves.toBeDefined()

      // Invalid transition should fail
      await expect(task.update({ status: TaskStatus.TODO })).resolves.toBeDefined() // This is actually valid

      // Try invalid transition
      await task.update({ status: TaskStatus.COMPLETED })
      await expect(task.update({ status: TaskStatus.TODO })).rejects.toThrow(
        "Invalid status transition"
      )
    })
  })
})
