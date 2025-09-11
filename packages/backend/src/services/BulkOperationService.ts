import { Segment, Task, MedicalInstitution, ContactPerson, User } from "../models"
import { TaskStatus, TaskPriority } from "../models/Task"
import { SegmentService } from "./SegmentService"

export enum BulkOperationType {
  CREATE_TASKS = "create_tasks",
  UPDATE_INSTITUTIONS = "update_institutions",
  UPDATE_CONTACTS = "update_contacts",
  SEND_COMMUNICATIONS = "send_communications",
}

export interface BulkOperationOptions {
  segmentId: string
  operationType: BulkOperationType
  userId: string
  options: {
    // For CREATE_TASKS
    taskTitle?: string
    taskDescription?: string
    taskPriority?: TaskPriority
    taskDueDate?: Date
    assigneeId?: string

    // For UPDATE_INSTITUTIONS
    institutionUpdates?: Partial<{
      assignedUserId: string
      tags: string[]
      isActive: boolean
    }>

    // For UPDATE_CONTACTS
    contactUpdates?: Partial<{
      title: string
      department: string
      isPrimary: boolean
      isActive: boolean
    }>

    // For SEND_COMMUNICATIONS
    communicationType?: "email" | "sms"
    subject?: string
    message?: string
    templateId?: string
  }
}

export interface BulkOperationResult {
  success: boolean
  totalProcessed: number
  successfulOperations: number
  failedOperations: number
  errors: string[]
  results?: any[]
}

export class BulkOperationService {
  /**
   * Execute a bulk operation on a segment
   */
  static async executeBulkOperation(
    options: BulkOperationOptions
  ): Promise<BulkOperationResult> {
    const { segmentId, operationType, userId, options: operationOptions } = options

    // Get the segment
    const segment = await Segment.findByPk(segmentId)
    if (!segment) {
      throw new Error("Segment not found")
    }

    // Check if user can access the segment
    const user = await User.findByPk(userId)
    if (!user) {
      throw new Error("User not found")
    }

    if (!segment.isVisibleTo(userId, user.teamId)) {
      throw new Error("Access denied to segment")
    }

    // Get segment results
    const results = await SegmentService.getSegmentResults(segment)

    const operationResult: BulkOperationResult = {
      success: true,
      totalProcessed: results.length,
      successfulOperations: 0,
      failedOperations: 0,
      errors: [],
      results: [],
    }

    // Execute the appropriate operation
    switch (operationType) {
      case BulkOperationType.CREATE_TASKS:
        await this.createTasksForSegment(results, segment, operationOptions, operationResult)
        break
      case BulkOperationType.UPDATE_INSTITUTIONS:
        await this.updateInstitutionsInSegment(results, segment, operationOptions, operationResult)
        break
      case BulkOperationType.UPDATE_CONTACTS:
        await this.updateContactsInSegment(results, segment, operationOptions, operationResult)
        break
      case BulkOperationType.SEND_COMMUNICATIONS:
        await this.sendCommunicationsToSegment(results, segment, operationOptions, operationResult)
        break
      default:
        throw new Error(`Unsupported bulk operation type: ${operationType}`)
    }

    return operationResult
  }

  /**
   * Create tasks for institutions or contacts in a segment
   */
  private static async createTasksForSegment(
    results: MedicalInstitution[] | ContactPerson[],
    segment: Segment,
    options: any,
    result: BulkOperationResult
  ): Promise<void> {
    const {
      taskTitle,
      taskDescription,
      taskPriority = TaskPriority.MEDIUM,
      taskDueDate,
      assigneeId,
    } = options

    if (!taskTitle) {
      throw new Error("Task title is required for bulk task creation")
    }

    for (const item of results) {
      try {
        let institutionId: string | undefined
        let contactPersonId: string | undefined

        if (segment.type === "institution") {
          institutionId = (item as MedicalInstitution).id
        } else {
          // For contact segments, we need to get the institution
          const contact = item as ContactPerson
          institutionId = contact.institutionId
          contactPersonId = contact.id
        }

        await Task.create({
          title: taskTitle,
          description: taskDescription,
          status: TaskStatus.TODO,
          priority: taskPriority,
          dueDate: taskDueDate,
          assigneeId: assigneeId,
          creatorId: options.userId,
          institutionId,
        })

        result.successfulOperations++
      } catch (error) {
        result.failedOperations++
        result.errors.push(`Failed to create task for item ${item.id}: ${(error as Error).message}`)
      }
    }
  }

  /**
   * Update institutions in a segment
   */
  private static async updateInstitutionsInSegment(
    results: MedicalInstitution[] | ContactPerson[],
    segment: Segment,
    options: any,
    result: BulkOperationResult
  ): Promise<void> {
    const { institutionUpdates } = options

    if (!institutionUpdates) {
      throw new Error("Institution updates are required")
    }

    // Get institutions to update
    let institutionsToUpdate: MedicalInstitution[] = []

    if (segment.type === "institution") {
      institutionsToUpdate = results as MedicalInstitution[]
    } else {
      // For contact segments, get unique institutions
      const contactResults = results as ContactPerson[]
      const institutionIds = [...new Set(contactResults.map(c => c.institutionId))]
      institutionsToUpdate = await MedicalInstitution.findAll({
        where: { id: institutionIds },
      })
    }

    for (const institution of institutionsToUpdate) {
      try {
        await institution.update(institutionUpdates)
        result.successfulOperations++
        result.results?.push({
          id: institution.id,
          name: institution.name,
          updated: true,
        })
      } catch (error) {
        result.failedOperations++
        result.errors.push(`Failed to update institution ${institution.id}: ${(error as Error).message}`)
      }
    }
  }

  /**
   * Update contacts in a segment
   */
  private static async updateContactsInSegment(
    results: MedicalInstitution[] | ContactPerson[],
    segment: Segment,
    options: any,
    result: BulkOperationResult
  ): Promise<void> {
    const { contactUpdates } = options

    if (!contactUpdates) {
      throw new Error("Contact updates are required")
    }

    let contactsToUpdate: ContactPerson[] = []

    if (segment.type === "contact") {
      contactsToUpdate = results as ContactPerson[]
    } else {
      // For institution segments, get all contacts from those institutions
      const institutionResults = results as MedicalInstitution[]
      const institutionIds = institutionResults.map(i => i.id)
      contactsToUpdate = await ContactPerson.findAll({
        where: { institutionId: institutionIds },
      })
    }

    for (const contact of contactsToUpdate) {
      try {
        await contact.update(contactUpdates)
        result.successfulOperations++
        result.results?.push({
          id: contact.id,
          name: `${contact.firstName} ${contact.lastName}`,
          updated: true,
        })
      } catch (error) {
        result.failedOperations++
        result.errors.push(`Failed to update contact ${contact.id}: ${(error as Error).message}`)
      }
    }
  }

  /**
   * Send communications to segment (placeholder for future implementation)
   */
  private static async sendCommunicationsToSegment(
    results: MedicalInstitution[] | ContactPerson[],
    segment: Segment,
    options: any,
    result: BulkOperationResult
  ): Promise<void> {
    // This would integrate with email/SMS services
    // For now, just mark as successful for demonstration
    result.successfulOperations = results.length
    result.results = results.map(item => ({
      id: item.id,
      communicationSent: true,
      type: options.communicationType,
    }))
  }

  /**
   * Validate bulk operation options
   */
  static validateBulkOperationOptions(options: BulkOperationOptions): void {
    const { operationType, options: operationOptions } = options

    switch (operationType) {
      case BulkOperationType.CREATE_TASKS:
        if (!operationOptions.taskTitle) {
          throw new Error("Task title is required for bulk task creation")
        }
        break
      case BulkOperationType.UPDATE_INSTITUTIONS:
        if (!operationOptions.institutionUpdates) {
          throw new Error("Institution updates are required")
        }
        break
      case BulkOperationType.UPDATE_CONTACTS:
        if (!operationOptions.contactUpdates) {
          throw new Error("Contact updates are required")
        }
        break
      case BulkOperationType.SEND_COMMUNICATIONS:
        if (!operationOptions.communicationType || !operationOptions.message) {
          throw new Error("Communication type and message are required")
        }
        break
      default:
        throw new Error(`Unsupported bulk operation type: ${operationType}`)
    }
  }

  /**
   * Get bulk operation preview (count of items that would be affected)
   */
  static async getBulkOperationPreview(
    segmentId: string,
    operationType: BulkOperationType,
    userId: string
  ): Promise<{
    segmentName: string
    segmentType: string
    totalItems: number
    operationType: BulkOperationType
  }> {
    const segment = await Segment.findByPk(segmentId)
    if (!segment) {
      throw new Error("Segment not found")
    }

    const user = await User.findByPk(userId)
    if (!user) {
      throw new Error("User not found")
    }

    if (!segment.isVisibleTo(userId, user.teamId)) {
      throw new Error("Access denied to segment")
    }

    const totalItems = await SegmentService.countSegmentResults(segment)

    return {
      segmentName: segment.name,
      segmentType: segment.type,
      totalItems,
      operationType,
    }
  }
}