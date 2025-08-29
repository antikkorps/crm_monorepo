import { useAuthStore } from "@/stores/auth"
import type { RouteRecordRaw } from "vue-router"
import { createRouter, createWebHistory } from "vue-router"

// Lazy load components for better performance
const Login = () => import("@/views/auth/LoginView.vue")
const Dashboard = () => import("@/views/DashboardView.vue")
const MedicalInstitutions = () =>
  import("@/views/institutions/MedicalInstitutionsView.vue")
const InstitutionDetail = () => import("@/views/institutions/InstitutionDetailView.vue")
const Tasks = () => import("@/views/tasks/TasksView.vue")
const Quotes = () => import("@/views/billing/QuotesView.vue")
const Invoices = () => import("@/views/billing/InvoicesView.vue")
const Team = () => import("@/views/team/TeamView.vue")
const Profile = () => import("@/views/profile/ProfileView.vue")

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
    meta: {
      requiresAuth: false,
      layout: "auth",
    },
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
    meta: {
      requiresAuth: true,
      title: "Dashboard",
    },
  },
  {
    path: "/institutions",
    name: "MedicalInstitutions",
    component: MedicalInstitutions,
    meta: {
      requiresAuth: true,
      title: "Medical Institutions",
    },
  },
  {
    path: "/institutions/:id",
    name: "InstitutionDetail",
    component: InstitutionDetail,
    meta: {
      requiresAuth: true,
      title: "Institution Details",
    },
  },
  {
    path: "/tasks",
    name: "Tasks",
    component: Tasks,
    meta: {
      requiresAuth: true,
      title: "Tasks",
    },
  },
  {
    path: "/quotes",
    name: "Quotes",
    component: Quotes,
    meta: {
      requiresAuth: true,
      title: "Quotes",
    },
  },
  {
    path: "/invoices",
    name: "Invoices",
    component: Invoices,
    meta: {
      requiresAuth: true,
      title: "Invoices",
    },
  },
  {
    path: "/team",
    name: "Team",
    component: Team,
    meta: {
      requiresAuth: true,
      title: "Team",
    },
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
    meta: {
      requiresAuth: true,
      title: "Profile",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    redirect: "/dashboard",
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Check if route requires authentication
  if (to.meta.requiresAuth !== false) {
    // Try to restore authentication state if not already done
    if (!authStore.isAuthenticated && !authStore.isInitialized) {
      await authStore.initializeAuth()
    }

    // Redirect to login if not authenticated
    if (!authStore.isAuthenticated) {
      next({ name: "Login", query: { redirect: to.fullPath } })
      return
    }
  }

  // Redirect to dashboard if already authenticated and trying to access login
  if (to.name === "Login" && authStore.isAuthenticated) {
    next({ name: "Dashboard" })
    return
  }

  next()
})

// Set page title
router.afterEach((to) => {
  const title = to.meta.title as string
  document.title = title ? `${title} - Medical CRM` : "Medical CRM"
})

export default router
