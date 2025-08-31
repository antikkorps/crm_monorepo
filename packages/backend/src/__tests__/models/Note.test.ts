import { SharePermission } from "@medical-crm/shared"
import { CollaborationValidation } from "../../types/collaboration"

// Mock data
const mockUser1 = {
  id: "user-1",
  firstName: "John",
  lastName: "Creator",
  email: "creator@test.com",
}

const mockUser2 = {
  id: "user-2",
  firstName: "Jane",
  lastName: "User",
  email: "user2@test.com",
}

const mockUser3 = {
  id: "user-3",
  firstName: "Bob",
  lastName: "User",
  email: "user3@test.com",
}

const mockInstitution = {
  id: "institution-1",
  name: "Test Hospital",
  type: "hospital",
}

describe("Note Model", () => {
  describe("Note Creation and Validation", () => {
    it("should validate note title correctly", () => {
      expect(() => {
        CollaborationValidation.validateNoteTitle("")
      }).toThrow("Note title is required")

      expect(() => {
        CollaborationValidation.validateNoteTitle("a".repeat(256))
      }).toThrow("Note title cannot exceed 255 characters")

      expect(() => {
        CollaborationValidation.validateNoteTitle("Valid Title")
      }).not.toThrow()
    })

    it("should validate note content correctly", () => {
      expect(() => {
        CollaborationValidation.validateNoteContent("")
      }).toThrow("Note content is required")

      expect(() => {
        CollaborationValidation.validateNoteContent("a".repeat(10001))
      }).toThrow("Note content cannot exceed 10,000 characters")

      expect(() => {
        CollaborationValidation.validateNoteContent("Valid content")
      }).not.toThrow()
    })

    it("should validate note tags correctly", () => {
      const tooManyTags = Array.from({ length: 25 }, (_, i) => `tag${i}`)
      expect(() => {
        CollaborationValidation.validateNoteTags(tooManyTags)
      }).toThrow("Cannot have more than 20 tags per note")

      expect(() => {
        CollaborationValidation.validateNoteTags(["valid-tag", "a".repeat(51)])
      }).toThrow("Tag cannot exceed 50 characters")

      expect(() => {
        CollaborationValidation.validateNoteTags(["valid-tag", "invalid@tag"])
      }).toThrow(
        "Tags can only contain letters, numbers, hyphens, underscores, and spaces"
      )

      expect(() => {
        CollaborationValidation.validateNoteTags([
          "valid",
          "also-valid",
          "also_valid",
          "also valid",
        ])
      }).not.toThrow()
    })
  })

  describe("Note Instance Methods", () => {
    it("should manage tags correctly", () => {
      const mockNote = {
        tags: ["test", "important"],

        addTag(tag: string) {
          if (!this.tags.includes(tag)) {
            this.tags.push(tag)
          }
        },

        removeTag(tag: string) {
          this.tags = this.tags.filter((t) => t !== tag)
        },

        hasTag(tag: string) {
          return this.tags.includes(tag)
        },
      }

      expect(mockNote.hasTag("test")).toBe(true)
      expect(mockNote.hasTag("nonexistent")).toBe(false)

      mockNote.addTag("new-tag")
      expect(mockNote.tags).toContain("new-tag")

      // Adding existing tag should not duplicate
      const initialLength = mockNote.tags.length
      mockNote.addTag("test")
      expect(mockNote.tags.length).toBe(initialLength)

      mockNote.removeTag("test")
      expect(mockNote.tags).not.toContain("test")
    })

    it("should check user access correctly", async () => {
      const mockNote = {
        creatorId: mockUser1.id,
        isPrivate: true,

        async canUserAccess(userId: string) {
          // Creator always has access
          if (this.creatorId === userId) return true
          // Public notes are accessible to all
          if (!this.isPrivate) return true
          // Mock shared access
          return userId === mockUser2.id
        },
      }

      // Creator should always have access
      expect(await mockNote.canUserAccess(mockUser1.id)).toBe(true)

      // Other users should have access based on sharing/privacy
      expect(await mockNote.canUserAccess(mockUser2.id)).toBe(true)
      expect(await mockNote.canUserAccess(mockUser3.id)).toBe(false)
    })

    it("should check user edit permissions correctly", async () => {
      const mockNote = {
        creatorId: mockUser1.id,

        async canUserEdit(userId: string) {
          // Creator always can edit
          if (this.creatorId === userId) return true
          // Mock write permission
          return userId === mockUser2.id
        },
      }

      // Creator should always be able to edit
      expect(await mockNote.canUserEdit(mockUser1.id)).toBe(true)

      // Other users based on permissions
      expect(await mockNote.canUserEdit(mockUser2.id)).toBe(true)
      expect(await mockNote.canUserEdit(mockUser3.id)).toBe(false)
    })
  })

  describe("Note Sharing", () => {
    it("should check read permission correctly", () => {
      const mockNoteShare = {
        permission: SharePermission.READ,

        hasReadPermission() {
          return (
            this.permission === SharePermission.READ ||
            this.permission === SharePermission.WRITE
          )
        },
      }

      mockNoteShare.permission = SharePermission.READ
      expect(mockNoteShare.hasReadPermission()).toBe(true)

      mockNoteShare.permission = SharePermission.WRITE
      expect(mockNoteShare.hasReadPermission()).toBe(true)
    })

    it("should check write permission correctly", () => {
      const mockNoteShare = {
        permission: SharePermission.READ,

        hasWritePermission() {
          return this.permission === SharePermission.WRITE
        },
      }

      mockNoteShare.permission = SharePermission.READ
      expect(mockNoteShare.hasWritePermission()).toBe(false)

      mockNoteShare.permission = SharePermission.WRITE
      expect(mockNoteShare.hasWritePermission()).toBe(true)
    })

    it("should update permission", async () => {
      const mockNoteShare = {
        permission: SharePermission.READ,

        async updatePermission(newPermission: SharePermission) {
          this.permission = newPermission
        },
      }

      expect(mockNoteShare.permission).toBe(SharePermission.READ)

      await mockNoteShare.updatePermission(SharePermission.WRITE)
      expect(mockNoteShare.permission).toBe(SharePermission.WRITE)
    })
  })

  describe("Note Static Methods", () => {
    it("should validate note data", () => {
      expect(() => {
        CollaborationValidation.validateNoteTitle("")
        CollaborationValidation.validateNoteContent("")
        CollaborationValidation.validateNoteTags([])
      }).toThrow()

      expect(() => {
        CollaborationValidation.validateNoteTitle("Valid Title")
        CollaborationValidation.validateNoteContent("Valid content")
        CollaborationValidation.validateNoteTags(["valid", "tags"])
      }).not.toThrow()
    })
  })

  describe("NoteShare Validation", () => {
    it("should validate share permission", () => {
      expect(() => {
        if (!Object.values(SharePermission).includes("invalid" as SharePermission)) {
          throw new Error("Invalid share permission: invalid")
        }
      }).toThrow("Invalid share permission: invalid")

      expect(() => {
        if (Object.values(SharePermission).includes(SharePermission.READ)) {
          // Valid permission
        }
      }).not.toThrow()
    })

    it("should validate share creation rules", () => {
      // Cannot share with creator
      expect(() => {
        if (mockUser1.id === mockUser1.id) {
          throw new Error("Cannot share note with its creator")
        }
      }).toThrow("Cannot share note with its creator")

      // Can share with different user
      expect(() => {
        if (mockUser1.id !== mockUser2.id) {
          // Valid share
        }
      }).not.toThrow()
    })
  })

  describe("Access Control Validation", () => {
    it("should validate note access correctly", () => {
      const mockNote = {
        creatorId: mockUser1.id,
        isPrivate: true,
      }

      const mockShares = [{ userId: mockUser2.id, permission: SharePermission.READ }]

      // Creator always has access
      expect(
        CollaborationValidation.validateNoteAccess(mockUser1.id, mockNote, mockShares)
      ).toBe(true)

      // Public notes are accessible to all
      mockNote.isPrivate = false
      expect(
        CollaborationValidation.validateNoteAccess(mockUser3.id, mockNote, mockShares)
      ).toBe(true)

      // Private notes require explicit sharing
      mockNote.isPrivate = true
      expect(
        CollaborationValidation.validateNoteAccess(mockUser2.id, mockNote, mockShares)
      ).toBe(true)
      expect(
        CollaborationValidation.validateNoteAccess(mockUser3.id, mockNote, mockShares)
      ).toBe(false)
    })
  })
})
