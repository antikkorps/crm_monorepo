import jwt from "jsonwebtoken"
import supertest from "supertest"
import { createMockUser } from "./db-mock"

/**
 * Authentication helpers for testing
 */

export interface TestUser {
  id: string
  email: string
  role: string
  token: string
}

/**
 * Create a test user with a valid JWT token
 */
export const createAuthenticatedUser = async (role: "SUPER_ADMIN" | "TEAM_ADMIN" | "USER" = "USER"): Promise<TestUser> => {
  const user = await createMockUser({ role })

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "test-jwt-secret",
    { expiresIn: "1h" }
  )

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    token,
  }
}

/**
 * Create multiple test users with different roles
 */
export const createTestUsers = async () => {
  const [superAdmin, teamAdmin, regularUser] = await Promise.all([
    createAuthenticatedUser("SUPER_ADMIN"),
    createAuthenticatedUser("TEAM_ADMIN"),
    createAuthenticatedUser("USER"),
  ])

  return { superAdmin, teamAdmin, regularUser }
}

/**
 * Make an authenticated request
 */
export const authenticatedRequest = (app: any, token: string) => {
  return {
    get: (url: string) => supertest(app.callback()).get(url).set("Authorization", `Bearer ${token}`),
    post: (url: string) => supertest(app.callback()).post(url).set("Authorization", `Bearer ${token}`),
    put: (url: string) => supertest(app.callback()).put(url).set("Authorization", `Bearer ${token}`),
    patch: (url: string) => supertest(app.callback()).patch(url).set("Authorization", `Bearer ${token}`),
    delete: (url: string) => supertest(app.callback()).delete(url).set("Authorization", `Bearer ${token}`),
  }
}

/**
 * Decode a JWT token without verification (for testing)
 */
export const decodeToken = (token: string) => {
  return jwt.decode(token)
}
