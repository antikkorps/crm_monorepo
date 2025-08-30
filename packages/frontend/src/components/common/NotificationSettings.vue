<template>
  <div class="notification-settings">
    <div class="settings-header">
      <h3 class="m-0">Notification Settings</h3>
      <p class="text-600 mt-2 mb-4">Customize how and when you receive notifications</p>
    </div>

    <div class="settings-content">
      <!-- General Settings -->
      <div class="settings-section">
        <h4 class="section-title">General</h4>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Sound Notifications</label>
            <small class="setting-description"
              >Play a sound when new notifications arrive</small
            >
          </div>
          <div class="setting-control">
            <InputSwitch v-model="localPreferences.enableSound" />
          </div>
        </div>

        <div class="setting-item" v-if="localPreferences.enableSound">
          <div class="setting-info">
            <label class="setting-label">Sound Volume</label>
            <small class="setting-description">Adjust notification sound volume</small>
          </div>
          <div class="setting-control">
            <Slider
              v-model="localPreferences.soundVolume"
              :min="0"
              :max="1"
              :step="0.1"
              class="w-full"
            />
            <small class="text-600"
              >{{ Math.round(localPreferences.soundVolume * 100) }}%</small
            >
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Desktop Notifications</label>
            <small class="setting-description"
              >Show desktop notifications outside the browser</small
            >
          </div>
          <div class="setting-control">
            <InputSwitch
              v-model="localPreferences.enableDesktop"
              @change="handleDesktopToggle"
            />
          </div>
        </div>

        <div class="setting-item" v-if="localPreferences.enableDesktop">
          <div class="setting-info">
            <label class="setting-label">Desktop Duration</label>
            <small class="setting-description"
              >How long desktop notifications stay visible</small
            >
          </div>
          <div class="setting-control">
            <Dropdown
              v-model="localPreferences.desktopDuration"
              :options="durationOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Notification Types -->
      <div class="settings-section">
        <h4 class="section-title">Notification Types</h4>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Task Assignments</label>
            <small class="setting-description">When you are assigned to a new task</small>
          </div>
          <div class="setting-control">
            <InputSwitch v-model="localPreferences.enableTaskAssignments" />
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Institution Updates</label>
            <small class="setting-description"
              >When medical institutions are updated</small
            >
          </div>
          <div class="setting-control">
            <InputSwitch v-model="localPreferences.enableInstitutionUpdates" />
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Team Activity</label>
            <small class="setting-description">When team members perform actions</small>
          </div>
          <div class="setting-control">
            <InputSwitch v-model="localPreferences.enableTeamActivity" />
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Webhook Events</label>
            <small class="setting-description">When webhooks are triggered</small>
          </div>
          <div class="setting-control">
            <InputSwitch v-model="localPreferences.enableWebhookEvents" />
          </div>
        </div>
      </div>

      <!-- Test Notifications -->
      <div class="settings-section">
        <h4 class="section-title">Test Notifications</h4>

        <div class="test-buttons">
          <Button
            label="Test Sound"
            icon="pi pi-volume-up"
            outlined
            size="small"
            @click="testSound"
            :disabled="!localPreferences.enableSound"
          />
          <Button
            label="Test Desktop"
            icon="pi pi-desktop"
            outlined
            size="small"
            @click="testDesktop"
            :disabled="
              !localPreferences.enableDesktop ||
              !notificationStore.isDesktopPermissionGranted
            "
          />
          <Button
            label="Test Notification"
            icon="pi pi-bell"
            outlined
            size="small"
            @click="testNotification"
          />
        </div>
      </div>

      <!-- Statistics -->
      <div class="settings-section">
        <h4 class="section-title">Statistics</h4>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">Total Notifications</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats.unread }}</div>
            <div class="stat-label">Unread</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats.today }}</div>
            <div class="stat-label">Today</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ stats.thisWeek }}</div>
            <div class="stat-label">This Week</div>
          </div>
        </div>

        <div class="type-stats">
          <h5>By Type</h5>
          <div class="type-stat-item">
            <i class="pi pi-check-square text-blue-500"></i>
            <span>Task Assignments: {{ stats.byType.taskAssigned }}</span>
          </div>
          <div class="type-stat-item">
            <i class="pi pi-building text-green-500"></i>
            <span>Institution Updates: {{ stats.byType.institutionUpdated }}</span>
          </div>
          <div class="type-stat-item">
            <i class="pi pi-users text-purple-500"></i>
            <span>Team Activity: {{ stats.byType.teamActivity }}</span>
          </div>
          <div class="type-stat-item">
            <i class="pi pi-link text-orange-500"></i>
            <span>Webhook Events: {{ stats.byType.webhookTriggered }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <div class="footer-actions">
        <Button
          label="Reset to Defaults"
          icon="pi pi-refresh"
          text
          size="small"
          @click="resetToDefaults"
        />
        <div class="ml-auto">
          <Button label="Cancel" text size="small" @click="cancel" class="mr-2" />
          <Button
            label="Save Changes"
            icon="pi pi-check"
            size="small"
            @click="saveChanges"
            :disabled="!hasChanges"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  useNotificationStore,
  type NotificationPreferences,
} from "@/stores/notifications"
import Button from "primevue/button"
import Dropdown from "primevue/dropdown"
import InputSwitch from "primevue/inputswitch"
import Slider from "primevue/slider"
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
  { label: "3 seconds", value: 3000 },
  { label: "5 seconds", value: 5000 },
  { label: "10 seconds", value: 10000 },
  { label: "15 seconds", value: 15000 },
  { label: "30 seconds", value: 30000 },
]

const hasChanges = computed(() => {
  return (
    JSON.stringify(localPreferences.value) !== JSON.stringify(originalPreferences.value)
  )
})

const stats = computed(() => notificationStore.getNotificationStats())

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
  max-width: 600px;
  margin: 0 auto;
}

.settings-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 1.5rem;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #495057;
  margin: 0 0 0.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f1f3f4;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  gap: 1rem;
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-weight: 500;
  color: #495057;
  margin-bottom: 0.25rem;
}

.setting-description {
  color: #6c757d;
  font-size: 0.875rem;
  line-height: 1.4;
}

.setting-control {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  min-width: 120px;
}

.test-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1976d2;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6c757d;
}

.type-stats {
  margin-top: 1rem;
}

.type-stats h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
}

.type-stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: #6c757d;
}

.settings-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.footer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Responsive Design */
@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: stretch;
  }

  .setting-control {
    align-items: stretch;
    min-width: auto;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-actions {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .footer-actions > div {
    margin-left: 0 !important;
    display: flex;
    gap: 0.5rem;
  }
}
</style>
