import { ComplianceStatus, InstitutionType, UserRole } from "@medical-crm/shared"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import DatabaseManager from "../../config/database"
import { ContactPerson, MedicalInstitution, MedicalProfile, User } from "../../models"
import { CsvImportService } from "../../services/CsvImportService"

describe("CsvImportService", () => {
  beforeAll(async () => {
    try {
      await DatabaseManager.connect()
      await DatabaseManager.sync({ force: true })
    } catch (error) {
      console.warn("Database not available for testing:", error)
    }
  })

  afterAll(async () => {
    try {
      await DatabaseManager.disconnect()
    } catch (error) {
      // Ignore disconnect errors
    }
  })

  beforeEach(async () => {
    try {
      await ContactPerson.destroy({ where: {}, force: true })
      await MedicalProfile.destroy({ where: {}, force: true })
      await MedicalInstitution.destroy({ where: {}, force: true })
      await User.destroy({ where: {}, force: true })
    } catch (error) {
      // Skip if database not available
    }
  })

  const validCsvData = `name,type,street,city,state,zipCode,country,bedCapacity,surgicalRooms,specialties,departments,equipmentTypes,certifications,complianceStatus,lastAuditDate,complianceExpirationDate,complianceNotes,tags,contactFirstName,contactLastName,contactEmail,contactPhone,contactTitle,contactDepartment,contactIsPrimary
General Hospital,hospital,123 Medical Center Dr,Healthcare City,CA,90210,US,150,8,"cardiology,neurology","emergency,icu","mri,ct_scan","jcaho,iso_9001",compliant,2024-01-15,2025-01-15,All requirements met,"cardiology,emergency",John,Doe,john.doe@hospital.com,+1234567890,Chief Medical Officer,Administration,true
City Clinic,clinic,456 City Ave,Los Angeles,CA,90001,US,50,2,dermatology,outpatient,laser,state_license,non_compliant,2023-12-01,2024-12-01,Needs improvement,dermatology,Jane,Smith,jane.smith@clinic.com,+1987654321,Practice Manager,Management,true`

  const invalidCsvData = `name,type,street,city,state,zipCode,country,bedCapacity,surgicalRooms,specialties
,hospital,123 Medical Dr,Test City,CA,90210,US,150,8,cardiology
Invalid Hospital,invalid_type,456 Test Ave,Test City,CA,90210,US,abc,xyz,neurology`

  describe("CSV Template Generation", () => {
    it("should generate CSV template with correct headers", () => {
      try {
        const template = CsvImportService.generateCsvTemplate()

        expect(template).toContain("name,type,street,city,state,zipCode")
        expect(template).toContain("General Hospital,hospital,123 Medical Center Dr")

        const lines = template.split("\n")
        expect(lines).toHaveLength(2) // Header + example row
      } catch (error) {
        // This test doesn't require database
        throw error
      }
    })
  })

  describe("CSV Import - Validation Only", () => {
    it("should validate correct CSV data", async () => {
      try {
        const result = await CsvImportService.importMedicalInstitutions(validCsvData, {
          validateOnly: true,
        })

        expect(result.success).toBe(true)
        expect(result.totalRows).toBe(2)
        expect(result.errors).toHaveLength(0)
        expect(result.successfulImports).toBe(2)
        expect(result.failedImports).toBe(0)
      } catch (error) {
        if (error.message?.includes("connect")) {
          console.warn("Skipping test - database not available")
          return
        }
        throw error
      }
    })

    it("should detect validation errors in CSV data", async () => {
      try {
        const result = await CsvImportService.importMedicalInstitutions(invalidCsvData, {
          validateOnly: true,
        })

        expect(result.success).toBe(false)
        expect(result.totalRows).toBe(2)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.failedImports).toBe(2)
        expect(result.successfulImports).toBe(0)

        // Check specific validation errors
        const nameError = result.errors.find((e) => e.field === "name")
        expect(nameError).toBeDefined()
        expect(nameError?.message).toContain("name is required")

        const typeError = result.errors.find((e) => e.field === "type")
        expect(typeError).toBeDefined()
        expect(typeError?.message).toContain("Invalid institution type")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate numeric fields", async () => {
      try {
        const csvWithInvalidNumbers = `name,type,street,city,state,zipCode,bedCapacity,surgicalRooms
Test Hospital,hospital,123 Test St,Test City,CA,90210,abc,xyz`

        const result = await CsvImportService.importMedicalInstitutions(
          csvWithInvalidNumbers,
          {
            validateOnly: true,
          }
        )

        expect(result.errors.length).toBeGreaterThan(0)

        const bedCapacityError = result.errors.find((e) => e.field === "bedCapacity")
        expect(bedCapacityError).toBeDefined()

        const surgicalRoomsError = result.errors.find((e) => e.field === "surgicalRooms")
        expect(surgicalRoomsError).toBeDefined()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate date fields", async () => {
      try {
        const csvWithInvalidDates = `name,type,street,city,state,zipCode,lastAuditDate,complianceExpirationDate
Test Hospital,hospital,123 Test St,Test City,CA,90210,invalid-date,not-a-date`

        const result = await CsvImportService.importMedicalInstitutions(
          csvWithInvalidDates,
          {
            validateOnly: true,
          }
        )

        expect(result.errors.length).toBeGreaterThan(0)

        const auditDateError = result.errors.find((e) => e.field === "lastAuditDate")
        expect(auditDateError).toBeDefined()

        const expirationDateError = result.errors.find(
          (e) => e.field === "complianceExpirationDate"
        )
        expect(expirationDateError).toBeDefined()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate email format", async () => {
      try {
        const csvWithInvalidEmail = `name,type,street,city,state,zipCode,contactFirstName,contactLastName,contactEmail
Test Hospital,hospital,123 Test St,Test City,CA,90210,John,Doe,invalid-email`

        const result = await CsvImportService.importMedicalInstitutions(
          csvWithInvalidEmail,
          {
            validateOnly: true,
          }
        )

        expect(result.errors.length).toBeGreaterThan(0)

        const emailError = result.errors.find((e) => e.field === "contactEmail")
        expect(emailError).toBeDefined()
        expect(emailError?.message).toContain("Invalid email format")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("CSV Import - Actual Import", () => {
    it("should import valid CSV data and create institutions", async () => {
      try {
        const result = await CsvImportService.importMedicalInstitutions(validCsvData, {
          validateOnly: false,
          skipDuplicates: true,
        })

        expect(result.success).toBe(true)
        expect(result.totalRows).toBe(2)
        expect(result.successfulImports).toBe(2)
        expect(result.failedImports).toBe(0)
        expect(result.importedInstitutions).toHaveLength(2)

        // Verify institutions were created
        const institutions = await MedicalInstitution.findAll({
          include: [
            { model: MedicalProfile, as: "medicalProfile" },
            { model: ContactPerson, as: "contactPersons" },
          ],
        })

        expect(institutions).toHaveLength(2)

        // Check first institution
        const hospital = institutions.find((i) => i.name === "General Hospital")
        expect(hospital).toBeDefined()
        expect(hospital?.type).toBe(InstitutionType.HOSPITAL)
        expect(hospital?.address.city).toBe("Healthcare City")
        expect(hospital?.medicalProfile?.bedCapacity).toBe(150)
        expect(hospital?.medicalProfile?.specialties).toContain("cardiology")
        expect(hospital?.contactPersons).toHaveLength(1)
        expect(hospital?.contactPersons?.[0].firstName).toBe("John")

        // Check second institution
        const clinic = institutions.find((i) => i.name === "City Clinic")
        expect(clinic).toBeDefined()
        expect(clinic?.type).toBe(InstitutionType.CLINIC)
        expect(clinic?.medicalProfile?.complianceStatus).toBe(
          ComplianceStatus.NON_COMPLIANT
        )
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should handle duplicate detection", async () => {
      try {
        // First import
        const result1 = await CsvImportService.importMedicalInstitutions(validCsvData, {
          validateOnly: false,
          skipDuplicates: true,
        })

        expect(result1.successfulImports).toBe(2)
        expect(result1.duplicatesFound).toBe(0)

        // Second import with same data
        const result2 = await CsvImportService.importMedicalInstitutions(validCsvData, {
          validateOnly: false,
          skipDuplicates: true,
        })

        expect(result2.duplicatesFound).toBe(2)
        expect(result2.duplicatesSkipped).toBe(2)
        expect(result2.successfulImports).toBe(0)

        // Verify only 2 institutions exist
        const institutions = await MedicalInstitution.findAll()
        expect(institutions).toHaveLength(2)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should handle duplicate merging", async () => {
      try {
        // First import
        await CsvImportService.importMedicalInstitutions(validCsvData, {
          validateOnly: false,
          skipDuplicates: true,
        })

        // Create updated CSV with additional data
        const updatedCsvData = `name,type,street,city,state,zipCode,specialties,tags
General Hospital,hospital,123 Medical Center Dr,Healthcare City,CA,90210,"cardiology,oncology","cardiology,emergency,oncology"`

        // Second import with merge duplicates
        const result = await CsvImportService.importMedicalInstitutions(updatedCsvData, {
          validateOnly: false,
          skipDuplicates: false,
          mergeDuplicates: true,
        })

        expect(result.duplicatesFound).toBe(1)
        expect(result.duplicatesMerged).toBe(1)
        expect(result.successfulImports).toBe(1)

        // Verify data was merged
        const hospital = await MedicalInstitution.findOne({
          where: { name: "General Hospital" },
          include: [{ model: MedicalProfile, as: "medicalProfile" }],
        })

        expect(hospital?.medicalProfile?.specialties).toContain("oncology")
        expect(hospital?.tags).toContain("oncology")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should assign user to imported institutions", async () => {
      try {
        // Create test user
        const user = await User.create({
          email: "test@example.com",
          passwordHash: "hashedpassword",
          firstName: "Test",
          lastName: "User",
          role: UserRole.SALES_REP,
          avatarSeed: "test-user",
          isActive: true,
        })

        const result = await CsvImportService.importMedicalInstitutions(validCsvData, {
          validateOnly: false,
          userId: user.id,
        })

        expect(result.successfulImports).toBe(2)

        // Verify institutions are assigned to user
        const institutions = await MedicalInstitution.findAll({
          where: { assignedUserId: user.id },
        })

        expect(institutions).toHaveLength(2)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("CSV Parsing", () => {
    it("should handle different column name variations", async () => {
      try {
        const csvWithVariations = `Institution Name,Hospital Type,Street Address,City,State,ZIP Code
General Hospital,hospital,123 Medical Dr,Test City,CA,90210`

        const result = await CsvImportService.importMedicalInstitutions(
          csvWithVariations,
          {
            validateOnly: true,
          }
        )

        expect(result.success).toBe(true)
        expect(result.errors).toHaveLength(0)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should parse comma-separated arrays correctly", async () => {
      try {
        const csvWithArrays = `name,type,street,city,state,zipCode,specialties,departments,tags
Test Hospital,hospital,123 Test St,Test City,CA,90210,"cardiology, neurology, oncology","emergency, icu, surgery","tag1, tag2, tag3"`

        const result = await CsvImportService.importMedicalInstitutions(csvWithArrays, {
          validateOnly: false,
        })

        expect(result.success).toBe(true)

        const institution = await MedicalInstitution.findOne({
          where: { name: "Test Hospital" },
          include: [{ model: MedicalProfile, as: "medicalProfile" }],
        })

        expect(institution?.medicalProfile?.specialties).toEqual([
          "cardiology",
          "neurology",
          "oncology",
        ])
        expect(institution?.medicalProfile?.departments).toEqual([
          "emergency",
          "icu",
          "surgery",
        ])
        expect(institution?.tags).toEqual(["tag1", "tag2", "tag3"])
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should handle empty and optional fields", async () => {
      try {
        const csvWithEmptyFields = `name,type,street,city,state,zipCode,bedCapacity,surgicalRooms,specialties
Test Hospital,hospital,123 Test St,Test City,CA,90210,,,`

        const result = await CsvImportService.importMedicalInstitutions(
          csvWithEmptyFields,
          {
            validateOnly: false,
          }
        )

        expect(result.success).toBe(true)

        const institution = await MedicalInstitution.findOne({
          where: { name: "Test Hospital" },
          include: [{ model: MedicalProfile, as: "medicalProfile" }],
        })

        expect(institution?.medicalProfile?.bedCapacity).toBeUndefined()
        expect(institution?.medicalProfile?.surgicalRooms).toBeUndefined()
        expect(institution?.medicalProfile?.specialties).toEqual([])
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("Error Handling", () => {
    it("should handle malformed CSV data", async () => {
      try {
        const malformedCsv = `name,type,street
"Unclosed quote hospital,123 Test St`

        const result = await CsvImportService.importMedicalInstitutions(malformedCsv, {
          validateOnly: true,
        })

        expect(result.success).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      } catch (error) {
        if (error.message?.includes("connect")) return
        // Expect this to throw an error for malformed CSV
        expect(error.message).toContain("CSV parsing failed")
      }
    })

    it("should handle empty CSV data", async () => {
      try {
        const result = await CsvImportService.importMedicalInstitutions("", {
          validateOnly: true,
        })

        expect(result.totalRows).toBe(0)
        expect(result.successfulImports).toBe(0)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should handle CSV with only headers", async () => {
      try {
        const headersOnly = `name,type,street,city,state,zipCode`

        const result = await CsvImportService.importMedicalInstitutions(headersOnly, {
          validateOnly: true,
        })

        expect(result.totalRows).toBe(0)
        expect(result.successfulImports).toBe(0)
        expect(result.errors).toHaveLength(0)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })
})
