import { SharePermission, InstitutionType } from "@medical-crm/shared"
import request from "supertest"
import { createApp } from "../../app"
import { sequelize } from "../../config/database"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { Note } from "../../models/Note"
import { NoteShare } from "../../models/NoteShare"
import { Team } from "../../models/Team"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"

describe("Note API Integration Tests", () => {
  let app: any
  let superAdminUser: User
  let teamAdminUser: User
  let regularUser: User
  let otherUser: User
  let teamMember: User
  let testTeam: Team
  let testInstitution: MedicalInstitution
  let superAdminToken: string
  let teamAdminToken: string
  let regularUserToken: string
  let otherUserToken: string
  let teamMemberToken: string

  beforeAll(async () => {
    app = createApp()
    // Sync models for testing - order matters for foreign keys
    await Team.sync({ force: true })
    await User.sync({ force: true })
    await MedicalInstitution.sync({ force: true })
    await Note.sync({ force: true })
    await NoteShare.sync({ force: true })
  })

  beforeEach(async () => {
    // Create test team
    testTeam = await Team.create({
      name: "Test Team",
      description: "Team for testing",
      isActive: true,
    })

    // Create test users
    superAdminUser = await User.create({
      email: "superadmin@test.com",
      passwordHash: await User.hashPassword("password123"),
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
      avatarSeed: "super-admin-seed",
      avatarStyle: "initials",
      isActive: true,
    })

    teamAdminUser = await User.create({
      email: "teamadmin@test.com",
      passwordHash: await User.hashPassword("password123"),
      firstName: "Team",
      lastName: "Admin",
      role: UserRole.TEAM_ADMIN,
      teamId: testTeam.id,
      avatarSeed: "team-admin-seed",
      avatarStyle: "initials",
      isActive: true,
    })

    regularUser = await User.create({
      email: "user@test.com",
      passwordHash: await User.hashPassword("password123"),
      firstName: "Regular",
      lastName: "User",
      role: UserRole.USER,
      teamId: testTeam.id,
      avatarSeed: "user-seed",
      avatarStyle: "initials",
      isActive: true,
    })

    teamMember = await User.create({
      email: "teammember@test.com",
      passwordHash: await User.hashPassword("password123"),
      firstName: "Team",
      lastName: "Member",
      role: UserRole.USER,
      teamId: testTeam.id,
      avatarSeed: "team-member-seed",
      avatarStyle: "initials",
      isActive: true,
    })

    otherUser = await User.create({
      email: "other@test.com",
      passwordHash: await User.hashPassword("password123"),
      firstName: "Other",
      lastName: "User",
      role: UserRole.USER,
      avatarSeed: "other-seed",
      avatarStyle: "initials",
      isActive: true,
    })

    // Create test institution
    testInstitution = await MedicalInstitution.create({
      name: "Test Hospital",
      type: InstitutionType.HOSPITAL,
      address: {
        street: "123 Medical St",
        city: "Healthcare City",
        state: "HC",
        zipCode: "12345",
        country: "USA",
      },
      tags: ["test"],
      isActive: true,
    })

    // Generate tokens
    superAdminToken = AuthService.generateAccessToken(superAdminUser)
    teamAdminToken = AuthService.generateAccessToken(teamAdminUser)
    regularUserToken = AuthService.generateAccessToken(regularUser)
    teamMemberToken = AuthService.generateAccessToken(teamMember)
    otherUserToken = AuthService.generateAccessToken(otherUser)

    // Debug: Verify users exist
    const allUsers = await User.findAll()
    console.log('Users in database:', allUsers.map(u => ({ id: u.id, email: u.email })))
    console.log('Generated token for user:', regularUser.id, regularUser.email)
  })

  afterEach(async () => {
    await NoteShare.destroy({ where: {} })
    await Note.destroy({ where: {} })
    await MedicalInstitution.destroy({ where: {} })
    await User.destroy({ where: {} })
    await Team.destroy({ where: {} })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  describe("POST /api/notes", () => {
    it("should create a note successfully", async () => {
      const noteData = {
        title: "Test Note",
        content: "This is a test note content",
        tags: ["test", "important"],
        institutionId: testInstitution.id,
        isPrivate: false,
      }

      const response = await request(app.callback())
        .post("/api/notes")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(noteData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(noteData.title)
      expect(response.body.data.content).toBe(noteData.content)
      expect(response.body.data.tags).toEqual(noteData.tags)
      expect(response.body.data.institutionId).toBe(noteData.institutionId)
      expect(response.body.data.isPrivate).toBe(noteData.isPrivate)
      expect(response.body.data.creatorId).toBe(regularUser.id)
    })

    it("should create a private note successfully", async () => {
      const noteData = {
        title: "Private Note",
        content: "This is private content",
        isPrivate: true,
      }

      const response = await request(app.callback())
        .post("/api/notes")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(noteData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.isPrivate).toBe(true)
    })

    it("should create a note with sharing", async () => {
      const noteData = {
        title: "Shared Note",
        content: "This note will be shared",
        shareWith: [
          { userId: teamMember.id, permission: SharePermission.READ },
          { userId: teamAdminUser.id, permission: SharePermission.WRITE },
        ],
      }

      const response = await request(app.callback())
        .post("/api/notes")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(noteData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(noteData.title)

      // Verify shares were created
      const shares = await NoteShare.findByNote(response.body.data.id)
      expect(shares).toHaveLength(2)
    })

    it("should fail to create note without required fields", async () => {
      const noteData = {
        content: "Missing title",
      }

      const response = await request(app.callback())
        .post("/api/notes")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(noteData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("should fail to create note with invalid institution", async () => {
      const noteData = {
        title: "Test Note",
        content: "Test content",
        institutionId: "invalid-id",
      }

      const response = await request(app.callback())
        .post("/api/notes")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(noteData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INVALID_INSTITUTION")
    })

    it("should fail to share with invalid user", async () => {
      const noteData = {
        title: "Test Note",
        content: "Test content",
        shareWith: [{ userId: "invalid-id", permission: SharePermission.READ }],
      }

      const response = await request(app.callback())
        .post("/api/notes")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(noteData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INVALID_SHARE_RECIPIENT")
    })

    it("should require authentication", async () => {
      const noteData = {
        title: "Test Note",
        content: "Test content",
      }

      await request(app.callback()).post("/api/notes").send(noteData).expect(401)
    })
  })

  describe("GET /api/notes", () => {
    beforeEach(async () => {
      // Create test notes
      await Note.create({
        title: "Public Note 1",
        content: "Public content 1",
        tags: ["public", "test"],
        creatorId: regularUser.id,
        institutionId: testInstitution.id,
        isPrivate: false,
      })

      const privateNote = await Note.create({
        title: "Private Note 1",
        content: "Private content 1",
        tags: ["private", "test"],
        creatorId: regularUser.id,
        isPrivate: true,
      })

      // Share private note with team member
      await NoteShare.create({
        noteId: privateNote.id,
        userId: teamMember.id,
        permission: SharePermission.READ,
      })

      await Note.create({
        title: "Other User Note",
        content: "Other user content",
        tags: ["other"],
        creatorId: otherUser.id,
        isPrivate: false,
      })
    })

    it("should get accessible notes for regular user", async () => {
      const response = await request(app.callback())
        .get("/api/notes")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeGreaterThanOrEqual(2) // Own notes + public notes
      expect(response.body.meta.total).toBeGreaterThanOrEqual(2)
    })

    it("should filter notes by institution", async () => {
      const response = await request(app.callback())
        .get(`/api/notes?institutionId=${testInstitution.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.data[0].institutionId).toBe(testInstitution.id)
    })

    it("should filter notes by tags", async () => {
      const response = await request(app.callback())
        .get("/api/notes?tags=public")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
      expect(response.body.data[0].tags).toContain("public")
    })

    it("should search notes by text", async () => {
      const response = await request(app.callback())
        .get("/api/notes?search=Public")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it("should paginate results", async () => {
      const response = await request(app.callback())
        .get("/api/notes?page=1&limit=1")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.meta.page).toBe(1)
      expect(response.body.meta.limit).toBe(1)
    })

    it("should require authentication", async () => {
      await request(app.callback()).get("/api/notes").expect(401)
    })
  })

  describe("GET /api/notes/:id", () => {
    let testNote: Note
    let privateNote: Note

    beforeEach(async () => {
      testNote = await Note.create({
        title: "Test Note",
        content: "Test content",
        tags: ["test"],
        creatorId: regularUser.id,
        isPrivate: false,
      })

      privateNote = await Note.create({
        title: "Private Note",
        content: "Private content",
        creatorId: regularUser.id,
        isPrivate: true,
      })
    })

    it("should get a specific note", async () => {
      const response = await request(app.callback())
        .get(`/api/notes/${testNote.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testNote.id)
      expect(response.body.data.title).toBe(testNote.title)
    })

    it("should get note with shares for creator", async () => {
      // Share the note
      await NoteShare.create({
        noteId: testNote.id,
        userId: teamMember.id,
        permission: SharePermission.READ,
      })

      const response = await request(app.callback())
        .get(`/api/notes/${testNote.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.shares).toBeDefined()
      expect(response.body.data.shares).toHaveLength(1)
    })

    it("should deny access to private note without permission", async () => {
      const response = await request(app.callback())
        .get(`/api/notes/${privateNote.id}`)
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should return 404 for non-existent note", async () => {
      const response = await request(app.callback())
        .get("/api/notes/non-existent-id")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback()).get(`/api/notes/${testNote.id}`).expect(401)
    })
  })

  describe("PUT /api/notes/:id", () => {
    let testNote: Note

    beforeEach(async () => {
      testNote = await Note.create({
        title: "Test Note",
        content: "Test content",
        tags: ["test"],
        creatorId: regularUser.id,
        isPrivate: false,
      })
    })

    it("should update a note successfully", async () => {
      const updateData = {
        title: "Updated Note",
        content: "Updated content",
        tags: ["updated", "test"],
        isPrivate: true,
      }

      const response = await request(app.callback())
        .put(`/api/notes/${testNote.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(updateData.title)
      expect(response.body.data.content).toBe(updateData.content)
      expect(response.body.data.tags).toEqual(updateData.tags)
      expect(response.body.data.isPrivate).toBe(updateData.isPrivate)
    })

    it("should update note with write permission", async () => {
      // Share note with write permission
      await NoteShare.create({
        noteId: testNote.id,
        userId: teamMember.id,
        permission: SharePermission.WRITE,
      })

      const updateData = {
        title: "Updated by shared user",
      }

      const response = await request(app.callback())
        .put(`/api/notes/${testNote.id}`)
        .set("Authorization", `Bearer ${teamMemberToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(updateData.title)
    })

    it("should deny update with read-only permission", async () => {
      // Share note with read permission
      await NoteShare.create({
        noteId: testNote.id,
        userId: teamMember.id,
        permission: SharePermission.READ,
      })

      const updateData = {
        title: "Should not update",
      }

      const response = await request(app.callback())
        .put(`/api/notes/${testNote.id}`)
        .set("Authorization", `Bearer ${teamMemberToken}`)
        .send(updateData)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should return 404 for non-existent note", async () => {
      const response = await request(app.callback())
        .put("/api/notes/non-existent-id")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send({ title: "Updated" })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .put(`/api/notes/${testNote.id}`)
        .send({ title: "Updated" })
        .expect(401)
    })
  })

  describe("DELETE /api/notes/:id", () => {
    let testNote: Note

    beforeEach(async () => {
      testNote = await Note.create({
        title: "Test Note",
        content: "Test content",
        creatorId: regularUser.id,
        isPrivate: false,
      })
    })

    it("should delete a note successfully", async () => {
      const response = await request(app.callback())
        .delete(`/api/notes/${testNote.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe("Note deleted successfully")

      // Verify note is deleted
      const deletedNote = await Note.findByPk(testNote.id)
      expect(deletedNote).toBeNull()
    })

    it("should allow super admin to delete any note", async () => {
      const response = await request(app.callback())
        .delete(`/api/notes/${testNote.id}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it("should deny deletion by non-creator", async () => {
      const response = await request(app.callback())
        .delete(`/api/notes/${testNote.id}`)
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should return 404 for non-existent note", async () => {
      const response = await request(app.callback())
        .delete("/api/notes/non-existent-id")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback()).delete(`/api/notes/${testNote.id}`).expect(401)
    })
  })

  describe("POST /api/notes/:id/share", () => {
    let testNote: Note

    beforeEach(async () => {
      testNote = await Note.create({
        title: "Test Note",
        content: "Test content",
        creatorId: regularUser.id,
        isPrivate: false,
      })
    })

    it("should share a note successfully", async () => {
      const shareData = {
        shares: [
          { userId: teamMember.id, permission: SharePermission.READ },
          { userId: teamAdminUser.id, permission: SharePermission.WRITE },
        ],
      }

      const response = await request(app.callback())
        .post(`/api/notes/${testNote.id}/share`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(shareData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.message).toBe("Note shared successfully")

      // Verify shares were created
      const shares = await NoteShare.findByNote(testNote.id)
      expect(shares).toHaveLength(2)
    })

    it("should update existing share permission", async () => {
      // Create initial share
      await NoteShare.create({
        noteId: testNote.id,
        userId: teamMember.id,
        permission: SharePermission.READ,
      })

      const shareData = {
        shares: [{ userId: teamMember.id, permission: SharePermission.WRITE }],
      }

      const response = await request(app.callback())
        .post(`/api/notes/${testNote.id}/share`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(shareData)
        .expect(200)

      expect(response.body.success).toBe(true)

      // Verify permission was updated
      const share = await NoteShare.findByNoteAndUser(testNote.id, teamMember.id)
      expect(share?.permission).toBe(SharePermission.WRITE)
    })

    it("should deny sharing by non-creator", async () => {
      const shareData = {
        shares: [{ userId: teamMember.id, permission: SharePermission.READ }],
      }

      const response = await request(app.callback())
        .post(`/api/notes/${testNote.id}/share`)
        .set("Authorization", `Bearer ${otherUserToken}`)
        .send(shareData)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should fail with invalid share recipient", async () => {
      const shareData = {
        shares: [{ userId: "invalid-id", permission: SharePermission.READ }],
      }

      const response = await request(app.callback())
        .post(`/api/notes/${testNote.id}/share`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(shareData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INVALID_SHARE_RECIPIENT")
    })

    it("should fail with empty shares array", async () => {
      const shareData = { shares: [] }

      const response = await request(app.callback())
        .post(`/api/notes/${testNote.id}/share`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(shareData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("should return 404 for non-existent note", async () => {
      const shareData = {
        shares: [{ userId: teamMember.id, permission: SharePermission.READ }],
      }

      const response = await request(app.callback())
        .post("/api/notes/non-existent-id/share")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send(shareData)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should require authentication", async () => {
      const shareData = {
        shares: [{ userId: teamMember.id, permission: SharePermission.READ }],
      }

      await request(app.callback())
        .post(`/api/notes/${testNote.id}/share`)
        .send(shareData)
        .expect(401)
    })
  })

  describe("DELETE /api/notes/:id/share/:userId", () => {
    let testNote: Note

    beforeEach(async () => {
      testNote = await Note.create({
        title: "Test Note",
        content: "Test content",
        creatorId: regularUser.id,
        isPrivate: false,
      })

      // Create a share
      await NoteShare.create({
        noteId: testNote.id,
        userId: teamMember.id,
        permission: SharePermission.READ,
      })
    })

    it("should remove share access successfully", async () => {
      const response = await request(app.callback())
        .delete(`/api/notes/${testNote.id}/share/${teamMember.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe("Share access removed successfully")

      // Verify share was removed
      const share = await NoteShare.findByNoteAndUser(testNote.id, teamMember.id)
      expect(share).toBeNull()
    })

    it("should deny removal by non-creator", async () => {
      const response = await request(app.callback())
        .delete(`/api/notes/${testNote.id}/share/${teamMember.id}`)
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should return 404 for non-existent share", async () => {
      const response = await request(app.callback())
        .delete(`/api/notes/${testNote.id}/share/${otherUser.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("SHARE_NOT_FOUND")
    })

    it("should return 404 for non-existent note", async () => {
      const response = await request(app.callback())
        .delete(`/api/notes/non-existent-id/share/${teamMember.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .delete(`/api/notes/${testNote.id}/share/${teamMember.id}`)
        .expect(401)
    })
  })

  describe("GET /api/notes/:id/shares", () => {
    let testNote: Note

    beforeEach(async () => {
      testNote = await Note.create({
        title: "Test Note",
        content: "Test content",
        creatorId: regularUser.id,
        isPrivate: false,
      })

      // Create shares
      await NoteShare.create({
        noteId: testNote.id,
        userId: teamMember.id,
        permission: SharePermission.READ,
      })

      await NoteShare.create({
        noteId: testNote.id,
        userId: teamAdminUser.id,
        permission: SharePermission.WRITE,
      })
    })

    it("should get note shares successfully", async () => {
      const response = await request(app.callback())
        .get(`/api/notes/${testNote.id}/shares`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.data[0]).toHaveProperty("user")
      expect(response.body.data[0]).toHaveProperty("permission")
      expect(response.body.data[0]).toHaveProperty("sharedAt")
    })

    it("should allow shared user to view shares", async () => {
      const response = await request(app.callback())
        .get(`/api/notes/${testNote.id}/shares`)
        .set("Authorization", `Bearer ${teamMemberToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
    })

    it("should deny access to non-shared user", async () => {
      const response = await request(app.callback())
        .get(`/api/notes/${testNote.id}/shares`)
        .set("Authorization", `Bearer ${otherUserToken}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should return 404 for non-existent note", async () => {
      const response = await request(app.callback())
        .get("/api/notes/non-existent-id/shares")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("NOTE_NOT_FOUND")
    })

    it("should require authentication", async () => {
      await request(app.callback()).get(`/api/notes/${testNote.id}/shares`).expect(401)
    })
  })

  describe("GET /api/notes/shared-with-me", () => {
    beforeEach(async () => {
      const note1 = await Note.create({
        title: "Shared Note 1",
        content: "Content 1",
        creatorId: otherUser.id,
        isPrivate: true,
      })

      const note2 = await Note.create({
        title: "Shared Note 2",
        content: "Content 2",
        creatorId: teamAdminUser.id,
        isPrivate: false,
      })

      // Share notes with regular user
      await NoteShare.create({
        noteId: note1.id,
        userId: regularUser.id,
        permission: SharePermission.READ,
      })

      await NoteShare.create({
        noteId: note2.id,
        userId: regularUser.id,
        permission: SharePermission.WRITE,
      })
    })

    it("should get notes shared with current user", async () => {
      const response = await request(app.callback())
        .get("/api/notes/shared-with-me")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.meta.total).toBe(2)
    })

    it("should paginate shared notes", async () => {
      const response = await request(app.callback())
        .get("/api/notes/shared-with-me?page=1&limit=1")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.meta.page).toBe(1)
      expect(response.body.meta.limit).toBe(1)
      expect(response.body.meta.totalPages).toBe(2)
    })

    it("should require authentication", async () => {
      await request(app.callback()).get("/api/notes/shared-with-me").expect(401)
    })
  })

  describe("GET /api/notes/by-institution/:institutionId", () => {
    beforeEach(async () => {
      await Note.create({
        title: "Institution Note 1",
        content: "Content 1",
        creatorId: regularUser.id,
        institutionId: testInstitution.id,
        isPrivate: false,
      })

      await Note.create({
        title: "Institution Note 2",
        content: "Content 2",
        creatorId: teamMember.id,
        institutionId: testInstitution.id,
        isPrivate: false,
      })

      // Note for different institution
      const otherInstitution = await MedicalInstitution.create({
        name: "Other Hospital",
        type: "clinic",
        address: {
          street: "456 Other St",
          city: "Other City",
          state: "OC",
          zipCode: "54321",
          country: "USA",
        },
        tags: ["other"],
        isActive: true,
      })

      await Note.create({
        title: "Other Institution Note",
        content: "Other content",
        creatorId: regularUser.id,
        institutionId: otherInstitution.id,
        isPrivate: false,
      })
    })

    it("should get notes for specific institution", async () => {
      const response = await request(app.callback())
        .get(`/api/notes/by-institution/${testInstitution.id}`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(
        response.body.data.every((note: any) => note.institutionId === testInstitution.id)
      ).toBe(true)
    })

    it("should return 404 for non-existent institution", async () => {
      const response = await request(app.callback())
        .get("/api/notes/by-institution/non-existent-id")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSTITUTION_NOT_FOUND")
    })

    it("should paginate institution notes", async () => {
      const response = await request(app.callback())
        .get(`/api/notes/by-institution/${testInstitution.id}?page=1&limit=1`)
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.meta.page).toBe(1)
      expect(response.body.meta.limit).toBe(1)
    })

    it("should require authentication", async () => {
      await request(app.callback())
        .get(`/api/notes/by-institution/${testInstitution.id}`)
        .expect(401)
    })
  })

  describe("GET /api/notes/by-tags", () => {
    beforeEach(async () => {
      await Note.create({
        title: "Tagged Note 1",
        content: "Content 1",
        tags: ["important", "urgent"],
        creatorId: regularUser.id,
        isPrivate: false,
      })

      await Note.create({
        title: "Tagged Note 2",
        content: "Content 2",
        tags: ["important", "review"],
        creatorId: regularUser.id,
        isPrivate: false,
      })

      await Note.create({
        title: "Other Tagged Note",
        content: "Other content",
        tags: ["other", "test"],
        creatorId: regularUser.id,
        isPrivate: false,
      })
    })

    it("should get notes by single tag", async () => {
      const response = await request(app.callback())
        .get("/api/notes/by-tags?tags=important")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(
        response.body.data.every((note: any) => note.tags.includes("important"))
      ).toBe(true)
    })

    it("should get notes by multiple tags", async () => {
      const response = await request(app.callback())
        .get("/api/notes/by-tags?tags=important&tags=urgent")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeGreaterThanOrEqual(1)
    })

    it("should fail without tags parameter", async () => {
      const response = await request(app.callback())
        .get("/api/notes/by-tags")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("should paginate tagged notes", async () => {
      const response = await request(app.callback())
        .get("/api/notes/by-tags?tags=important&page=1&limit=1")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(1)
      expect(response.body.meta.page).toBe(1)
      expect(response.body.meta.limit).toBe(1)
    })

    it("should require authentication", async () => {
      await request(app.callback()).get("/api/notes/by-tags?tags=important").expect(401)
    })
  })
})
