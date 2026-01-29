import { Context } from "koa"
import { CatalogItem } from "../models/CatalogItem"
import { requirePermission } from "../middleware/permissions"
import { Op } from "sequelize"

export class CatalogController {
  /**
   * Get all catalog items with filtering and pagination
   * GET /api/catalog
   */
  static async getAll(ctx: Context) {
    try {

      const {
        page = 1,
        limit = 20,
        search,
        category,
        isActive = "true",
        sortBy = "name",
        sortOrder = "ASC",
      } = ctx.query

      const offset = (Number(page) - 1) * Number(limit)
      const where: any = {}

      // Filter by active status
      if (isActive !== "all") {
        where.isActive = isActive === "true"
      }

      // Filter by category
      if (category && category !== "all") {
        where.category = category
      }

      // Search filter
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { sku: { [Op.iLike]: `%${search}%` } },
          { category: { [Op.iLike]: `%${search}%` } },
        ]
      }

      const { count, rows } = await CatalogItem.findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        order: [[sortBy as string, sortOrder as string]],
        include: [
          {
            model: require("../models/User").User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      ctx.body = {
        items: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit)),
        },
      }
    } catch (error) {
      console.error("Error fetching catalog items:", error)
      ctx.status = 500
      ctx.body = { error: "Failed to fetch catalog items" }
    }
  }

  /**
   * Get a single catalog item by ID
   * GET /api/catalog/:id
   */
  static async getById(ctx: Context) {
    try {

      const item = await CatalogItem.findByPk(ctx.params.id, {
        include: [
          {
            model: require("../models/User").User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      if (!item) {
        ctx.status = 404
        ctx.body = { error: "Catalog item not found" }
        return
      }

      ctx.body = item
    } catch (error) {
      console.error("Error fetching catalog item:", error)
      ctx.status = 500
      ctx.body = { error: "Failed to fetch catalog item" }
    }
  }

  /**
   * Create a new catalog item
   * POST /api/catalog
   */
  static async create(ctx: Context) {
    try {
      const user = ctx.state.user
      const body = ctx.request.body as any

      const {
        name,
        description,
        category,
        unitPrice,
        taxRate = 0,
        sku,
        unit,
      } = body

      // Validation
      if (!name || !unitPrice) {
        ctx.status = 400
        ctx.body = { error: "Name and unit price are required" }
        return
      }

      if (Number(unitPrice) < 0) {
        ctx.status = 400
        ctx.body = { error: "Unit price must be positive" }
        return
      }

      if (Number(taxRate) < 0 || Number(taxRate) > 100) {
        ctx.status = 400
        ctx.body = { error: "Tax rate must be between 0 and 100" }
        return
      }

      // Check SKU uniqueness if provided
      if (sku) {
        const existingItem = await CatalogItem.findOne({ where: { sku } })
        if (existingItem) {
          ctx.status = 400
          ctx.body = { error: "SKU already exists" }
          return
        }
      }

      const item = await CatalogItem.createItem({
        name: name.trim(),
        description: description?.trim(),
        category: category?.trim(),
        unitPrice: Number(unitPrice),
        taxRate: Number(taxRate),
        sku: sku?.trim(),
        unit: unit?.trim(),
        createdBy: user?.id || "",
      })

      const createdItem = await CatalogItem.findByPk(item.id, {
        include: [
          {
            model: require("../models/User").User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      // Always return 201 with a JSON body
      ctx.status = 201
      ctx.body = createdItem ?? item
    } catch (error) {
      console.error("Error creating catalog item:", error)
      ctx.status = 500
      ctx.body = { error: "Failed to create catalog item" }
    }
  }

  /**
   * Update a catalog item
   * PUT /api/catalog/:id
   */
  static async update(ctx: Context) {
    try {
      const item = await CatalogItem.findByPk(ctx.params.id)

      if (!item) {
        ctx.status = 404
        ctx.body = { error: "Catalog item not found" }
        return
      }

      const body = ctx.request.body as any
      const {
        name,
        description,
        category,
        unitPrice,
        taxRate,
        sku,
        unit,
        isActive,
      } = body

      // Validation
      if (name && !name.trim()) {
        ctx.status = 400
        ctx.body = { error: "Name cannot be empty" }
        return
      }

      if (unitPrice !== undefined && Number(unitPrice) < 0) {
        ctx.status = 400
        ctx.body = { error: "Unit price must be positive" }
        return
      }

      if (taxRate !== undefined && (Number(taxRate) < 0 || Number(taxRate) > 100)) {
        ctx.status = 400
        ctx.body = { error: "Tax rate must be between 0 and 100" }
        return
      }

      // Check SKU uniqueness if provided and different from current
      // Use get() to avoid class field shadowing Sequelize getter
      const currentSku = item.get('sku') as string | null
      if (sku && sku !== currentSku) {
        const existingItem = await CatalogItem.findOne({ where: { sku } })
        if (existingItem) {
          ctx.status = 400
          ctx.body = { error: "SKU already exists" }
          return
        }
      }

      // Update fields
      const updates: any = {}
      if (name !== undefined) updates.name = name.trim()
      if (description !== undefined) updates.description = description?.trim()
      if (category !== undefined) updates.category = category?.trim()
      if (unitPrice !== undefined) updates.unitPrice = Number(unitPrice)
      if (taxRate !== undefined) updates.taxRate = Number(taxRate)
      if (sku !== undefined) updates.sku = sku?.trim()
      if (unit !== undefined) updates.unit = unit?.trim()
      if (isActive !== undefined) updates.isActive = Boolean(isActive)

      await item.update(updates)

      const updatedItem = await CatalogItem.findByPk(item.id, {
        include: [
          {
            model: require("../models/User").User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      // Ensure a JSON body is returned
      ctx.body = updatedItem ?? item
    } catch (error) {
      console.error("Error updating catalog item:", error)
      ctx.status = 500
      ctx.body = { error: "Failed to update catalog item" }
    }
  }

  /**
   * Delete a catalog item
   * DELETE /api/catalog/:id
   */
  static async delete(ctx: Context) {
    try {

      const item = await CatalogItem.findByPk(ctx.params.id)

      if (!item) {
        ctx.status = 404
        ctx.body = { error: "Catalog item not found" }
        return
      }

      await item.destroy()

      ctx.status = 204
    } catch (error) {
      console.error("Error deleting catalog item:", error)
      ctx.status = 500
      ctx.body = { error: "Failed to delete catalog item" }
    }
  }

  /**
   * Get all categories
   * GET /api/catalog/categories
   */
  static async getCategories(ctx: Context) {
    try {

      const categories = await CatalogItem.getCategories()

      ctx.body = { categories }
    } catch (error) {
      console.error("Error fetching categories:", error)
      ctx.status = 500
      ctx.body = { error: "Failed to fetch categories" }
    }
  }

  /**
   * Search catalog items
   * GET /api/catalog/search?q=query
   */
  static async search(ctx: Context) {
    try {

      const { q: query } = ctx.query

      if (!query || typeof query !== "string") {
        ctx.status = 400
        ctx.body = { error: "Query parameter 'q' is required" }
        return
      }

      const items = await CatalogItem.searchItems(query)

      ctx.body = { items }
    } catch (error) {
      console.error("Error searching catalog items:", error)
      ctx.status = 500
      ctx.body = { error: "Failed to search catalog items" }
    }
  }

  /**
   * Toggle item active status
   * PATCH /api/catalog/:id/toggle
   */
  static async toggleActive(ctx: Context) {
    try {

      const item = await CatalogItem.findByPk(ctx.params.id)

      if (!item) {
        ctx.status = 404
        ctx.body = { error: "Catalog item not found" }
        return
      }

      if (item.isActive) {
        await item.deactivate()
      } else {
        await item.activate()
      }

      const updatedItem = await CatalogItem.findByPk(item.id, {
        include: [
          {
            model: require("../models/User").User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
        ],
      })

      // Ensure a JSON body is returned
      ctx.body = updatedItem ?? item
    } catch (error) {
      console.error("Error toggling catalog item status:", error)
      ctx.status = 500
      ctx.body = { error: "Failed to toggle catalog item status" }
    }
  }
}
