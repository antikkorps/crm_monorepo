import { DataTypes, Model, Optional, Op } from 'sequelize'
import { sequelize } from '../config/database'
import { MedicalInstitution } from './MedicalInstitution'

interface DigiformaCompanyAttributes {
  id: string
  digiformaId: string
  institutionId?: string // Linked MedicalInstitution
  name: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  siret?: string
  website?: string
  lastSyncAt: Date
  metadata?: Record<string, any> // Store any additional Digiforma data
  createdAt?: Date
  updatedAt?: Date
}

interface DigiformaCompanyCreationAttributes
  extends Optional<DigiformaCompanyAttributes, 'id' | 'institutionId' | 'email' | 'phone' | 'address' | 'siret' | 'website' | 'metadata' | 'createdAt' | 'updatedAt'> {}

export class DigiformaCompany
  extends Model<DigiformaCompanyAttributes, DigiformaCompanyCreationAttributes>
  implements DigiformaCompanyAttributes
{
  declare id: string
  declare digiformaId: string
  declare institutionId?: string
  declare name: string
  declare email?: string
  declare phone?: string
  declare address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  declare siret?: string
  declare website?: string
  declare lastSyncAt: Date
  declare metadata?: Record<string, any>
  declare readonly createdAt?: Date
  declare readonly updatedAt?: Date

  // Association
  declare institution?: MedicalInstitution

  /**
   * Find company by Digiforma ID
   */
  static async findByDigiformaId(digiformaId: string): Promise<DigiformaCompany | null> {
    return await DigiformaCompany.findOne({
      where: { digiformaId },
      include: [{ model: MedicalInstitution, as: 'institution' }],
    })
  }

  /**
   * Find unlinked companies (not yet merged with institutions)
   */
  static async findUnlinked(limit?: number): Promise<DigiformaCompany[]> {
    const options: any = {
      where: { institutionId: { [Op.is]: null } as any },
      order: [['lastSyncAt', 'DESC']],
    }

    // Only add limit if explicitly provided
    if (limit) {
      options.limit = limit
    }

    return await DigiformaCompany.findAll(options)
  }

  /**
   * Link to a medical institution
   */
  async linkToInstitution(institutionId: string): Promise<void> {
    await this.update({ institutionId })
  }

  /**
   * Get all companies for an institution
   */
  static async getByInstitution(institutionId: string): Promise<DigiformaCompany[]> {
    return await DigiformaCompany.findAll({
      where: { institutionId },
      order: [['lastSyncAt', 'DESC']],
    })
  }
}

DigiformaCompany.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    digiformaId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Digiforma company ID',
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    siret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING,
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
      comment: 'Additional Digiforma data',
    },
  },
  {
    sequelize,
    tableName: 'digiforma_companies',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['digiforma_id'], unique: true },
      { fields: ['institution_id'] },
      { fields: ['email'] },
    ],
  }
)

// Note: Associations are defined in models/index.ts to avoid circular dependencies
