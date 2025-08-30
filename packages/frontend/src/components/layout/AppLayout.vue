<template>
  <div class="layout-wrapper">
    <!-- Top Navigation Bar -->
    <div class="layout-topbar">
      <div class="layout-topbar-logo">
        <router-link to="/dashboard" class="layout-topbar-logo-link">
          <i class="pi pi-heart-fill text-primary mr-2"></i>
          <span class="layout-topbar-logo-text">Medical CRM</span>
        </router-link>
      </div>

      <div class="layout-topbar-menu">
        <!-- Notification Center -->
        <div class="layout-topbar-item mr-3">
          <NotificationCenter />
        </div>

        <!-- User Profile Menu -->
        <div class="layout-topbar-item">
          <Button
            type="button"
            class="p-link layout-topbar-button"
            @click="toggleProfileMenu"
            aria-haspopup="true"
            aria-controls="profile-menu"
          >
            <Avatar
              :image="authStore.userAvatar"
              shape="circle"
              size="normal"
              class="mr-2"
            />
            <span class="layout-topbar-item-text">{{ authStore.userName }}</span>
            <i class="pi pi-angle-down ml-2"></i>
          </Button>

          <Menu
            id="profile-menu"
            ref="profileMenu"
            :model="profileMenuItems"
            :popup="true"
          />
        </div>
      </div>
    </div>

    <!-- Sidebar Navigation -->
    <div class="layout-sidebar">
      <div class="layout-menu">
        <ul class="layout-menu-list">
          <li class="layout-menuitem">
            <router-link to="/dashboard" class="layout-menuitem-link">
              <i class="layout-menuitem-icon pi pi-home"></i>
              <span class="layout-menuitem-text">Dashboard</span>
            </router-link>
          </li>

          <li class="layout-menuitem">
            <router-link to="/institutions" class="layout-menuitem-link">
              <i class="layout-menuitem-icon pi pi-building"></i>
              <span class="layout-menuitem-text">Medical Institutions</span>
            </router-link>
          </li>

          <li class="layout-menuitem">
            <router-link to="/tasks" class="layout-menuitem-link">
              <i class="layout-menuitem-icon pi pi-check-square"></i>
              <span class="layout-menuitem-text">Tasks</span>
            </router-link>
          </li>

          <li class="layout-menuitem-category">
            <span class="layout-menuitem-text">Billing</span>
          </li>

          <li class="layout-menuitem">
            <router-link to="/quotes" class="layout-menuitem-link">
              <i class="layout-menuitem-icon pi pi-file-edit"></i>
              <span class="layout-menuitem-text">Quotes</span>
            </router-link>
          </li>

          <li class="layout-menuitem">
            <router-link to="/invoices" class="layout-menuitem-link">
              <i class="layout-menuitem-icon pi pi-file"></i>
              <span class="layout-menuitem-text">Invoices</span>
            </router-link>
          </li>

          <li class="layout-menuitem">
            <router-link to="/templates" class="layout-menuitem-link">
              <i class="layout-menuitem-icon pi pi-palette"></i>
              <span class="layout-menuitem-text">Templates</span>
            </router-link>
          </li>

          <li class="layout-menuitem">
            <router-link to="/billing/analytics" class="layout-menuitem-link">
              <i class="layout-menuitem-icon pi pi-chart-bar"></i>
              <span class="layout-menuitem-text">Billing Analytics</span>
            </router-link>
          </li>

          <li class="layout-menuitem-category">
            <span class="layout-menuitem-text">Team</span>
          </li>

          <li class="layout-menuitem">
            <router-link to="/team" class="layout-menuitem-link">
              <i class="layout-menuitem-icon pi pi-users"></i>
              <span class="layout-menuitem-text">Team</span>
            </router-link>
          </li>
        </ul>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="layout-main-container">
      <div class="layout-main">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NotificationCenter from "@/components/common/NotificationCenter.vue"
import { useAuthStore } from "@/stores/auth"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Menu from "primevue/menu"
import type { MenuItem } from "primevue/menuitem"
import { ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const authStore = useAuthStore()

const profileMenu = ref()

const profileMenuItems: MenuItem[] = [
  {
    label: "Profile",
    icon: "pi pi-user",
    command: () => {
      router.push("/profile")
    },
  },
  {
    separator: true,
  },
  {
    label: "Logout",
    icon: "pi pi-sign-out",
    command: async () => {
      await authStore.logout()
      router.push("/login")
    },
  },
]

const toggleProfileMenu = (event: Event) => {
  profileMenu.value.toggle(event)
}
</script>

<style scoped>
.layout-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Top Navigation Bar */
.layout-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 4rem;
  background: #ffffff;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.layout-topbar-logo {
  display: flex;
  align-items: center;
}

.layout-topbar-logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #495057;
  font-weight: 600;
  font-size: 1.25rem;
}

.layout-topbar-logo-text {
  margin-left: 0.5rem;
}

.layout-topbar-menu {
  display: flex;
  align-items: center;
}

.layout-topbar-item {
  position: relative;
}

.layout-topbar-button {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.layout-topbar-button:hover {
  background-color: #f8f9fa;
}

.layout-topbar-item-text {
  margin: 0 0.5rem;
  font-weight: 500;
}

/* Sidebar Navigation */
.layout-sidebar {
  position: fixed;
  top: 4rem;
  left: 0;
  width: 16rem;
  height: calc(100vh - 4rem);
  background: #ffffff;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  z-index: 999;
}

.layout-menu {
  padding: 1rem 0;
}

.layout-menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.layout-menuitem {
  margin: 0;
}

.layout-menuitem-category {
  padding: 0.75rem 1.5rem 0.5rem;
  margin-top: 1rem;
}

.layout-menuitem-category:first-child {
  margin-top: 0;
}

.layout-menuitem-category .layout-menuitem-text {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #6c757d;
  letter-spacing: 0.5px;
}

.layout-menuitem-link {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  color: #495057;
  transition: all 0.2s;
  border-radius: 0;
}

.layout-menuitem-link:hover {
  background-color: #f8f9fa;
  color: #007bff;
}

.layout-menuitem-link.router-link-active {
  background-color: #e3f2fd;
  color: #1976d2;
  border-right: 3px solid #1976d2;
}

.layout-menuitem-icon {
  margin-right: 0.75rem;
  font-size: 1rem;
  width: 1rem;
  text-align: center;
}

.layout-menuitem-text {
  font-weight: 500;
}

/* Main Content Area */
.layout-main-container {
  margin-left: 16rem;
  margin-top: 4rem;
  min-height: calc(100vh - 4rem);
}

.layout-main {
  padding: 0;
  background: #f8f9fa;
  min-height: calc(100vh - 4rem);
}

/* Responsive Design */
@media (max-width: 768px) {
  .layout-sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .layout-main-container {
    margin-left: 0;
  }

  .layout-topbar-logo-text {
    display: none;
  }

  .layout-topbar-item-text {
    display: none;
  }
}
</style>
