import { Context } from "koa"
import {
  DocumentTemplateCreationAttributes,
  TemplateType,
} from "../models/DocumentTemplate"
import { DocumentTemplateService } from "../services/DocumentTemplateService"
import logger from "../utils/logger"

export class DocumentTemplateController {
  private templateService: DocumentTemplateService

  constructor() {
    this.templateService = new DocumentTemplateService()
  }

  public async createTemplate(ctx: Context): Promise<void> {
    try {
      const userId = ctx.state?.user?.id || ctx.state
      const templateData = ctx.request.body

      if (typeof userId === "string") {
        const template = await this.templateService.createTemplate(
          templateData as DocumentTemplateCreationAttributes,
          userId
        )
        ctx.status = 201
        ctx.body = {
          success: true,
          data: template,
        }
      } else {
        throw new Error("User ID not found in context")
      }
    } catch (error) {
      logger.error("Error creating document template:", error)
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  public async getTemplates(ctx: Context): Promise<void> {
    try {
      const { type } = ctx.query
      const templateType = type as TemplateType

      const templates = await this.templateService.getTemplates(templateType)

      ctx.status = 200
      ctx.body = {
        success: true,
        data: templates,
      }
    } catch (error) {
      logger.error("Error getting document templates:", error)
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  public async getTemplate(ctx: Context): Promise<void> {
    try {
      const { id } = ctx.params

      const template = await this.templateService.getTemplate(id)

      if (!template) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: "Template not found",
        }
        return
      }

      ctx.status = 200
      ctx.body = {
        success: true,
        data: template,
      }
    } catch (error) {
      logger.error("Error getting document template:", error)
      ctx.status = 500
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  public async updateTemplate(ctx: Context): Promise<void> {
    try {
      const { id } = ctx.params
      const userId = ctx.state?.user?.id || ctx.state
      const updates = ctx.request.body

      if (typeof userId !== "string") {
        throw new Error("User ID not found in context")
      }

      const template = await this.templateService.updateTemplate(
        id,
        updates as Partial<DocumentTemplateCreationAttributes>,
        userId
      )

      ctx.status = 200
      ctx.body = {
        success: true,
        data: template,
      }
    } catch (error) {
      logger.error("Error updating document template:", error)
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  public async deleteTemplate(ctx: Context): Promise<void> {
    try {
      const { id } = ctx.params

      await this.templateService.deleteTemplate(id)

      ctx.status = 200
      ctx.body = {
        success: true,
        message: "Template deleted successfully",
      }
    } catch (error) {
      logger.error("Error deleting document template:", error)
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  public async setDefaultTemplate(ctx: Context): Promise<void> {
    try {
      const { id } = ctx.params

      const template = await this.templateService.setDefaultTemplate(id)

      ctx.status = 200
      ctx.body = {
        success: true,
        data: template,
      }
    } catch (error) {
      logger.error("Error setting default template:", error)
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  public async duplicateTemplate(ctx: Context): Promise<void> {
    try {
      const { id } = ctx.params
      const { name } = ctx.request.body as { name: string }
      const userId = ctx.state?.user?.id

      if (!name) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: "Template name is required",
        }
        return
      }

      if (typeof userId !== "string") {
        throw new Error("User ID not found in context")
      }
      const template = await this.templateService.duplicateTemplate(id, name, userId)

      ctx.status = 201
      ctx.body = {
        success: true,
        data: template,
      }
    } catch (error) {
      logger.error("Error duplicating template:", error)
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  public async uploadLogo(ctx: Context): Promise<void> {
    try {
      const { templateId } = ctx.params
      const file = ctx.request.file

      if (!file) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: "No file uploaded",
        }
        return
      }

      const result = await this.templateService.uploadLogo(file, templateId)

      ctx.status = 200
      ctx.body = {
        success: true,
        data: result,
      }
    } catch (error) {
      logger.error("Error uploading logo:", error)
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  public async previewTemplate(ctx: Context): Promise<void> {
    try {
      const { id } = ctx.params
      const sampleData = ctx.request.body

      const html = await this.templateService.previewTemplate(id, sampleData)

      ctx.status = 200
      ctx.type = "text/html"
      ctx.body = html
    } catch (error) {
      logger.error("Error previewing template:", error)
      ctx.status = 400
      ctx.body = {
        success: false,
        error: (error as Error).message,
      }
    }
  }
}

export default DocumentTemplateController
