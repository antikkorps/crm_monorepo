import { InstitutionType } from "@medical-crm/shared"
import jwt from "jsonwebtoken"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { app } from "../../app"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { User, UserRole } from "../../models/User"

describe("RBAC Integration Tests", () => {
  let superAdminToken: string
  let teamAdminToken: string
  let userToken: string
  let superAdminUser: User
  let teamAdminUser: User
  let regularUser: User
  let testInstitution: MedicalInstitution

  beforeAll(async () => {
    // Create test users
    superAdminUser = await User.createUser({
      email: "rbac-superadmin@test.com",
      password: "password123",
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
    })

    teamAdminUser = await User.createUser({
      email: "rbac-teamadmin@test.com",
      password: "password123",
      firstName: "Team",
      lastName: "Admin",
      role: UserRole.TEAM_ADMIN,
      teamId: "team-1",
    })

    regularUser = await User.createUser({
      email: "rbac-user@test.com",
      password: "password123",
      firstName: "Regular",
      lastName: "User",
      role: UserRole.USER,
      teamId: "team-1",
    })

    // Generate JWT tokens
    const jwtSecret = process.env.JWT_SECRET || "test-secret"

    superAdminToken = jwt.sign(
      { userId: superAdminUser.id, email: superAdminUser.email },
      jwtSecret,
      { expiresIn: "1h" }
    )

    teamAdminToken = jwt.sign(
      { userId: teamAdminUser.id, email: teamAdminUser.email },
      jwtSecret,
      { expiresIn: "1h" }
    )

    userToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email },
      jwtSecret,
      { expiresIn: "1h" }
    )
  })

  beforeEach(async () => {
    // Create a test institution assigned to the regular user
    testInstitution = await MedicalInstitution.create({
      name: "Test Hospital RBAC",
      type: InstitutionType.HOSPITAL,
      address: {
        street: "123 Test St",
        city: "Test City",
        state: "Test State",
        zipCode: "12345",
        country: "Test Country",
      },
      assignedUserId: regularUser.id,
    })
  })

  afterAll(async () => {
    // Cleanup test data
    await MedicalInstitution.destroy({ where: { name: "Test Hospital RBAC" } })
    await User.destroy({
      where: { email: { [User.sequelize.Op.like]: "rbac-%@test.com" } },
    })
  })

  describe("Medical Institution Access Control", () => {
    it("should allow super admin to access any institution", async () => {
      const response = await request(app.callback())
        .get(`/api/institutions/${testInstitution.id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.institution.id).toBe(testInstitution.id)
    })

    it("should allow team admin to access team member's institution", async () => {
      const response = await request(app.callback())
        .get(`/api/institutions/${testInstitution.id}`)
        .set("Authorization", `Bearer ${teamAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.institution.id).toBe(testInstitution.id)
    })

    it("should allow user to access their own institution", async () => {
      const response = await request(app.callback())
        .get(`/api/institutions/${testInstitution.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.institution.id).toBe(testInstitution.id)
    })

    it("should deny user access to institution not assigned to them", async () => {
      // Create another institution not assigned to the user
      const otherInstitution = await MedicalInstitution.create({
        name: "Other Hospital RBAC",
        type: InstitutionType.CLINIC,
        address: {
          street: "456 Other St",
          city: "Other City",
          state: "Other State",
          zipCode: "67890",
          country: "Other Country",
        },
        assignedUserId: "other-user-id",
      })

      try {
        await request(app.callback())
          .get(`/api/institutions/${otherInstitution.id}`)
          .set("Authorization", `Bearer ${userToken}`)
          .expect(403)
      } finally {
        await MedicalInstitution.destroy({ where: { id: otherInstitution.id } })
      }
    })

    it("should allow super admin to edit any institution", async () => {
      const updateData = {
        name: "Updated Hospital Name",
      }

      const response = await request(app.callback())
        .put(`/api/institutions/${testInstitution.id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.institution.name).toBe("Updated Hospital Name")
    })

    it("should allow user to edit their own institution", async () => {
      const updateData = {
        name: "User Updated Hospital",
      }

      const response = await request(app.callback())
        .put(`/api/institutions/${testInstitution.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.institution.name).toBe("User Updated Hospital")
    })

    it("should deny user from deleting institutions", async () => {
      await request(app.callback())
        .delete(`/api/institutions/${testInstitution.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403)
    })

    it("should allow super admin to delete institutions", async () => {
      // Create a temporary institution for deletion
      const tempInstitution = await MedicalInstitution.create({
        name: "Temp Hospital for Deletion",
        type: InstitutionType.CLINIC,
        address: {
          street: "789 Temp St",
          city: "Temp City",
          state: "Temp State",
          zipCode: "11111",
          country: "Temp Country",
        },
      })

      await request(app.callback())
        .delete(`/api/institutions/${tempInstitution.id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)
    })
  })

  describe("Institution Listing with Filtering", () => {
    it("should return all institutions for super admin", async () => {
      const response = await request(app.callback())
        .get("/api/institutions")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.institutions)).toBe(true)
    })

    it("should return filtered institutions for regular user", async () => {
      const response = await request(app.callback())
        .get("/api/institutions")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.institutions)).toBe(true)

      // All returned institutions should be assigned to the user or unassigned
      const institutions = response.body.data.institutions
      institutions.forEach((institution: any) => {
        expect(
          institution.assignedUserId === regularUser.id ||
            institution.assignedUserId === null
        ).toBe(true)
      })
    })
  })

  describe("CSV Import Permissions", () => {
    it("should allow super admin to import CSV", async () => {
      await request(app.callback())
        .get("/api/institutions/import/template")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)
    })

    it("should deny regular user CSV import", async () => {
      await request(app.callback())
        .get("/api/institutions/import/template")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(403)
    })

    it("should deny team admin CSV import", async () => {
      await request(app.callback())
        .get("/api/institutions/import/template")
        .set("Authorization", `Bearer ${teamAdminToken}`)
        .expect(403)
    })
  })

  describe("Authentication Required", () => {
    it("should require authentication for all endpoints", async () => {
      await request(app.callback()).get("/api/institutions").expect(401)

      await request(app.callback())
        .get(`/api/institutions/${testInstitution.id}`)
        .expect(401)

      await request(app.callback())
        .post("/api/institutions")
        .send({
          name: "Test Hospital",
          type: InstitutionType.HOSPITAL,
          address: {
            street: "123 Test St",
            city: "Test City",
            state: "Test State",
            zipCode: "12345",
            country: "Test Country",
          },
        })
        .expect(401)
    })
  })
})
