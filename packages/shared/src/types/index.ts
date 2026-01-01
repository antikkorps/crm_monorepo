// Core type definitions for Medical CRM
export * from "./billing"
export * from "./collaboration"
export * from "./common"
export * from "./document-template"
export * from "./document-version"
export * from "./medical-institution"
export * from "./opportunity"
export * from "./segmentation"
export * from "./task"
export * from "./user"

// Re-export commonly used collaboration types for convenience
export { ReminderStatus, ReminderPriority, CallType } from "./collaboration"
