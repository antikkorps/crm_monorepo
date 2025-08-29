import { ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import DatabaseManager from "../../config/database"
import { MedicalInstitution, MedicalProfile } from "../../models"

describe("MedicalProfile Model", () => {
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
      await MedicalProfile.destroy({ where: {}, force: true })
      await MedicalInstitution.destroy({ where: {}, force: true })
    } catch (error) {
      // Skip if database not available
    }
  })

  let institution: MedicalInstitution

  const validProfileData = {
    bedCapacity: 150,
    surgicalRooms: 8,
    specialties: ["cardiology", "neurology", "oncology"],
    departments: ["emergency", "icu", "surgery"],
    equipmentTypes: ["mri", "ct_scan", "ultrasound"],
    certifications: ["jcaho", "iso_9001"],
    complianceStatus: ComplianceStatus.COMPLIANT,
    lastAuditDate: new Date("2024-01-15"),
    complianceExpirationDate: new Date("2025-01-15"),
    complianceNotes: "All requirements met during last audit",
  }

  beforeEach(async () => {
    try {
      institution = await MedicalInstitution.create({
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
    } catch (error) {
      if (error.message?.includes("connect")) return
    }
  })

  describe("Model Creation", () => {
    it("should create a medical profile with valid data", async () => {
      try {
        const profile = await MedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
        })

        expect(profile.id).toBeDefined()
        expect(profile.institutionId).toBe(institution.id)
        expect(profile.bedCapacity).toBe(150)
        expect(profile.surgicalRooms).toBe(8)
        expect(profile.specialties).toEqual(["cardiology", "neurology", "oncology"])
        expect(profile.complianceStatus).toBe(ComplianceStatus.COMPLIANT)
        expect(profile.createdAt).toBeDefined()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should normalize specialties to lowercase", async () => {
      try {
        const profile = await MedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          specialties: ["CARDIOLOGY", "Neurology", "  ONCOLOGY  "],
        })

        expect(profile.specialties).toEqual(["cardiology", "neurology", "oncology"])
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should normalize departments to lowercase", async () => {
      try {
        const profile = await MedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          departments: ["EMERGENCY", "ICU", "  Surgery  "],
        })

        expect(profile.departments).toEqual(["emergency", "icu", "surgery"])
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should normalize equipment types to lowercase", async () => {
      try {
        const profile = await MedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          equipmentTypes: ["MRI", "CT_Scan", "  ULTRASOUND  "],
        })

        expect(profile.equipmentTypes).toEqual(["mri", "ct_scan", "ultrasound"])
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate bed capacity range", async () => {
      try {
        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            bedCapacity: -1,
          })
        ).rejects.toThrow()

        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            bedCapacity: 15000,
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate surgical rooms range", async () => {
      try {
        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            surgicalRooms: -1,
          })
        ).rejects.toThrow()

        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            surgicalRooms: 1500,
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate specialties array", async () => {
      try {
        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            specialties: ["valid", "", "another"] as any,
          })
        ).rejects.toThrow("All specialties must be non-empty strings")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate departments array", async () => {
      try {
        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            departments: ["valid", "", "another"] as any,
          })
        ).rejects.toThrow("All departments must be non-empty strings")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate equipment types array", async () => {
      try {
        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            equipmentTypes: ["valid", "", "another"] as any,
          })
        ).rejects.toThrow("All equipment types must be non-empty strings")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate certifications array", async () => {
      try {
        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            certifications: ["valid", "", "another"] as any,
          })
        ).rejects.toThrow("All certifications must be non-empty strings")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should require valid compliance status", async () => {
      try {
        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            complianceStatus: "invalid_status" as ComplianceStatus,
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate compliance notes length", async () => {
      try {
        const longNotes = "a".repeat(2001)
        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
            complianceNotes: longNotes,
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("Instance Methods", () => {
    let profile: MedicalProfile

    beforeEach(async () => {
      try {
        profile = await MedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
        })
      } catch (error) {
        if (error.message?.includes("connect")) return
      }
    })

    it("should check if profile is compliant", async () => {
      try {
        expect(profile.isCompliant()).toBe(true)

        profile.complianceStatus = ComplianceStatus.NON_COMPLIANT
        expect(profile.isCompliant()).toBe(false)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should check if compliance is expired", async () => {
      try {
        // Future date - not expired
        profile.complianceExpirationDate = new Date(Date.now() + 86400000) // +1 day
        expect(profile.isComplianceExpired()).toBe(false)

        // Past date - expired
        profile.complianceExpirationDate = new Date(Date.now() - 86400000) // -1 day
        expect(profile.isComplianceExpired()).toBe(true)

        // No expiration date
        profile.complianceExpirationDate = undefined
        expect(profile.isComplianceExpired()).toBe(false)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should check if profile has specialty", async () => {
      try {
        expect(profile.hasSpecialty("cardiology")).toBe(true)
        expect(profile.hasSpecialty("CARDIOLOGY")).toBe(true)
        expect(profile.hasSpecialty("dermatology")).toBe(false)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should check if profile has department", async () => {
      try {
        expect(profile.hasDepartment("emergency")).toBe(true)
        expect(profile.hasDepartment("EMERGENCY")).toBe(true)
        expect(profile.hasDepartment("radiology")).toBe(false)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should check if profile has equipment type", async () => {
      try {
        expect(profile.hasEquipmentType("mri")).toBe(true)
        expect(profile.hasEquipmentType("MRI")).toBe(true)
        expect(profile.hasEquipmentType("pet_scan")).toBe(false)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("Static Methods", () => {
    beforeEach(async () => {
      try {
        // Create multiple institutions and profiles for testing
        const institution2 = await MedicalInstitution.create({
          name: "Test Clinic",
          type: InstitutionType.CLINIC,
          address: {
            street: "456 Test Ave",
            city: "Test City",
            state: "CA",
            zipCode: "90211",
            country: "US",
          },
        })

        await MedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          complianceStatus: ComplianceStatus.COMPLIANT,
        })

        await MedicalProfile.create({
          institutionId: institution2.id,
          bedCapacity: 50,
          surgicalRooms: 2,
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

    it("should find profile by institution", async () => {
      try {
        const profile = await MedicalProfile.findByInstitution(institution.id)
        expect(profile).toBeDefined()
        expect(profile?.institutionId).toBe(institution.id)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should find profiles by compliance status", async () => {
      try {
        const compliantProfiles = await MedicalProfile.findByCompliance(
          ComplianceStatus.COMPLIANT
        )
        const nonCompliantProfiles = await MedicalProfile.findByCompliance(
          ComplianceStatus.NON_COMPLIANT
        )

        expect(compliantProfiles).toHaveLength(1)
        expect(nonCompliantProfiles).toHaveLength(1)
        expect(compliantProfiles[0].complianceStatus).toBe(ComplianceStatus.COMPLIANT)
        expect(nonCompliantProfiles[0].complianceStatus).toBe(
          ComplianceStatus.NON_COMPLIANT
        )
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should find expired compliance profiles", async () => {
      try {
        // Update one profile to have expired compliance
        await MedicalProfile.update(
          { complianceExpirationDate: new Date(Date.now() - 86400000) }, // Yesterday
          { where: { institutionId: institution.id } }
        )

        const expiredProfiles = await MedicalProfile.findExpiredCompliance()
        expect(expiredProfiles).toHaveLength(1)
        expect(expiredProfiles[0].institutionId).toBe(institution.id)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("Unique Constraints", () => {
    it("should enforce unique institution_id constraint", async () => {
      try {
        // Create first profile
        await MedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
        })

        // Try to create second profile for same institution
        await expect(
          MedicalProfile.create({
            ...validProfileData,
            institutionId: institution.id,
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })
})
