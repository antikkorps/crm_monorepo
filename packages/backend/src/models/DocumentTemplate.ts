import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { User } from "./User"

export enum TemplateType {
  QUOTE = "quote",
  INVOICE = "invoice",
  BOTH = "both",
  ENGAGEMENT_LETTER = "engagement_letter",
}

export enum LogoPosition {
  TOP_LEFT = "top_left",
  TOP_CENTER = "top_center",
  TOP_RIGHT = "top_right",
  HEADER_LEFT = "header_left",
  HEADER_RIGHT = "header_right",
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface DocumentTemplateAttributes {
  id: string
  name: string
  type: TemplateType
  isDefault: boolean
  isActive: boolean

  // Company Information
  companyName: string
  companyAddress: Address
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string

  // Tax and Legal Information
  taxNumber?: string
  vatNumber?: string
  siretNumber?: string
  registrationNumber?: string

  // Logo and Branding
  logoUrl?: string
  logoPosition: LogoPosition
  primaryColor?: string
  secondaryColor?: string

  // Template Layout Settings
  headerHeight: number
  footerHeight: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number

  // Custom Fields and Text
  customHeader?: string
  customFooter?: string
  termsAndConditions?: string
  paymentInstructions?: string

  // HTML Template Content
  htmlTemplate?: string
  styles?: string

  // Metadata
  createdBy: string
  version: number
  createdAt: Date
  updatedAt: Date
}

export interface DocumentTemplateCreationAttributes
  extends Optional<
    DocumentTemplateAttributes,
    "id" | "isDefault" | "isActive" | "version" | "createdAt" | "updatedAt"
  > {}

export class DocumentTemplate
  extends Model<DocumentTemplateAttributes, DocumentTemplateCreationAttributes>
  implements DocumentTemplateAttributes
{
  declare id: string
  declare name: string
  declare type: TemplateType
  declare isDefault: boolean
  declare isActive: boolean

  // Company Information
  declare companyName: string
  declare companyAddress: Address
  declare companyPhone?: string
  declare companyEmail?: string
  declare companyWebsite?: string

  // Tax and Legal Information
  declare taxNumber?: string
  declare vatNumber?: string
  declare siretNumber?: string
  declare registrationNumber?: string

  // Logo and Branding
  declare logoUrl?: string
  declare logoPosition: LogoPosition
  declare primaryColor?: string
  declare secondaryColor?: string

  // Template Layout Settings
  declare headerHeight: number
  declare footerHeight: number
  declare marginTop: number
  declare marginBottom: number
  declare marginLeft: number
  declare marginRight: number

  // Custom Fields and Text
  declare customHeader?: string
  declare customFooter?: string
  declare termsAndConditions?: string
  declare paymentInstructions?: string

  // HTML Template Content
  declare htmlTemplate?: string
  declare styles?: string

  // Metadata
  declare createdBy: string
  declare version: number
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  public creator?: User

  // Instance methods
  public async setAsDefault(): Promise<void> {
    // First, unset any existing default templates of the same type
    await DocumentTemplate.update(
      { isDefault: false },
      {
        where: {
          type: this.type,
          isDefault: true,
          id: { [Op.ne]: this.id },
        },
      }
    )

    // Set this template as default
    this.isDefault = true
    await this.save()
  }

  public async createVersion(): Promise<DocumentTemplate> {
    const newVersion = await DocumentTemplate.create({
      name: `${this.name} (v${this.version + 1})`,
      type: this.type,
      isDefault: false,
      isActive: true,
      companyName: this.companyName,
      companyAddress: this.companyAddress,
      companyPhone: this.companyPhone,
      companyEmail: this.companyEmail,
      companyWebsite: this.companyWebsite,
      taxNumber: this.taxNumber,
      vatNumber: this.vatNumber,
      siretNumber: this.siretNumber,
      registrationNumber: this.registrationNumber,
      logoUrl: this.logoUrl,
      logoPosition: this.logoPosition,
      primaryColor: this.primaryColor,
      secondaryColor: this.secondaryColor,
      headerHeight: this.headerHeight,
      footerHeight: this.footerHeight,
      marginTop: this.marginTop,
      marginBottom: this.marginBottom,
      marginLeft: this.marginLeft,
      marginRight: this.marginRight,
      customHeader: this.customHeader,
      customFooter: this.customFooter,
      termsAndConditions: this.termsAndConditions,
      paymentInstructions: this.paymentInstructions,
      htmlTemplate: this.htmlTemplate,
      styles: this.styles,
      createdBy: this.createdBy,
      version: this.version + 1,
    })

    return newVersion
  }

  public canBeDeleted(): boolean {
    return !this.isDefault
  }

  // Static methods
  public static async getDefaultTemplate(
    type: TemplateType
  ): Promise<DocumentTemplate | null> {
    // First try to find a default template of the exact type
    let template = await this.findOne({
      where: {
        type,
        isDefault: true,
        isActive: true,
      },
    })

    // If not found, try to find a default template of type "both"
    if (!template && type !== TemplateType.BOTH) {
      template = await this.findOne({
        where: {
          type: TemplateType.BOTH,
          isDefault: true,
          isActive: true,
        },
      })
    }

    return template
  }

  public static async hasAnyTemplate(type?: TemplateType): Promise<boolean> {
    const where: any = { isActive: true }
    if (type) {
      where[Op.or] = [{ type }, { type: TemplateType.BOTH }]
    }
    const count = await this.count({ where })
    return count > 0
  }

  public static async getActiveTemplates(
    type?: TemplateType
  ): Promise<DocumentTemplate[]> {
    const where: any = { isActive: true }
    if (type) {
      // Include templates of the specific type AND templates of type "both"
      where[Op.or] = [{ type }, { type: TemplateType.BOTH }]
    }

    return this.findAll({
      where,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [
        ["isDefault", "DESC"],
        ["name", "ASC"],
      ],
    })
  }

  public static async createTemplate(
    data: DocumentTemplateCreationAttributes
  ): Promise<DocumentTemplate> {
    return this.create({
      ...data,
      isDefault: false,
      isActive: true,
      version: 1,
    })
  }
}

// Initialize the model
DocumentTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TemplateType)),
      allowNull: false,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_default",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "company_name",
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    companyAddress: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: "company_address",
      validate: {
        isValidAddress(value: any) {
          if (!value || typeof value !== "object") {
            throw new Error("Company address must be a valid address object")
          }
          const required = ["street", "city", "state", "zipCode", "country"]
          for (const field of required) {
            if (!value[field] || typeof value[field] !== "string") {
              throw new Error(`Address field '${field}' is required and must be a string`)
            }
          }
        },
      },
    },
    companyPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "company_phone",
    },
    companyEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "company_email",
      validate: {
        isEmail: true,
      },
    },
    companyWebsite: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "company_website",
      validate: {
        isUrl: true,
      },
    },
    taxNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "tax_number",
    },
    vatNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "vat_number",
    },
    siretNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "siret_number",
    },
    registrationNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "registration_number",
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "logo_url",
    },
    logoPosition: {
      type: DataTypes.ENUM(...Object.values(LogoPosition)),
      allowNull: false,
      defaultValue: LogoPosition.TOP_LEFT,
      field: "logo_position",
    },
    primaryColor: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "primary_color",
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
    },
    secondaryColor: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "secondary_color",
      validate: {
        is: /^#[0-9A-F]{6}$/i,
      },
    },
    headerHeight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 80,
      field: "header_height",
      validate: {
        min: 0,
        max: 200,
      },
    },
    footerHeight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      field: "footer_height",
      validate: {
        min: 0,
        max: 200,
      },
    },
    marginTop: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      field: "margin_top",
      validate: {
        min: 0,
        max: 100,
      },
    },
    marginBottom: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      field: "margin_bottom",
      validate: {
        min: 0,
        max: 100,
      },
    },
    marginLeft: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      field: "margin_left",
      validate: {
        min: 0,
        max: 100,
      },
    },
    marginRight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      field: "margin_right",
      validate: {
        min: 0,
        max: 100,
      },
    },
    customHeader: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "custom_header",
    },
    customFooter: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "custom_footer",
    },
    termsAndConditions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "terms_and_conditions",
    },
    paymentInstructions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "payment_instructions",
    },
    htmlTemplate: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "html_template",
    },
    styles: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
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
    modelName: "DocumentTemplate",
    tableName: "document_templates",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["type"],
      },
      {
        fields: ["is_default"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["created_by"],
      },
      {
        unique: true,
        fields: ["type", "is_default"],
        where: {
          is_default: true,
          is_active: true,
        },
      },
    ],
  }
)

export default DocumentTemplate
