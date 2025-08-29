// Application constants

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
  },
  INSTITUTIONS: {
    BASE: "/api/institutions",
    SEARCH: "/api/institutions/search",
    IMPORT: "/api/institutions/import",
  },
  TASKS: {
    BASE: "/api/tasks",
    ASSIGNED: "/api/tasks/assigned",
  },
  INVOICES: {
    BASE: "/api/invoices",
    PDF: "/api/invoices/:id/pdf",
  },
  WEBHOOKS: {
    BASE: "/api/webhooks",
    LOGS: "/api/webhooks/:id/logs",
  },
} as const

export const SOCKET_EVENTS = {
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  JOIN_ROOM: "join-room",
  NOTIFICATION: "notification",
  TASK_ASSIGNED: "task-assigned",
  INSTITUTION_UPDATED: "institution-updated",
} as const
