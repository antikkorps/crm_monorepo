import { InvoiceStatus, PaymentMethod, PaymentStatus } from "@medical-crm/shared"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Invoice } from "../../models/Invoice"
import { Payment } from "../../models/Payment"
import { BillingAnalyticsService } from "../../services/BillingAnalyticsService"

// Mock the models
vi.mock("../../models/Invoice")
vi.mock("../../models/Payment")
vi.mock("../../models/MedicalInstitution")
vi.mock("../../config/database", () => ({
  sequelize: {
    query: vi.fn(),
    models: {
      InvoiceLine: {},
      Payment: {},
      MedicalProfile: {},
    },
  },
}))

describe("BillingAnalyticsService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getRevenueAnalytics", () => {
    it("should calculate revenue analytics correctly", async () => {
      // Mock invoice data
      const mockInvoices = [
        {
          id: "1",
          total: 1000,
          status: InvoiceStatus.PAID,
          remainingAmount: 0,
          createdAt: new Date(),
        },
        {
          id: "2",
          total: 500,
          status: InvoiceStatus.SENT,
          remainingAmount: 500,
          createdAt: new Date(),
        },
        {
          id: "3",
          total: 750,
          status: InvoiceStatus.OVERDUE,
          remainingAmount: 750,
          createdAt: new Date(),
        },
      ]

      // Mock Invoice.findAll
      vi.mocked(Invoice.findAll).mockResolvedValue(mockInvoices as any)

      // Mock other methods
      vi.spyOn(BillingAnalyticsService as any, "getMonthlyRevenue").mockResolvedValue([])
      vi.spyOn(BillingAnalyticsService as any, "getRevenueByStatus").mockResolvedValue([])
      vi.spyOn(
        BillingAnalyticsService as any,
        "calculateAveragePaymentTime"
      ).mockResolvedValue(15)

      const result = await BillingAnalyticsService.getRevenueAnalytics()

      expect(result.totalRevenue).toBe(2250) // 1000 + 500 + 750
      expect(result.paidRevenue).toBe(1000) // Only paid invoice
      expect(result.pendingRevenue).toBe(500) // Sent invoice remaining amount
      expect(result.overdueRevenue).toBe(750) // Overdue invoice remaining amount
      expect(result.averageInvoiceValue).toBe(750) // 2250 / 3
      expect(result.averagePaymentTime).toBe(15)
    })

    it("should handle empty invoice data", async () => {
      vi.mocked(Invoice.findAll).mockResolvedValue([])
      vi.spyOn(BillingAnalyticsService as any, "getMonthlyRevenue").mockResolvedValue([])
      vi.spyOn(BillingAnalyticsService as any, "getRevenueByStatus").mockResolvedValue([])
      vi.spyOn(
        BillingAnalyticsService as any,
        "calculateAveragePaymentTime"
      ).mockResolvedValue(0)

      const result = await BillingAnalyticsService.getRevenueAnalytics()

      expect(result.totalRevenue).toBe(0)
      expect(result.paidRevenue).toBe(0)
      expect(result.pendingRevenue).toBe(0)
      expect(result.overdueRevenue).toBe(0)
      expect(result.averageInvoiceValue).toBe(0)
    })
  })

  describe("getPaymentAnalytics", () => {
    it("should calculate payment analytics correctly", async () => {
      const mockPayments = [
        {
          id: "1",
          amount: 500,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          status: PaymentStatus.CONFIRMED,
        },
        {
          id: "2",
          amount: 300,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          status: PaymentStatus.CONFIRMED,
        },
      ]

      vi.mocked(Payment.findAll).mockResolvedValue(mockPayments as any)
      vi.spyOn(BillingAnalyticsService as any, "getPaymentsByMethod").mockReturnValue([
        {
          method: PaymentMethod.BANK_TRANSFER,
          amount: 500,
          count: 1,
          percentage: 62.5,
          averageAmount: 500,
        },
        {
          method: PaymentMethod.CREDIT_CARD,
          amount: 300,
          count: 1,
          percentage: 37.5,
          averageAmount: 300,
        },
      ])
      vi.spyOn(BillingAnalyticsService as any, "getPaymentsByStatus").mockResolvedValue(
        []
      )
      vi.spyOn(BillingAnalyticsService as any, "getPaymentTrends").mockResolvedValue([])
      vi.spyOn(
        BillingAnalyticsService as any,
        "getPartialPaymentStats"
      ).mockResolvedValue({
        invoicesWithPartialPayments: 0,
        averagePartialPaymentRatio: 0,
        totalPartiallyPaidAmount: 0,
        averageTimeToFullPayment: 0,
      })

      const result = await BillingAnalyticsService.getPaymentAnalytics()

      expect(result.totalPayments).toBe(800) // 500 + 300
      expect(result.averagePaymentAmount).toBe(400) // 800 / 2
      expect(result.paymentsByMethod).toHaveLength(2)
      expect(result.paymentsByMethod[0].method).toBe(PaymentMethod.BANK_TRANSFER)
      expect(result.paymentsByMethod[0].amount).toBe(500)
    })
  })

  describe("getOutstandingInvoiceAnalytics", () => {
    it("should calculate outstanding invoice analytics correctly", async () => {
      const mockOutstandingInvoices = [
        {
          id: "1",
          status: InvoiceStatus.OVERDUE,
          remainingAmount: 1000,
          institution: { id: "inst1", name: "Hospital A", type: "hospital" },
          getDaysOverdue: () => 30,
        },
        {
          id: "2",
          status: InvoiceStatus.PARTIALLY_PAID,
          remainingAmount: 500,
          institution: { id: "inst2", name: "Clinic B", type: "clinic" },
          getDaysOverdue: () => 0,
        },
      ]

      vi.mocked(Invoice.findAll).mockResolvedValue(mockOutstandingInvoices as any)
      vi.spyOn(BillingAnalyticsService as any, "calculateAgingBuckets").mockReturnValue([
        { label: "Current (0-30 days)", daysMin: 0, daysMax: 30, amount: 500, count: 1 },
        { label: "31-60 days", daysMin: 31, daysMax: 60, amount: 1000, count: 1 },
      ])

      const result = await BillingAnalyticsService.getOutstandingInvoiceAnalytics()

      expect(result.totalOutstanding).toBe(1500) // 1000 + 500
      expect(result.overdueAmount).toBe(1000) // Only overdue invoice
      expect(result.overdueCount).toBe(1)
      expect(result.partiallyPaidAmount).toBe(500) // Only partially paid invoice
      expect(result.partiallyPaidCount).toBe(1)
      expect(result.agingBuckets).toHaveLength(2)
    })
  })

  describe("getBillingDashboardData", () => {
    it("should return comprehensive dashboard data", async () => {
      // Mock all the individual analytics methods
      const mockRevenueAnalytics = {
        totalRevenue: 10000,
        paidRevenue: 8000,
        pendingRevenue: 1500,
        overdueRevenue: 500,
        monthlyRevenue: [],
        revenueByStatus: [],
        averageInvoiceValue: 1000,
        averagePaymentTime: 15,
      }

      const mockPaymentAnalytics = {
        totalPayments: 8000,
        paymentsByMethod: [],
        paymentsByStatus: [],
        averagePaymentAmount: 800,
        paymentTrends: [],
        partialPaymentStats: {
          invoicesWithPartialPayments: 2,
          averagePartialPaymentRatio: 0.6,
          totalPartiallyPaidAmount: 1200,
          averageTimeToFullPayment: 20,
        },
      }

      const mockOutstandingAnalytics = {
        totalOutstanding: 2000,
        overdueAmount: 500,
        overdueCount: 1,
        partiallyPaidAmount: 1500,
        partiallyPaidCount: 2,
        agingBuckets: [],
        topOverdueInvoices: [],
      }

      const mockSegmentAnalytics = [
        {
          segmentName: "Hospital",
          totalRevenue: 7000,
          invoiceCount: 7,
          averageInvoiceValue: 1000,
          paymentRate: 85,
          institutions: [],
        },
      ]

      const mockCashFlowProjections = [
        {
          projectionDate: new Date(),
          expectedInflow: 2000,
          confirmedInflow: 0,
          pendingInflow: 1500,
          overdueInflow: 500,
          projectionDetails: [],
        },
      ]

      const mockKPIs = {
        totalActiveInvoices: 5,
        averageCollectionTime: 25,
        collectionRate: 80,
        overdueRate: 10,
        monthlyGrowthRate: 5,
        customerPaymentScore: 75,
      }

      vi.spyOn(BillingAnalyticsService, "getRevenueAnalytics").mockResolvedValue(
        mockRevenueAnalytics
      )
      vi.spyOn(BillingAnalyticsService, "getPaymentAnalytics").mockResolvedValue(
        mockPaymentAnalytics
      )
      vi.spyOn(
        BillingAnalyticsService,
        "getOutstandingInvoiceAnalytics"
      ).mockResolvedValue(mockOutstandingAnalytics)
      vi.spyOn(
        BillingAnalyticsService,
        "getMedicalInstitutionSegmentAnalytics"
      ).mockResolvedValue(mockSegmentAnalytics)
      vi.spyOn(BillingAnalyticsService, "getCashFlowProjections").mockResolvedValue(
        mockCashFlowProjections
      )
      vi.spyOn(BillingAnalyticsService as any, "calculateBillingKPIs").mockResolvedValue(
        mockKPIs
      )

      const result = await BillingAnalyticsService.getBillingDashboardData()

      expect(result.revenueAnalytics).toEqual(mockRevenueAnalytics)
      expect(result.paymentAnalytics).toEqual(mockPaymentAnalytics)
      expect(result.outstandingAnalytics).toEqual(mockOutstandingAnalytics)
      expect(result.segmentAnalytics).toEqual(mockSegmentAnalytics)
      expect(result.cashFlowProjections).toEqual(mockCashFlowProjections)
      expect(result.kpis).toEqual(mockKPIs)
    })
  })
})
