<template>
  <div class="notifications-view">
    <div class="view-header">
      <div class="header-content">
        <h1 class="page-title">Notifications</h1>
        <p class="page-description">
          Manage your notification preferences and view notification history
        </p>
      </div>
    </div>

    <div class="view-content">
      <TabView>
        <TabPanel header="History">
          <NotificationHistory />
        </TabPanel>

        <TabPanel header="Settings">
          <NotificationSettings />
        </TabPanel>
      </TabView>
    </div>
  </div>
</template>

<script setup lang="ts">
import NotificationHistory from "@/components/common/NotificationHistory.vue"
import NotificationSettings from "@/components/common/NotificationSettings.vue"
import TabPanel from "primevue/tabpanel"
import TabView from "primevue/tabview"
</script>

<style scoped>
.notifications-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.view-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: #495057;
  margin: 0 0 0.5rem 0;
}

.page-description {
  color: #6c757d;
  font-size: 1.1rem;
  margin: 0;
}

.view-content {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Responsive Design */
@media (max-width: 768px) {
  .notifications-view {
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .page-description {
    font-size: 1rem;
  }
}
</style>
