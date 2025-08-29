import { useAuthStore } from "@/stores/auth"
import { computed } from "vue"
import type { RouteLocationNormalized } from "vue-router"

export interface RoutePermissions {
  requiresAuth?: boolean
  roles?: string[]
  permissions?: string[]
}

export function useRouteGuards() {
  const authStore = useAuthStore()

  const canAccessRoute = computed(() => {
    return (route: RouteLocationNormalized): boolean => {
      const meta = route.meta as RoutePermissions

      // If route doesn't require auth, allow access
      if (meta.requiresAuth === false) {
        return true
      }

      // Check if user is authenticated
      if (!authStore.isAuthenticated) {
        return false
      }

      // Check role-based access
      if (meta.roles && meta.roles.length > 0) {
        const userRole = authStore.userRole
        if (!userRole || !meta.roles.includes(userRole)) {
          return false
        }
      }

      // Additional permission checks can be added here
      if (meta.permissions && meta.permissions.length > 0) {
        // This would require a more complex permission system
        // For now, we'll just check if user has any role
        return !!authStore.userRole
      }

      return true
    }
  })

  const getRedirectPath = (route: RouteLocationNormalized): string => {
    if (!authStore.isAuthenticated) {
      return `/login?redirect=${encodeURIComponent(route.fullPath)}`
    }

    // If user doesn't have permission, redirect to dashboard
    return "/dashboard"
  }

  const checkRouteAccess = (route: RouteLocationNormalized) => {
    const hasAccess = canAccessRoute.value(route)

    if (!hasAccess) {
      return {
        hasAccess: false,
        redirectTo: getRedirectPath(route),
      }
    }

    return {
      hasAccess: true,
      redirectTo: null,
    }
  }

  return {
    canAccessRoute,
    getRedirectPath,
    checkRouteAccess,
  }
}

// Route permission constants
export const ROUTE_PERMISSIONS = {
  PUBLIC: { requiresAuth: false },
  AUTHENTICATED: { requiresAuth: true },
  ADMIN_ONLY: { requiresAuth: true, roles: ["super_admin"] },
  TEAM_ADMIN: { requiresAuth: true, roles: ["super_admin", "team_admin"] },
  ALL_USERS: { requiresAuth: true, roles: ["super_admin", "team_admin", "user"] },
} as const
