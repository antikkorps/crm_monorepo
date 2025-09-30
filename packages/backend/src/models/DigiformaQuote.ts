import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { MedicalInstitution } from './MedicalInstitution'
import { DigiformaCompany } from './DigiformaCompany'

export enum DigiformaQuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CONVERTED = 'converted', // Converted to invoice
}

interface DigiformaQuoteAttributes {
  id: string
  digiformaId: string
  digiformaCompanyId?: string
  institutionId?: string // Linked institution
  quoteNumber?: string
  status: DigiformaQuoteStatus
  totalAmount: number
  currency: string
  validUntil?: Date
  createdDate: Date
  acceptedDate?: Date
  rejectedDate?: Date
  convertedDate?: Date
  lastSyncAt: Date
  metadata?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

interface DigiformaQuoteCreationAttributes
  extends Optional<
    DigiformaQuoteAttributes,
    'id' | 'digiformaCompanyId' | 'institutionId' | 'quoteNumber' | 'validUntil' | 'acceptedDate' | 'rejectedDate' | 'convertedDate' | 'metadata' | 'createdAt' | 'updatedAt'
  > {}

export class DigiformaQuote
  extends Model<DigiformaQuoteAttributes, DigiformaQuoteCreationAttributes>
  implements DigiformaQuoteAttributes
{
  declare id: string
  declare digiformaId: string
  declare digiformaCompanyId?: string
  declare institutionId?: string
  declare quoteNumber?: string
  declare status: DigiformaQuoteStatus
  declare totalAmount: number
  declare currency: string
  declare validUntil?: Date
  declare createdDate: Date
  declare acceptedDate?: Date
  declare rejectedDate?: Date
  declare convertedDate?: Date
  declare lastSyncAt: Date
  declare metadata?: Record<string, any>
  declare readonly createdAt?: Date
  declare readonly updatedAt?: Date

  // Associations
  declare institution?: MedicalInstitution
  declare digiformaCompany?: DigiformaCompany

  /**
   * Find quote by Digiforma ID
   */
  static async findByDigiformaId(digiformaId: string): Promise<DigiformaQuote | null> {
    return await DigiformaQuote.findOne({
      where: { digiformaId },
      include: [
        { model: MedicalInstitution, as: 'institution' },
        { model: DigiformaCompany, as: 'digiformaCompany' },
      ],
    })
  }

  /**
   * Get quotes by institution
   */
  static async getByInstitution(institutionId: string): Promise<DigiformaQuote[]> {
    return await DigiformaQuote.findAll({
      where: { institutionId },
      order: [['createdDate', 'DESC']],
    })
  }

  /**
   * Get total quotes amount by institution and period
   */
  static async getTotalByInstitution(
    institutionId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ totalAmount: number; count: number }> {
    const where: any = { institutionId }

    if (startDate || endDate) {
      where.createdDate = {}
      if (startDate) where.createdDate.$gte = startDate
      if (endDate) where.createdDate.$lte = endDate
    }

    const quotes = await DigiformaQuote.findAll({ where })

    return {
      totalAmount: quotes.reduce((sum, q) => sum + q.totalAmount, 0),
      count: quotes.length,
    }
  }

  /**
   * Get quotes statistics by status
   */
  static async getStatsByStatus(institutionId?: string): Promise<Record<string, { count: number; totalAmount: number }>> {
    const where: any = {}
    if (institutionId) where.institutionId = institutionId

    const quotes = await DigiformaQuote.findAll({ where })

    const stats: Record<string, { count: number; totalAmount: number }> = {}

    for (const status of Object.values(DigiformaQuoteStatus)) {
      stats[status] = { count: 0, totalAmount: 0 }
    }

    quotes.forEach((quote) => {
      stats[quote.status].count++
      stats[quote.status].totalAmount += quote.totalAmount
    })

    return stats
  }
}

DigiformaQuote.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    digiformaId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Digiforma quote ID',
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
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'medical_institutions',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    quoteNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(DigiformaQuoteStatus)),
      allowNull: false,
      defaultValue: DigiformaQuoteStatus.DRAFT,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'EUR',
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    acceptedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    convertedDate: {
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
    tableName: 'digiforma_quotes',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['digiforma_id'], unique: true },
      { fields: ['digiforma_company_id'] },
      { fields: ['institution_id'] },
      { fields: ['status'] },
      { fields: ['created_date'] },
    ],
  }
)

// Define associations
DigiformaQuote.belongsTo(MedicalInstitution, {
  foreignKey: 'institutionId',
  as: 'institution',
})

DigiformaQuote.belongsTo(DigiformaCompany, {
  foreignKey: 'digiformaCompanyId',
  as: 'digiformaCompany',
})
