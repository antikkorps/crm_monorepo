<template>
  <div class="layout-topbar layout-topbar-sticky">
    <div class="layout-topbar-inner">
      <!-- Logo Container -->
      <div class="layout-topbar-logo-container">
        <router-link
          to="/dashboard"
          class="layout-topbar-logo"
          aria-label="Medical CRM logo"
        >
          <svg
            width="165"
            height="40"
            viewBox="0 0 165 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <text
              x="10"
              y="25"
              font-family="Arial, sans-serif"
              font-size="18"
              font-weight="bold"
              fill="var(--p-primary-color)"
            >
              Medical CRM
            </text>
          </svg>
        </router-link>
        <router-link
          to="/dashboard"
          class="layout-topbar-icon"
          aria-label="Medical CRM icon"
        >
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
        </router-link>
      </div>

      <!-- Navigation Items -->
      <ul class="topbar-items">
        <!-- Search -->
        <li>
          <div class="search-container">
            <Button
              type="button"
              aria-label="Search"
              class="topbar-item search-button"
              @click="showSearchDialog = true"
            >
              <i class="pi pi-search"></i>
              <span class="search-placeholder">Search</span>
              <span class="search-keys"> <kbd>⌘</kbd><kbd>K</kbd> </span>
            </Button>
          </div>
        </li>

        <!-- Navigation Links -->
        <li>
          <router-link to="/dashboard" class="topbar-item">
            <i class="pi pi-home"></i>
            <span class="topbar-item-text">Dashboard</span>
          </router-link>
        </li>

        <li>
          <router-link to="/institutions" class="topbar-item">
            <i class="pi pi-building"></i>
            <span class="topbar-item-text">Institutions</span>
          </router-link>
        </li>

        <li>
          <router-link to="/tasks" class="topbar-item">
            <i class="pi pi-check-square"></i>
            <span class="topbar-item-text">Tasks</span>
          </router-link>
        </li>

        <!-- Billing Dropdown -->
        <li class="dropdown-container">
          <Button
            type="button"
            class="topbar-item dropdown-toggle"
            @click="toggleBillingMenu"
            aria-haspopup="true"
          >
            <i class="pi pi-credit-card"></i>
            <span class="topbar-item-text">Billing</span>
            <i class="pi pi-angle-down"></i>
          </Button>
          <div v-if="showBillingMenu" class="dropdown-menu">
            <router-link to="/quotes" class="dropdown-item">
              <i class="pi pi-file-edit"></i>
              <span>Quotes</span>
            </router-link>
            <router-link to="/invoices" class="dropdown-item">
              <i class="pi pi-file"></i>
              <span>Invoices</span>
            </router-link>
            <router-link to="/templates" class="dropdown-item">
              <i class="pi pi-palette"></i>
              <span>Templates</span>
            </router-link>
            <div class="dropdown-separator"></div>
            <router-link to="/billing/analytics" class="dropdown-item">
              <i class="pi pi-chart-bar"></i>
              <span>Analytics</span>
              <span class="shortcut">⌘A</span>
            </router-link>
          </div>
        </li>

        <li>
          <router-link to="/team" class="topbar-item">
            <i class="pi pi-users"></i>
            <span class="topbar-item-text">Team</span>
          </router-link>
        </li>

        <li>
          <router-link to="/webhooks" class="topbar-item">
            <i class="pi pi-send"></i>
            <span class="topbar-item-text">Webhooks</span>
          </router-link>
        </li>

        <!-- Notifications -->
        <li>
          <NotificationCenter />
        </li>

        <!-- Profile Menu -->
        <li class="dropdown-container">
          <Button
            type="button"
            class="topbar-item profile-button"
            @click="toggleProfileMenu"
            aria-haspopup="true"
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
          <div v-if="showProfileMenu" class="dropdown-menu profile-menu">
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
            <div class="dropdown-separator"></div>
            <router-link to="/profile" class="dropdown-item">
              <i class="pi pi-user"></i>
              <span>Profile</span>
            </router-link>
            <div class="dropdown-separator"></div>
            <button @click="handleLogout" class="dropdown-item logout-item">
              <i class="pi pi-sign-out"></i>
              <span>Logout</span>
            </button>
          </div>
        </li>

        <!-- Mobile Menu Button -->
        <li class="menu-button">
          <Button
            type="button"
            class="topbar-item mobile-menu-button"
            @click="toggleMobileMenu"
            aria-label="Menu"
          >
            <i class="pi pi-bars"></i>
          </Button>
        </li>
      </ul>
    </div>

    <!-- Mobile Menu Overlay -->
    <div
      v-if="showMobileMenu"
      class="mobile-menu-overlay"
      @click="showMobileMenu = false"
    >
      <div class="mobile-menu" @click.stop>
        <div class="mobile-menu-header">
          <span class="mobile-menu-title">Medical CRM</span>
          <Button type="button" class="mobile-menu-close" @click="showMobileMenu = false">
            <i class="pi pi-times"></i>
          </Button>
        </div>
        <nav class="mobile-menu-nav">
          <router-link
            to="/dashboard"
            class="mobile-menu-item"
            @click="showMobileMenu = false"
          >
            <i class="pi pi-home"></i>
            <span>Dashboard</span>
          </router-link>
          <router-link
            to="/institutions"
            class="mobile-menu-item"
            @click="showMobileMenu = false"
          >
            <i class="pi pi-building"></i>
            <span>Institutions</span>
          </router-link>
          <router-link
            to="/tasks"
            class="mobile-menu-item"
            @click="showMobileMenu = false"
          >
            <i class="pi pi-check-square"></i>
            <span>Tasks</span>
          </router-link>
          <div class="mobile-menu-section">
            <span class="mobile-menu-section-title">Billing</span>
            <router-link
              to="/quotes"
              class="mobile-menu-item"
              @click="showMobileMenu = false"
            >
              <i class="pi pi-file-edit"></i>
              <span>Quotes</span>
            </router-link>
            <router-link
              to="/invoices"
              class="mobile-menu-item"
              @click="showMobileMenu = false"
            >
              <i class="pi pi-file"></i>
              <span>Invoices</span>
            </router-link>
            <router-link
              to="/templates"
              class="mobile-menu-item"
              @click="showMobileMenu = false"
            >
              <i class="pi pi-palette"></i>
              <span>Templates</span>
            </router-link>
            <router-link
              to="/billing/analytics"
              class="mobile-menu-item"
              @click="showMobileMenu = false"
            >
              <i class="pi pi-chart-bar"></i>
              <span>Analytics</span>
            </router-link>
          </div>
          <router-link
            to="/team"
            class="mobile-menu-item"
            @click="showMobileMenu = false"
          >
            <i class="pi pi-users"></i>
            <span>Team</span>
          </router-link>
          <router-link
            to="/webhooks"
            class="mobile-menu-item"
            @click="showMobileMenu = false"
          >
            <i class="pi pi-send"></i>
            <span>Webhooks</span>
          </router-link>
        </nav>
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
      <div class="search-dialog-content">
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
import InputText from "primevue/inputtext"
import { onMounted, onUnmounted, ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const authStore = useAuthStore()

// Reactive state
const showBillingMenu = ref(false)
const showProfileMenu = ref(false)
const showMobileMenu = ref(false)
const showSearchDialog = ref(false)
const searchQuery = ref("")

// Toggle functions
const toggleBillingMenu = () => {
  showBillingMenu.value = !showBillingMenu.value
  showProfileMenu.value = false
}

const toggleProfileMenu = () => {
  showProfileMenu.value = !showProfileMenu.value
  showBillingMenu.value = false
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

// Handle logout
const handleLogout = async () => {
  await authStore.logout()
  router.push("/login")
  showProfileMenu.value = false
}

// Close dropdowns when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  if (!target.closest(".dropdown-container")) {
    showBillingMenu.value = false
    showProfileMenu.value = false
  }
}

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "k") {
    event.preventDefault()
    showSearchDialog.value = true
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside)
  document.addEventListener("keydown", handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside)
  document.removeEventListener("keydown", handleKeydown)
})
</script>

<style scoped>
/* Layout Topbar - Based on PrimeVue official site */
.layout-topbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: var(--p-surface-0);
  border-bottom: 1px solid var(--p-surface-border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.layout-topbar-sticky {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.layout-topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 4rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Logo */
.layout-topbar-logo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.layout-topbar-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--p-text-color);
}

.layout-topbar-icon {
  display: none;
  align-items: center;
  text-decoration: none;
  color: var(--p-text-color);
}

/* Navigation Items */
.topbar-items {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0.5rem;
}

.topbar-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  text-decoration: none;
  color: var(--p-text-color);
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.topbar-item:hover {
  background: var(--p-surface-100);
  color: var(--p-primary-color);
}

.topbar-item.router-link-active {
  background: var(--p-primary-50);
  color: var(--p-primary-color);
  border-color: var(--p-primary-200);
}

.topbar-item-text {
  white-space: nowrap;
}

/* Search Button */
.search-container {
  position: relative;
}

.search-button {
  min-width: 200px;
  justify-content: space-between;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-border);
}

.search-button:hover {
  background: var(--p-surface-100);
  border-color: var(--p-primary-200);
}

.search-placeholder {
  flex: 1;
  text-align: left;
  color: var(--p-text-muted-color);
}

.search-keys {
  display: flex;
  gap: 0.25rem;
}

.search-keys kbd {
  background: var(--p-surface-200);
  border: 1px solid var(--p-surface-300);
  border-radius: 3px;
  padding: 0.125rem 0.25rem;
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--p-text-muted-color);
}

/* Dropdown */
.dropdown-container {
  position: relative;
}

.dropdown-toggle {
  gap: 0.5rem;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 200px;
  background: var(--p-surface-0);
  border: 1px solid var(--p-surface-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
  z-index: 1001;
  margin-top: 0.25rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--p-text-color);
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background: var(--p-surface-100);
}

.dropdown-separator {
  height: 1px;
  background: var(--p-surface-border);
  margin: 0.5rem 0;
}

.shortcut {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  background: var(--p-surface-100);
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
}

/* Profile Menu */
.profile-button {
  padding: 0.25rem;
  border-radius: 50%;
}

.profile-menu {
  right: 0;
  min-width: 280px;
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--p-surface-50);
  margin: -0.5rem -0rem 0.5rem -0rem;
  border-radius: 6px 6px 0 0;
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

.logout-item {
  color: var(--p-red-500);
}

.logout-item:hover {
  background: var(--p-red-50);
  color: var(--p-red-600);
}

/* Mobile Menu */
.menu-button {
  display: none;
}

.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1002;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100vh;
  background: var(--p-surface-0);
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  overflow-y: auto;
}

.mobile-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--p-surface-border);
}

.mobile-menu-title {
  font-weight: 600;
  font-size: 1.125rem;
}

.mobile-menu-close {
  padding: 0.5rem;
  border-radius: 50%;
}

.mobile-menu-nav {
  padding: 1rem 0;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  color: var(--p-text-color);
  transition: background-color 0.2s;
}

.mobile-menu-item:hover {
  background: var(--p-surface-100);
}

.mobile-menu-section {
  margin: 1rem 0;
}

.mobile-menu-section-title {
  display: block;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Search Dialog */
.search-dialog {
  max-width: 500px;
}

.search-dialog-content {
  padding: 1rem 0;
}

.search-results {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: 6px;
  text-align: center;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .topbar-item-text {
    display: none;
  }

  .search-button {
    min-width: auto;
    width: 2.5rem;
  }

  .search-placeholder,
  .search-keys {
    display: none;
  }
}

@media (max-width: 768px) {
  .layout-topbar-logo {
    display: none;
  }

  .layout-topbar-icon {
    display: flex;
  }

  .topbar-items li:not(.menu-button):not(:last-child) {
    display: none;
  }

  .menu-button {
    display: block;
  }
}

@media (max-width: 480px) {
  .layout-topbar-inner {
    padding: 0 0.5rem;
  }

  .mobile-menu {
    width: 100vw;
  }
}
</style>
