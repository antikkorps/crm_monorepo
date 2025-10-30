import { ReminderRuleAttributes } from "../models/ReminderRule"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateReminderRule(data: Partial<ReminderRuleAttributes>): ValidationResult {
  const errors: string[] = []

  // Required fields
  if (!data.entityType) {
    errors.push("Entity type is required")
  } else if (!["task", "quote", "invoice"].includes(data.entityType)) {
    errors.push("Entity type must be task, quote, or invoice")
  }

  if (!data.triggerType) {
    errors.push("Trigger type is required")
  } else if (!["due_soon", "overdue", "expired", "unpaid"].includes(data.triggerType)) {
    errors.push("Trigger type must be due_soon, overdue, expired, or unpaid")
  }

  if (!data.titleTemplate || data.titleTemplate.trim().length === 0) {
    errors.push("Title template is required")
  }

  if (!data.messageTemplate || data.messageTemplate.trim().length === 0) {
    errors.push("Message template is required")
  }

  if (!data.actionUrlTemplate || data.actionUrlTemplate.trim().length === 0) {
    errors.push("Action URL template is required")
  }

  if (!data.actionTextTemplate || data.actionTextTemplate.trim().length === 0) {
    errors.push("Action text template is required")
  }

  // Validate days
  if (data.daysBefore !== undefined) {
    if (typeof data.daysBefore !== "number" || data.daysBefore < 0) {
      errors.push("Days before must be a non-negative number")
    } else if (data.daysBefore > 365) {
      errors.push("Days before cannot exceed 365")
    }
  }

  if (data.daysAfter !== undefined) {
    if (typeof data.daysAfter !== "number" || data.daysAfter < 0) {
      errors.push("Days after must be a non-negative number")
    } else if (data.daysAfter > 365) {
      errors.push("Days after cannot exceed 365")
    }
  }

  // Validate priority
  if (data.priority && !["low", "medium", "high", "urgent"].includes(data.priority)) {
    errors.push("Priority must be low, medium, high, or urgent")
  }

  // Validate task priority
  if (data.taskPriority && !["low", "medium", "high", "urgent"].includes(data.taskPriority)) {
    errors.push("Task priority must be low, medium, high, or urgent")
  }

  // Validate boolean fields
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    errors.push("isActive must be a boolean")
  }

  if (data.autoCreateTask !== undefined && typeof data.autoCreateTask !== "boolean") {
    errors.push("autoCreateTask must be a boolean")
  }

  // Validate templates for required placeholders
  if (data.messageTemplate) {
    const entityType = data.entityType || ""
    const requiredPlaceholders = getRequiredPlaceholders(entityType, data.triggerType)
    
    for (const placeholder of requiredPlaceholders) {
      if (!data.messageTemplate.includes(placeholder)) {
        errors.push(`Message template must include placeholder: ${placeholder}`)
      }
    }
  }

  // Validate task title template if auto-create task is enabled
  if (data.autoCreateTask && data.taskTitleTemplate) {
    if (!data.taskTitleTemplate.includes("{title}") && !data.taskTitleTemplate.includes("{entityType}")) {
      errors.push("Task title template must include {title} or {entityType} placeholder")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

function getRequiredPlaceholders(entityType: string, triggerType?: string): string[] {
  const placeholders: string[] = []

  // Common placeholders
  if (entityType === "task") {
    placeholders.push("{title}")
  } else if (entityType === "quote") {
    placeholders.push("{quoteNumber}")
  } else if (entityType === "invoice") {
    placeholders.push("{invoiceNumber}")
  }

  // Days placeholder for due/overdue triggers
  if (triggerType && ["due_soon", "overdue", "expired", "unpaid"].includes(triggerType)) {
    placeholders.push("{days}")
  }

  return placeholders
}

export function validateReminderRuleUpdate(data: Partial<ReminderRuleAttributes>): ValidationResult {
  const errors: string[] = []

  // Validate entity type if provided
  if (data.entityType && !["task", "quote", "invoice"].includes(data.entityType)) {
    errors.push("Entity type must be task, quote, or invoice")
  }

  // Validate trigger type if provided
  if (data.triggerType && !["due_soon", "overdue", "expired", "unpaid"].includes(data.triggerType)) {
    errors.push("Trigger type must be due_soon, overdue, expired, or unpaid")
  }

  // Validate days if provided
  if (data.daysBefore !== undefined) {
    if (typeof data.daysBefore !== "number" || data.daysBefore < 0) {
      errors.push("Days before must be a non-negative number")
    } else if (data.daysBefore > 365) {
      errors.push("Days before cannot exceed 365")
    }
  }

  if (data.daysAfter !== undefined) {
    if (typeof data.daysAfter !== "number" || data.daysAfter < 0) {
      errors.push("Days after must be a non-negative number")
    } else if (data.daysAfter > 365) {
      errors.push("Days after cannot exceed 365")
    }
  }

  // Validate priority if provided
  if (data.priority && !["low", "medium", "high", "urgent"].includes(data.priority)) {
    errors.push("Priority must be low, medium, high, or urgent")
  }

  // Validate task priority if provided
  if (data.taskPriority && !["low", "medium", "high", "urgent"].includes(data.taskPriority)) {
    errors.push("Task priority must be low, medium, high, or urgent")
  }

  // Validate boolean fields if provided
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    errors.push("isActive must be a boolean")
  }

  if (data.autoCreateTask !== undefined && typeof data.autoCreateTask !== "boolean") {
    errors.push("autoCreateTask must be a boolean")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}