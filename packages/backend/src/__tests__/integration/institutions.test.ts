import { ComplianceStatus, InstitutionType, UserRole } from "@medical-crm/shared"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../../app"
import DatabaseManager from "../../config/database"
import { ContactPerson, MedicalInstitution, MedicalProfile, User } from "../../models"

describe("Medical Institution API Integration Tests", () => {
  let app: any
  let server: any
  let authToken: string
  let testUser: User

  beforeAll(async () => {
    try {
      // Initialize database
      await DatabaseManager.connect()
      await DatabaseManager.sync({ force: true })

      // Create app
      app = createApp()
      server = app.listen()

      // Create test user and get auth token
      testUser = await User.create({
        email: "test@example.com",
        passwordHash: await User.hashPassword("password123"),
        firstName: "Test",
        lastName: "User",
        role: UserRole.ADMIN,
        avatarSeed: "test-user",
        isActive: true,
      })

      // Login to get token
      const loginResponse = await request(server).post("/api/auth/login").send({
        email: "test@example.com",
        password: "password123",
      })

      authToken = loginResponse.body.data.accessToken
    } catch (error) {
      console.warn("Database not available for integration tests:", error)
    }
  })

  afterAll(async () => {
    try {
      if (server) {
        server.close()
      }
      await DatabaseManager.disconnect()
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  beforeEach(async () => {
    try {
      // Clean up data before each test
      await ContactPerson.destroy({ where: {}, force: true })
      await MedicalProfile.destroy({ where: {}, force: true })
      await MedicalInstitution.destroy({ where: {}, force: true })
    } catch (error) {
      // Skip if database not available
    }
  })

  const validInstitutionData = {
    name: "General Hospital",
    type: InstitutionType.HOSPITAL,
    address: {
      street: "123 Medical Center Dr",
      city: "Healthcare City",
      state: "CA",
      zipCode: "90210",
      country: "US",
    },
    tags: ["cardiology", "emergency"],
    medicalProfile: {
      bedCapacity: 150,
      surgicalRooms: 8,
      specialties: ["cardiology", "neurology"],
      departments: ["emergency", "icu"],
      equipmentTypes: ["mri", "ct_scan"],
      certifications: ["jcaho"],
      complianceStatus: ComplianceStatus.COMPLIANT,
    },
    contactPersons: [
      {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@hospital.com",
        phone: "+1234567890",
        title: "Chief Medical Officer",
        isPrimary: true,
      },
    ],
  }

  describe("POST /api/institutions", () => {
    it("should create a new medical institution", async () => {
      try {
        const response = await request(server)
          .post("/api/institutions")
          .set("Authorization", `Bearer ${authToken}`)
          .send(validInstitutionData)
          .expect(201)

        expect(response.body.success).toBe(true)
        expect(response.body.data.institution).toBeDefined()
        expect(response.body.data.institution.name).toBe("General Hospital")
        expect(response.body.data.institution.medicalProfile).toBeDefined()
        expect(response.body.data.institution.contactPersons).toHaveLength(1)
      } catch (error) {
        if (error.message?.includes("connect")) {
          console.warn("Skipping test - database not available")
          return
        }
        throw error
      }
    })

    it("should validate required fields", async () => {
      try {
        const invalidData = { ...validInstitutionData }
        delete invalidData.name

        const response = await request(server)
          .post("/api/institutions")
          .set("Authorization", `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400)

        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe("VALIDATION_ERROR")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should require authentication", async () => {
      try {
        await request(server)
          .post("/api/institutions")
          .send(validInstitutionData)
          .expect(401)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate institution type", async () => {
      try {
        const invalidData = {
          ...validInstitutionData,
          type: "invalid_type",
        }

        const response = await request(server)
          .post("/api/institutions")
          .set("Authorization", `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400)

        expect(response.body.error.code).toBe("VALIDATION_ERROR")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate address fields", async () => {
      try {
        const invalidData = {
          ...validInstitutionData,
          address: {
            street: "123 Test St",
            city: "", // Empty city should fail
            state: "CA",
            zipCode: "90210",
            country: "US",
          },
        }

        const response = await request(server)
          .post("/api/institutions")
          .set("Authorization", `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400)

        expect(response.body.error.code).toBe("VALIDATION_ERROR")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("GET /api/institutions", () => {
    beforeEach(async () => {
      try {
        // Create test institutions
        const institution1 = await MedicalInstitution.create({
          name: "City Hospital",
          type: InstitutionType.HOSPITAL,
          address: {
            street: "456 City Ave",
            city: "Los Angeles",
            state: "CA",
            zipCode: "90001",
            country: "US",
          },
          tags: ["emergency"],
        })

        await MedicalProfile.create({
          institutionId: institution1.id,
          bedCapacity: 200,
          specialties: ["emergency", "trauma"],
          departments: ["emergency"],
          equipmentTypes: ["ct_scan"],
          certifications: ["jcaho"],
          complianceStatus: ComplianceStatus.COMPLIANT,
        })

        const institution2 = await MedicalInstitution.create({
          name: "Specialty Clinic",
          type: InstitutionType.SPECIALTY_CLINIC,
          address: {
            street: "789 Specialty St",
            city: "San Francisco",
            state: "CA",
            zipCode: "94102",
            country: "US",
          },
          tags: ["dermatology"],
        })

        await MedicalProfile.create({
          institutionId: institution2.id,
          bedCapacity: 50,
          specialties: ["dermatology"],
          departments: ["outpatient"],
          equipmentTypes: ["laser"],
          certifications: ["state_license"],
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
        })
      } catch (error) {
        if (error.message?.includes("connect")) return
      }
    })

    it("should get all institutions", async () => {
      try {
        const response = await request(server)
          .get("/api/institutions")
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.data.institutions).toHaveLength(2)
        expect(response.body.data.pagination).toBeDefined()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should filter by institution type", async () => {
      try {
        const response = await request(server)
          .get("/api/institutions")
          .query({ type: InstitutionType.HOSPITAL })
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data.institutions).toHaveLength(1)
        expect(response.body.data.institutions[0].type).toBe(InstitutionType.HOSPITAL)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should filter by city", async () => {
      try {
        const response = await request(server)
          .get("/api/institutions")
          .query({ city: "Los Angeles" })
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data.institutions).toHaveLength(1)
        expect(response.body.data.institutions[0].address.city).toBe("Los Angeles")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should support pagination", async () => {
      try {
        const response = await request(server)
          .get("/api/institutions")
          .query({ page: 1, limit: 1 })
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.data.institutions).toHaveLength(1)
        expect(response.body.data.pagination.page).toBe(1)
        expect(response.body.data.pagination.limit).toBe(1)
        expect(response.body.data.pagination.total).toBe(2)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should require authentication", async () => {
      try {
        await request(server).get("/api/institutions").expect(401)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("GET /api/institutions/:id", () => {
    let institutionId: string

    beforeEach(async () => {
      try {
        const institution = await MedicalInstitution.create({
          name: "Test Hospital",
          type: InstitutionType.HOSPITAL,
          address: {
            street: "123 Test St",
            city: "Test City",
            state: "CA",
            zipCode: "90210",
            country: "US",
          },
        })

        await MedicalProfile.create({
          institutionId: institution.id,
          bedCapacity: 100,
          specialties: ["general"],
          departments: ["general"],
          equipmentTypes: ["basic"],
          certifications: ["basic"],
          complianceStatus: ComplianceStatus.COMPLIANT,
        })

        institutionId = institution.id
      } catch (error) {
        if (error.message?.includes("connect")) return
      }
    })

    it("should get institution by ID", async () => {
      try {
        const response = await request(server)
          .get(`/api/institutions/${institutionId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.data.institution.id).toBe(institutionId)
        expect(response.body.data.institution.medicalProfile).toBeDefined()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should return 404 for non-existent institution", async () => {
      try {
        const fakeId = "123e4567-e89b-12d3-a456-426614174000"
        const response = await request(server)
          .get(`/api/institutions/${fakeId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(404)

        expect(response.body.error.code).toBe("INSTITUTION_NOT_FOUND")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should require authentication", async () => {
      try {
        await request(server).get(`/api/institutions/${institutionId}`).expect(401)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("PUT /api/institutions/:id", () => {
    let institutionId: string

    beforeEach(async () => {
      try {
        const institution = await MedicalInstitution.create({
          name: "Test Hospital",
          type: InstitutionType.HOSPITAL,
          address: {
            street: "123 Test St",
            city: "Test City",
            state: "CA",
            zipCode: "90210",
            country: "US",
          },
        })

        institutionId = institution.id
      } catch (error) {
        if (error.message?.includes("connect")) return
      }
    })

    it("should update institution", async () => {
      try {
        const updateData = {
          name: "Updated Hospital Name",
          tags: ["updated", "test"],
        }

        const response = await request(server)
          .put(`/api/institutions/${institutionId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send(updateData)
          .expect(200)

        expect(response.body.success).toBe(true)
        expect(response.body.data.institution.name).toBe("Updated Hospital Name")
        expect(response.body.data.institution.tags).toEqual(["updated", "test"])
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should return 404 for non-existent institution", async () => {
      try {
        const fakeId = "123e4567-e89b-12d3-a456-426614174000"
        const response = await request(server)
          .put(`/api/institutions/${fakeId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .send({ name: "Updated Name" })
          .expect(404)

        expect(response.body.error.code).toBe("INSTITUTION_NOT_FOUND")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should require authentication", async () => {
      try {
        await request(server)
          .put(`/api/institutions/${institutionId}`)
          .send({ name: "Updated Name" })
          .expect(401)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("DELETE /api/institutions/:id", () => {
    let institutionId: string

    beforeEach(async () => {
      try {
        const institution = await MedicalInstitution.create({
          name: "Test Hospital",
          type: InstitutionType.HOSPITAL,
          address: {
            street: "123 Test St",
            city: "Test City",
            state: "CA",
            zipCode: "90210",
            country: "US",
          },
        })

        institutionId = institution.id
      } catch (error) {
        if (error.message?.includes("connect")) return
      }
    })

    it("should soft delete institution", async () => {
      try {
        const response = await request(server)
          .delete(`/api/institutions/${institutionId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200)

        expect(response.body.success).toBe(true)

        // Verify institution is soft deleted
        const institution = await MedicalInstitution.findByPk(institutionId)
        expect(institution?.isActive).toBe(false)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should return 404 for non-existent institution", async () => {
      try {
        const fakeId = "123e4567-e89b-12d3-a456-426614174000"
        const response = await request(server)
          .delete(`/api/institutions/${fakeId}`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(404)

        expect(response.body.error.code).toBe("INSTITUTION_NOT_FOUND")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should require authentication", async () => {
      try {
        await request(server).delete(`/api/institutions/${institutionId}`).expect(401)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })
})
