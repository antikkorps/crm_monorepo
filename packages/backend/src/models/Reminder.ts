import { ReminderPriority } from "@medical-crm/shared"
import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { CollaborationValidation } from "../types/collaboration"
import { MedicalInstitution } from "./MedicalInstitution"
import { User } from "./User"

export interface ReminderAttributes {
  id: string
  title: string
  description?: string
  reminderDate: Date
  isCompleted: boolean
  userId: string
  institutionId?: string
  priority: ReminderPriority
  createdAt: Date
  updatedAt: Date
}

export interface ReminderCreationAttributes
  extends Optional<ReminderAttributes, "id" | "createdAt" | "updatedAt" | "isCompleted" | "priority"> {}

export class Reminder
  extends Model<ReminderAttributes, ReminderCreationAttributes>
  implements ReminderAttributes
{
  declare id: string
  declare title: string
  declare description?: string
  declare reminderDate: Date
  declare isCompleted: boolean
  declare userId: string
  declare institutionId?: string
  declare priority: ReminderPriority
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  declare user?: User
  declare institution?: MedicalInstitution

  // Instance methods
  public isOverdue(): boolean {
    if (this.isCompleted) {
      return false
    }
    return new Date() > this.reminderDate
  }

  public getDaysUntilDue(): number | null {
    if (this.isCompleted) return null
    const now = new Date()
    const diffTime = this.reminderDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  public getHoursUntilDue(): number | null {
    if (this.isCompleted) return null
    const now = new Date()
    const diffTime = this.reminderDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60))
  }

  public async markAsCompleted(): Promise<void> {
    this.isCompleted = true
    await this.save()
  }

  public async markAsIncomplete(): Promise<void> {
    this.isCompleted = false
    await this.save()
  }

  public async reschedule(newReminderDate: Date): Promise<void> {
    CollaborationValidation.validateReminderDate(newReminderDate)
    this.reminderDate = newReminderDate
    this.isCompleted = false // Reset completion status when rescheduling
    await this.save()
  }

  public async updatePriority(newPriority: ReminderPriority): Promise<void> {
    this.priority = newPriority
    await this.save()
  }

  public async snooze(minutes: number): Promise<void> {
    const newDate = new Date(this.reminderDate.getTime() + minutes * 60 * 1000)
    await this.reschedule(newDate)
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      isOverdue: this.isOverdue(),
      daysUntilDue: this.getDaysUntilDue(),
      hoursUntilDue: this.getHoursUntilDue(),
    }
  }

  // Static methods
  public static async findByUser(userId: string): Promise<Reminder[]> {
    const includeOptions = []

    // Only include associations if they exist (for testing compatibility)
    try {
      includeOptions.push({
        model: User,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"],
      })
    } catch (e) {
      // Association doesn't exist, skip
    }

    try {
      includeOptions.push({
        model: MedicalInstitution,
        as: "institution",
        attributes: ["id", "name", "type"],
      })
    } catch (e) {
      // Association doesn't exist, skip
    }

    return this.findAll({
      where: { userId },
      include: includeOptions,
      order: [
        ["priority", "DESC"],
        ["reminderDate", "ASC"],
        ["createdAt", "DESC"],
      ],
    })
  }

  public static async findByInstitution(institutionId: string): Promise<Reminder[]> {
    return this.findAll({
      where: { institutionId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [
        ["priority", "DESC"],
        ["reminderDate", "ASC"],
        ["createdAt", "DESC"],
      ],
    })
  }

  public static async findByPriority(priority: ReminderPriority): Promise<Reminder[]> {
    return this.findAll({
      where: { priority },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [
        ["reminderDate", "ASC"],
        ["createdAt", "DESC"],
      ],
    })
  }

  public static async findCompleted(userId?: string): Promise<Reminder[]> {
    const whereClause: any = { isCompleted: true }
    if (userId) {
      whereClause.userId = userId
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["updatedAt", "DESC"]],
    })
  }

  public static async findPending(userId?: string): Promise<Reminder[]> {
    const whereClause: any = { isCompleted: false }
    if (userId) {
      whereClause.userId = userId
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [
        ["priority", "DESC"],
        ["reminderDate", "ASC"],
        ["createdAt", "DESC"],
      ],
    })
  }

  public static async findOverdueReminders(userId?: string): Promise<Reminder[]> {
    const whereClause: any = {
      reminderDate: {
        [Op.lt]: new Date(),
      },
      isCompleted: false,
    }

    if (userId) {
      whereClause.userId = userId
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [
        ["reminderDate", "ASC"],
        ["priority", "DESC"],
      ],
    })
  }

  public static async findUpcomingReminders(
    userId?: string,
    hoursAhead: number = 24
  ): Promise<Reminder[]> {
    const now = new Date()
    const futureDate = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)

    const whereClause: any = {
      reminderDate: {
        [Op.between]: [now, futureDate],
      },
      isCompleted: false,
    }

    if (userId) {
      whereClause.userId = userId
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [
        ["reminderDate", "ASC"],
        ["priority", "DESC"],
      ],
    })
  }

  public static async findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<Reminder[]> {
    const whereClause: any = {
      reminderDate: {
        [Op.between]: [startDate, endDate],
      },
    }

    if (userId) {
      whereClause.userId = userId
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [
        ["reminderDate", "ASC"],
        ["priority", "DESC"],
      ],
    })
  }

  public static async findByTeamMembers(teamMemberIds: string[]): Promise<Reminder[]> {
    return this.findAll({
      where: {
        userId: {
          [Op.in]: teamMemberIds,
        },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [
        ["priority", "DESC"],
        ["reminderDate", "ASC"],
        ["createdAt", "DESC"],
      ],
    })
  }

  public static async searchReminders(filters: {
    userId?: string
    institutionId?: string
    priority?: ReminderPriority
    isCompleted?: boolean
    reminderDateFrom?: Date
    reminderDateTo?: Date
    overdue?: boolean
    teamMemberIds?: string[]
    search?: string
  }): Promise<Reminder[]> {
    const whereClause: any = {}

    if (filters.userId) {
      whereClause.userId = filters.userId
    }

    if (filters.institutionId) {
      whereClause.institutionId = filters.institutionId
    }

    if (filters.priority) {
      whereClause.priority = filters.priority
    }

    if (filters.isCompleted !== undefined) {
      whereClause.isCompleted = filters.isCompleted
    }

    if (filters.teamMemberIds && filters.teamMemberIds.length > 0) {
      whereClause.userId = {
        [Op.in]: filters.teamMemberIds,
      }
    }

    if (filters.overdue) {
      whereClause.reminderDate = {
        [Op.lt]: new Date(),
      }
      whereClause.isCompleted = false
    }

    if (filters.reminderDateFrom) {
      whereClause.reminderDate = {
        ...whereClause.reminderDate,
        [Op.gte]: filters.reminderDateFrom,
      }
    }

    if (filters.reminderDateTo) {
      whereClause.reminderDate = {
        ...whereClause.reminderDate,
        [Op.lte]: filters.reminderDateTo,
      }
    }

    if (filters.search) {
      whereClause[Op.or] = [
        {
          title: {
            [Op.iLike]: `%${filters.search}%`,
          },
        },
        {
          description: {
            [Op.iLike]: `%${filters.search}%`,
          },
        },
      ]
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [
        ["priority", "DESC"],
        ["reminderDate", "ASC"],
        ["createdAt", "DESC"],
      ],
    })
  }

  // Validation methods
  public static validateReminderData(reminderData: Partial<ReminderAttributes>): void {
    if (reminderData.title !== undefined) {
      CollaborationValidation.validateReminderTitle(reminderData.title)
    }

    if (reminderData.description !== undefined) {
      CollaborationValidation.validateReminderDescription(reminderData.description)
    }

    if (reminderData.reminderDate !== undefined) {
      CollaborationValidation.validateReminderDate(reminderData.reminderDate)
    }
  }

  public static validatePriorityTransition(
    currentPriority: ReminderPriority,
    newPriority: ReminderPriority
  ): void {
    // All priority transitions are allowed for reminders
    // This method exists for consistency and future extensibility
    const validPriorities = Object.values(ReminderPriority)
    if (!validPriorities.includes(newPriority)) {
      throw new Error(`Invalid priority: ${newPriority}`)
    }
  }
}

// Initialize the model
Reminder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000],
      },
    },
    reminderDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "reminder_date",
      validate: {
        isDate: true,
      },
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_completed",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "institution_id",
    },
    priority: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ReminderPriority.MEDIUM,
      validate: {
        isIn: [Object.values(ReminderPriority)],
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
    modelName: "Reminder",
    tableName: "reminders",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["institution_id"],
      },
      {
        fields: ["priority"],
      },
      {
        fields: ["reminder_date"],
      },
      {
        fields: ["is_completed"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["user_id", "is_completed"],
      },
      {
        fields: ["reminder_date", "is_completed"],
      },
      {
        fields: ["priority", "reminder_date"],
      },
    ],
    hooks: {
      beforeValidate: (reminder: Reminder) => {
        // Validate reminder data
        Reminder.validateReminderData(reminder)
      },
      beforeSave: (reminder: Reminder) => {
        // Validate priority transitions if this is an update
        if (!reminder.isNewRecord && reminder.changed("priority")) {
          const previousPriority = reminder.previous("priority") as ReminderPriority
          Reminder.validatePriorityTransition(previousPriority, reminder.priority)
        }
      },
    },
  }
)

export default Reminder
