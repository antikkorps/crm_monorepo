<template>
  <v-container fluid class="pa-6">
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">Notifications</h1>
      <p class="text-body-1 text-medium-emphasis">
        Manage your notification preferences and view notification history
      </p>
    </div>

    <v-card elevation="2">
      <v-tabs v-model="activeTab" bg-color="primary">
        <v-tab value="history">
          <v-icon start>mdi-history</v-icon>
          History
        </v-tab>
        <v-tab value="settings">
          <v-icon start>mdi-cog</v-icon>
          Settings
        </v-tab>
      </v-tabs>

      <v-card-text class="pa-6">
        <v-window v-model="activeTab">
          <v-window-item value="history">
            <NotificationHistory />
          </v-window-item>

          <v-window-item value="settings">
            <NotificationSettings />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import NotificationHistory from "@/components/common/NotificationHistory.vue"
import NotificationSettings from "@/components/common/NotificationSettings.vue"
import { ref } from "vue"

const activeTab = ref("history")
</script>
