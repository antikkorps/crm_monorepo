import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { DocumentTemplate } from "./DocumentTemplate"
import { User } from "./User"

export enum DocumentVersionType {
  QUOTE_PDF = "quote_pdf",
  INVOICE_PDF = "invoice_pdf",
}

export interface DocumentVersionAttributes {
  id: string
  documentId: string // Quote ID or Invoice ID
  documentType: DocumentVersionType
  templateId?: string
  version: number
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string

  // Generation metadata
  generatedBy: string
  generatedAt: Date

  // Email tracking
  emailedTo?: string[]
  emailedAt?: Date
  emailSubject?: string

  // Template snapshot for audit
  templateSnapshot?: any

  createdAt: Date
  updatedAt: Date
}

export interface DocumentVersionCreationAttributes
  extends Optional<
    DocumentVersionAttributes,
    "id" | "version" | "createdAt" | "updatedAt"
  > {}

export class DocumentVersion
  extends Model<DocumentVersionAttributes, DocumentVersionCreationAttributes>
  implements DocumentVersionAttributes
{
  public id!: string
  public documentId!: string
  public documentType!: DocumentVersionType
  public templateId?: string
  public version!: number
  public fileName!: string
  public filePath!: string
  public fileSize!: number
  public mimeType!: string

  // Generation metadata
  public generatedBy!: string
  public generatedAt!: Date

  // Email tracking
  public emailedTo?: string[]
  public emailedAt?: Date
  public emailSubject?: string

  // Template snapshot for audit
  public templateSnapshot?: any

  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Associations
  public template?: DocumentTemplate
  public generator?: User

  // Instance methods
  public async markAsEmailed(recipients: string[], subject: string): Promise<void> {
    this.emailedTo = recipients
    this.emailedAt = new Date()
    this.emailSubject = subject
    await this.save()
  }

  public wasEmailed(): boolean {
    return !!this.emailedAt
  }

  public getEmailRecipients(): string[] {
    return this.emailedTo || []
  }

  // Static methods
  public static async getNextVersion(
    documentId: string,
    documentType: DocumentVersionType
  ): Promise<number> {
    const lastVersion = await this.findOne({
      where: {
        documentId,
        documentType,
      },
      order: [["version", "DESC"]],
    })

    return lastVersion ? lastVersion.version + 1 : 1
  }

  public static async createVersion(
    data: Omit<DocumentVersionCreationAttributes, "version">
  ): Promise<DocumentVersion> {
    const version = await this.getNextVersion(data.documentId, data.documentType)

    return this.create({
      ...data,
      version,
    })
  }

  public static async getVersionHistory(
    documentId: string,
    documentType: DocumentVersionType
  ): Promise<DocumentVersion[]> {
    return this.findAll({
      where: {
        documentId,
        documentType,
      },
      include: [
        {
          model: User,
          as: "generator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: DocumentTemplate,
          as: "template",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["version", "DESC"]],
    })
  }

  public static async getLatestVersion(
    documentId: string,
    documentType: DocumentVersionType
  ): Promise<DocumentVersion | null> {
    return this.findOne({
      where: {
        documentId,
        documentType,
      },
      include: [
        {
          model: User,
          as: "generator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: DocumentTemplate,
          as: "template",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["version", "DESC"]],
    })
  }

  public static async findByDocument(
    documentId: string,
    documentType: DocumentVersionType
  ): Promise<DocumentVersion[]> {
    return this.findAll({
      where: {
        documentId,
        documentType,
      },
      include: [
        {
          model: User,
          as: "generator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: DocumentTemplate,
          as: "template",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }
}

// Initialize the model
DocumentVersion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "document_id",
    },
    documentType: {
      type: DataTypes.ENUM(...Object.values(DocumentVersionType)),
      allowNull: false,
      field: "document_type",
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "template_id",
      references: {
        model: "document_templates",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "file_name",
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "file_path",
      validate: {
        len: [1, 500],
        notEmpty: true,
      },
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "file_size",
      validate: {
        min: 0,
      },
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "mime_type",
      validate: {
        len: [1, 100],
        notEmpty: true,
      },
    },
    generatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "generated_by",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "generated_at",
    },
    emailedTo: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      field: "emailed_to",
    },
    emailedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "emailed_at",
    },
    emailSubject: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "email_subject",
    },
    templateSnapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "template_snapshot",
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
    modelName: "DocumentVersion",
    tableName: "document_versions",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["document_id", "document_type"],
      },
      {
        fields: ["template_id"],
      },
      {
        fields: ["generated_by"],
      },
      {
        fields: ["generated_at"],
      },
      {
        unique: true,
        fields: ["document_id", "document_type", "version"],
      },
    ],
  }
)

export default DocumentVersion
