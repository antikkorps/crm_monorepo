import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { MedicalInstitution } from './MedicalInstitution'
import { DigiformaCompany } from './DigiformaCompany'
import { DigiformaQuote } from './DigiformaQuote'

export enum DigiformaInvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

interface DigiformaInvoiceAttributes {
  id: string
  digiformaId: string
  digiformaCompanyId?: string
  digiformaQuoteId?: string // Link to quote if converted
  institutionId?: string // Linked institution
  invoiceNumber?: string
  status: DigiformaInvoiceStatus
  totalAmount: number
  paidAmount: number
  currency: string
  issueDate: Date
  dueDate?: Date
  paidDate?: Date
  lastSyncAt: Date
  metadata?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

interface DigiformaInvoiceCreationAttributes
  extends Optional<
    DigiformaInvoiceAttributes,
    | 'id'
    | 'digiformaCompanyId'
    | 'digiformaQuoteId'
    | 'institutionId'
    | 'invoiceNumber'
    | 'paidAmount'
    | 'dueDate'
    | 'paidDate'
    | 'metadata'
    | 'createdAt'
    | 'updatedAt'
  > {}

export class DigiformaInvoice
  extends Model<DigiformaInvoiceAttributes, DigiformaInvoiceCreationAttributes>
  implements DigiformaInvoiceAttributes
{
  declare id: string
  declare digiformaId: string
  declare digiformaCompanyId?: string
  declare digiformaQuoteId?: string
  declare institutionId?: string
  declare invoiceNumber?: string
  declare status: DigiformaInvoiceStatus
  declare totalAmount: number
  declare paidAmount: number
  declare currency: string
  declare issueDate: Date
  declare dueDate?: Date
  declare paidDate?: Date
  declare lastSyncAt: Date
  declare metadata?: Record<string, any>
  declare readonly createdAt?: Date
  declare readonly updatedAt?: Date

  // Associations
  declare institution?: MedicalInstitution
  declare digiformaCompany?: DigiformaCompany
  declare digiformaQuote?: DigiformaQuote

  /**
   * Find invoice by Digiforma ID
   */
  static async findByDigiformaId(digiformaId: string): Promise<DigiformaInvoice | null> {
    return await DigiformaInvoice.findOne({
      where: { digiformaId },
      include: [
        { model: MedicalInstitution, as: 'institution' },
        { model: DigiformaCompany, as: 'digiformaCompany' },
        { model: DigiformaQuote, as: 'digiformaQuote' },
      ],
    })
  }

  /**
   * Get invoices by institution
   */
  static async getByInstitution(institutionId: string): Promise<DigiformaInvoice[]> {
    return await DigiformaInvoice.findAll({
      where: { institutionId },
      order: [['issueDate', 'DESC']],
    })
  }

  /**
   * Get total revenue (CA Formation) by institution and period
   */
  static async getRevenueByInstitution(
    institutionId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ totalRevenue: number; paidRevenue: number; unpaidRevenue: number; invoiceCount: number }> {
    const where: any = { institutionId }

    if (startDate || endDate) {
      where.issueDate = {}
      if (startDate) where.issueDate.$gte = startDate
      if (endDate) where.issueDate.$lte = endDate
    }

    const invoices = await DigiformaInvoice.findAll({ where })

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const paidRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)

    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue: totalRevenue - paidRevenue,
      invoiceCount: invoices.length,
    }
  }

  /**
   * Get global Digiforma revenue (all institutions)
   */
  static async getGlobalRevenue(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number
    paidRevenue: number
    unpaidRevenue: number
    invoiceCount: number
  }> {
    const where: any = {}

    if (startDate || endDate) {
      where.issueDate = {}
      if (startDate) where.issueDate.$gte = startDate
      if (endDate) where.issueDate.$lte = endDate
    }

    const invoices = await DigiformaInvoice.findAll({ where })

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
    const paidRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)

    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue: totalRevenue - paidRevenue,
      invoiceCount: invoices.length,
    }
  }

  /**
   * Get revenue statistics by status
   */
  static async getStatsByStatus(institutionId?: string): Promise<Record<string, { count: number; totalAmount: number; paidAmount: number }>> {
    const where: any = {}
    if (institutionId) where.institutionId = institutionId

    const invoices = await DigiformaInvoice.findAll({ where })

    const stats: Record<string, { count: number; totalAmount: number; paidAmount: number }> = {}

    for (const status of Object.values(DigiformaInvoiceStatus)) {
      stats[status] = { count: 0, totalAmount: 0, paidAmount: 0 }
    }

    invoices.forEach((invoice) => {
      stats[invoice.status].count++
      stats[invoice.status].totalAmount += invoice.totalAmount
      stats[invoice.status].paidAmount += invoice.paidAmount
    })

    return stats
  }
}

DigiformaInvoice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    digiformaId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Digiforma invoice ID',
    },
    digiformaCompanyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'digiforma_companies',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    digiformaQuoteId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'digiforma_quotes',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'medical_institutions',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(DigiformaInvoiceStatus)),
      allowNull: false,
      defaultValue: DigiformaInvoiceStatus.DRAFT,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'EUR',
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    paidDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'digiforma_invoices',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['digiforma_id'], unique: true },
      { fields: ['digiforma_company_id'] },
      { fields: ['digiforma_quote_id'] },
      { fields: ['institution_id'] },
      { fields: ['status'] },
      { fields: ['issue_date'] },
    ],
  }
)

// Define associations
DigiformaInvoice.belongsTo(MedicalInstitution, {
  foreignKey: 'institutionId',
  as: 'institution',
})

DigiformaInvoice.belongsTo(DigiformaCompany, {
  foreignKey: 'digiformaCompanyId',
  as: 'digiformaCompany',
})

DigiformaInvoice.belongsTo(DigiformaQuote, {
  foreignKey: 'digiformaQuoteId',
  as: 'digiformaQuote',
})
