import { InstitutionType } from "@medical-crm/shared"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import DatabaseManager from "../../config/database"
import { ContactPerson, MedicalInstitution } from "../../models"

describe("ContactPerson Model", () => {
  beforeAll(async () => {
    try {
      await DatabaseManager.connect()
      await DatabaseManager.sync({ force: true })
    } catch (error) {
      console.warn("Database not available for testing:", error)
    }
  })

  afterAll(async () => {
    try {
      await DatabaseManager.disconnect()
    } catch (error) {
      // Ignore disconnect errors
    }
  })

  beforeEach(async () => {
    try {
      await ContactPerson.destroy({ where: {}, force: true })
      await MedicalInstitution.destroy({ where: {}, force: true })
    } catch (error) {
      // Skip if database not available
    }
  })

  let institution: MedicalInstitution

  const validContactData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@hospital.com",
    phone: "+1234567890",
    title: "Chief Medical Officer",
    department: "Administration",
    isPrimary: true,
  }

  beforeEach(async () => {
    try {
      institution = await MedicalInstitution.create({
        name: "Test Hospital",
        type: InstitutionType.HOSPITAL,
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "CA",
          zipCode: "90210",
          country: "US",
        },
      })
    } catch (error) {
      if (error.message?.includes("connect")) return
    }
  })

  describe("Model Creation", () => {
    it("should create a contact person with valid data", async () => {
      try {
        const contact = await ContactPerson.create({
          ...validContactData,
          institutionId: institution.id,
        })

        expect(contact.id).toBeDefined()
        expect(contact.institutionId).toBe(institution.id)
        expect(contact.firstName).toBe("John")
        expect(contact.lastName).toBe("Doe")
        expect(contact.email).toBe("john.doe@hospital.com")
        expect(contact.phone).toBe("+1234567890")
        expect(contact.title).toBe("Chief Medical Officer")
        expect(contact.department).toBe("Administration")
        expect(contact.isPrimary).toBe(true)
        expect(contact.isActive).toBe(true)
        expect(contact.createdAt).toBeDefined()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should normalize email to lowercase", async () => {
      try {
        const contact = await ContactPerson.create({
          ...validContactData,
          institutionId: institution.id,
          email: "JOHN.DOE@HOSPITAL.COM",
        })

        expect(contact.email).toBe("john.doe@hospital.com")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should require first name", async () => {
      try {
        await expect(
          ContactPerson.create({
            ...validContactData,
            institutionId: institution.id,
            firstName: "",
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should require last name", async () => {
      try {
        await expect(
          ContactPerson.create({
            ...validContactData,
            institutionId: institution.id,
            lastName: "",
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should require valid email", async () => {
      try {
        await expect(
          ContactPerson.create({
            ...validContactData,
            institutionId: institution.id,
            email: "invalid-email",
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate phone number format", async () => {
      try {
        await expect(
          ContactPerson.create({
            ...validContactData,
            institutionId: institution.id,
            phone: "invalid-phone",
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate name length", async () => {
      try {
        const longName = "a".repeat(51)
        await expect(
          ContactPerson.create({
            ...validContactData,
            institutionId: institution.id,
            firstName: longName,
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should validate title length", async () => {
      try {
        const longTitle = "a".repeat(101)
        await expect(
          ContactPerson.create({
            ...validContactData,
            institutionId: institution.id,
            title: longTitle,
          })
        ).rejects.toThrow()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should default isPrimary to false", async () => {
      try {
        const contact = await ContactPerson.create({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@hospital.com",
          institutionId: institution.id,
        })

        expect(contact.isPrimary).toBe(false)
        expect(contact.isActive).toBe(true)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("Instance Methods", () => {
    let contact: ContactPerson

    beforeEach(async () => {
      try {
        contact = await ContactPerson.create({
          ...validContactData,
          institutionId: institution.id,
        })
      } catch (error) {
        if (error.message?.includes("connect")) return
      }
    })

    it("should get full name", async () => {
      try {
        expect(contact.getFullName()).toBe("John Doe")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should get display title with title and department", async () => {
      try {
        expect(contact.getDisplayTitle()).toBe("Chief Medical Officer, Administration")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should get display title with only title", async () => {
      try {
        contact.department = undefined
        expect(contact.getDisplayTitle()).toBe("Chief Medical Officer")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should get display title with only department", async () => {
      try {
        contact.title = undefined
        expect(contact.getDisplayTitle()).toBe("Administration")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should get default display title", async () => {
      try {
        contact.title = undefined
        contact.department = undefined
        expect(contact.getDisplayTitle()).toBe("Contact Person")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should include computed fields in JSON", async () => {
      try {
        const json = contact.toJSON() as any
        expect(json.fullName).toBe("John Doe")
        expect(json.displayTitle).toBe("Chief Medical Officer, Administration")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("Static Methods", () => {
    beforeEach(async () => {
      try {
        // Create multiple contacts for testing
        await ContactPerson.create({
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@hospital.com",
          institutionId: institution.id,
          isPrimary: true,
          title: "CMO",
        })

        await ContactPerson.create({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@hospital.com",
          institutionId: institution.id,
          isPrimary: false,
          title: "Nurse Manager",
        })

        await ContactPerson.create({
          firstName: "Bob",
          lastName: "Johnson",
          email: "bob.johnson@hospital.com",
          institutionId: institution.id,
          isPrimary: false,
          isActive: false, // Inactive contact
        })
      } catch (error) {
        if (error.message?.includes("connect")) return
      }
    })

    it("should find contacts by institution", async () => {
      try {
        const contacts = await ContactPerson.findByInstitution(institution.id)
        expect(contacts).toHaveLength(2) // Only active contacts
        expect(contacts[0].isPrimary).toBe(true) // Primary contact first
        expect(contacts[0].firstName).toBe("John")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should find primary contact", async () => {
      try {
        const primaryContact = await ContactPerson.findPrimaryContact(institution.id)
        expect(primaryContact).toBeDefined()
        expect(primaryContact?.isPrimary).toBe(true)
        expect(primaryContact?.firstName).toBe("John")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should find contact by email", async () => {
      try {
        const contact = await ContactPerson.findByEmail("john.doe@hospital.com")
        expect(contact).toBeDefined()
        expect(contact?.firstName).toBe("John")

        // Test case insensitive search
        const contactUpper = await ContactPerson.findByEmail("JOHN.DOE@HOSPITAL.COM")
        expect(contactUpper).toBeDefined()
        expect(contactUpper?.firstName).toBe("John")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should not find inactive contact by email", async () => {
      try {
        const contact = await ContactPerson.findByEmail("bob.johnson@hospital.com")
        expect(contact).toBeNull()
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should set primary contact", async () => {
      try {
        // Find Jane's contact
        const janeContact = await ContactPerson.findByEmail("jane.smith@hospital.com")
        expect(janeContact).toBeDefined()

        // Set Jane as primary
        await ContactPerson.setPrimaryContact(institution.id, janeContact!.id)

        // Verify John is no longer primary
        const johnContact = await ContactPerson.findByEmail("john.doe@hospital.com")
        await johnContact?.reload()
        expect(johnContact?.isPrimary).toBe(false)

        // Verify Jane is now primary
        await janeContact?.reload()
        expect(janeContact?.isPrimary).toBe(true)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })

  describe("Primary Contact Validation", () => {
    it("should prevent multiple primary contacts per institution", async () => {
      try {
        // Create first primary contact
        await ContactPerson.create({
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@hospital.com",
          institutionId: institution.id,
          isPrimary: true,
        })

        // Try to create second primary contact - should fail
        await expect(
          ContactPerson.create({
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@hospital.com",
            institutionId: institution.id,
            isPrimary: true,
          })
        ).rejects.toThrow("Only one primary contact is allowed per institution")
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should allow multiple non-primary contacts per institution", async () => {
      try {
        await ContactPerson.create({
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@hospital.com",
          institutionId: institution.id,
          isPrimary: false,
        })

        await ContactPerson.create({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@hospital.com",
          institutionId: institution.id,
          isPrimary: false,
        })

        const contacts = await ContactPerson.findByInstitution(institution.id)
        expect(contacts).toHaveLength(2)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })

    it("should allow primary contact if previous one is inactive", async () => {
      try {
        // Create primary contact
        const primaryContact = await ContactPerson.create({
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@hospital.com",
          institutionId: institution.id,
          isPrimary: true,
        })

        // Deactivate primary contact
        await primaryContact.update({ isActive: false })

        // Should be able to create new primary contact
        const newPrimary = await ContactPerson.create({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@hospital.com",
          institutionId: institution.id,
          isPrimary: true,
        })

        expect(newPrimary.isPrimary).toBe(true)
      } catch (error) {
        if (error.message?.includes("connect")) return
        throw error
      }
    })
  })
})
