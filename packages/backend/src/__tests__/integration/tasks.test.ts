import request from "supertest"
import { createApp } from "../../app"
import { sequelize } from "../../config/database"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Task, TaskPriority, TaskStatus } from "../../models/Task"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"

describe("Task API Integration Tests", () => {
  let app: any
  let superAdminUser: User
  let teamAdminUser: User
  let regularUser: User
  let otherUser: User
  let testInstitution: MedicalInstitution
  let superAdminToken: string
  let teamAdminToken: string
  let regularUserToken: string
  let otherUserToken: string

  beforeAll(async () => {
    app = createApp()
    // Only sync User and Task models to avoid SQLite compatibility issues
    await User.sync({ force: true })
    await Task.sync({ force: true })
  })

  beforeEach(async () => {
    // Create test users
    superAdminUser = await User.create({
      email: "superadmin@test.com",
      passwordHash: await User.hashPassword("password123"),
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
      avatarSeed: "super-admin-seed",
      isActive: true,
    })

    teamAdminUser = await User.create({
      email: "teamadmin@test.com",
      passwordHash: await User.hashPassword("password123"),
      firstName: "Team",
      lastName: "Admin",
      role: UserRole.TEAM_ADMIN,
      avatarSeed: "team-admin-seed",
      isActive: true,
    })

    regularUser = await User.create({
      email: "user@test.com",
      passwordHash: await User.hashPassword("password123"),
      firstName: "Regular",
      lastName: "User",
      role: UserRole.USER,
      avatarSeed: "user-seed",
      isActive: true,
    })

    otherUser = await User.create({
      email: "other@test.com",
      passwordHash: await User.hashPassword("password123"),
      firstName: "Other",
      lastName: "User",
      role: UserRole.USER,
      avatarSeed: "other-seed",
      isActive: true,
    })

    // Create test institution (skip for now due to SQLite compatibility issues)
    // testInstitution = await MedicalInstitution.create({
    //   name: "Test Hospital",
    //   type: InstitutionType.HOSPITAL,
    //   address: {
    //     street: "123 Medical St",
    //     city: "Healthcare City",
    //     state: "HC",
    //     zipCode: "12345",
    //     country: "USA",
    //   },
    //   tags: ["test"],
    //   isActive: true,
    // })

    // Generate tokens
    superAdminToken = AuthService.generateAccessToken(superAdminUser.id)
    teamAdminToken = AuthService.generateAccessToken(teamAdminUser.id)
    regularUserToken = AuthService.generateAccessToken(regularUser.id)
    otherUserToken = AuthService.generateAccessToken(otherUser.id)
  })

  afterEach(async () => {
    await Task.destroy({ where: {} })
    await User.destroy({ where: {} })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  describe("POST /api/tasks", () => {
    it("should create a task successfully", async () => {
      const taskData = {
        title: "Test Task",
        description: "This is a test task",
        priority: TaskPriority.HIGH,
        assigneeId: regularUser.id,
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      }

      const response = await request(app.callback())
        .post("/api/tasks")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send(taskData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(taskData.title)
      expect(response.body.data.description).toBe(taskData.description)
      expect(response.body.data.priority).toBe(taskData.priority)
      expect(response.body.data.assigneeId).toBe(taskData.assigneeId)
      expect(response.body.data.creatorId).toBe(superAdminUser.id)
      expect(response.body.data.status).toBe(TaskStatus.TODO)
    })

    it("should fail to create task without required fields", async () => {
      const taskData = {
        description: "Missing title and assignee",
      }

      const response = await request(app.callback())
        .post("/api/tasks")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send(taskData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("should fail to create task with invalid assignee", async () => {
      const taskData = {
        title: "Test Task",
        assigneeId: "invalid-id",
      }

      const response = await request(app.callback())
        .post("/api/tasks")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send(taskData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INVALID_ASSIGNEE")
    })

    it("should require authentication", async () => {
      const taskData = {
        title: "Test Task",
        assigneeId: regularUser.id,
      }

      await request(app.callback()).post("/api/tasks").send(taskData).expect(401)
    })
  })

  describe("GET /api/tasks", () => {
    beforeEach(async () => {
      // Create test tasks
      await Task.create({
        title: "Task 1",
        description: "First task",
        priority: TaskPriority.HIGH,
        assigneeId: regularUser.id,
        creatorId: superAdminUser.id,
        status: TaskStatus.TODO,
      })

      await Task.create({
        title: "Task 2",
        description: "Second task",
        priority: TaskPriority.MEDIUM,
        assigneeId: otherUser.id,
        creatorId: teamAdminUser.id,
        status: TaskStatus.IN_PROGRESS,
      })
    })

    it("should get all tasks for super admin", async () => {
      const response = await request(app.callback())
        .get("/api/tasks")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.meta.total).toBe(2)
    })

    it("should filter tasks by status", async () => {
      const response = await request(app.callback())
        .get("/api/tasks?status=todo")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].status).toBe(TaskStatus.TODO)
    })

    it("should filter tasks by assignee", async () => {
      const response = await request(app.callback())
        .get(`/api/tasks?assigneeId=${regularUser.id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].assigneeId).toBe(regularUser.id)
    })

    it("should search tasks by text", async () => {
      const response = await request(app.callback())
        .get("/api/tasks?search=First")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].description).toContain("First")
    })

    it("should paginate results", async () => {
      const response = await request(app.callback())
        .get("/api/tasks?page=1&limit=1")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.meta.page).toBe(1)
      expect(response.body.meta.limit).toBe(1)
      expect(response.body.meta.totalPages).toBe(2)
    })

    it("should require authentication", async () => {
      await request(app.callback()).get("/api/tasks").expect(401)
    })
  })

  describe("GET /api/tasks/:id", () => {
    let testTask: Task

    beforeEach(async () => {
      testTask = await Task.create({
        title: "Test Task",
        description: "Test description",
        priority: TaskPriority.MEDIUM,
        assigneeId: regularUser.id,
        creatorId: superAdminUser.id,
        status: TaskStatus.TODO,
      })
    })

    it("should get a specific task", async () => {
      const response = await request(app.callback())
        .get(`/api/tasks/${testTask.id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testTask.id)
      expect(response.body.data.title).toBe(testTask.title)
    })

    it("should return 404 for non-existent task", async () => {
      const response = await request(app.callback())
        .get("/api/tasks/non-existent-id")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("TASK_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback()).get(`/api/tasks/${testTask.id}`).expect(401)
    })
  })

  describe("PUT /api/tasks/:id", () => {
    let testTask: Task

    beforeEach(async () => {
      testTask = await Task.create({
        title: "Test Task",
        description: "Test description",
        priority: TaskPriority.MEDIUM,
        assigneeId: regularUser.id,
        creatorId: superAdminUser.id,
        status: TaskStatus.TODO,
      })
    })

    it("should update a task successfully", async () => {
      const updateData = {
        title: "Updated Task",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
      }

      const response = await request(app.callback())
        .put(`/api/tasks/${testTask.id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(updateData.title)
      expect(response.body.data.status).toBe(updateData.status)
      expect(response.body.data.priority).toBe(updateData.priority)
    })

    it("should return 404 for non-existent task", async () => {
      const response = await request(app.callback())
        .put("/api/tasks/non-existent-id")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ title: "Updated" })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("TASK_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .put(`/api/tasks/${testTask.id}`)
        .send({ title: "Updated" })
        .expect(401)
    })
  })

  describe("DELETE /api/tasks/:id", () => {
    let testTask: Task

    beforeEach(async () => {
      testTask = await Task.create({
        title: "Test Task",
        description: "Test description",
        priority: TaskPriority.MEDIUM,
        assigneeId: regularUser.id,
        creatorId: superAdminUser.id,
        status: TaskStatus.TODO,
      })
    })

    it("should delete a task successfully", async () => {
      const response = await request(app.callback())
        .delete(`/api/tasks/${testTask.id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe("Task deleted successfully")

      // Verify task is deleted
      const deletedTask = await Task.findByPk(testTask.id)
      expect(deletedTask).toBeNull()
    })

    it("should return 404 for non-existent task", async () => {
      const response = await request(app.callback())
        .delete("/api/tasks/non-existent-id")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("TASK_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback()).delete(`/api/tasks/${testTask.id}`).expect(401)
    })
  })

  describe("GET /api/tasks/assigned/:userId", () => {
    beforeEach(async () => {
      // Create tasks assigned to regularUser
      await Task.create({
        title: "Task 1",
        assigneeId: regularUser.id,
        creatorId: superAdminUser.id,
      })

      await Task.create({
        title: "Task 2",
        assigneeId: regularUser.id,
        creatorId: teamAdminUser.id,
      })

      // Create task assigned to otherUser
      await Task.create({
        title: "Task 3",
        assigneeId: otherUser.id,
        creatorId: superAdminUser.id,
      })
    })

    it("should get tasks assigned to a specific user", async () => {
      const response = await request(app.callback())
        .get(`/api/tasks/assigned/${regularUser.id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(
        response.body.data.every((task: any) => task.assigneeId === regularUser.id)
      ).toBe(true)
    })

    it("should return 404 for non-existent user", async () => {
      const response = await request(app.callback())
        .get("/api/tasks/assigned/non-existent-id")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("USER_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/tasks/assigned/${regularUser.id}`)
        .expect(401)
    })
  })
})
