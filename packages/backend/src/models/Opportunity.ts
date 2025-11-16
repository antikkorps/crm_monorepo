import {
  Association,
  BelongsToCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  Sequelize,
} from "sequelize"
import { MedicalInstitution } from "./MedicalInstitution"
import { ContactPerson } from "./ContactPerson"
import { User } from "./User"

/**
 * Opportunity Stage Enum
 * Represents the stages of the sales pipeline
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
 * Product Line Interface
 * Represents a product/service line item in an opportunity
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
 * Opportunity Model
 * Represents a sales opportunity/deal in the pipeline
 */
export class Opportunity extends Model<
  InferAttributes<Opportunity>,
  InferCreationAttributes<Opportunity>
> {
  // Primary Key
  declare id: CreationOptional<string>

  // Foreign Keys
  declare institutionId: ForeignKey<MedicalInstitution["id"]>
  declare contactPersonId: CreationOptional<ForeignKey<ContactPerson["id"]> | null>
  declare assignedUserId: ForeignKey<User["id"]>

  // Core Fields
  declare name: string
  declare description: CreationOptional<string | null>
  declare stage: OpportunityStage
  declare status: CreationOptional<OpportunityStatus>
  declare value: number
  declare probability: number // 0-100
  declare expectedCloseDate: Date
  declare actualCloseDate: CreationOptional<Date | null>

  // Product/Service Details
  declare products: CreationOptional<ProductLine[] | null>

  // Competition & Win/Loss Analysis
  declare competitors: CreationOptional<string[] | null>
  declare wonReason: CreationOptional<string | null>
  declare lostReason: CreationOptional<string | null>

  // Additional Metadata
  declare tags: CreationOptional<string[] | null>
  declare notes: CreationOptional<string | null>
  declare source: CreationOptional<string | null> // Lead source

  // Timestamps
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>
  declare deletedAt: CreationOptional<Date | null>

  // Associations
  declare institution?: NonAttribute<MedicalInstitution>
  declare contactPerson?: NonAttribute<ContactPerson | null>
  declare assignedUser?: NonAttribute<User>

  // Association Mixins
  declare getInstitution: BelongsToGetAssociationMixin<MedicalInstitution>
  declare setInstitution: BelongsToSetAssociationMixin<MedicalInstitution, string>
  declare createInstitution: BelongsToCreateAssociationMixin<MedicalInstitution>

  declare getContactPerson: BelongsToGetAssociationMixin<ContactPerson>
  declare setContactPerson: BelongsToSetAssociationMixin<ContactPerson, string>

  declare getAssignedUser: BelongsToGetAssociationMixin<User>
  declare setAssignedUser: BelongsToSetAssociationMixin<User, string>

  // Static Associations
  declare static associations: {
    institution: Association<Opportunity, MedicalInstitution>
    contactPerson: Association<Opportunity, ContactPerson>
    assignedUser: Association<Opportunity, User>
  }

  /**
   * Initialize the Opportunity model
   */
  static initModel(sequelize: Sequelize): typeof Opportunity {
    Opportunity.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        institutionId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "medical_institutions",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        contactPersonId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "contact_persons",
            key: "id",
          },
          onDelete: "SET NULL",
        },
        assignedUserId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onDelete: "RESTRICT",
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [3, 255],
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        stage: {
          type: DataTypes.ENUM(...Object.values(OpportunityStage)),
          allowNull: false,
          defaultValue: OpportunityStage.PROSPECTING,
        },
        status: {
          type: DataTypes.ENUM(...Object.values(OpportunityStatus)),
          allowNull: false,
          defaultValue: OpportunityStatus.ACTIVE,
        },
        value: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        probability: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 50,
          validate: {
            min: 0,
            max: 100,
          },
        },
        expectedCloseDate: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        actualCloseDate: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        products: {
          type: DataTypes.JSONB,
          allowNull: true,
          defaultValue: [],
        },
        competitors: {
          type: DataTypes.JSONB,
          allowNull: true,
          defaultValue: [],
        },
        wonReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        lostReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        tags: {
          type: DataTypes.JSONB,
          allowNull: true,
          defaultValue: [],
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        source: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "opportunities",
        timestamps: true,
        paranoid: true,
        underscored: false,
        indexes: [
          {
            fields: ["institutionId"],
          },
          {
            fields: ["contactPersonId"],
          },
          {
            fields: ["assignedUserId"],
          },
          {
            fields: ["stage"],
          },
          {
            fields: ["status"],
          },
          {
            fields: ["expectedCloseDate"],
          },
          {
            fields: ["value"],
          },
          {
            fields: ["probability"],
          },
          {
            fields: ["createdAt"],
          },
        ],
      }
    )

    return Opportunity
  }

  /**
   * Define associations
   */
  static associate() {
    // Opportunity belongs to Institution
    Opportunity.belongsTo(MedicalInstitution, {
      foreignKey: "institutionId",
      as: "institution",
    })

    // Opportunity optionally belongs to Contact Person
    Opportunity.belongsTo(ContactPerson, {
      foreignKey: "contactPersonId",
      as: "contactPerson",
    })

    // Opportunity belongs to User (assigned)
    Opportunity.belongsTo(User, {
      foreignKey: "assignedUserId",
      as: "assignedUser",
    })
  }

  /**
   * Calculate weighted value based on probability
   */
  getWeightedValue(): number {
    return (this.value * this.probability) / 100
  }

  /**
   * Check if opportunity is active
   */
  isActive(): boolean {
    return this.status === OpportunityStatus.ACTIVE
  }

  /**
   * Check if opportunity is closed (won or lost)
   */
  isClosed(): boolean {
    return (
      this.status === OpportunityStatus.WON ||
      this.status === OpportunityStatus.LOST
    )
  }

  /**
   * Check if opportunity is overdue (past expected close date)
   */
  isOverdue(): boolean {
    if (this.isClosed()) return false
    return this.expectedCloseDate < new Date()
  }

  /**
   * Get days until expected close
   */
  getDaysUntilClose(): number {
    const now = new Date()
    const diff = this.expectedCloseDate.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  /**
   * Auto-update status based on stage
   */
  async updateStatusFromStage(): Promise<void> {
    if (this.stage === OpportunityStage.CLOSED_WON) {
      this.status = OpportunityStatus.WON
      this.actualCloseDate = new Date()
      this.probability = 100
    } else if (this.stage === OpportunityStage.CLOSED_LOST) {
      this.status = OpportunityStatus.LOST
      this.actualCloseDate = new Date()
      this.probability = 0
    } else {
      this.status = OpportunityStatus.ACTIVE
      this.actualCloseDate = null
    }
    await this.save()
  }
}
