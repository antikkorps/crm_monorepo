import { describe, it, expect, beforeEach } from "vitest"
import { ExportService, ExportOptions } from "../../services/ExportService"
import { User, MedicalInstitution, MedicalProfile, ContactPerson, Task, Quote, Invoice } from "../../models"
import { UserRole, InstitutionType } from "@medical-crm/shared"

describe("ExportService", () => {
  beforeEach(async () => {
    try {
      if (process.env.NODE_ENV === "test") {
        // For pg-mem, just clean tables data without recreating schema
        await User.destroy({ where: {}, force: true })
        await MedicalInstitution.destroy({ where: {}, force: true })
        await MedicalProfile.destroy({ where: {}, force: true })
        await ContactPerson.destroy({ where: {}, force: true })
        
        // Try to clean other tables, but ignore if they don't exist
        try {
          await Task.destroy({ where: {}, force: true })
        } catch {}
        try {
          await Quote.destroy({ where: {}, force: true })
        } catch {}
        try {
          await Invoice.destroy({ where: {}, force: true })
        } catch {}
      }
    } catch (error) {
      console.warn("Database cleanup warning:", (error as Error).message)
    }
  })

  describe("exportMedicalInstitutions", () => {
    it("should export medical institutions successfully", async () => {
      // Create test user
      const user = await User.create({
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "hashed_password",
        role: UserRole.USER,
        avatarSeed: "test-seed",
        isActive: true,
      })

      // Create test medical institution
      await MedicalInstitution.create({
        name: "Test Hospital",
        type: InstitutionType.HOSPITAL,
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          country: "Test Country",
        },
        tags: ["test", "hospital"],
        isActive: true,
        assignedUserId: user.id,
      })

      const options: ExportOptions = {
        format: "csv",
        includeHeaders: true,
        teamMemberIds: [user.id],
      }

      const result = await ExportService.exportMedicalInstitutions(options)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.totalRecords).toBe(1)
      expect(result.filename).toContain("medical-institutions")
      
      if (result.data && result.data.length > 0) {
        const exportedInstitution = result.data[0]
        expect(exportedInstitution.name).toBe("Test Hospital")
        expect(exportedInstitution.type).toBe("hospital")
        expect(exportedInstitution.street).toBe("123 Test St")
        expect(exportedInstitution.city).toBe("Test City")
        expect(exportedInstitution.tags).toBe("test, hospital")
        expect(exportedInstitution.isActive).toBe(true)
        expect(exportedInstitution.contactCount).toBe(0) // No contacts created in this simplified test
      }
    })

    it("should handle empty results", async () => {
      const options: ExportOptions = {
        format: "csv",
        includeHeaders: true,
      }

      const result = await ExportService.exportMedicalInstitutions(options)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
      expect(result.totalRecords).toBe(0)
    })

    it("should filter by institution type", async () => {
      const user = await User.create({
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        passwordHash: "hashed_password",
        role: UserRole.USER,
        avatarSeed: "test-seed",
        isActive: true,
      })

      // Create hospital
      await MedicalInstitution.create({
        name: "Test Hospital",
        type: InstitutionType.HOSPITAL,
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          country: "Test Country",
        },
        tags: ["test"],
        isActive: true,
        assignedUserId: user.id,
      })

      // Create clinic
      await MedicalInstitution.create({
        name: "Test Clinic",
        type: InstitutionType.CLINIC,
        address: {
          street: "456 Clinic St",
          city: "Test City",
          state: "Test State",
          zipCode: "12345",
          country: "Test Country",
        },
        tags: ["test"],
        isActive: true,
        assignedUserId: user.id,
      })

      const options: ExportOptions = {
        format: "csv",
        includeHeaders: true,
        institutionType: InstitutionType.HOSPITAL,
        teamMemberIds: [user.id],
      }

      const result = await ExportService.exportMedicalInstitutions(options)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      if (result.data && result.data.length > 0) {
        expect(result.data[0].type).toBe(InstitutionType.HOSPITAL)
      }
    })
  })

  describe("generateCSV", () => {
    it("should generate CSV with headers", () => {
      const data = [
        { id: "1", name: "Test Institution", type: "hospital", city: "Test City" },
        { id: "2", name: "Another Institution", type: "clinic", city: "Another City" },
      ]

      const csv = ExportService.generateCSV(data, true)

      expect(csv).toContain("id,name,type,city")
      expect(csv).toContain("1,Test Institution,hospital,Test City")
      expect(csv).toContain("2,Another Institution,clinic,Another City")
    })

    it("should generate CSV without headers", () => {
      const data = [
        { id: "1", name: "Test Institution", type: "hospital" },
      ]

      const csv = ExportService.generateCSV(data, false)

      expect(csv).not.toContain("id,name,type")
      expect(csv).toContain("1,Test Institution,hospital")
    })

    it("should handle special characters in CSV", () => {
      const data = [
        { id: "1", name: 'Test "Institution"', description: "Line 1\nLine 2", tags: ["a,b", "c"] },
      ]

      const csv = ExportService.generateCSV(data, true)

      expect(csv).toContain('"Test ""Institution"""')
      expect(csv).toContain('"Line 1\nLine 2"')
    })

    it("should handle empty data", () => {
      const csv = ExportService.generateCSV([], true)
      expect(csv).toBe("")
    })
  })

  describe("generateJSON", () => {
    it("should generate formatted JSON", () => {
      const data = [
        { id: "1", name: "Test Institution", type: "hospital" },
      ]

      const json = ExportService.generateJSON(data)

      expect(json).toContain('"id": "1"')
      expect(json).toContain('"name": "Test Institution"')
      expect(json).toContain('"type": "hospital"')
    })

    it("should handle empty data", () => {
      const json = ExportService.generateJSON([])
      expect(json).toBe("[]")
    })
  })

  describe("checkExportPermissions", () => {
    it("should allow super admin to export anything", async () => {
      const superAdmin = await User.create({
        firstName: "Super",
        lastName: "Admin",
        email: "super@example.com",
        passwordHash: "hashed_password",
        role: UserRole.SUPER_ADMIN,
        avatarSeed: "super-seed",
        isActive: true,
      })

      const canExportInstitutions = await ExportService.checkExportPermissions(superAdmin.id, "institutions")
      const canExportContacts = await ExportService.checkExportPermissions(superAdmin.id, "contacts")
      const canExportTasks = await ExportService.checkExportPermissions(superAdmin.id, "tasks")

      expect(canExportInstitutions).toBe(true)
      expect(canExportContacts).toBe(true)
      expect(canExportTasks).toBe(true)
    })

    it("should allow team admin to export team data", async () => {
      const teamAdmin = await User.create({
        firstName: "Team",
        lastName: "Admin",
        email: "team@example.com",
        passwordHash: "hashed_password",
        role: UserRole.TEAM_ADMIN,
        avatarSeed: "team-seed",
        isActive: true,
      })

      const canExportInstitutions = await ExportService.checkExportPermissions(teamAdmin.id, "institutions")
      const canExportContacts = await ExportService.checkExportPermissions(teamAdmin.id, "contacts")
      const canExportTasks = await ExportService.checkExportPermissions(teamAdmin.id, "tasks")

      expect(canExportInstitutions).toBe(true)
      expect(canExportContacts).toBe(true)
      expect(canExportTasks).toBe(true)
    })

    it("should allow regular user to export their own data", async () => {
      const regularUser = await User.create({
        firstName: "Regular",
        lastName: "User",
        email: "regular@example.com",
        passwordHash: "hashed_password",
        role: UserRole.USER,
        avatarSeed: "regular-seed",
        isActive: true,
      })

      const canExportInstitutions = await ExportService.checkExportPermissions(regularUser.id, "institutions")
      const canExportContacts = await ExportService.checkExportPermissions(regularUser.id, "contacts")
      const canExportTasks = await ExportService.checkExportPermissions(regularUser.id, "tasks")

      expect(canExportInstitutions).toBe(true)
      expect(canExportContacts).toBe(true)
      expect(canExportTasks).toBe(true)
    })

    it("should return false for non-existent user", async () => {
      // Use a valid UUID format that doesn't exist
      const nonExistentId = "00000000-0000-0000-0000-000000000000"
      const canExport = await ExportService.checkExportPermissions(nonExistentId, "institutions")
      expect(canExport).toBe(false)
    })
  })
})