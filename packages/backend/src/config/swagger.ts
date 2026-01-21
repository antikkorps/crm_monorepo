import Router from "@koa/router"
import type Koa from "koa"
import { koaSwagger } from "koa2-swagger-ui"
import swaggerJsdoc from "swagger-jsdoc"

/**
 * Swagger/OpenAPI configuration for OPEx_CRM API
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "OPEx_CRM API",
      version: "1.0.0",
      description:
        "API Documentation for OPEx_CRM - A comprehensive B2B CRM solution for medical institutions",
      contact: {
        name: "API Support",
        email: "support@medical-crm.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:4000",
        description: "Development server",
      },
      {
        url: "https://staging-api.medical-crm.com",
        description: "Staging server",
      },
      {
        url: "https://api.medical-crm.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token obtained from /api/auth/login endpoint",
        },
      },
      schemas: {
        // Common schemas
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: {
              type: "integer",
              example: 1,
            },
            limit: {
              type: "integer",
              example: 20,
            },
            total: {
              type: "integer",
              example: 100,
            },
            totalPages: {
              type: "integer",
              example: 5,
            },
          },
        },
        // Medical Institution
        MedicalInstitution: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            name: {
              type: "string",
              example: "Hôpital Central",
            },
            type: {
              type: "string",
              enum: [
                "hospital",
                "clinic",
                "laboratory",
                "pharmacy",
                "nursing_home",
                "medical_center",
                "other",
              ],
              example: "hospital",
            },
            isActive: {
              type: "boolean",
              example: true,
            },
            address: {
              type: "object",
              properties: {
                street: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                zipCode: { type: "string" },
                country: { type: "string" },
              },
            },
            phone: { type: "string" },
            email: { type: "string", format: "email" },
            website: { type: "string", format: "uri" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
            assignedUserId: {
              type: "string",
              format: "uuid",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        // Opportunity
        Opportunity: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Équipement Scanner IRM" },
            stage: {
              type: "string",
              enum: [
                "prospecting",
                "qualification",
                "proposal",
                "negotiation",
                "closed_won",
                "closed_lost",
              ],
              example: "proposal",
            },
            value: {
              type: "number",
              format: "decimal",
              example: 50000,
            },
            probability: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              example: 75,
            },
            expectedCloseDate: {
              type: "string",
              format: "date",
            },
            institutionId: {
              type: "string",
              format: "uuid",
            },
            assignedUserId: {
              type: "string",
              format: "uuid",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        // Quote
        Quote: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            quoteNumber: { type: "string", example: "Q-2024-001" },
            institutionId: { type: "string", format: "uuid" },
            contactPersonId: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: ["draft", "sent", "accepted", "rejected", "expired"],
              example: "sent",
            },
            subtotal: { type: "number", format: "decimal" },
            taxAmount: { type: "number", format: "decimal" },
            totalAmount: { type: "number", format: "decimal" },
            validUntil: { type: "string", format: "date" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "integer" },
                  unitPrice: { type: "number" },
                  taxRate: { type: "number" },
                  total: { type: "number" },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        // Invoice
        Invoice: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            invoiceNumber: { type: "string", example: "INV-2024-001" },
            institutionId: { type: "string", format: "uuid" },
            status: {
              type: "string",
              enum: ["draft", "sent", "paid", "overdue", "cancelled"],
              example: "sent",
            },
            subtotal: { type: "number", format: "decimal" },
            taxAmount: { type: "number", format: "decimal" },
            totalAmount: { type: "number", format: "decimal" },
            paidAmount: { type: "number", format: "decimal" },
            dueDate: { type: "string", format: "date" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "integer" },
                  unitPrice: { type: "number" },
                  taxRate: { type: "number" },
                  total: { type: "number" },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        // Task
        Task: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string", example: "Appeler le client" },
            description: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "in_progress", "completed", "cancelled"],
              example: "pending",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              example: "high",
            },
            dueDate: { type: "string", format: "date-time" },
            assigneeId: { type: "string", format: "uuid" },
            institutionId: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        // Lead Score
        LeadScore: {
          type: "object",
          properties: {
            institutionId: { type: "string", format: "uuid" },
            institutionName: { type: "string" },
            score: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              example: 85,
            },
            level: {
              type: "string",
              enum: ["hot", "warm", "cold"],
              example: "hot",
            },
            factors: {
              type: "object",
              properties: {
                sizeScore: { type: "integer", example: 18 },
                specialtyMatchScore: { type: "integer", example: 15 },
                engagementScore: { type: "integer", example: 25 },
                budgetScore: { type: "integer", example: 17 },
                responseScore: { type: "integer", example: 10 },
              },
            },
            signals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["positive", "negative", "neutral"],
                  },
                  signal: { type: "string" },
                  impact: { type: "integer" },
                },
              },
            },
            recommendations: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "User authentication and session management",
      },
      {
        name: "Medical Institutions",
        description: "Manage medical institutions (hospitals, clinics, etc.)",
      },
      {
        name: "Opportunities",
        description: "Sales pipeline and opportunity management",
      },
      {
        name: "Quotes",
        description: "Quote creation and management",
      },
      {
        name: "Invoices",
        description: "Invoice creation and payment tracking",
      },
      {
        name: "Tasks",
        description: "Task management and assignment",
      },
      {
        name: "Meetings",
        description: "Meeting scheduling and calendar integration",
      },
      {
        name: "Calls",
        description: "Call logging and tracking",
      },
      {
        name: "Notes",
        description: "Note-taking and sharing",
      },
      {
        name: "Reminders",
        description: "Reminder creation and notifications",
      },
      {
        name: "Analytics",
        description: "Business intelligence and insights",
      },
      {
        name: "Webhooks",
        description: "Webhook configuration and management",
      },
      {
        name: "Users",
        description: "User management",
      },
      {
        name: "Teams",
        description: "Team management and organization",
      },
    ],
  },
  // Paths to files containing OpenAPI definitions
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts", "./src/models/*.ts"],
}

/**
 * Generate OpenAPI specification
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions)

/**
 * Setup Swagger UI middleware
 */
export function setupSwagger(app: Koa) {
  const router = new Router()

  // Serve Swagger UI
  router.get(
    "/api-docs",
    koaSwagger({
      routePrefix: false,
      swaggerOptions: {
        spec: swaggerSpec as Record<string, unknown>,
      },
      title: "OPEx_CRM API Documentation",
      favicon: "/favicon.ico",
    }),
  )

  // Serve OpenAPI JSON spec
  router.get("/api-docs.json", async (ctx) => {
    ctx.body = swaggerSpec
    ctx.type = "application/json"
  })

  app.use(router.routes())
  app.use(router.allowedMethods())

  console.log("📚 Swagger UI available at: http://localhost:4000/api-docs")
  console.log("📄 OpenAPI spec available at: http://localhost:4000/api-docs.json")
}
