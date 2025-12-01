import { User, UserRole } from "../../models/User"

export interface UserFactoryOptions {
  role?: UserRole
  teamId?: string | undefined
  isActive?: boolean
  overrides?: Partial<User>
}

export const createTestUser = async (options: UserFactoryOptions = {}) => {
  const {
    role = UserRole.USER,
    teamId = undefined,
    isActive = true,
    overrides = {},
  } = options

  return await User.create({
    email: `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}@example.com`,
    passwordHash: await User.hashPassword("password123"),
    firstName: "Test",
    lastName: "User",
    role, // ✅ Ensures a valid role
    teamId,
    avatarSeed: `avatar-${Date.now()}`,
    avatarStyle: "initials",
    isActive,
    ...overrides,
  })
}
