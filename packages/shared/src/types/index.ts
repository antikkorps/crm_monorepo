// Core type definitions for OPEx_CRM
export * from "./billing"
export * from "./collaboration"
export * from "./common"
export * from "./document-template"
export * from "./document-version"
export * from "./engagement-letter"
export * from "./medical-institution"
export * from "./opportunity"
export * from "./segmentation"
export * from "./task"
export * from "./user"

// Re-export commonly used collaboration types for convenience
export { CallType, ReminderPriority } from "./collaboration"
export type { ReminderStatus } from "./collaboration"
