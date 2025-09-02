import request from "supertest"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { CallType } from "@medical-crm/shared"
import { createApp } from "../../app"
import { sequelize } from "../../config/database"
import { Call } from "../../models/Call"
import { ContactPerson } from "../../models/ContactPerson"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"

describe("Calls API", () => {
  let app: any
  let adminUser: User
  let regularUser: User
  let adminToken: string
  let userToken: string
  let testInstitution: MedicalInstitution
  let testContactPerson: ContactPerson
  let testCall: Call

  beforeEach(async () => {
    await sequelize.sync({ force: true })
    app = createApp()

    // Create test users
    adminUser = await User.createUser({
      email: "admin@example.com",
      password: "password123",
      firstName: "Admin",
      lastName: "User",
      role: UserRole.SUPER_ADMIN,
    })

    regularUser = await User.createUser({
      email: "user@example.com",
      password: "password123",
      firstName: "Regular",
      lastName: "User",
      role: UserRole.USER,
    })

    // Generate tokens
    adminToken = AuthService.generateAccessToken(adminUser.id, adminUser.role)
    userToken = AuthService.generateAccessToken(regularUser.id, regularUser.role)

    // Create test institution
    testInstitution = await MedicalInstitution.create({
      name: "Test Hospital",
      type: "hospital",
      address: "123 Test St",
      city: "Test City",
      state: "TS",
      zipCode: "12345",
      phone: "+1234567890",
      email: "test@hospital.com",
      isActive: true,
    })

    // Create test contact person
    testContactPerson = await ContactPerson.create({
      firstName: "Dr. John",
      lastName: "Doe",
      phone: "+1234567890",
      email: "john.doe@hospital.com",
      institutionId: testInstitution.id,
      isActive: true,
    })

    // Create test call
    testCall = await Call.create({
      phoneNumber: "+1234567890",
      duration: 300,
      summary: "Test call summary",
      callType: CallType.INCOMING,
      userId: regularUser.id,
      institutionId: testInstitution.id,
      contactPersonId: testContactPerson.id,
    })
  })

  afterEach(async () => {
    await sequelize.truncate({ cascade: true })
  })

  describe("GET /api/calls", () => {
    it("should get all calls for admin", async () => {
      const response = await request(app.callback())
        .get("/api/calls")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.length).toBeGreaterThan(0)
      expect(response.body.pagination).toBeDefined()
    })

    it("should filter calls by userId", async () => {
      const response = await request(app.callback())
        .get(`/api/calls?userId=${regularUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.every((call: any) => call.userId === regularUser.id)).toBe(true)
    })

    it("should filter calls by callType", async () => {
      const response = await request(app.callback())
        .get(`/api/calls?callType=${CallType.INCOMING}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.every((call: any) => call.callType === CallType.INCOMING)).toBe(true)
    })

    it("should filter calls by phoneNumber", async () => {
      const response = await request(app.callback())
        .get(`/api/calls?phoneNumber=${encodeURIComponent("+1234567890")}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.every((call: any) => call.phoneNumber.includes("1234567890"))).toBe(true)
    })

    it("should filter calls by date range", async () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const response = await request(app.callback())
        .get(`/api/calls?dateFrom=${yesterday.toISOString()}&dateTo=${today.toISOString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it("should support pagination", async () => {
      const response = await request(app.callback())
        .get("/api/calls?limit=1&offset=0")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeLessThanOrEqual(1)
      expect(response.body.pagination.limit).toBe(1)
      expect(response.body.pagination.offset).toBe(0)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get("/api/calls")
        .expect(401)
    })
  })

  describe("GET /api/calls/:id", () => {
    it("should get a specific call", async () => {
      const response = await request(app.callback())
        .get(`/api/calls/${testCall.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testCall.id)
      expect(response.body.data.phoneNumber).toBe(testCall.phoneNumber)
      expect(response.body.data.callType).toBe(testCall.callType)
    })

    it("should return 404 for non-existent call", async () => {
      await request(app.callback())
        .get("/api/calls/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/calls/${testCall.id}`)
        .expect(401)
    })
  })

  describe("POST /api/calls", () => {
    it("should create a new call", async () => {
      const callData = {
        phoneNumber: "+1987654321",
        duration: 180,
        summary: "New test call",
        callType: CallType.OUTGOING,
        userId: regularUser.id,
      }

      const response = await request(app.callback())
        .post("/api/calls")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(callData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.phoneNumber).toBe(callData.phoneNumber)
      expect(response.body.data.duration).toBe(callData.duration)
      expect(response.body.data.callType).toBe(callData.callType)
      expect(response.body.data.userId).toBe(callData.userId)
    })

    it("should create a call with auto-linking", async () => {
      const callData = {
        phoneNumber: testContactPerson.phone,
        duration: 240,
        summary: "Auto-linked call",
        callType: CallType.INCOMING,
        userId: regularUser.id,
      }

      const response = await request(app.callback())
        .post("/api/calls")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(callData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.contactPersonId).toBe(testContactPerson.id)
      expect(response.body.data.institutionId).toBe(testInstitution.id)
    })

    it("should validate required fields", async () => {
      const invalidCallData = {
        duration: 180,
        summary: "Missing required fields",
      }

      await request(app.callback())
        .post("/api/calls")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidCallData)
        .expect(400)
    })

    it("should validate call type", async () => {
      const invalidCallData = {
        phoneNumber: "+1987654321",
        callType: "INVALID_TYPE",
        userId: regularUser.id,
      }

      await request(app.callback())
        .post("/api/calls")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidCallData)
        .expect(400)
    })

    it("should require authentication", async () => {
      const callData = {
        phoneNumber: "+1987654321",
        callType: CallType.OUTGOING,
        userId: regularUser.id,
      }

      await request(app.callback())
        .post("/api/calls")
        .send(callData)
        .expect(401)
    })
  })

  describe("PUT /api/calls/:id", () => {
    it("should update a call", async () => {
      const updateData = {
        summary: "Updated summary",
        duration: 450,
      }

      const response = await request(app.callback())
        .put(`/api/calls/${testCall.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.summary).toBe(updateData.summary)
      expect(response.body.data.duration).toBe(updateData.duration)
    })

    it("should return 404 for non-existent call", async () => {
      const updateData = { summary: "Updated summary" }

      await request(app.callback())
        .put("/api/calls/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404)
    })

    it("should validate update data", async () => {
      const invalidUpdateData = {
        duration: -100,
      }

      await request(app.callback())
        .put(`/api/calls/${testCall.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(invalidUpdateData)
        .expect(500) // Should catch validation error
    })

    it("should require authentication", async () => {
      const updateData = { summary: "Updated summary" }

      await request(app.callback())
        .put(`/api/calls/${testCall.id}`)
        .send(updateData)
        .expect(401)
    })
  })

  describe("DELETE /api/calls/:id", () => {
    it("should delete a call", async () => {
      await request(app.callback())
        .delete(`/api/calls/${testCall.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(204)

      // Verify call was deleted
      const deletedCall = await Call.findByPk(testCall.id)
      expect(deletedCall).toBeNull()
    })

    it("should return 404 for non-existent call", async () => {
      await request(app.callback())
        .delete("/api/calls/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .delete(`/api/calls/${testCall.id}`)
        .expect(401)
    })
  })

  describe("GET /api/calls/user/:userId", () => {
    it("should get calls by user", async () => {
      const response = await request(app.callback())
        .get(`/api/calls/user/${regularUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.every((call: any) => call.userId === regularUser.id)).toBe(true)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/calls/user/${regularUser.id}`)
        .expect(401)
    })
  })

  describe("GET /api/calls/institution/:institutionId", () => {
    it("should get calls by institution", async () => {
      const response = await request(app.callback())
        .get(`/api/calls/institution/${testInstitution.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.every((call: any) => call.institutionId === testInstitution.id)).toBe(true)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/calls/institution/${testInstitution.id}`)
        .expect(401)
    })
  })

  describe("GET /api/calls/phone/:phoneNumber", () => {
    it("should get calls by phone number", async () => {
      const phoneNumber = encodeURIComponent("+1234567890")
      
      const response = await request(app.callback())
        .get(`/api/calls/phone/${phoneNumber}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
    })

    it("should require authentication", async () => {
      const phoneNumber = encodeURIComponent("+1234567890")

      await request(app.callback())
        .get(`/api/calls/phone/${phoneNumber}`)
        .expect(401)
    })
  })

  describe("GET /api/calls/type/:callType", () => {
    it("should get calls by type", async () => {
      const response = await request(app.callback())
        .get(`/api/calls/type/${CallType.INCOMING}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
      expect(response.body.data.every((call: any) => call.callType === CallType.INCOMING)).toBe(true)
    })

    it("should validate call type", async () => {
      await request(app.callback())
        .get("/api/calls/type/INVALID_TYPE")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/calls/type/${CallType.INCOMING}`)
        .expect(401)
    })
  })

  describe("GET /api/calls/date-range", () => {
    it("should get calls by date range", async () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const response = await request(app.callback())
        .get(`/api/calls/date-range?startDate=${yesterday.toISOString()}&endDate=${today.toISOString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeInstanceOf(Array)
    })

    it("should validate date format", async () => {
      await request(app.callback())
        .get("/api/calls/date-range?startDate=invalid-date&endDate=2024-01-01")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)
    })

    it("should validate date range", async () => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      await request(app.callback())
        .get(`/api/calls/date-range?startDate=${tomorrow.toISOString()}&endDate=${today.toISOString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)
    })

    it("should require both dates", async () => {
      await request(app.callback())
        .get("/api/calls/date-range?startDate=2024-01-01")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400)
    })

    it("should require authentication", async () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      await request(app.callback())
        .get(`/api/calls/date-range?startDate=${yesterday.toISOString()}&endDate=${today.toISOString()}`)
        .expect(401)
    })
  })

  describe("Call Auto-linking Integration", () => {
    it("should automatically link calls to existing contacts", async () => {
      const callData = {
        phoneNumber: testContactPerson.phone,
        callType: CallType.MISSED,
        userId: regularUser.id,
        summary: "Missed call from known contact",
      }

      const response = await request(app.callback())
        .post("/api/calls")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(callData)
        .expect(201)

      expect(response.body.data.contactPersonId).toBe(testContactPerson.id)
      expect(response.body.data.institutionId).toBe(testInstitution.id)
    })

    it("should handle calls from unknown numbers", async () => {
      const callData = {
        phoneNumber: "+1555999888",
        callType: CallType.INCOMING,
        userId: regularUser.id,
        summary: "Call from unknown number",
      }

      const response = await request(app.callback())
        .post("/api/calls")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(callData)
        .expect(201)

      expect(response.body.data.contactPersonId).toBeNull()
      expect(response.body.data.institutionId).toBeNull()
    })
  })

  describe("Call Search Functionality", () => {
    beforeEach(async () => {
      // Create additional test calls
      await Call.create({
        phoneNumber: "+1987654321",
        duration: 120,
        summary: "Follow-up appointment discussion",
        callType: CallType.OUTGOING,
        userId: adminUser.id,
      })

      await Call.create({
        phoneNumber: "+1555666777",
        duration: undefined,
        summary: "Emergency consultation",
        callType: CallType.MISSED,
        userId: regularUser.id,
      })
    })

    it("should search calls by summary text", async () => {
      const response = await request(app.callback())
        .get("/api/calls?search=appointment")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.some((call: any) => 
        call.summary?.toLowerCase().includes("appointment")
      )).toBe(true)
    })

    it("should search calls by phone number partial match", async () => {
      const response = await request(app.callback())
        .get("/api/calls?search=987654")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.some((call: any) => 
        call.phoneNumber.includes("987654")
      )).toBe(true)
    })

    it("should combine multiple filters", async () => {
      const response = await request(app.callback())
        .get(`/api/calls?userId=${regularUser.id}&callType=${CallType.MISSED}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.every((call: any) => 
        call.userId === regularUser.id && call.callType === CallType.MISSED
      )).toBe(true)
    })
  })
})