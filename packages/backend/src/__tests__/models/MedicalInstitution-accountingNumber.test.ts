import { describe, it, expect, beforeEach } from "vitest"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { InstitutionType } from "@medical-crm/shared"
import { cleanDatabase } from "../helpers/db-mock"
import { sequelize } from "../../config/database"

describe("MedicalInstitution - accountingNumber", () => {
  beforeEach(async () => {
    await cleanDatabase(sequelize)
  })

  describe("Field Validation", () => {
    it("should allow creation without accountingNumber", async () => {
      const institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: InstitutionType.HOSPITAL,
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      expect(institution.id).toBeDefined()
      expect(institution.accountingNumber).toBeUndefined()
    })

    it("should allow creation with valid accountingNumber", async () => {
      const institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: InstitutionType.HOSPITAL,
        accountingNumber: "ACCT-12345",
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      expect(institution.accountingNumber).toBe("ACCT-12345")
    })

    it("should enforce max length of 50 characters", async () => {
      const longAccountingNumber = "A".repeat(51)

      await expect(
        MedicalInstitution.create({
          name: "Test Hospital",
          type: InstitutionType.HOSPITAL,
          accountingNumber: longAccountingNumber,
          address: {
            street: "123 Main St",
            city: "Paris",
            state: "Île-de-France",
            zipCode: "75001",
            country: "France",
          },
          tags: [],
          isActive: true,
        })
      ).rejects.toThrow()
    })

    it("should reject empty string as accountingNumber", async () => {
      await expect(
        MedicalInstitution.create({
          name: "Test Hospital",
          type: InstitutionType.HOSPITAL,
          accountingNumber: "",
          address: {
            street: "123 Main St",
            city: "Paris",
            state: "Île-de-France",
            zipCode: "75001",
            country: "France",
          },
          tags: [],
          isActive: true,
        })
      ).rejects.toThrow()
    })

    it("should allow accountingNumber with 50 characters exactly", async () => {
      const exactLength = "A".repeat(50)

      const institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: InstitutionType.HOSPITAL,
        accountingNumber: exactLength,
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      expect(institution.accountingNumber).toBe(exactLength)
    })
  })

  describe("Uniqueness Constraint", () => {
    it("should enforce unique accountingNumber", async () => {
      const accountingNumber = "ACCT-UNIQUE-001"

      // Create first institution
      await MedicalInstitution.create({
        name: "First Hospital",
        type: InstitutionType.HOSPITAL,
        accountingNumber,
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      // Try to create second institution with same accountingNumber
      await expect(
        MedicalInstitution.create({
          name: "Second Hospital",
          type: InstitutionType.CLINIC,
          accountingNumber,
          address: {
            street: "456 Other St",
            city: "Lyon",
            state: "Auvergne-Rhône-Alpes",
            zipCode: "69001",
            country: "France",
          },
          tags: [],
          isActive: true,
        })
      ).rejects.toThrow()
    })

    it("should allow multiple institutions without accountingNumber", async () => {
      // Create first institution without accountingNumber
      const institution1 = await MedicalInstitution.create({
        name: "First Hospital",
        type: InstitutionType.HOSPITAL,
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      // Create second institution without accountingNumber
      const institution2 = await MedicalInstitution.create({
        name: "Second Hospital",
        type: InstitutionType.CLINIC,
        address: {
          street: "456 Other St",
          city: "Lyon",
          state: "Auvergne-Rhône-Alpes",
          zipCode: "69001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      expect(institution1.id).toBeDefined()
      expect(institution2.id).toBeDefined()
      expect(institution1.accountingNumber).toBeUndefined()
      expect(institution2.accountingNumber).toBeUndefined()
    })
  })

  describe("Update Operations", () => {
    it("should allow updating accountingNumber", async () => {
      const institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: InstitutionType.HOSPITAL,
        accountingNumber: "ACCT-OLD",
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      await institution.update({ accountingNumber: "ACCT-NEW" })

      expect(institution.accountingNumber).toBe("ACCT-NEW")

      // Verify in database
      const reloaded = await MedicalInstitution.findByPk(institution.id)
      expect(reloaded?.accountingNumber).toBe("ACCT-NEW")
    })

    it("should allow removing accountingNumber by setting to null", async () => {
      const institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: InstitutionType.HOSPITAL,
        accountingNumber: "ACCT-REMOVE",
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      await institution.update({ accountingNumber: null })

      expect(institution.accountingNumber).toBeNull()
    })

    it("should enforce unique constraint on update", async () => {
      const accountingNumber1 = "ACCT-001"
      const accountingNumber2 = "ACCT-002"

      const institution1 = await MedicalInstitution.create({
        name: "First Hospital",
        type: InstitutionType.HOSPITAL,
        accountingNumber: accountingNumber1,
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      const institution2 = await MedicalInstitution.create({
        name: "Second Hospital",
        type: InstitutionType.CLINIC,
        accountingNumber: accountingNumber2,
        address: {
          street: "456 Other St",
          city: "Lyon",
          state: "Auvergne-Rhône-Alpes",
          zipCode: "69001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      // Try to update institution2 to use institution1's accountingNumber
      await expect(
        institution2.update({ accountingNumber: accountingNumber1 })
      ).rejects.toThrow()
    })
  })

  describe("Query Operations", () => {
    it("should find institution by exact accountingNumber", async () => {
      const accountingNumber = "ACCT-FIND-001"

      await MedicalInstitution.create({
        name: "Findable Hospital",
        type: InstitutionType.HOSPITAL,
        accountingNumber,
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      const found = await MedicalInstitution.findOne({
        where: { accountingNumber },
      })

      expect(found).not.toBeNull()
      expect(found?.accountingNumber).toBe(accountingNumber)
      expect(found?.name).toBe("Findable Hospital")
    })

    it("should return null when searching for non-existent accountingNumber", async () => {
      const found = await MedicalInstitution.findOne({
        where: { accountingNumber: "NON-EXISTENT" },
      })

      expect(found).toBeNull()
    })
  })

  describe("Integration with digiformaId", () => {
    it("should allow both accountingNumber and digiformaId", async () => {
      const institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: InstitutionType.HOSPITAL,
        accountingNumber: "ACCT-123",
        digiformaId: "DIGI-456",
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      expect(institution.accountingNumber).toBe("ACCT-123")
      expect(institution.digiformaId).toBe("DIGI-456")
    })

    it("should allow one without the other", async () => {
      const institution1 = await MedicalInstitution.create({
        name: "Hospital with Accounting",
        type: InstitutionType.HOSPITAL,
        accountingNumber: "ACCT-ONLY",
        address: {
          street: "123 Main St",
          city: "Paris",
          state: "Île-de-France",
          zipCode: "75001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      const institution2 = await MedicalInstitution.create({
        name: "Hospital with Digiforma",
        type: InstitutionType.HOSPITAL,
        digiformaId: "DIGI-ONLY",
        address: {
          street: "456 Other St",
          city: "Lyon",
          state: "Auvergne-Rhône-Alpes",
          zipCode: "69001",
          country: "France",
        },
        tags: [],
        isActive: true,
      })

      expect(institution1.accountingNumber).toBe("ACCT-ONLY")
      expect(institution1.digiformaId).toBeUndefined()
      expect(institution2.accountingNumber).toBeUndefined()
      expect(institution2.digiformaId).toBe("DIGI-ONLY")
    })
  })
})
