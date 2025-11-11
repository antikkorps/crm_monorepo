<template>
  <div class="notification-settings pa-4">
    <div class="settings-header mb-6">
      <h3 class="text-h5 font-weight-bold mb-2">Notification Settings</h3>
      <p class="text-body-2 text-medium-emphasis">
        Customize how and when you receive notifications
      </p>
    </div>

    <div class="settings-content">
      <!-- General Settings -->
      <v-card class="mb-6" variant="outlined">
        <v-card-title class="bg-grey-lighten-4">
          <v-icon start>mdi-cog</v-icon>
          General
        </v-card-title>

        <v-card-text class="pa-4">
          <v-list class="pa-0">
            <!-- Sound Notifications -->
            <v-list-item class="px-0">
              <v-list-item-title>Sound Notifications</v-list-item-title>
              <v-list-item-subtitle>Play a sound when new notifications arrive</v-list-item-subtitle>
              <template #append>
                <v-switch
                  v-model="localPreferences.enableSound"
                  color="primary"
                  hide-details
                  inset
                />
              </template>
            </v-list-item>

            <!-- Sound Volume -->
            <v-list-item v-if="localPreferences.enableSound" class="px-0">
              <v-list-item-title>Sound Volume</v-list-item-title>
              <v-list-item-subtitle class="mb-2">Adjust notification sound volume</v-list-item-subtitle>
              <div class="d-flex align-center w-100 mt-2">
                <v-slider
                  v-model="localPreferences.soundVolume"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  thumb-label
                  color="primary"
                  hide-details
                >
                  <template #append>
                    <span class="text-caption ml-2">
                      {{ Math.round(localPreferences.soundVolume * 100) }}%
                    </span>
                  </template>
                </v-slider>
              </div>
            </v-list-item>

            <v-divider class="my-2" />

            <!-- Desktop Notifications -->
            <v-list-item class="px-0">
              <v-list-item-title>Desktop Notifications</v-list-item-title>
              <v-list-item-subtitle>Show desktop notifications outside the browser</v-list-item-subtitle>
              <template #append>
                <v-switch
                  v-model="localPreferences.enableDesktop"
                  color="primary"
                  hide-details
                  inset
                  @update:model-value="handleDesktopToggle"
                />
              </template>
            </v-list-item>

            <!-- Desktop Duration -->
            <v-list-item v-if="localPreferences.enableDesktop" class="px-0">
              <v-list-item-title>Desktop Duration</v-list-item-title>
              <v-list-item-subtitle>How long desktop notifications stay visible</v-list-item-subtitle>
              <v-select
                v-model="localPreferences.desktopDuration"
                :items="durationOptions"
                variant="outlined"
                density="compact"
                hide-details
                class="mt-2"
              />
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Notification Types -->
      <v-card class="mb-6" variant="outlined">
        <v-card-title class="bg-grey-lighten-4">
          <v-icon start>mdi-bell</v-icon>
          Notification Types
        </v-card-title>

        <v-card-text class="pa-4">
          <v-list class="pa-0">
            <v-list-item class="px-0">
              <v-list-item-title>Task Assignments</v-list-item-title>
              <v-list-item-subtitle>When you are assigned to a new task</v-list-item-subtitle>
              <template #append>
                <v-switch
                  v-model="localPreferences.enableTaskAssignments"
                  color="primary"
                  hide-details
                  inset
                />
              </template>
            </v-list-item>

            <v-divider class="my-2" />

            <v-list-item class="px-0">
              <v-list-item-title>Institution Updates</v-list-item-title>
              <v-list-item-subtitle>When medical institutions are updated</v-list-item-subtitle>
              <template #append>
                <v-switch
                  v-model="localPreferences.enableInstitutionUpdates"
                  color="primary"
                  hide-details
                  inset
                />
              </template>
            </v-list-item>

            <v-divider class="my-2" />

            <v-list-item class="px-0">
              <v-list-item-title>Team Activity</v-list-item-title>
              <v-list-item-subtitle>When team members perform actions</v-list-item-subtitle>
              <template #append>
                <v-switch
                  v-model="localPreferences.enableTeamActivity"
                  color="primary"
                  hide-details
                  inset
                />
              </template>
            </v-list-item>

            <v-divider class="my-2" />

            <v-list-item class="px-0">
              <v-list-item-title>Webhook Events</v-list-item-title>
              <v-list-item-subtitle>When webhooks are triggered</v-list-item-subtitle>
              <template #append>
                <v-switch
                  v-model="localPreferences.enableWebhookEvents"
                  color="primary"
                  hide-details
                  inset
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Test Notifications -->
      <v-card class="mb-6" variant="outlined">
        <v-card-title class="bg-grey-lighten-4">
          <v-icon start>mdi-test-tube</v-icon>
          Test Notifications
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="d-flex flex-wrap ga-2">
            <v-btn
              variant="outlined"
              size="small"
              prepend-icon="mdi-volume-up"
              @click="testSound"
              :disabled="!localPreferences.enableSound"
            >
              Test Sound
            </v-btn>
            <v-btn
              variant="outlined"
              size="small"
              prepend-icon="mdi-monitor"
              @click="testDesktop"
              :disabled="
                !localPreferences.enableDesktop ||
                !notificationStore.isDesktopPermissionGranted
              "
            >
              Test Desktop
            </v-btn>
            <v-btn
              variant="outlined"
              size="small"
              prepend-icon="mdi-bell"
              @click="testNotification"
            >
              Test Notification
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Statistics -->
      <v-card variant="outlined">
        <v-card-title class="bg-grey-lighten-4">
          <v-icon start>mdi-chart-bar</v-icon>
          Statistics
        </v-card-title>

        <v-card-text class="pa-4">
          <v-row>
            <v-col v-for="(value, key) in statsGrid" :key="key" cols="6" md="3">
              <v-sheet class="text-center pa-4 bg-grey-lighten-5 rounded">
                <div class="text-h4 font-weight-bold text-primary mb-1">{{ value }}</div>
                <div class="text-caption text-medium-emphasis">{{ key }}</div>
              </v-sheet>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <div>
            <h4 class="text-subtitle-1 font-weight-bold mb-3">By Type</h4>
            <v-list class="pa-0" density="compact">
              <v-list-item>
                <template #prepend>
                  <v-icon color="blue" size="small">mdi-check-circle</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  Task Assignments: {{ stats.byType.taskAssigned }}
                </v-list-item-title>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon color="green" size="small">mdi-domain</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  Institution Updates: {{ stats.byType.institutionUpdated }}
                </v-list-item-title>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon color="purple" size="small">mdi-account-group</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  Team Activity: {{ stats.byType.teamActivity }}
                </v-list-item-title>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon color="orange" size="small">mdi-webhook</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  Webhook Events: {{ stats.byType.webhookTriggered }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Footer Actions -->
    <v-divider class="my-6" />

    <div class="d-flex justify-space-between align-center">
      <v-btn variant="text" prepend-icon="mdi-refresh" @click="resetToDefaults">
        Reset to Defaults
      </v-btn>

      <div class="d-flex ga-2">
        <v-btn variant="text" @click="cancel">Cancel</v-btn>
        <v-btn
          variant="elevated"
          color="primary"
          prepend-icon="mdi-check"
          @click="saveChanges"
          :disabled="!hasChanges"
        >
          Save Changes
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  useNotificationStore,
  type NotificationPreferences,
} from "@/stores/notifications"
import { computed, onMounted, ref, watch } from "vue"

const emit = defineEmits<{
  close: []
}>()

const notificationStore = useNotificationStore()

const localPreferences = ref<NotificationPreferences>({
  ...notificationStore.preferences,
})
const originalPreferences = ref<NotificationPreferences>({
  ...notificationStore.preferences,
})

const durationOptions = [
  { title: "3 seconds", value: 3000 },
  { title: "5 seconds", value: 5000 },
  { title: "10 seconds", value: 10000 },
  { title: "15 seconds", value: 15000 },
  { title: "30 seconds", value: 30000 },
]

const hasChanges = computed(() => {
  return (
    JSON.stringify(localPreferences.value) !== JSON.stringify(originalPreferences.value)
  )
})

const stats = computed(() => notificationStore.getNotificationStats())

const statsGrid = computed(() => ({
  "Total": stats.value.total,
  "Unread": stats.value.unread,
  "Today": stats.value.today,
  "This Week": stats.value.thisWeek,
}))

const handleDesktopToggle = async () => {
  if (localPreferences.value.enableDesktop) {
    const granted = await notificationStore.requestDesktopPermission()
    if (!granted) {
      localPreferences.value.enableDesktop = false
    }
  }
}

const testSound = () => {
  notificationStore.playNotificationSound()
}

const testDesktop = () => {
  notificationStore.showDesktopNotification({
    id: "test",
    type: "test",
    message: "This is a test desktop notification",
    timestamp: new Date(),
    read: false,
    dismissed: false,
  })
}

const testNotification = () => {
  notificationStore.addNotification({
    type: "test",
    message: "This is a test notification",
    timestamp: new Date(),
  })
}

const resetToDefaults = () => {
  localPreferences.value = {
    enableSound: true,
    enableDesktop: false,
    enableTaskAssignments: true,
    enableInstitutionUpdates: true,
    enableTeamActivity: true,
    enableWebhookEvents: false,
    soundVolume: 0.5,
    desktopDuration: 5000,
  }
}

const saveChanges = async () => {
  await notificationStore.updatePreferences(localPreferences.value)
  originalPreferences.value = { ...localPreferences.value }
  emit("close")
}

const cancel = () => {
  localPreferences.value = { ...originalPreferences.value }
  emit("close")
}

// Watch for external preference changes
watch(
  () => notificationStore.preferences,
  (newPrefs) => {
    if (!hasChanges.value) {
      localPreferences.value = { ...newPrefs }
      originalPreferences.value = { ...newPrefs }
    }
  },
  { deep: true }
)

onMounted(() => {
  // Ensure we have the latest preferences
  localPreferences.value = { ...notificationStore.preferences }
  originalPreferences.value = { ...notificationStore.preferences }
})
</script>

<style scoped>
.notification-settings {
  max-width: 100%;
}
</style>
