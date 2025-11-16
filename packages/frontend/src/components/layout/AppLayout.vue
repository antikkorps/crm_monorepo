<template>
  <v-app>
    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="shouldShowRail"
      :permanent="isPermanent"
      class="sidebar-gradient"
      elevation="3"
    >
      <!-- Logo Section -->
      <v-list-item nav>
        <template v-slot:prepend>
          <v-avatar color="primary" size="40">
            <v-icon color="white" size="24">mdi-medical-bag</v-icon>
          </v-avatar>
        </template>
        <template v-slot:title>
          <span v-show="!shouldShowRail" class="text-h6 font-weight-bold text-primary">
            {{ $t("sidebar.appName") }}
          </span>
        </template>
        <template v-slot:append>
          <v-btn
            v-if="!mobile"
            variant="text"
            icon="mdi-chevron-left"
            @click.stop="rail = !rail"
          ></v-btn>
          <v-btn
            v-if="mobile"
            variant="text"
            icon="mdi-close"
            @click.stop="drawer = false"
          ></v-btn>
        </template>
      </v-list-item>

      <v-divider></v-divider>

      <!-- Navigation Menu -->
      <v-list density="compact" nav>
        <!-- Main Navigation -->
        <v-list-item
          v-for="item in mainNavigation"
          :key="item.title"
          :prepend-icon="item.icon"
          :title="$t(item.title)"
          :to="item.to"
          :value="item.value"
          @click="onNavigationClick"
        ></v-list-item>

        <!-- Collaboration Section -->
        <v-list-group value="Collaboration">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-calendar-account"
              :title="$t('sidebar.collaboration')"
            ></v-list-item>
          </template>

          <v-list-item
            v-for="item in collaborationNavigation"
            :key="item.title"
            :prepend-icon="item.icon"
            :title="$t(item.title)"
            :to="item.to"
            :value="item.value"
            @click="onNavigationClick"
          ></v-list-item>
        </v-list-group>

        <!-- Billing Section (conditionally shown based on feature flags) -->
        <v-list-group v-if="filteredBillingNavigation.length > 0" value="Billing">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-credit-card"
              :title="$t('sidebar.billing')"
            ></v-list-item>
          </template>

          <v-list-item
            v-for="item in filteredBillingNavigation"
            :key="item.title"
            :prepend-icon="item.icon"
            :title="$t(item.title)"
            :to="item.to"
            :value="item.value"
            @click="onNavigationClick"
          ></v-list-item>
        </v-list-group>

        <!-- Contacts & Segmentation -->
        <v-list-group value="Contacts">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-account-box-multiple"
              :title="$t('sidebar.contactsSegmentation')"
            ></v-list-item>
          </template>

          <v-list-item
            v-for="item in contactsNavigation"
            :key="item.title"
            :prepend-icon="item.icon"
            :title="$t(item.title)"
            :to="item.to"
            :value="item.value"
            @click="onNavigationClick"
          ></v-list-item>
        </v-list-group>

        <!-- Configuration -->
        <v-list-group v-if="configNavigation.length > 0" value="Configuration">
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-cog"
              :title="$t('sidebar.configuration')"
            ></v-list-item>
          </template>

          <v-list-item
            v-for="item in configNavigation"
            :key="item.title"
            :prepend-icon="item.icon"
            :title="$t(item.title)"
            :to="item.to"
            :value="item.value"
            @click="onNavigationClick"
          ></v-list-item>
        </v-list-group>

        <!-- Export Center -->
        <v-list-item
          prepend-icon="mdi-download"
          :title="$t('navigation.exportCenter')"
          to="/export"
          value="export"
          @click="onNavigationClick"
        ></v-list-item>
      </v-list>

      <!-- User Card and Logout Button at Bottom -->
      <template v-slot:append>
        <div class="pa-2">
          <!-- User Info Card -->
          <v-card
            v-if="!shouldShowRail"
            class="user-card mb-3"
            variant="outlined"
            @click="$router.push('/profile')"
            hover
          >
            <v-card-text class="pa-3">
              <div class="d-flex align-center">
                <UserAvatar
                  v-if="authStore.user?.avatarSeed"
                  :seed="authStore.user.avatarSeed"
                  :style="authStore.user.avatarStyle"
                  :size="40"
                  class="me-3"
                />
                <v-avatar v-else size="40" class="me-3">
                  <v-img
                    src="https://randomuser.me/api/portraits/women/85.jpg"
                    alt="Default Avatar"
                  ></v-img>
                </v-avatar>
                <div class="flex-grow-1 text-truncate">
                  <div class="text-subtitle-2 font-weight-bold text-truncate">
                    {{ authStore.userName || "User" }}
                  </div>
                  <div class="text-caption text-medium-emphasis text-truncate">
                    {{ authStore.user?.email || "user@example.com" }}
                  </div>
                </div>
                <v-icon size="16" class="text-medium-emphasis">
                  mdi-chevron-right
                </v-icon>
              </div>
            </v-card-text>
          </v-card>

          <!-- Mini User Card for Rail Mode -->
          <v-card
            v-else-if="shouldShowRail"
            class="user-card-mini mb-3 d-flex justify-center"
            variant="outlined"
            @click="$router.push('/profile')"
            hover
          >
            <v-card-text class="pa-2">
              <UserAvatar
                v-if="authStore.user?.avatarSeed"
                :seed="authStore.user.avatarSeed"
                :style="authStore.user.avatarStyle"
                size="small"
              />
              <v-avatar v-else size="32">
                <v-img
                  src="https://randomuser.me/api/portraits/women/85.jpg"
                  alt="Default Avatar"
                ></v-img>
              </v-avatar>
              <v-tooltip activator="parent" location="right">
                <div>
                  <div class="font-weight-bold">{{ authStore.userName || "User" }}</div>
                  <div class="text-caption">
                    {{ authStore.user?.email || "user@example.com" }}
                  </div>
                  <div class="text-caption mt-1">
                    {{ $t("sidebar.clickToViewProfile") }}
                  </div>
                </div>
              </v-tooltip>
            </v-card-text>
          </v-card>

          <!-- Logout Button -->
          <v-btn
            color="error"
            variant="tonal"
            :block="!shouldShowRail"
            :icon="shouldShowRail"
            @click="handleLogout"
            class="logout-button"
          >
            <v-icon>mdi-logout</v-icon>
            <span v-if="!shouldShowRail" class="ml-2">{{ $t("navigation.logout") }}</span>
            <v-tooltip v-if="shouldShowRail" activator="parent" location="right">
              {{ $t("navigation.logout") }}
            </v-tooltip>
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- App Bar -->
    <v-app-bar color="primary" density="compact" elevation="2">
      <template v-slot:prepend>
        <v-app-bar-nav-icon @click="mobile ? (drawer = !drawer) : (rail = !rail)"></v-app-bar-nav-icon>
      </template>

      <v-spacer></v-spacer>

      <!-- Search -->
      <v-btn icon @click="showSearch = true">
        <v-icon>mdi-magnify</v-icon>
      </v-btn>

      <!-- Language Selector -->
      <LanguageSelector />

      <!-- Notifications -->
      <NotificationCenterVuetify />

      <!-- User Menu -->
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <UserAvatar
              v-if="authStore.user?.avatarSeed"
              :seed="authStore.user.avatarSeed"
              :style="authStore.user.avatarStyle"
              size="small"
            />
            <v-avatar v-else size="32">
              <v-img
                src="https://randomuser.me/api/portraits/women/85.jpg"
                alt="Default Avatar"
              ></v-img>
            </v-avatar>
          </v-btn>
        </template>

        <v-list>
          <v-list-item
            prepend-icon="mdi-account"
            :title="$t('navigation.profile')"
            @click="$router.push('/profile')"
          ></v-list-item>
          <v-divider></v-divider>
          <v-list-item
            prepend-icon="mdi-logout"
            :title="$t('navigation.logout')"
            @click="handleLogout"
          ></v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Main Content -->
    <v-main>
      <v-container fluid>
        <slot />
      </v-container>
    </v-main>

    <!-- Search Dialog -->
    <v-dialog v-model="showSearch" max-width="600">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ $t("search.title") }}</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            :label="$t('search.placeholder')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            clearable
            autofocus
          ></v-text-field>
          <v-alert v-if="searchQuery" type="info" variant="tonal" class="mt-4">
            {{ $t("search.comingSoon") }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="showSearch = false">{{
            $t("common.close")
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import LanguageSelector from "@/components/common/LanguageSelector.vue"
import NotificationCenterVuetify from "@/components/common/NotificationCenterVuetify.vue"
import UserAvatar from "@/components/common/UserAvatar.vue"
import { useAuthStore } from "@/stores/auth"
import { useSettingsStore } from "@/stores/settings"
import { UserRole } from "@medical-crm/shared"
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import { useDisplay } from "vuetify"

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const router = useRouter()
const { mobile } = useDisplay()

// Reactive state
const drawer = ref(!mobile.value) // Fermé par défaut sur mobile
const rail = ref(false)
const showSearch = ref(false)
const searchQuery = ref("")

// Computed properties for responsive sidebar
const isPermanent = computed(() => !mobile.value)
const shouldShowRail = computed(() => !mobile.value && rail.value)

// Navigation items
const mainNavigation = [
  {
    title: "navigation.dashboard",
    icon: "mdi-view-dashboard",
    to: "/dashboard",
    value: "dashboard",
  },
  {
    title: "navigation.institutions",
    icon: "mdi-domain",
    to: "/institutions",
    value: "institutions",
  },
  {
    title: "navigation.tasks",
    icon: "mdi-check-circle",
    to: "/tasks",
    value: "tasks",
  },
]

const collaborationNavigation = [
  {
    title: "navigation.meetings",
    icon: "mdi-calendar-account",
    to: "/meetings",
    value: "meetings",
  },
  {
    title: "navigation.calls",
    icon: "mdi-phone",
    to: "/calls",
    value: "calls",
  },
  {
    title: "navigation.notes",
    icon: "mdi-note-text",
    to: "/notes",
    value: "notes",
  },
  {
    title: "navigation.reminders",
    icon: "mdi-bell-alert",
    to: "/reminders",
    value: "reminders",
  },
]

const billingNavigation = [
  {
    title: "navigation.quotes",
    icon: "mdi-file-document-edit",
    to: "/quotes",
    value: "quotes",
  },
  {
    title: "navigation.invoices",
    icon: "mdi-file-document",
    to: "/invoices",
    value: "invoices",
  },
  {
    title: "navigation.templates",
    icon: "mdi-palette",
    to: "/templates",
    value: "templates",
  },
  {
    title: "navigation.catalog",
    icon: "mdi-package-variant",
    to: "/catalog",
    value: "catalog",
  },
  {
    title: "navigation.analytics",
    icon: "mdi-chart-bar",
    to: "/billing/analytics",
    value: "analytics",
  },
]

const contactsNavigation = [
  {
    title: "navigation.contacts",
    icon: "mdi-account-box-outline",
    to: "/contacts",
    value: "contacts",
  },
  {
    title: "navigation.segmentation",
    icon: "mdi-filter-variant",
    to: "/segmentation",
    value: "segmentation",
  },
]

const configNavigation = computed(() => {
  const items = [
    {
      title: "navigation.team",
      icon: "mdi-account-group",
      to: "/team",
      value: "team",
    },
    {
      title: "navigation.webhooks",
      icon: "mdi-webhook",
      to: "/webhooks",
      value: "webhooks",
    },
    {
      title: "navigation.digiforma",
      icon: "mdi-school",
      to: "/settings/digiforma",
      value: "digiforma",
    },
  ]

  // Add System Settings for SUPER_ADMIN only
  if (authStore.userRole === UserRole.SUPER_ADMIN) {
    items.push({
      title: "navigation.systemSettings",
      icon: "mdi-cog-outline",
      to: "/settings/features",
      value: "features",
    })
  }

  return items
})

// Filter billing navigation based on feature flags
const filteredBillingNavigation = computed(() => {
  return billingNavigation.filter((item) => {
    if (item.value === "quotes") {
      return settingsStore.isQuotesEnabled
    }
    if (item.value === "invoices") {
      return settingsStore.isInvoicesEnabled
    }
    // Templates, catalog, and analytics are always visible if any billing feature is enabled
    return settingsStore.isBillingEnabled
  })
})

// Handle logout
const handleLogout = async () => {
  await authStore.logout()
  router.push("/login")
}

// Handle navigation clicks - close sidebar on mobile
const onNavigationClick = () => {
  if (mobile.value) {
    drawer.value = false
  }
}
</script>

<style scoped>
.sidebar-gradient {
  background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%) !important;
  border-right: 1px solid rgba(0, 0, 0, 0.12) !important;
}

.v-navigation-drawer--rail .sidebar-gradient {
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%) !important;
}

/* Améliorer l'apparence des éléments de navigation */
:deep(.v-list-item--active) {
  background: linear-gradient(
    90deg,
    rgba(25, 118, 210, 0.1) 0%,
    rgba(25, 118, 210, 0.05) 100%
  ) !important;
  border-right: 3px solid #1976d2;
}

:deep(.v-list-item:hover:not(.v-list-item--active)) {
  background: rgba(25, 118, 210, 0.04) !important;
  transform: translateX(2px);
  transition: all 0.2s ease;
}

/* Style pour les cartes utilisateur */
.user-card {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(248, 249, 250, 0.95) 100%
  ) !important;
  border: 1px solid rgba(25, 118, 210, 0.2) !important;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.user-card:hover {
  background: linear-gradient(
    135deg,
    rgba(25, 118, 210, 0.05) 0%,
    rgba(25, 118, 210, 0.02) 100%
  ) !important;
  border-color: rgba(25, 118, 210, 0.4) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15) !important;
}

.user-card-mini {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(248, 249, 250, 0.95) 100%
  ) !important;
  border: 1px solid rgba(25, 118, 210, 0.2) !important;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  border-radius: 12px !important;
}

.user-card-mini:hover {
  background: linear-gradient(
    135deg,
    rgba(25, 118, 210, 0.08) 0%,
    rgba(25, 118, 210, 0.04) 100%
  ) !important;
  border-color: rgba(25, 118, 210, 0.5) !important;
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.2) !important;
}

/* Animation pour l'avatar */
.user-card:hover .v-avatar,
.user-card-mini:hover .v-avatar {
  transform: scale(1.05);
  transition: transform 0.2s ease;
}

/* Style pour le texte de la carte utilisateur */
.user-card .text-subtitle-2 {
  color: rgba(0, 0, 0, 0.87) !important;
}

.user-card .text-caption {
  color: rgba(0, 0, 0, 0.6) !important;
}

/* Style pour le bouton de déconnexion */
.logout-button {
  background: linear-gradient(45deg, #f44336, #d32f2f) !important;
  color: white !important;
  box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3) !important;
  transition: all 0.3s ease;
}

.logout-button:hover {
  box-shadow: 0 4px 8px rgba(244, 67, 54, 0.4) !important;
  transform: translateY(-1px);
}

/* Animation pour l'icône chevron */
.user-card:hover .mdi-chevron-right {
  transform: translateX(2px);
  transition: transform 0.2s ease;
}

/* Mobile specific styles */
@media (max-width: 960px) {
  /* Ensure drawer takes full height on mobile */
  :deep(.v-navigation-drawer) {
    height: 100vh !important;
    z-index: 1006 !important;
  }
  
  /* Add overlay backdrop when drawer is open on mobile */
  :deep(.v-overlay__scrim) {
    background-color: rgba(0, 0, 0, 0.5) !important;
  }
  
  /* Ensure main content is not affected by drawer on mobile */
  :deep(.v-main) {
    padding-left: 0 !important;
  }
  
  /* Make sure app bar nav icon is visible on mobile */
  .v-app-bar .v-app-bar-nav-icon {
    display: flex !important;
  }
  
  /* Style for mobile close button in drawer */
  .v-list-item .v-btn[icon="mdi-close"] {
    color: rgba(var(--v-theme-error)) !important;
    background: rgba(var(--v-theme-error), 0.1) !important;
    border-radius: 8px !important;
  }
  
  .v-list-item .v-btn[icon="mdi-close"]:hover {
    background: rgba(var(--v-theme-error), 0.2) !important;
    transform: scale(1.05);
  }
}
</style>
