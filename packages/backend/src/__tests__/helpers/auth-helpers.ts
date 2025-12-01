import jwt from "jsonwebtoken"
import supertest from "supertest"
import { UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"
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
export const createAuthenticatedUser = async (
  role: UserRole = UserRole.USER
): Promise<TestUser> => {
  const user = await createMockUser({ role })

  const token = AuthService.generateAccessToken(user)

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
    createAuthenticatedUser(UserRole.SUPER_ADMIN),
    createAuthenticatedUser(UserRole.TEAM_ADMIN),
    createAuthenticatedUser(UserRole.USER),
  ])

  return { superAdmin, teamAdmin, regularUser }
}

/**
 * Make an authenticated request
 */
export const authenticatedRequest = (app: any, token: string) => {
  return {
    get: (url: string) =>
      supertest(app.callback()).get(url).set("Authorization", `Bearer ${token}`),
    post: (url: string) =>
      supertest(app.callback()).post(url).set("Authorization", `Bearer ${token}`),
    put: (url: string) =>
      supertest(app.callback()).put(url).set("Authorization", `Bearer ${token}`),
    patch: (url: string) =>
      supertest(app.callback()).patch(url).set("Authorization", `Bearer ${token}`),
    delete: (url: string) =>
      supertest(app.callback()).delete(url).set("Authorization", `Bearer ${token}`),
  }
}

/**
 * Decode a JWT token without verification (for testing)
 */
export const decodeToken = (token: string) => {
  return jwt.decode(token)
}
