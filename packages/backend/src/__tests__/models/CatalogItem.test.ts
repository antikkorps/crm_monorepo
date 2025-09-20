import { CatalogItem } from "../../models/CatalogItem"
import { User } from "../../models/User"
import { sequelize } from "../../config/database"
import { v4 as uuidv4 } from "uuid"

describe("CatalogItem Model", () => {
  let testUser: User

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    // Create a test user
    testUser = await User.create({
      id: uuidv4(),
      firstName: "Test",
      lastName: "User",
      email: "test@catalog.com",
      password: "hashedpassword",
      role: "USER",
    })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await CatalogItem.destroy({ where: {} })
  })

  describe("Model Creation", () => {
    it("should create a catalog item with required fields", async () => {
      const itemData = {
        name: "Test Service",
        unitPrice: 100.50,
        taxRate: 20,
        createdBy: testUser.id,
      }

      const item = await CatalogItem.createItem(itemData)

      expect(item).toBeDefined()
      expect(item.name).toBe(itemData.name)
      expect(item.unitPrice).toBe(itemData.unitPrice)
      expect(item.taxRate).toBe(itemData.taxRate)
      expect(item.isActive).toBe(true)
      expect(item.createdBy).toBe(testUser.id)
    })

    it("should create a catalog item with all optional fields", async () => {
      const itemData = {
        name: "Complete Service",
        description: "A comprehensive service package",
        category: "Software",
        unitPrice: 250.75,
        taxRate: 19.6,
        sku: "SRV-001",
        unit: "hour",
        createdBy: testUser.id,
      }

      const item = await CatalogItem.createItem(itemData)

      expect(item.description).toBe(itemData.description)
      expect(item.category).toBe(itemData.category)
      expect(item.sku).toBe(itemData.sku)
      expect(item.unit).toBe(itemData.unit)
    })

    it("should enforce unique SKU constraint", async () => {
      const sku = "UNIQUE-SKU-001"

      await CatalogItem.createItem({
        name: "First Item",
        unitPrice: 100,
        taxRate: 20,
        sku,
        createdBy: testUser.id,
      })

      await expect(
        CatalogItem.createItem({
          name: "Second Item",
          unitPrice: 200,
          taxRate: 20,
          sku,
          createdBy: testUser.id,
        })
      ).rejects.toThrow()
    })

    it("should validate unit price is positive", async () => {
      await expect(
        CatalogItem.create({
          name: "Invalid Item",
          unitPrice: -50,
          taxRate: 20,
          createdBy: testUser.id,
        })
      ).rejects.toThrow()
    })

    it("should validate tax rate range", async () => {
      await expect(
        CatalogItem.create({
          name: "Invalid Tax Item",
          unitPrice: 100,
          taxRate: 150, // Invalid: > 100
          createdBy: testUser.id,
        })
      ).rejects.toThrow()
    })
  })

  describe("Instance Methods", () => {
    let testItem: CatalogItem

    beforeEach(async () => {
      testItem = await CatalogItem.createItem({
        name: "Test Item",
        unitPrice: 100,
        taxRate: 20,
        createdBy: testUser.id,
      })
    })

    it("should activate an item", async () => {
      testItem.isActive = false
      await testItem.save()

      await testItem.activate()

      expect(testItem.isActive).toBe(true)
    })

    it("should deactivate an item", async () => {
      expect(testItem.isActive).toBe(true)

      await testItem.deactivate()

      expect(testItem.isActive).toBe(false)
    })
  })

  describe("Static Methods", () => {
    beforeEach(async () => {
      // Create test items
      await CatalogItem.createItem({
        name: "Software Development",
        description: "Custom software development service",
        category: "Software",
        unitPrice: 150,
        taxRate: 20,
        sku: "SW-DEV-001",
        unit: "hour",
        createdBy: testUser.id,
      })

      await CatalogItem.createItem({
        name: "Consulting",
        description: "Technical consulting service",
        category: "Consulting",
        unitPrice: 200,
        taxRate: 20,
        sku: "CONS-001",
        unit: "hour",
        createdBy: testUser.id,
      })

      const inactiveItem = await CatalogItem.createItem({
        name: "Inactive Service",
        category: "Software",
        unitPrice: 100,
        taxRate: 20,
        createdBy: testUser.id,
      })
      await inactiveItem.deactivate()
    })

    it("should get active items only", async () => {
      const activeItems = await CatalogItem.getActiveItems()

      expect(activeItems).toHaveLength(2)
      expect(activeItems.every(item => item.isActive)).toBe(true)
    })

    it("should search items by name, description, and SKU", async () => {
      const searchResults = await CatalogItem.searchItems("software")

      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].name).toBe("Software Development")
    })

    it("should search items by SKU", async () => {
      const searchResults = await CatalogItem.searchItems("CONS-001")

      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].name).toBe("Consulting")
    })

    it("should get items by category", async () => {
      const softwareItems = await CatalogItem.getItemsByCategory("Software")

      expect(softwareItems).toHaveLength(1)
      expect(softwareItems[0].name).toBe("Software Development")
    })

    it("should get all categories", async () => {
      const categories = await CatalogItem.getCategories()

      expect(categories).toContain("Software")
      expect(categories).toContain("Consulting")
      expect(categories).toHaveLength(2)
    })

    it("should include creator information in queries", async () => {
      const items = await CatalogItem.getActiveItems()

      expect(items[0].creator).toBeDefined()
      expect(items[0].creator?.firstName).toBe("Test")
      expect(items[0].creator?.lastName).toBe("User")
    })
  })
})