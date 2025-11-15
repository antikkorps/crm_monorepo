import { DataTypes, Model, Optional, Op } from 'sequelize'
import { sequelize } from '../config/database'
import { ContactPerson } from './ContactPerson'
import { DigiformaCompany } from './DigiformaCompany'

interface DigiformaContactAttributes {
  id: string
  digiformaId: string
  digiformaCompanyId?: string // Link to DigiformaCompany
  contactPersonId?: string // Linked ContactPerson in CRM
  firstName: string
  lastName: string
  email?: string
  phone?: string
  role?: string
  lastSyncAt: Date
  metadata?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

interface DigiformaContactCreationAttributes
  extends Optional<DigiformaContactAttributes, 'id' | 'digiformaCompanyId' | 'contactPersonId' | 'email' | 'phone' | 'role' | 'metadata' | 'createdAt' | 'updatedAt'> {}

export class DigiformaContact
  extends Model<DigiformaContactAttributes, DigiformaContactCreationAttributes>
  implements DigiformaContactAttributes
{
  declare id: string
  declare digiformaId: string
  declare digiformaCompanyId?: string
  declare contactPersonId?: string
  declare firstName: string
  declare lastName: string
  declare email?: string
  declare phone?: string
  declare role?: string
  declare lastSyncAt: Date
  declare metadata?: Record<string, any>
  declare readonly createdAt?: Date
  declare readonly updatedAt?: Date

  // Associations
  declare contactPerson?: ContactPerson
  declare digiformaCompany?: DigiformaCompany

  /**
   * Find contact by Digiforma ID
   */
  static async findByDigiformaId(digiformaId: string): Promise<DigiformaContact | null> {
    return await DigiformaContact.findOne({
      where: { digiformaId },
      include: [
        { model: ContactPerson, as: 'contactPerson' },
        { model: DigiformaCompany, as: 'digiformaCompany' },
      ],
    })
  }

  /**
   * Find unlinked contacts
   */
  static async findUnlinked(limit = 50): Promise<DigiformaContact[]> {
    return await DigiformaContact.findAll({
      where: { contactPersonId: { [Op.is]: null } as any },
      limit,
      order: [['lastSyncAt', 'DESC']],
    })
  }

  /**
   * Link to a contact person
   */
  async linkToContactPerson(contactPersonId: string): Promise<void> {
    await this.update({ contactPersonId })
  }

  /**
   * Get contacts by company
   */
  static async getByCompany(digiformaCompanyId: string): Promise<DigiformaContact[]> {
    return await DigiformaContact.findAll({
      where: { digiformaCompanyId },
      order: [['lastName', 'ASC']],
    })
  }
}

DigiformaContact.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    digiformaId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Digiforma contact ID',
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
    contactPersonId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'contact_persons',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
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
    role: {
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
    },
  },
  {
    sequelize,
    tableName: 'digiforma_contacts',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['digiforma_id'], unique: true },
      { fields: ['digiforma_company_id'] },
      { fields: ['contact_person_id'] },
      { fields: ['email'] },
    ],
  }
)

// Note: Associations are defined in models/index.ts to avoid circular dependencies
