import { authApi, type LoginCredentials } from "@/services/api"
import type { User } from "@medical-crm/shared"
import { defineStore } from "pinia"

export const useAuthStore = defineStore("auth", {
  state: () => {
    const token = localStorage.getItem("token")
    return {
      user: null as User | null,
      token: token,
      isAuthenticated: false,
    }
  },

  getters: {
    currentUser: (state) => state.user,
    isLoggedIn: (state) => state.isAuthenticated && !!state.token,
    userName: (state) =>
      state.user ? `${state.user.firstName} ${state.user.lastName}` : "User",
    userAvatar: (state) => state.user?.avatarSeed || undefined,
    userRole: (state) => state.user?.role,
    accessToken: (state) => state.token,
  },

  actions: {
    async login(credentials: LoginCredentials) {
      try {
        const response = await authApi.login(credentials)
        this.token = response.token
        this.user = response.user
        this.isAuthenticated = true
        localStorage.setItem("token", response.token)
        return response
      } catch (error) {
        this.logout()
        throw error
      }
    },

    async logout() {
      try {
        if (this.token) {
          await authApi.logout()
        }
      } catch (error) {
        console.error("Logout error:", error)
      } finally {
        this.user = null
        this.token = null
        this.isAuthenticated = false
        localStorage.removeItem("token")
      }
    },

    async fetchUser() {
      if (!this.token) return null

      try {
        const user = await authApi.getProfile()
        this.user = user
        this.isAuthenticated = true
        return user
      } catch (error) {
        this.logout()
        throw error
      }
    },

    async updateProfile(data: Partial<User>) {
      if (!this.user) throw new Error("No user logged in")

      try {
        const updatedUser = await authApi.updateProfile(data)
        this.user = updatedUser
        return updatedUser
      } catch (error) {
        throw error
      }
    },

    async initializeAuth() {
      if (this.token && !this.isAuthenticated) {
        try {
          await this.fetchUser()
        } catch (error) {
          this.logout()
        }
      }
    },
  },
})
