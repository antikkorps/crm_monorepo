import type { MedicalInstitution } from "./medical-institution"
import type { ContactPerson } from "./common"
import type { User } from "./user"

/**
 * Opportunity Stage Enum
 */
export enum OpportunityStage {
  PROSPECTING = "prospecting",
  QUALIFICATION = "qualification",
  PROPOSAL = "proposal",
  NEGOTIATION = "negotiation",
  CLOSED_WON = "closed_won",
  CLOSED_LOST = "closed_lost",
}

/**
 * Opportunity Status
 */
export enum OpportunityStatus {
  ACTIVE = "active",
  WON = "won",
  LOST = "lost",
  ABANDONED = "abandoned",
}

/**
 * Product Line
 */
export interface ProductLine {
  name: string
  description?: string
  quantity: number
  unitPrice: number
  discount?: number
  total: number
}

/**
 * Opportunity (Sales Deal)
 */
export interface Opportunity {
  id: string
  institutionId: string
  contactPersonId?: string | null
  assignedUserId: string
  name: string
  description?: string | null
  stage: OpportunityStage
  status: OpportunityStatus
  value: number
  probability: number
  expectedCloseDate: Date | string
  actualCloseDate?: Date | string | null
  products?: ProductLine[] | null
  competitors?: string[] | null
  wonReason?: string | null
  lostReason?: string | null
  tags?: string[] | null
  notes?: string | null
  source?: string | null
  createdAt: Date | string
  updatedAt: Date | string
  deletedAt?: Date | string | null

  // Populated relations
  institution?: MedicalInstitution
  contactPerson?: ContactPerson | null
  assignedUser?: User
}

/**
 * Opportunity Create Request
 */
export interface OpportunityCreateRequest {
  institutionId: string
  contactPersonId?: string | null
  assignedUserId: string
  name: string
  description?: string
  stage?: OpportunityStage
  value: number
  probability?: number
  expectedCloseDate: Date | string
  products?: ProductLine[]
  competitors?: string[]
  tags?: string[]
  notes?: string
  source?: string
}

/**
 * Opportunity Update Request
 */
export interface OpportunityUpdateRequest {
  contactPersonId?: string | null
  assignedUserId?: string
  name?: string
  description?: string
  stage?: OpportunityStage
  value?: number
  probability?: number
  expectedCloseDate?: Date | string
  products?: ProductLine[]
  competitors?: string[]
  wonReason?: string
  lostReason?: string
  tags?: string[]
  notes?: string
  source?: string
}

/**
 * Pipeline Stage Data
 */
export interface PipelineStage {
  stage: OpportunityStage
  count: number
  totalValue: number
  weightedValue: number
  opportunities: Opportunity[]
}

/**
 * Forecast Summary
 */
export interface ForecastSummary {
  totalOpportunities: number
  totalValue: number
  weightedValue: number
  forecastPeriod: string
}

/**
 * Monthly Forecast
 */
export interface MonthlyForecast {
  month: string
  count: number
  totalValue: number
  weightedValue: number
  opportunities: Opportunity[]
}

/**
 * Forecast Response
 */
export interface ForecastResponse {
  summary: ForecastSummary
  monthlyForecast: MonthlyForecast[]
}
