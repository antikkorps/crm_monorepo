import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'
import { MedicalInstitution } from './MedicalInstitution'
import { DigiformaCompany } from './DigiformaCompany'

/**
 * Match type for institution mapping
 * - auto: Automatically matched by accountingNumber/SIRET/email (100% confidence)
 * - fuzzy: Fuzzy matched by name similarity (< 100% confidence)
 * - manual: Manually confirmed by admin
 */
export enum MatchType {
  AUTO = 'auto',
  FUZZY = 'fuzzy',
  MANUAL = 'manual'
}

interface DigiformaInstitutionMappingAttributes {
  id: string
  digiformaCompanyId: string // FK to digiforma_companies
  institutionId: string // FK to medical_institutions
  matchType: MatchType
  matchScore: number // Confidence score 0-100
  matchCriteria?: string // What criteria was used (accountingNumber, siret, email, fuzzy_name_city, etc.)
  confirmedBy?: string // User ID who confirmed the mapping
  confirmedAt?: Date
  notes?: string // Admin notes
  createdAt?: Date
  updatedAt?: Date
}

interface DigiformaInstitutionMappingCreationAttributes
  extends Optional<DigiformaInstitutionMappingAttributes, 'id' | 'matchCriteria' | 'confirmedBy' | 'confirmedAt' | 'notes' | 'createdAt' | 'updatedAt'> {}

export class DigiformaInstitutionMapping
  extends Model<DigiformaInstitutionMappingAttributes, DigiformaInstitutionMappingCreationAttributes>
  implements DigiformaInstitutionMappingAttributes
{
  declare id: string
  declare digiformaCompanyId: string
  declare institutionId: string
  declare matchType: MatchType
  declare matchScore: number
  declare matchCriteria?: string
  declare confirmedBy?: string
  declare confirmedAt?: Date
  declare notes?: string
  declare readonly createdAt?: Date
  declare readonly updatedAt?: Date

  // Associations
  declare digiformaCompany?: DigiformaCompany
  declare institution?: MedicalInstitution

  /**
   * Find mapping by Digiforma company ID
   */
  static async findByDigiformaCompanyId(digiformaCompanyId: string): Promise<DigiformaInstitutionMapping | null> {
    return await DigiformaInstitutionMapping.findOne({
      where: { digiformaCompanyId },
      include: [
        { model: DigiformaCompany, as: 'digiformaCompany' },
        { model: MedicalInstitution, as: 'institution' }
      ]
    })
  }

  /**
   * Find mapping by institution ID
   */
  static async findByInstitutionId(institutionId: string): Promise<DigiformaInstitutionMapping | null> {
    return await DigiformaInstitutionMapping.findOne({
      where: { institutionId },
      include: [
        { model: DigiformaCompany, as: 'digiformaCompany' },
        { model: MedicalInstitution, as: 'institution' }
      ]
    })
  }

  /**
   * Get all fuzzy matches (need review)
   */
  static async getFuzzyMatches(): Promise<DigiformaInstitutionMapping[]> {
    return await DigiformaInstitutionMapping.findAll({
      where: { matchType: MatchType.FUZZY },
      include: [
        { model: DigiformaCompany, as: 'digiformaCompany' },
        { model: MedicalInstitution, as: 'institution' }
      ],
      order: [['matchScore', 'DESC']]
    })
  }

  /**
   * Create or update manual mapping
   */
  static async createManualMapping(
    digiformaCompanyId: string,
    institutionId: string,
    confirmedBy: string,
    notes?: string
  ): Promise<DigiformaInstitutionMapping> {
    // Check if mapping already exists
    const existing = await DigiformaInstitutionMapping.findOne({
      where: { digiformaCompanyId }
    })

    if (existing) {
      // Update existing mapping
      return await existing.update({
        institutionId,
        matchType: MatchType.MANUAL,
        matchScore: 100,
        matchCriteria: 'manual',
        confirmedBy,
        confirmedAt: new Date(),
        notes
      })
    } else {
      // Create new mapping
      return await DigiformaInstitutionMapping.create({
        digiformaCompanyId,
        institutionId,
        matchType: MatchType.MANUAL,
        matchScore: 100,
        matchCriteria: 'manual',
        confirmedBy,
        confirmedAt: new Date(),
        notes
      })
    }
  }

  /**
   * Confirm a fuzzy match
   */
  async confirm(userId: string): Promise<void> {
    await this.update({
      confirmedBy: userId,
      confirmedAt: new Date()
    })
  }
}

DigiformaInstitutionMapping.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    digiformaCompanyId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'digiforma_companies',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Digiforma company linked to this mapping'
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'medical_institutions',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'CRM institution linked to this mapping'
    },
    matchType: {
      type: DataTypes.ENUM(...Object.values(MatchType)),
      allowNull: false,
      defaultValue: MatchType.MANUAL,
      comment: 'How this mapping was created'
    },
    matchScore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Confidence score 0-100'
    },
    matchCriteria: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Criteria used for matching (accountingNumber, siret, email, fuzzy_name_city, manual)'
    },
    confirmedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL',
      comment: 'User who confirmed this mapping'
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this mapping was confirmed'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Admin notes about this mapping'
    }
  },
  {
    sequelize,
    tableName: 'digiforma_institution_mappings',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['digiforma_company_id'], unique: true },
      { fields: ['institution_id'] },
      { fields: ['match_type'] },
      { fields: ['match_score'] }
    ]
  }
)

// Note: Associations are defined in models/index.ts to avoid circular dependencies
