import { describe, it, expect } from "vitest"
import { SegmentService } from "../../services/SegmentService"
import { SegmentCriteria, SegmentType } from "../../models/Segment"
import { MedicalInstitutionSearchFilters } from "@medical-crm/shared"

describe("SegmentService", () => {
  describe("validateSegmentCriteria", () => {
    it("should validate institution segment criteria", () => {
      const criteria: SegmentCriteria = {
        institutionFilters: {
          name: "Test Hospital",
          type: "hospital" as any,
        },
      }

      expect(() => {
        SegmentService.validateSegmentCriteria(SegmentType.INSTITUTION, criteria)
      }).not.toThrow()
    })

    it("should validate contact segment criteria", () => {
      const criteria: SegmentCriteria = {
        contactFilters: {
          role: ["Doctor"],
          department: ["Cardiology"],
        },
      }

      expect(() => {
        SegmentService.validateSegmentCriteria(SegmentType.CONTACT, criteria)
      }).not.toThrow()
    })

    it("should throw error for institution segment without institution filters", () => {
      const criteria: SegmentCriteria = {
        contactFilters: {
          role: ["Doctor"],
        },
      }

      expect(() => {
        SegmentService.validateSegmentCriteria(SegmentType.INSTITUTION, criteria)
      }).toThrow("Institution segments require institution filters")
    })

    it("should throw error for contact segment without contact filters", () => {
      const criteria: SegmentCriteria = {
        institutionFilters: {
          name: "Test",
        },
      }

      expect(() => {
        SegmentService.validateSegmentCriteria(SegmentType.CONTACT, criteria)
      }).toThrow("Contact segments require contact filters")
    })
  })

  describe("buildWhereClause", () => {
    it("should build where clause for name filter", () => {
      const filters = { name: "Test Hospital" }
      const whereClause = SegmentService["buildWhereClause"](filters)

      expect(whereClause).toEqual({
        name: { $iLike: "%Test Hospital%" },
      })
    })

    it("should build where clause for type filter", () => {
      const filters = { type: "hospital" as any }
      const whereClause = SegmentService["buildWhereClause"](filters)

      expect(whereClause).toEqual({
        type: "hospital",
      })
    })

    it("should build where clause for city filter", () => {
      const filters = { city: "Paris" }
      const whereClause = SegmentService["buildWhereClause"](filters)

      expect(whereClause).toEqual({
        "address.city": { $iLike: "%Paris%" },
      })
    })

    it("should build where clause for tags filter", () => {
      const filters = { tags: ["urgent", "private"] }
      const whereClause = SegmentService["buildWhereClause"](filters)

      expect(whereClause).toEqual({
        tags: { $overlap: ["urgent", "private"] },
      })
    })

    it("should handle empty filters", () => {
      const filters = {}
      const whereClause = SegmentService["buildWhereClause"](filters)

      expect(whereClause).toEqual({})
    })

    it("should ignore undefined and null values", () => {
      const filters = { name: undefined, type: null, city: "Paris" }
      const whereClause = SegmentService["buildWhereClause"](filters)

      expect(whereClause).toEqual({
        "address.city": { $iLike: "%Paris%" },
      })
    })
  })

  describe("countFiltersInCriteria", () => {
    it("should count institution filters", () => {
      const criteria: SegmentCriteria = {
        institutionFilters: {
          name: "Test",
          type: "hospital" as any,
          city: "Paris",
          tags: ["urgent"],
        },
      }

      const count = SegmentService["countFiltersInCriteria"](criteria)
      expect(count).toBe(4)
    })

    it("should count contact filters", () => {
      const criteria: SegmentCriteria = {
        contactFilters: {
          role: ["Doctor"],
          department: ["Cardiology"],
          isPrimary: true,
        },
      }

      const count = SegmentService["countFiltersInCriteria"](criteria)
      expect(count).toBe(3)
    })

    it("should count combined filters", () => {
      const criteria: SegmentCriteria = {
        combinedFilters: {
          hasActiveContacts: true,
          assignedToTeam: false,
        },
      }

      const count = SegmentService["countFiltersInCriteria"](criteria)
      expect(count).toBe(2)
    })

    it("should count all filter types", () => {
      const criteria: SegmentCriteria = {
        institutionFilters: {
          name: "Test",
        },
        contactFilters: {
          role: ["Doctor"],
        },
        combinedFilters: {
          hasActiveContacts: true,
        },
      }

      const count = SegmentService["countFiltersInCriteria"](criteria)
      expect(count).toBe(3)
    })

    it("should handle empty criteria", () => {
      const criteria: SegmentCriteria = {}
      const count = SegmentService["countFiltersInCriteria"](criteria)
      expect(count).toBe(0)
    })
  })

  // Note: Integration tests for applyInstitutionFilters and applyContactFilters
  // would require database setup and are better suited for integration test suites
})