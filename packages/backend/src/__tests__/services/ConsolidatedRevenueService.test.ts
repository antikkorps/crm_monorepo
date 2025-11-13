import { describe, it, expect, beforeEach } from "vitest"
import { ConsolidatedRevenueService } from "../../services/ConsolidatedRevenueService"
import { createMockUser, createMockMedicalInstitution, createMockInvoice, cleanDatabase } from "../helpers/db-mock"
import { sequelize } from "../../config/database"
import { InvoiceStatus } from "@medical-crm/shared"

describe("ConsolidatedRevenueService", () => {
  beforeEach(async () => {
    await cleanDatabase(sequelize)
  })

  describe("getInstitutionRevenue", () => {
    it("should return zero revenue for institution with no invoices", async () => {
      const institution = await createMockMedicalInstitution()

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.audit.totalRevenue).toBe(0)
      expect(revenue.audit.paidRevenue).toBe(0)
      expect(revenue.audit.unpaidRevenue).toBe(0)
      expect(revenue.audit.invoiceCount).toBe(0)
      expect(revenue.formation.totalRevenue).toBe(0)
      expect(revenue.total.totalRevenue).toBe(0)
    })

    it("should calculate revenue from paid invoices", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      // Create paid invoice
      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 1000,
        paidAmount: 1000,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.audit.totalRevenue).toBe(1000)
      expect(revenue.audit.paidRevenue).toBe(1000)
      expect(revenue.audit.unpaidRevenue).toBe(0)
      expect(revenue.audit.invoiceCount).toBe(1)
    })

    it("should calculate revenue from unpaid invoices", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      // Create unpaid invoice
      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.DRAFT,
        totalAmount: 500,
        paidAmount: 0,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.audit.totalRevenue).toBe(500)
      expect(revenue.audit.paidRevenue).toBe(0)
      expect(revenue.audit.unpaidRevenue).toBe(500)
      expect(revenue.audit.invoiceCount).toBe(1)
    })

    it("should calculate revenue from partially paid invoices", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      // Create partially paid invoice
      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PARTIALLY_PAID,
        totalAmount: 1000,
        paidAmount: 300,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.audit.totalRevenue).toBe(1000)
      expect(revenue.audit.paidRevenue).toBe(300)
      expect(revenue.audit.unpaidRevenue).toBe(700)
    })

    it("should sum revenue from multiple invoices", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 1000,
        paidAmount: 1000,
      })

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.DRAFT,
        totalAmount: 500,
        paidAmount: 0,
      })

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PARTIALLY_PAID,
        totalAmount: 800,
        paidAmount: 200,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.audit.totalRevenue).toBe(2300)
      expect(revenue.audit.paidRevenue).toBe(1200)
      expect(revenue.audit.unpaidRevenue).toBe(1100)
      expect(revenue.audit.invoiceCount).toBe(3)
    })

    it("should filter invoices by date range", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      // Invoice within range
      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 1000,
        paidAmount: 1000,
        issueDate: thirtyDaysAgo,
      })

      // Invoice outside range
      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 500,
        paidAmount: 500,
        issueDate: sixtyDaysAgo,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(
        institution.id,
        new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // Start: 45 days ago
        now // End: now
      )

      // Should only include the invoice from 30 days ago
      expect(revenue.audit.totalRevenue).toBe(1000)
      expect(revenue.audit.invoiceCount).toBe(1)
    })

    it("should calculate total revenue across all sources", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 1000,
        paidAmount: 1000,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.total.totalRevenue).toBe(revenue.audit.totalRevenue + revenue.formation.totalRevenue)
      expect(revenue.total.paidRevenue).toBe(revenue.audit.paidRevenue + revenue.formation.paidRevenue)
      expect(revenue.total.unpaidRevenue).toBe(revenue.audit.unpaidRevenue + revenue.formation.unpaidRevenue)
    })

    it("should not include cancelled invoices", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.CANCELLED,
        totalAmount: 1000,
        paidAmount: 0,
      })

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 500,
        paidAmount: 500,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      // Should only count the paid invoice, not the cancelled one
      expect(revenue.audit.totalRevenue).toBe(500)
      expect(revenue.audit.invoiceCount).toBe(1)
    })
  })

  describe("getGlobalRevenue", () => {
    it("should return zero revenue when no invoices exist", async () => {
      const revenue = await ConsolidatedRevenueService.getGlobalRevenue()

      expect(revenue.audit.totalRevenue).toBe(0)
      expect(revenue.audit.paidRevenue).toBe(0)
      expect(revenue.audit.unpaidRevenue).toBe(0)
      expect(revenue.total.totalRevenue).toBe(0)
    })

    it("should aggregate revenue from multiple institutions", async () => {
      const user = await createMockUser()
      const institution1 = await createMockMedicalInstitution()
      const institution2 = await createMockMedicalInstitution()

      // Institution 1 invoices
      await createMockInvoice(institution1.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 1000,
        paidAmount: 1000,
      })

      // Institution 2 invoices
      await createMockInvoice(institution2.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 500,
        paidAmount: 500,
      })

      const revenue = await ConsolidatedRevenueService.getGlobalRevenue()

      expect(revenue.audit.totalRevenue).toBe(1500)
      expect(revenue.audit.paidRevenue).toBe(1500)
      expect(revenue.audit.invoiceCount).toBe(2)
    })

    it("should filter global revenue by date range", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      const now = new Date()
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000)

      // Recent invoice
      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 1000,
        paidAmount: 1000,
        issueDate: twentyDaysAgo,
      })

      // Older invoice
      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 500,
        paidAmount: 500,
        issueDate: fortyDaysAgo,
      })

      const revenue = await ConsolidatedRevenueService.getGlobalRevenue(
        new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Start: 30 days ago
        now // End: now
      )

      // Should only include the recent invoice
      expect(revenue.audit.totalRevenue).toBe(1000)
    })
  })

  describe("getTopInstitutionsByRevenue", () => {
    it("should return empty array when no institutions exist", async () => {
      const topInstitutions = await ConsolidatedRevenueService.getTopInstitutionsByRevenue(10)

      expect(topInstitutions).toHaveLength(0)
    })

    it("should rank institutions by total revenue", async () => {
      const user = await createMockUser()
      const institution1 = await createMockMedicalInstitution({ name: "High Revenue Hospital" })
      const institution2 = await createMockMedicalInstitution({ name: "Medium Revenue Clinic" })
      const institution3 = await createMockMedicalInstitution({ name: "Low Revenue Center" })

      // Institution 1: High revenue
      await createMockInvoice(institution1.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 5000,
        paidAmount: 5000,
      })

      // Institution 2: Medium revenue
      await createMockInvoice(institution2.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 3000,
        paidAmount: 3000,
      })

      // Institution 3: Low revenue
      await createMockInvoice(institution3.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 1000,
        paidAmount: 1000,
      })

      const topInstitutions = await ConsolidatedRevenueService.getTopInstitutionsByRevenue(3)

      expect(topInstitutions).toHaveLength(3)
      expect(topInstitutions[0].institution.name).toBe("High Revenue Hospital")
      expect(topInstitutions[0].revenue.audit.totalRevenue).toBe(5000)
      expect(topInstitutions[1].institution.name).toBe("Medium Revenue Clinic")
      expect(topInstitutions[1].revenue.audit.totalRevenue).toBe(3000)
      expect(topInstitutions[2].institution.name).toBe("Low Revenue Center")
      expect(topInstitutions[2].revenue.audit.totalRevenue).toBe(1000)
    })

    it("should respect limit parameter", async () => {
      const user = await createMockUser()

      // Create 5 institutions with revenue
      for (let i = 0; i < 5; i++) {
        const institution = await createMockMedicalInstitution()
        await createMockInvoice(institution.id, user.id, {
          status: InvoiceStatus.PAID,
          totalAmount: (5 - i) * 1000,
          paidAmount: (5 - i) * 1000,
        })
      }

      const topInstitutions = await ConsolidatedRevenueService.getTopInstitutionsByRevenue(3)

      expect(topInstitutions).toHaveLength(3)
    })

    it("should exclude institutions with zero revenue", async () => {
      const user = await createMockUser()
      const institutionWithRevenue = await createMockMedicalInstitution()
      const institutionWithoutRevenue = await createMockMedicalInstitution()

      await createMockInvoice(institutionWithRevenue.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 1000,
        paidAmount: 1000,
      })

      const topInstitutions = await ConsolidatedRevenueService.getTopInstitutionsByRevenue(10)

      // Should only include institution with revenue
      expect(topInstitutions).toHaveLength(1)
      expect(topInstitutions[0].institution.id).toBe(institutionWithRevenue.id)
    })
  })

  describe("Revenue Calculation Edge Cases", () => {
    it("should handle invoices with zero amounts", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 0,
        paidAmount: 0,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.audit.totalRevenue).toBe(0)
      expect(revenue.audit.paidRevenue).toBe(0)
      expect(revenue.audit.invoiceCount).toBe(1)
    })

    it("should handle large revenue amounts", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 999999.99,
        paidAmount: 999999.99,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.audit.totalRevenue).toBe(999999.99)
      expect(revenue.audit.paidRevenue).toBe(999999.99)
    })

    it("should handle decimal amounts correctly", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 123.45,
        paidAmount: 123.45,
      })

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.PAID,
        totalAmount: 67.89,
        paidAmount: 67.89,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.audit.totalRevenue).toBeCloseTo(191.34, 2)
      expect(revenue.audit.paidRevenue).toBeCloseTo(191.34, 2)
    })

    it("should handle institutions with only draft invoices", async () => {
      const user = await createMockUser()
      const institution = await createMockMedicalInstitution()

      await createMockInvoice(institution.id, user.id, {
        status: InvoiceStatus.DRAFT,
        totalAmount: 1000,
        paidAmount: 0,
      })

      const revenue = await ConsolidatedRevenueService.getInstitutionRevenue(institution.id)

      expect(revenue.audit.totalRevenue).toBe(1000)
      expect(revenue.audit.paidRevenue).toBe(0)
      expect(revenue.audit.unpaidRevenue).toBe(1000)
    })
  })
})
