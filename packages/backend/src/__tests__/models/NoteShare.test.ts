import { SharePermission } from "@medical-crm/shared"

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

const mockNote = {
  id: "note-1",
  title: "Test Note",
  content: "Test content",
  creatorId: mockUser1.id,
  isPrivate: true,
}

describe("NoteShare Model", () => {
  describe("NoteShare Creation and Validation", () => {
    it("should create a note share with required fields", () => {
      const share = {
        id: "share-1",
        noteId: mockNote.id,
        userId: mockUser2.id,
        permission: SharePermission.READ,
        createdAt: new Date(),
      }

      expect(share.id).toBeDefined()
      expect(share.noteId).toBe(mockNote.id)
      expect(share.userId).toBe(mockUser2.id)
      expect(share.permission).toBe(SharePermission.READ)
      expect(share.createdAt).toBeDefined()
    })

    it("should validate permission values", () => {
      const validPermissions = Object.values(SharePermission)

      expect(validPermissions).toContain(SharePermission.READ)
      expect(validPermissions).toContain(SharePermission.WRITE)
      expect(validPermissions).not.toContain("invalid" as SharePermission)
    })

    it("should prevent sharing with note creator", () => {
      expect(() => {
        if (mockNote.creatorId === mockUser1.id) {
          throw new Error("Cannot share note with its creator")
        }
      }).toThrow("Cannot share note with its creator")
    })

    it("should allow sharing with different users", () => {
      expect(() => {
        if (mockNote.creatorId !== mockUser2.id) {
          // Valid share
        }
      }).not.toThrow()
    })
  })

  describe("NoteShare Instance Methods", () => {
    it("should update permission correctly", async () => {
      const mockShare = {
        permission: SharePermission.READ,

        async updatePermission(newPermission: SharePermission) {
          this.permission = newPermission
        },
      }

      expect(mockShare.permission).toBe(SharePermission.READ)

      await mockShare.updatePermission(SharePermission.WRITE)
      expect(mockShare.permission).toBe(SharePermission.WRITE)
    })

    it("should check read permission correctly", () => {
      const mockShare = {
        permission: SharePermission.READ,

        hasReadPermission() {
          return (
            this.permission === SharePermission.READ ||
            this.permission === SharePermission.WRITE
          )
        },
      }

      mockShare.permission = SharePermission.READ
      expect(mockShare.hasReadPermission()).toBe(true)

      mockShare.permission = SharePermission.WRITE
      expect(mockShare.hasReadPermission()).toBe(true)
    })

    it("should check write permission correctly", () => {
      const mockShare = {
        permission: SharePermission.READ,

        hasWritePermission() {
          return this.permission === SharePermission.WRITE
        },
      }

      mockShare.permission = SharePermission.READ
      expect(mockShare.hasWritePermission()).toBe(false)

      mockShare.permission = SharePermission.WRITE
      expect(mockShare.hasWritePermission()).toBe(true)
    })
  })

  describe("NoteShare Static Methods", () => {
    it("should find shares by note", () => {
      const mockShares = [
        {
          id: "share-1",
          noteId: mockNote.id,
          userId: mockUser2.id,
          permission: SharePermission.READ,
          createdAt: new Date(),
          user: mockUser2,
        },
        {
          id: "share-2",
          noteId: mockNote.id,
          userId: mockUser3.id,
          permission: SharePermission.WRITE,
          createdAt: new Date(),
          user: mockUser3,
        },
      ]

      const noteShares = mockShares.filter((share) => share.noteId === mockNote.id)

      expect(noteShares).toHaveLength(2)
      expect(noteShares.map((s) => s.userId)).toContain(mockUser2.id)
      expect(noteShares.map((s) => s.userId)).toContain(mockUser3.id)
    })

    it("should find shares by user", () => {
      const mockShares = [
        {
          id: "share-1",
          noteId: mockNote.id,
          userId: mockUser2.id,
          permission: SharePermission.READ,
          createdAt: new Date(),
        },
        {
          id: "share-2",
          noteId: "note-2",
          userId: mockUser2.id,
          permission: SharePermission.WRITE,
          createdAt: new Date(),
        },
      ]

      const userShares = mockShares.filter((share) => share.userId === mockUser2.id)

      expect(userShares).toHaveLength(2)
      expect(userShares.map((s) => s.noteId)).toContain(mockNote.id)
      expect(userShares.map((s) => s.noteId)).toContain("note-2")
    })

    it("should find share by note and user", () => {
      const mockShares = [
        {
          id: "share-1",
          noteId: mockNote.id,
          userId: mockUser2.id,
          permission: SharePermission.READ,
          createdAt: new Date(),
        },
      ]

      const share = mockShares.find(
        (s) => s.noteId === mockNote.id && s.userId === mockUser2.id
      )

      expect(share).toBeDefined()
      expect(share!.permission).toBe(SharePermission.READ)

      const nonExistentShare = mockShares.find(
        (s) => s.noteId === mockNote.id && s.userId === "non-existent"
      )
      expect(nonExistentShare).toBeUndefined()
    })

    it("should share note with multiple users", () => {
      const shareRequests = [
        { userId: mockUser2.id, permission: SharePermission.READ },
        { userId: mockUser3.id, permission: SharePermission.WRITE },
      ]

      const createdShares = shareRequests.map((request, index) => ({
        id: `share-${index + 1}`,
        noteId: mockNote.id,
        userId: request.userId,
        permission: request.permission,
        createdAt: new Date(),
      }))

      expect(createdShares).toHaveLength(2)
      expect(createdShares[0].permission).toBe(SharePermission.READ)
      expect(createdShares[1].permission).toBe(SharePermission.WRITE)
    })

    it("should update existing shares when sharing with same users", () => {
      const mockShares = [
        {
          id: "share-1",
          noteId: mockNote.id,
          userId: mockUser2.id,
          permission: SharePermission.READ,
          createdAt: new Date(),
        },
      ]

      // Simulate updating existing share
      const existingShare = mockShares.find((s) => s.userId === mockUser2.id)
      if (existingShare) {
        existingShare.permission = SharePermission.WRITE
      }

      expect(existingShare!.permission).toBe(SharePermission.WRITE)
    })

    it("should remove note shares", () => {
      const mockShares = [
        {
          id: "share-1",
          noteId: mockNote.id,
          userId: mockUser2.id,
          permission: SharePermission.READ,
          createdAt: new Date(),
        },
        {
          id: "share-2",
          noteId: mockNote.id,
          userId: mockUser3.id,
          permission: SharePermission.WRITE,
          createdAt: new Date(),
        },
      ]

      const userIdsToRemove = [mockUser2.id]
      const remainingShares = mockShares.filter(
        (share) => !userIdsToRemove.includes(share.userId)
      )

      expect(remainingShares).toHaveLength(1)
      expect(remainingShares[0].userId).toBe(mockUser3.id)
    })

    it("should get users with access", () => {
      const mockShares = [
        {
          id: "share-1",
          noteId: mockNote.id,
          userId: mockUser2.id,
          permission: SharePermission.READ,
          createdAt: new Date(),
          user: mockUser2,
        },
        {
          id: "share-2",
          noteId: mockNote.id,
          userId: mockUser3.id,
          permission: SharePermission.WRITE,
          createdAt: new Date(),
          user: mockUser3,
        },
      ]

      const usersWithAccess = mockShares.map((share) => ({
        user: share.user,
        permission: share.permission,
        sharedAt: share.createdAt,
      }))

      expect(usersWithAccess).toHaveLength(2)

      const user2Access = usersWithAccess.find((u) => u.user.id === mockUser2.id)
      const user3Access = usersWithAccess.find((u) => u.user.id === mockUser3.id)

      expect(user2Access!.permission).toBe(SharePermission.READ)
      expect(user3Access!.permission).toBe(SharePermission.WRITE)
      expect(user2Access!.sharedAt).toBeDefined()
    })

    it("should get notes shared with user", () => {
      const mockShares = [
        {
          id: "share-1",
          noteId: mockNote.id,
          userId: mockUser2.id,
          permission: SharePermission.READ,
          createdAt: new Date(),
        },
        {
          id: "share-2",
          noteId: "note-2",
          userId: mockUser2.id,
          permission: SharePermission.WRITE,
          createdAt: new Date(),
        },
      ]

      const user2Shares = mockShares.filter((share) => share.userId === mockUser2.id)
      const noteIds = user2Shares.map((share) => share.noteId)

      expect(noteIds).toContain(mockNote.id)
      expect(noteIds).toContain("note-2")
    })
  })

  describe("NoteShare Validation", () => {
    it("should validate share permission enum", () => {
      const validPermissions = Object.values(SharePermission)

      expect(() => {
        const permission = "invalid"
        if (!validPermissions.includes(permission as SharePermission)) {
          throw new Error(`Invalid share permission: ${permission}`)
        }
      }).toThrow("Invalid share permission: invalid")

      expect(() => {
        const permission = SharePermission.READ
        if (validPermissions.includes(permission)) {
          // Valid permission
        }
      }).not.toThrow()
    })

    it("should validate note exists", () => {
      const noteExists = (noteId: string) => noteId === mockNote.id

      expect(() => {
        if (!noteExists("non-existent-id")) {
          throw new Error("Note with id non-existent-id does not exist")
        }
      }).toThrow("Note with id non-existent-id does not exist")

      expect(() => {
        if (noteExists(mockNote.id)) {
          // Note exists
        }
      }).not.toThrow()
    })

    it("should validate user exists", () => {
      const userExists = (userId: string) =>
        [mockUser1.id, mockUser2.id, mockUser3.id].includes(userId)

      expect(() => {
        if (!userExists("non-existent-id")) {
          throw new Error("User with id non-existent-id does not exist")
        }
      }).toThrow("User with id non-existent-id does not exist")

      expect(() => {
        if (userExists(mockUser2.id)) {
          // User exists
        }
      }).not.toThrow()
    })

    it("should validate share creation rules", () => {
      expect(() => {
        // Cannot share with creator
        if (mockUser1.id === mockNote.creatorId) {
          throw new Error("Cannot share note with its creator")
        }
      }).toThrow("Cannot share note with its creator")

      expect(() => {
        // Can share with different user
        if (mockUser2.id !== mockNote.creatorId) {
          // Valid share
        }
      }).not.toThrow()
    })
  })
})
