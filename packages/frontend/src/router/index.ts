import { useAuthStore } from "@/stores/auth"
import type { RouteRecordRaw } from "vue-router"
import { createRouter, createWebHistory } from "vue-router"

// Lazy load components for better performance
const Landing = () => import("@/views/LandingView.vue")
const Login = () => import("@/views/auth/LoginView.vue")
const Dashboard = () => import("@/views/DashboardView.vue")
const MedicalInstitutions = () =>
  import("@/views/institutions/MedicalInstitutionsView.vue")
const InstitutionDetail = () => import("@/views/institutions/InstitutionDetailView.vue")
const Tasks = () => import("@/views/tasks/TasksView.vue")
const Quotes = () => import("@/views/billing/QuotesView.vue")
const Invoices = () => import("@/views/billing/InvoicesView.vue")
const InvoiceDetail = () => import("@/views/billing/InvoiceDetailView.vue")
const Team = () => import("@/views/team/TeamView.vue")
const Profile = () => import("@/views/profile/ProfileView.vue")
const Notifications = () => import("@/views/notifications/NotificationsView.vue")
const Templates = () => import("@/views/templates/TemplatesView.vue")
const BillingAnalytics = () => import("@/views/billing/BillingAnalyticsView.vue")
const Webhooks = () => import("@/views/webhooks/WebhooksView.vue")
const ExportCenter = () => import("@/views/export/ExportCenterView.vue")
const Segmentation = () => import("@/views/segmentation/SegmentationView.vue")
const Contacts = () => import("@/views/contacts/ContactsView.vue")
const Catalog = () => import("@/views/catalog/CatalogView.vue")
const DigiformaSettings = () => import("@/views/settings/DigiformaSettingsView.vue")
const SecurityLogs = () => import("@/views/settings/SecurityLogsView.vue")

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Landing",
    component: Landing,
    meta: {
      requiresAuth: false,
      title: "Accueil",
    },
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
    path: "/invoices/:id",
    name: "InvoiceDetail",
    component: InvoiceDetail,
    meta: {
      requiresAuth: true,
      title: "Invoice Details",
    },
  },
  {
    path: "/invoices/:id/edit",
    name: "InvoiceEdit",
    component: InvoiceDetail,
    meta: {
      requiresAuth: true,
      title: "Edit Invoice",
    },
    props: route => ({ ...route.params, editMode: true })
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
    path: "/notifications",
    name: "Notifications",
    component: Notifications,
    meta: {
      requiresAuth: true,
      title: "Notifications",
    },
  },
  {
    path: "/templates",
    name: "Templates",
    component: Templates,
    meta: {
      requiresAuth: true,
      title: "Document Templates",
    },
  },
  {
    path: "/catalog",
    name: "Catalog",
    component: Catalog,
    meta: {
      requiresAuth: true,
      title: "Catalog",
    },
  },
  {
    path: "/billing/analytics",
    name: "BillingAnalytics",
    component: BillingAnalytics,
    meta: {
      requiresAuth: true,
      title: "Billing Analytics",
    },
  },
  {
    path: "/webhooks",
    name: "Webhooks",
    component: Webhooks,
    meta: {
      requiresAuth: true,
      title: "Webhooks",
    },
  },
   {
     path: "/export",
     name: "ExportCenter",
     component: ExportCenter,
     meta: {
       requiresAuth: true,
       title: "Export Center",
     },
   },
   {
     path: "/segmentation",
     name: "Segmentation",
     component: Segmentation,
     meta: {
       requiresAuth: true,
       title: "Segmentation",
     },
   },
  {
    path: "/contacts",
    name: "Contacts",
    component: Contacts,
    meta: {
      requiresAuth: true,
      title: "Contacts",
    },
  },
  {
    path: "/settings/digiforma",
    name: "DigiformaSettings",
    component: DigiformaSettings,
    meta: {
      requiresAuth: true,
      title: "Digiforma Integration",
    },
  },
  {
    path: "/settings/security-logs",
    name: "SecurityLogs",
    component: SecurityLogs,
    meta: {
      requiresAuth: true,
      title: "Security Logs",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    redirect: "/",
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Check if route requires authentication
  if (to.meta.requiresAuth !== false) {
    // Try to restore authentication state if not already done
    if (!authStore.isAuthenticated && authStore.token) {
      try {
        await authStore.fetchUser()
      } catch (error) {
        // If token is invalid, clear it and redirect to login
        authStore.logout()
        next({ name: "Login", query: { redirect: to.fullPath } })
        return
      }
    }

    // Redirect to login if not authenticated
    if (!authStore.isAuthenticated) {
      next({ name: "Login", query: { redirect: to.fullPath } })
      return
    }
  }

  // Redirect to dashboard if already authenticated and trying to access login or landing
  if ((to.name === "Login" || to.name === "Landing") && authStore.isAuthenticated) {
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
