import request from "supertest"
import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest"
import { createApp } from "../../app"
import { User, UserRole } from "../../models/User"
import { MedicalInstitution } from "../../models/MedicalInstitution"
import { AuthService } from "../../services/AuthService"
import { closeDatabaseConnection, initializeDatabase } from "../../utils/database-init"

describe("Institutions CSV Import Integration", () => {
  let app: any
  let admin: User
  let user: User
  let adminToken: string
  let userToken: string

  beforeAll(async () => {
    app = createApp()
    await initializeDatabase()
  })

  afterAll(async () => {
    await closeDatabaseConnection()
  })

  beforeEach(async () => {
    // Clean tables impacted by this suite
    await MedicalInstitution.destroy({ where: {} })
    await User.destroy({ where: {} })

    // Create users
    admin = await User.create({
      email: "admin-import@test.com",
      passwordHash: "irrelevant",
      firstName: "Admin",
      lastName: "Import",
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      avatarSeed: "admin-import",
    })

    user = await User.create({
      email: "user-import@test.com",
      passwordHash: "irrelevant",
      firstName: "User",
      lastName: "Import",
      role: UserRole.USER,
      isActive: true,
      avatarSeed: "user-import",
    })

    adminToken = AuthService.generateAccessToken(admin)
    userToken = AuthService.generateAccessToken(user)
  })

  it("GET /api/institutions/import/template returns CSV for super admin", async () => {
    const res = await request(app.callback())
      .get("/api/institutions/import/template")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200)

    expect(res.headers["content-type"]).toContain("text/csv")
    expect(res.text).toContain("name,type,street,city,state,zipCode,country")
  })

  it("GET /api/institutions/import/template forbidden for regular user", async () => {
    await request(app.callback())
      .get("/api/institutions/import/template")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403)
  })

  it("POST /api/institutions/import/validate validates uploaded CSV", async () => {
    const csv = `name,type,street,city,state,zipCode,country\nTest Hospital,hospital,123 St,City,CA,90210,US`

    const res = await request(app.callback())
      .post("/api/institutions/import/validate")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csv, "utf8"), "institutions.csv")
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.isValid).toBe(true)
    expect(res.body.data.totalRows).toBe(1)
  })

  it("POST /api/institutions/import/validate forbids regular user", async () => {
    const csv = `name,type,street,city,state,zipCode,country\nTest Hospital,hospital,123 St,City,CA,90210,US`

    await request(app.callback())
      .post("/api/institutions/import/validate")
      .set("Authorization", `Bearer ${userToken}`)
      .attach("file", Buffer.from(csv, "utf8"), "institutions.csv")
      .expect(403)
  })

  it("POST /api/institutions/import imports CSV and creates records", async () => {
    const csv = [
      "name,type,street,city,state,zipCode,country,contactFirstName,contactLastName,contactEmail",
      "General Hospital,hospital,123 Main,Healthcare City,CA,90210,US,John,Doe,john@hosp.com",
    ].join("\n")

    const res = await request(app.callback())
      .post("/api/institutions/import?skipDuplicates=true")
      .set("Authorization", `Bearer ${adminToken}`)
      .attach("file", Buffer.from(csv, "utf8"), "institutions.csv")
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.success).toBe(true)
    expect(res.body.data.totalRows).toBe(1)
    expect(res.body.data.successfulImports).toBe(1)

    const count = await MedicalInstitution.count({ where: { name: "General Hospital" } })
    expect(count).toBe(1)
  })
})

