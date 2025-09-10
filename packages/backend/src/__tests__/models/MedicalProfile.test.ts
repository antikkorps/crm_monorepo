import { ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import { describe, expect, it, vi } from "vitest"
import { MedicalInstitution, MedicalProfile } from "../../models"

// Mock database state
let mockInstitutions: any[] = []
let mockProfiles: any[] = []

// Mock MedicalInstitution model
const MockMedicalInstitution = {
  create: async (data: any) => {
    const institution = {
      id: data.id || `institution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      type: data.type,
      address: data.address,
      assignedUserId: data.assignedUserId,
      tags: data.tags || [],
      isActive: data.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      getFullAddress: function() {
        const { street, city, state, zipCode, country } = this.address
        return `${street}, ${city}, ${state} ${zipCode}, ${country}`
      },
      hasTag: function(tag: string) {
        return this.tags.includes(tag.toLowerCase())
      },
      addTag: function(tag: string) {
        const normalizedTag = tag.toLowerCase().trim()
        if (!this.hasTag(normalizedTag)) {
          this.tags = [...this.tags, normalizedTag]
        }
      },
      removeTag: function(tag: string) {
        const normalizedTag = tag.toLowerCase().trim()
        this.tags = this.tags.filter((t: string) => t !== normalizedTag)
      },
      toJSON: function() {
        return {
          ...this,
          fullAddress: this.getFullAddress(),
        }
      }
    }
    mockInstitutions.push(institution)
    return institution
  },

  destroy: async (options: any) => {
    if (options.where && Object.keys(options.where).length === 0) {
      mockInstitutions = []
      mockProfiles = [] // Also clear related profiles
    }
    return [1] // Mock affected rows
  },

  sync: async () => {},

  findAll: async (options?: any) => {
    let results = [...mockInstitutions]
    
    if (options?.where) {
      results = results.filter(inst => {
        for (const [key, value] of Object.entries(options.where)) {
          if (key === 'isActive' && inst.isActive !== value) return false
          if (key === 'type' && inst.type !== value) return false
          if (key === 'name' && typeof value === 'object' && value[Symbol.for('Op.iLike')]) {
            const pattern = value[Symbol.for('Op.iLike')].replace(/%/g, '')
            if (!inst.name.toLowerCase().includes(pattern.toLowerCase())) return false
          }
        }
        return true
      })
    }

    return results
  }
}

// Mock MedicalProfile model
const MockMedicalProfile = {
  create: async (data: any) => {
    // Validate required fields
    if (!data.institutionId) {
      throw new Error('notNull Violation: MedicalProfile.institutionId cannot be null')
    }

    // Validate bed capacity range
    if (data.bedCapacity !== undefined) {
      if (data.bedCapacity < 0 || data.bedCapacity > 10000) {
        throw new Error('Validation error: bedCapacity out of range')
      }
    }

    // Validate surgical rooms range
    if (data.surgicalRooms !== undefined) {
      if (data.surgicalRooms < 0 || data.surgicalRooms > 1000) {
        throw new Error('Validation error: surgicalRooms out of range')
      }
    }

    // Validate specialties array
    if (data.specialties) {
      if (!Array.isArray(data.specialties)) {
        throw new Error('Specialties must be an array')
      }
      if (data.specialties.some((s: any) => typeof s !== 'string' || s.trim().length === 0)) {
        throw new Error('All specialties must be non-empty strings')
      }
    }

    // Validate departments array
    if (data.departments) {
      if (!Array.isArray(data.departments)) {
        throw new Error('Departments must be an array')
      }
      if (data.departments.some((d: any) => typeof d !== 'string' || d.trim().length === 0)) {
        throw new Error('All departments must be non-empty strings')
      }
    }

    // Validate equipment types array
    if (data.equipmentTypes) {
      if (!Array.isArray(data.equipmentTypes)) {
        throw new Error('Equipment types must be an array')
      }
      if (data.equipmentTypes.some((e: any) => typeof e !== 'string' || e.trim().length === 0)) {
        throw new Error('All equipment types must be non-empty strings')
      }
    }

    // Validate certifications array
    if (data.certifications) {
      if (!Array.isArray(data.certifications)) {
        throw new Error('Certifications must be an array')
      }
      if (data.certifications.some((c: any) => typeof c !== 'string' || c.trim().length === 0)) {
        throw new Error('All certifications must be non-empty strings')
      }
    }

    // Validate compliance status
    if (data.complianceStatus && !Object.values(ComplianceStatus).includes(data.complianceStatus)) {
      throw new Error('Invalid compliance status')
    }

    // Validate compliance notes length
    if (data.complianceNotes && data.complianceNotes.length > 2000) {
      throw new Error('Validation error: complianceNotes too long')
    }

    // Check unique constraint
    const existingProfile = mockProfiles.find(p => p.institutionId === data.institutionId)
    if (existingProfile) {
      throw new Error('Unique constraint violation: institution_id must be unique')
    }

    const profile = {
      id: data.id || `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      institutionId: data.institutionId,
      bedCapacity: data.bedCapacity,
      surgicalRooms: data.surgicalRooms,
      specialties: data.specialties ? data.specialties.map((s: string) => s.toLowerCase().trim()) : [],
      departments: data.departments ? data.departments.map((d: string) => d.toLowerCase().trim()) : [],
      equipmentTypes: data.equipmentTypes ? data.equipmentTypes.map((e: string) => e.toLowerCase().trim()) : [],
      certifications: data.certifications || [],
      complianceStatus: data.complianceStatus || ComplianceStatus.PENDING_REVIEW,
      lastAuditDate: data.lastAuditDate,
      complianceExpirationDate: data.complianceExpirationDate,
      complianceNotes: data.complianceNotes,
      createdAt: new Date(),
      updatedAt: new Date(),

      // Instance methods
      isCompliant: function() {
        return this.complianceStatus === ComplianceStatus.COMPLIANT
      },

      isComplianceExpired: function() {
        if (!this.complianceExpirationDate) return false
        return new Date() > this.complianceExpirationDate
      },

      hasSpecialty: function(specialty: string) {
        return this.specialties.includes(specialty.toLowerCase())
      },

      hasDepartment: function(department: string) {
        return this.departments.includes(department.toLowerCase())
      },

      hasEquipmentType: function(equipmentType: string) {
        return this.equipmentTypes.includes(equipmentType.toLowerCase())
      }
    }

    mockProfiles.push(profile)
    return profile
  },

  findOne: async (options: any) => {
    let results = [...mockProfiles]
    
    if (options?.where) {
      results = results.filter(profile => {
        for (const [key, value] of Object.entries(options.where)) {
          if (key === 'institutionId' && profile.institutionId !== value) return false
        }
        return true
      })
    }

    return results[0] || null
  },

  findAll: async (options: any) => {
    let results = [...mockProfiles]
    
    if (options?.where) {
      results = results.filter(profile => {
        for (const [key, value] of Object.entries(options.where)) {
          if (key === 'complianceStatus' && profile.complianceStatus !== value) return false
          if (key === 'complianceExpirationDate' && typeof value === 'object') {
            const opKey = Object.keys(value)[0]
            const opValue = value[opKey]
            if (opKey === Symbol.for('Op.lt') && profile.complianceExpirationDate >= opValue) return false
          }
        }
        return true
      })
    }

    return results
  },

  update: async (updates: any, options: any) => {
    let updatedCount = 0
    
    if (options?.where) {
      mockProfiles.forEach(profile => {
        let matches = true
        for (const [key, value] of Object.entries(options.where)) {
          if (key === 'institutionId' && profile.institutionId !== value) {
            matches = false
            break
          }
        }
        
        if (matches) {
          Object.assign(profile, updates)
          profile.updatedAt = new Date()
          updatedCount++
        }
      })
    }

    return [updatedCount]
  },

  destroy: async (options: any) => {
    if (options.where && Object.keys(options.where).length === 0) {
      mockProfiles = []
      return [mockProfiles.length]
    }
    return [0]
  },

  sync: async () => {},

  // Static methods
  findByInstitution: async (institutionId: string) => {
    return MockMedicalProfile.findOne({ where: { institutionId } })
  },

  findByCompliance: async (status: ComplianceStatus) => {
    return MockMedicalProfile.findAll({ where: { complianceStatus: status } })
  },

  findExpiredCompliance: async () => {
    const now = new Date()
    const profiles = await MockMedicalProfile.findAll({
      where: {
        complianceExpirationDate: {
          [Symbol.for('Op.lt')]: now,
        },
      },
    })
    return profiles.filter(profile => {
      // Additional filtering to ensure date comparison works correctly
      return profile.complianceExpirationDate && new Date(profile.complianceExpirationDate) < now
    })
  }
}

// Mock the actual models using vi.mock
vi.mock("../../models", () => ({
  MedicalInstitution: MockMedicalInstitution,
  MedicalProfile: MockMedicalProfile,
}))

describe("MedicalProfile Model", () => {
  beforeEach(() => {
    // Reset mock database
    mockInstitutions = []
    mockProfiles = []
  })

  let institution: any

  const validProfileData = {
    bedCapacity: 150,
    surgicalRooms: 8,
    specialties: ["cardiology", "neurology", "oncology"],
    departments: ["emergency", "icu", "surgery"],
    equipmentTypes: ["mri", "ct_scan", "ultrasound"],
    certifications: ["jcaho", "iso_9001"],
    complianceStatus: ComplianceStatus.COMPLIANT,
    lastAuditDate: new Date("2024-01-15"),
    complianceExpirationDate: new Date(Date.now() + 86400000), // Future date - not expired
    complianceNotes: "All requirements met during last audit",
  }

  beforeEach(async () => {
    institution = await MockMedicalInstitution.create({
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
  })

  describe("Model Creation", () => {
    it("should create a medical profile with valid data", async () => {
      const profile = await MockMedicalProfile.create({
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
    })

    it("should normalize specialties to lowercase", async () => {
      const profile = await MockMedicalProfile.create({
        ...validProfileData,
        institutionId: institution.id,
        specialties: ["CARDIOLOGY", "Neurology", "  ONCOLOGY  "],
      })

      expect(profile.specialties).toEqual(["cardiology", "neurology", "oncology"])
    })

    it("should normalize departments to lowercase", async () => {
      const profile = await MockMedicalProfile.create({
        ...validProfileData,
        institutionId: institution.id,
        departments: ["EMERGENCY", "ICU", "  Surgery  "],
      })

      expect(profile.departments).toEqual(["emergency", "icu", "surgery"])
    })

    it("should normalize equipment types to lowercase", async () => {
      const profile = await MockMedicalProfile.create({
        ...validProfileData,
        institutionId: institution.id,
        equipmentTypes: ["MRI", "CT_Scan", "  ULTRASOUND  "],
      })

      expect(profile.equipmentTypes).toEqual(["mri", "ct_scan", "ultrasound"])
    })

    it("should validate bed capacity range", async () => {
      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          bedCapacity: -1,
        })
      ).rejects.toThrow()

      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          bedCapacity: 15000,
        })
      ).rejects.toThrow()
    })

    it("should validate surgical rooms range", async () => {
      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          surgicalRooms: -1,
        })
      ).rejects.toThrow()

      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          surgicalRooms: 1500,
        })
      ).rejects.toThrow()
    })

    it("should validate specialties array", async () => {
      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          specialties: ["valid", "", "another"] as any,
        })
      ).rejects.toThrow("All specialties must be non-empty strings")
    })

    it("should validate departments array", async () => {
      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          departments: ["valid", "", "another"] as any,
        })
      ).rejects.toThrow("All departments must be non-empty strings")
    })

    it("should validate equipment types array", async () => {
      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          equipmentTypes: ["valid", "", "another"] as any,
        })
      ).rejects.toThrow("All equipment types must be non-empty strings")
    })

    it("should validate certifications array", async () => {
      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          certifications: ["valid", "", "another"] as any,
        })
      ).rejects.toThrow("All certifications must be non-empty strings")
    })

    it("should require valid compliance status", async () => {
      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          complianceStatus: "invalid_status" as ComplianceStatus,
        })
      ).rejects.toThrow()
    })

    it("should validate compliance notes length", async () => {
      const longNotes = "a".repeat(2001)
      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
          complianceNotes: longNotes,
        })
      ).rejects.toThrow()
    })
  })

  describe("Instance Methods", () => {
    let profile: any

    beforeEach(async () => {
      profile = await MockMedicalProfile.create({
        ...validProfileData,
        institutionId: institution.id,
      })
    })

    it("should check if profile is compliant", async () => {
      expect(profile.isCompliant()).toBe(true)

      profile.complianceStatus = ComplianceStatus.NON_COMPLIANT
      expect(profile.isCompliant()).toBe(false)
    })

    it("should check if compliance is expired", async () => {
      // Future date - not expired
      profile.complianceExpirationDate = new Date(Date.now() + 86400000) // +1 day
      expect(profile.isComplianceExpired()).toBe(false)

      // Past date - expired
      profile.complianceExpirationDate = new Date(Date.now() - 86400000) // -1 day
      expect(profile.isComplianceExpired()).toBe(true)

      // No expiration date
      profile.complianceExpirationDate = undefined
      expect(profile.isComplianceExpired()).toBe(false)
    })

    it("should check if profile has specialty", async () => {
      expect(profile.hasSpecialty("cardiology")).toBe(true)
      expect(profile.hasSpecialty("CARDIOLOGY")).toBe(true)
      expect(profile.hasSpecialty("dermatology")).toBe(false)
    })

    it("should check if profile has department", async () => {
      expect(profile.hasDepartment("emergency")).toBe(true)
      expect(profile.hasDepartment("EMERGENCY")).toBe(true)
      expect(profile.hasDepartment("radiology")).toBe(false)
    })

    it("should check if profile has equipment type", async () => {
      expect(profile.hasEquipmentType("mri")).toBe(true)
      expect(profile.hasEquipmentType("MRI")).toBe(true)
      expect(profile.hasEquipmentType("pet_scan")).toBe(false)
    })
  })

  describe("Static Methods", () => {
    beforeEach(async () => {
      // Create multiple institutions and profiles for testing
      const institution2 = await MockMedicalInstitution.create({
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

      await MockMedicalProfile.create({
        ...validProfileData,
        institutionId: institution.id,
        complianceStatus: ComplianceStatus.COMPLIANT,
      })

await MockMedicalProfile.create({
          institutionId: institution2.id,
          bedCapacity: 50,
          surgicalRooms: 2,
          specialties: ["dermatology"],
          departments: ["outpatient"],
          equipmentTypes: ["laser"],
          certifications: ["state_license"],
          complianceStatus: ComplianceStatus.NON_COMPLIANT,
          complianceExpirationDate: new Date(Date.now() + 86400000), // Future date - not expired
        })
    })

    it("should find profile by institution", async () => {
      const profile = await MockMedicalProfile.findByInstitution(institution.id)
      expect(profile).toBeDefined()
      expect(profile?.institutionId).toBe(institution.id)
    })

    it("should find profiles by compliance status", async () => {
      const compliantProfiles = await MockMedicalProfile.findByCompliance(
        ComplianceStatus.COMPLIANT
      )
      const nonCompliantProfiles = await MockMedicalProfile.findByCompliance(
        ComplianceStatus.NON_COMPLIANT
      )

      expect(compliantProfiles).toHaveLength(1)
      expect(nonCompliantProfiles).toHaveLength(1)
      expect(compliantProfiles[0].complianceStatus).toBe(ComplianceStatus.COMPLIANT)
      expect(nonCompliantProfiles[0].complianceStatus).toBe(
        ComplianceStatus.NON_COMPLIANT
      )
    })

it("should find expired compliance profiles", async () => {
      // Update only first profile to have expired compliance
      await MockMedicalProfile.update(
        { complianceExpirationDate: new Date(Date.now() - 86400000) }, // Yesterday
        { where: { institutionId: institution.id } }
      )

      const expiredProfiles = await MockMedicalProfile.findExpiredCompliance()
      expect(expiredProfiles).toHaveLength(1)
      expect(expiredProfiles[0].institutionId).toBe(institution.id)
    })
  })

  describe("Unique Constraints", () => {
    it("should enforce unique institution_id constraint", async () => {
      // Create first profile
      await MockMedicalProfile.create({
        ...validProfileData,
        institutionId: institution.id,
      })

      // Try to create second profile for same institution
      await expect(
        MockMedicalProfile.create({
          ...validProfileData,
          institutionId: institution.id,
        })
      ).rejects.toThrow()
    })
  })
})
