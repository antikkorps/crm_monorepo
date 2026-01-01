import { DataTypes, Model, Op, Optional, InstanceUpdateOptions, CreateOptions } from "sequelize"
import { sequelize } from "../config/database"
import type { MedicalInstitution } from "./MedicalInstitution"
import { logger } from "../utils/logger"

/**
 * Extended options for sync operations to prevent auto-lock
 */
interface SyncOptions {
  context?: { isSync: boolean }
}

export type DataSource = 'crm' | 'digiforma' | 'sage' | 'import'

export interface ExternalData {
  digiforma?: {
    id: string
    firstname?: string
    lastname?: string
    phone?: string
    position?: string
    title?: string
    lastSync: Date
  }
  sage?: {
    id: string
    accountingCode?: string
    creditLimit?: number
    lastSync: Date
  }
  import?: {
    source_file: string
    import_date: Date
    import_user_id: string
    original_data: Record<string, any>
  }
}

export interface LastSyncAt {
  digiforma?: Date
  sage?: Date
  import?: Date
}

export interface ContactPersonAttributes {
  id: string
  institutionId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  title?: string
  department?: string
  isPrimary: boolean
  isActive: boolean

  // Multi-source tracking
  dataSource: DataSource
  isLocked: boolean
  lockedAt?: Date
  lockedReason?: string
  externalData: ExternalData
  lastSyncAt: LastSyncAt

  createdAt: Date
  updatedAt: Date
}

export interface ContactPersonCreationAttributes
  extends Optional<
    ContactPersonAttributes,
    "id" | "createdAt" | "updatedAt" | "isActive" | "dataSource" | "isLocked" | "externalData" | "lastSyncAt"
  > {}

export class ContactPerson
  extends Model<ContactPersonAttributes, ContactPersonCreationAttributes>
  implements ContactPersonAttributes
{
  declare id: string
  declare institutionId: string
  declare firstName: string
  declare lastName: string
  declare email: string
  declare phone?: string
  declare title?: string
  declare department?: string
  declare isPrimary: boolean
  declare isActive: boolean

  // Multi-source tracking
  declare dataSource: DataSource
  declare isLocked: boolean
  declare lockedAt?: Date
  declare lockedReason?: string
  declare externalData: ExternalData
  declare lastSyncAt: LastSyncAt

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  public institution?: MedicalInstitution

  // Instance methods
  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  public getDisplayTitle(): string {
    if (this.title && this.department) {
      return `${this.title}, ${this.department}`
    }
    return this.title || this.department || "Contact Person"
  }

  public override toJSON(): Partial<ContactPersonAttributes> {
    const values = { ...this.get() } as ContactPersonAttributes
    return {
      ...values,
      fullName: this.getFullName(),
      displayTitle: this.getDisplayTitle(),
    } as any
  }

  // Static methods
  public static async findByInstitution(institutionId: string): Promise<ContactPerson[]> {
    return this.findAll({
      where: {
        institutionId,
        isActive: true,
      },
      order: [
        ["isPrimary", "DESC"],
        ["firstName", "ASC"],
        ["lastName", "ASC"],
      ],
    })
  }

  public static async findPrimaryContact(
    institutionId: string
  ): Promise<ContactPerson | null> {
    return this.findOne({
      where: {
        institutionId,
        isPrimary: true,
        isActive: true,
      },
    })
  }

  public static async findByEmail(email: string): Promise<ContactPerson | null> {
    return this.findOne({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    })
  }

  public static async setPrimaryContact(
    institutionId: string,
    contactId: string
  ): Promise<void> {
    // First, remove primary status from all contacts for this institution
    await this.update(
      { isPrimary: false },
      {
        where: {
          institutionId,
          isActive: true,
        },
      }
    )

    // Then set the specified contact as primary
    await this.update(
      { isPrimary: true },
      {
        where: {
          id: contactId,
          institutionId,
          isActive: true,
        },
      }
    )
  }
}

// Initialize the model
ContactPerson.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "institution_id",
      references: {
        model: "medical_institutions",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "first_name",
      validate: {
        len: [1, 50],
        notEmpty: true,
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "last_name",
      validate: {
        len: [1, 50],
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        len: [1, 255],
      },
      set(value: string) {
        this.setDataValue("email", value.toLowerCase().trim())
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 20],
        is: /^[\+]?[1-9][\d]{0,15}$/i, // Basic international phone number format
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_primary",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },

    // Multi-source tracking fields
    dataSource: {
      type: DataTypes.ENUM('crm', 'digiforma', 'sage', 'import'),
      allowNull: false,
      defaultValue: 'crm',
      field: "data_source",
      comment: 'Source de création - NE CHANGE JAMAIS (provenance historique)',
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_locked",
      comment: 'True = CRM-owned (ne peut plus être écrasé par sync externe)',
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "locked_at",
      comment: 'Date de verrouillage',
    },
    lockedReason: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "locked_reason",
      comment: 'Raison du lock (manual_edit, note_created, meeting_created, etc.)',
    },
    externalData: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "external_data",
      comment: 'Données des systèmes externes (Digiforma, Sage) - Read-only',
    },
    lastSyncAt: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "last_sync_at",
      comment: 'Dernière sync par source: { digiforma: Date, sage: Date, import: Date }',
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    modelName: "ContactPerson",
    tableName: "contact_persons",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["institution_id"],
      },
      {
        fields: ["email"],
      },
      {
        fields: ["institution_id", "is_primary"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["first_name", "last_name"],
      },
    ],
    validate: {
      // Ensure only one primary contact per institution
      async onlyOnePrimaryPerInstitution() {
        if (this.isPrimary && this.isActive) {
          const existingPrimary = await ContactPerson.findOne({
            where: {
              institutionId: this.institutionId as string,
              isPrimary: true,
              isActive: true,
              id: { [Op.ne]: this.id as string },
            },
          })

          if (existingPrimary) {
            throw new Error("Only one primary contact is allowed per institution")
          }
        }
      },
    },
    hooks: {
      // ============================================
      // AUTO-LOCK HOOKS
      // ============================================

      /**
       * After creating a contact, lock it if created manually (not via sync)
       */
      afterCreate: async (contact, options) => {
        const syncOptions = options as unknown as SyncOptions
        const context = syncOptions.context

        // If creation is manual (not from sync), lock immediately
        if (!context?.isSync) {
          const updateOptions: InstanceUpdateOptions<ContactPersonAttributes> & SyncOptions = {
            transaction: options.transaction,
            context: { isSync: true }
          }

          await contact.update({
            isLocked: true,
            lockedAt: new Date(),
            lockedReason: 'manual_creation'
          }, updateOptions)

          logger.info('Contact auto-locked after manual creation', {
            contactId: contact.id,
            email: contact.email,
            dataSource: contact.dataSource
          })
        }
      },

      /**
       * Before updating a contact, lock it if update is manual (not via sync)
       */
      beforeUpdate: async (contact, options) => {
        const syncOptions = options as unknown as SyncOptions
        const context = syncOptions.context

        // If update is manual (not from sync) and not yet locked
        if (!context?.isSync && !contact.isLocked) {
          contact.isLocked = true
          contact.lockedAt = new Date()
          contact.lockedReason = 'manual_edit'

          logger.info('Contact auto-locked after manual edit', {
            contactId: contact.id,
            email: contact.email,
            dataSource: contact.dataSource
          })
        }
      },
    },
  }
)

export default ContactPerson
