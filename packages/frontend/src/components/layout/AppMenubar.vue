<template>
  <div class="layout-container">
    <!-- Sidebar Drawer - Always visible on desktop -->
    <Drawer 
      v-model:visible="sidebarVisible" 
      position="left" 
      class="sidebar-drawer"
      :showCloseIcon="false"
    >
      <template #header>
        <div class="sidebar-header">
          <router-link to="/dashboard" class="sidebar-logo">
            <svg
              width="35"
              height="40"
              viewBox="0 0 35 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M25.87 18.05L23.16 17.45L25.27 20.46V29.78L32.49 23.76V13.53L29.18 14.73L25.87 18.04V18.05ZM25.27 35.49L29.18 31.58V27.67L25.27 30.98V35.49ZM20.16 17.14H20.03H20.17H20.16ZM30.1 5.19L34.89 4.81L33.08 12.33L24.1 15.67L30.08 5.2L30.1 5.19ZM5.72 14.74L2.41 13.54V23.77L9.63 29.79V20.47L11.74 17.46L9.03 18.06L5.72 14.75V14.74ZM9.63 30.98L5.72 27.67V31.58L9.63 35.49V30.98ZM4.8 5.2L10.78 15.67L1.81 12.33L0 4.81L4.79 5.19L4.8 5.2ZM24.37 21.05V34.59L22.56 37.29L20.46 39.4H14.44L12.34 37.29L10.53 34.59V21.05L12.42 18.23L17.45 26.8L22.48 18.23L24.37 21.05ZM22.85 0L22.57 0.69L17.45 13.08L12.33 0.69L12.05 0H22.85Z"
                fill="var(--p-primary-color)"
              />
              <path
                d="M30.69 4.21L24.37 4.81L22.57 0.69L22.86 0H26.48L30.69 4.21ZM23.75 5.67L22.66 3.08L18.05 14.24V17.14H19.7H20.03H20.16H20.2L24.1 15.7L30.11 5.19L23.75 5.67ZM4.21002 4.21L10.53 4.81L12.33 0.69L12.05 0H8.43002L4.22002 4.21H4.21002ZM21.9 17.4L20.6 18.2H14.3L13 17.4L12.4 18.2L12.42 18.23L17.45 26.8L22.48 18.23L22.5 18.2L21.9 17.4ZM4.79002 5.19L10.8 15.7L14.7 17.14H14.74H15.2H16.85V14.24L12.24 3.09L11.15 5.68L4.79002 5.2V5.19Z"
                fill="var(--p-text-color)"
              />
            </svg>
            <span class="sidebar-title">{{ t("sidebar.appName") }}</span>
          </router-link>
        </div>
      </template>

      <div class="sidebar-content">
        <nav class="sidebar-nav">
          <router-link
            v-for="item in navigationItems"
            :key="item.label"
            :to="item.to"
            class="sidebar-item"
            :class="{ 'router-link-active': $route.path === item.to }"
          >
            <i :class="item.icon"></i>
            <span class="sidebar-item-text">{{ item.label }}</span>
          </router-link>

          <div class="sidebar-section">
            <span class="sidebar-section-title">{{ t("sidebar.billing") }}</span>
            <router-link
              v-for="item in billingItems"
              :key="item.label"
              :to="item.to"
              class="sidebar-item"
              :class="{ 'router-link-active': $route.path === item.to }"
            >
              <i :class="item.icon"></i>
              <span class="sidebar-item-text">{{ item.label }}</span>
            </router-link>
          </div>

          <router-link
            v-for="item in additionalItems"
            :key="item.label"
            :to="item.to"
            class="sidebar-item"
            :class="{ 'router-link-active': $route.path === item.to }"
          >
            <i :class="item.icon"></i>
            <span class="sidebar-item-text">{{ item.label }}</span>
          </router-link>
        </nav>
      </div>
    </Drawer>

    <!-- Top MenuBar - Clean and minimal -->
    <div class="top-menubar" :class="{ 'sidebar-open': sidebarVisible }">
      <div class="menubar-content">
        <div class="menubar-start">
          <!-- Toggle Sidebar Button -->
          <Button
            icon="pi pi-bars"
            text
            rounded
            @click="toggleSidebar"
            class="sidebar-toggle"
            aria-label="Toggle menu"
          />
        </div>

        <div class="menubar-end">
          <!-- Search Button -->
          <Button
            icon="pi pi-search"
            text
            rounded
            aria-label="Search"
            @click="showSearchDialog = true"
            class="action-button"
          />

          <!-- Notifications -->
          <NotificationCenter />

          <!-- Profile Menu -->
          <div class="profile-section">
            <Button
              @click="toggleProfileMenu"
              text
              rounded
              aria-haspopup="true"
              class="profile-button"
            >
              <Avatar
                :image="
                  authStore.userAvatar ||
                  'https://primefaces.org/cdn/primevue/images/avatar/amyelsner.png'
                "
                shape="circle"
                size="small"
              />
            </Button>
            <Menu
              ref="profileMenu"
              :model="profileMenuItems"
              :popup="true"
              class="profile-menu"
            >
              <template #start>
                <div class="profile-info">
                  <Avatar
                    :image="
                      authStore.userAvatar ||
                      'https://primefaces.org/cdn/primevue/images/avatar/amyelsner.png'
                    "
                    shape="circle"
                    size="large"
                  />
                  <div class="profile-details">
                    <span class="profile-name">{{ authStore.userName }}</span>
                    <span class="profile-email">{{ authStore.user?.email }}</span>
                  </div>
                </div>
              </template>
            </Menu>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Dialog -->
    <Dialog
      v-model:visible="showSearchDialog"
      header="Search"
      :modal="true"
      :closable="true"
      class="search-dialog"
    >
      <div class="search-content">
        <InputText
          v-model="searchQuery"
          placeholder="Search..."
          class="w-full"
          autofocus
        />
        <div v-if="searchQuery" class="search-results">
          <p class="text-muted-color">Search functionality coming soon...</p>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import NotificationCenter from "@/components/common/NotificationCenter.vue"
import { useAuthStore } from "@/stores/auth"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Dialog from "primevue/dialog"
import Drawer from "primevue/drawer"
import InputText from "primevue/inputtext"
import Menu from "primevue/menu"
import MenuBar from "primevue/menubar"
import { onMounted, onUnmounted, ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

// Reactive state
const sidebarVisible = ref(true) // Open by default on desktop
const showSearchDialog = ref(false)
const searchQuery = ref("")
const profileMenu = ref()

// Check if mobile
const isMobile = ref(false)

// Navigation items for sidebar
const navigationItems = computed(() => [
  { label: t("navigation.dashboard"), icon: "pi pi-home", to: "/dashboard" },
  { label: t("navigation.institutions"), icon: "pi pi-building", to: "/institutions" },
  { label: t("navigation.tasks"), icon: "pi pi-check-square", to: "/tasks" }
])

const billingItems = computed(() => [
  { label: t("navigation.quotes"), icon: "pi pi-file-edit", to: "/quotes" },
  { label: t("navigation.invoices"), icon: "pi pi-file", to: "/invoices" },
  { label: t("navigation.templates"), icon: "pi pi-palette", to: "/templates" },
  { label: t("navigation.analytics"), icon: "pi pi-chart-bar", to: "/billing/analytics" }
])

const additionalItems = computed(() => [
  { label: t("navigation.segmentation"), icon: "pi pi-filter", to: "/segmentation" },
  { label: t("navigation.team"), icon: "pi pi-users", to: "/team" },
  { label: t("navigation.webhooks"), icon: "pi pi-send", to: "/webhooks" },
  { label: t("navigation.exportCenter"), icon: "pi pi-download", to: "/export" }
])

// Profile menu items with proper header
const profileMenuItems = ref([
  {
    label: "Profile",
    icon: "pi pi-user",
    command: () => router.push("/profile")
  },
  { separator: true },
  {
    label: "Logout",
    icon: "pi pi-sign-out",
    command: handleLogout,
    class: "logout-item"
  }
])

// Toggle sidebar
const toggleSidebar = () => {
  sidebarVisible.value = !sidebarVisible.value
}

// Toggle profile menu with proper event handling
const toggleProfileMenu = (event: Event) => {
  if (profileMenu.value) {
    profileMenu.value.toggle(event)
  }
}

// Handle window resize
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) {
    sidebarVisible.value = false
  } else {
    sidebarVisible.value = true
  }
}

// Handle logout
async function handleLogout() {
  await authStore.logout()
  router.push("/login")
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "k") {
    event.preventDefault()
    showSearchDialog.value = true
  }
}

onMounted(() => {
  checkMobile()
  document.addEventListener("keydown", handleKeydown)
  window.addEventListener("resize", checkMobile)
})

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown)
  window.removeEventListener("resize", checkMobile)
})
</script>

<style scoped>
/* Layout Container */
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Sidebar Drawer Styling */
.sidebar-drawer {
  width: 280px;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.sidebar-drawer :deep(.p-drawer) {
  width: 280px !important;
  height: 100vh !important;
  position: fixed !important;
  left: 0 !important;
  top: 0 !important;
  z-index: 1000 !important;
}

.sidebar-drawer :deep(.p-drawer-content) {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-drawer :deep(.p-drawer-header) {
  padding: 1.5rem 1rem 1rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

/* Sidebar Header */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--p-text-color);
}

.sidebar-title {
  font-weight: 600;
  font-size: 1.125rem;
  color: var(--p-primary-color);
}

/* Sidebar Content */
.sidebar-content {
  padding: 1rem 0;
  overflow-y: auto;
  flex: 1;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--p-text-color);
  border-radius: var(--p-border-radius);
  margin: 0 1rem;
  transition: all 0.2s ease;
  font-weight: 500;
}

.sidebar-item:hover {
  background: var(--p-surface-100);
  color: var(--p-primary-color);
  transform: translateX(2px);
}

.sidebar-item.router-link-active {
  background: var(--p-primary-50);
  color: var(--p-primary-color);
  border-left: 3px solid var(--p-primary-color);
  font-weight: 600;
}

.sidebar-item i {
  width: 1.25rem;
  flex-shrink: 0;
}

.sidebar-item-text {
  white-space: nowrap;
}

.sidebar-section {
  margin: 1.5rem 0 1rem 0;
}

.sidebar-section-title {
  display: block;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Top MenuBar */
.top-menubar {
  position: sticky;
  top: 0;
  z-index: 999;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: margin-left 0.3s ease;
  margin-left: 0;
}

.top-menubar.sidebar-open {
  margin-left: 280px;
}

.menubar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 4rem;
}

.menubar-start {
  display: flex;
  align-items: center;
}

.menubar-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-toggle {
  color: var(--p-text-muted-color);
}

.sidebar-toggle:hover {
  color: var(--p-primary-color);
  background: var(--p-primary-50);
}

.action-button {
  color: var(--p-text-muted-color);
}

.action-button:hover {
  color: var(--p-primary-color);
  background: var(--p-primary-50);
}

/* Profile Section */
.profile-section {
  position: relative;
}

.profile-button {
  padding: 0.25rem;
}

.profile-menu :deep(.p-menu-header) {
  padding: 1rem;
  background: var(--p-surface-50);
  border-bottom: 1px solid var(--p-surface-border);
  border-radius: var(--p-border-radius) var(--p-border-radius) 0 0;
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.profile-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.profile-email {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

/* Search Dialog */
.search-content {
  padding: 0.5rem 0;
}

.search-results {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: var(--p-border-radius);
  text-align: center;
}

/* Responsive Design */
@media (max-width: 768px) {
  .sidebar-drawer {
    width: 100vw;
    transform: translateX(-100%);
  }

  .sidebar-drawer.visible {
    transform: translateX(0);
  }

  .top-menubar {
    margin-left: 0 !important;
  }

  .sidebar-toggle {
    display: inline-flex;
  }
}

@media (min-width: 769px) {
  .sidebar-drawer :deep(.p-drawer-mask) {
    display: none;
  }
  
  .sidebar-drawer {
    position: fixed;
    transform: none;
  }
}

/* Global Menu Item Styling for Logout */
:deep(.logout-item) {
  color: var(--p-red-500) !important;
}

:deep(.logout-item:hover) {
  background: var(--p-red-50) !important;
  color: var(--p-red-600) !important;
}

/* Hide close icon from drawer */
.sidebar-drawer :deep(.p-drawer-close) {
  display: none;
}
</style>
