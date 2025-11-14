<template>
  <div class="detail-skeleton">
    <!-- Page Header -->
    <div class="mb-6">
      <div class="d-flex align-center mb-4">
        <v-skeleton-loader
          v-if="backButton"
          type="button"
          width="40"
          height="40"
          class="mr-3"
        />
        <v-skeleton-loader
          v-if="avatar"
          type="avatar"
          :size="avatarSize"
          class="mr-4"
        />
        <div class="flex-grow-1">
          <v-skeleton-loader type="heading" class="mb-2" />
          <v-skeleton-loader type="text" width="200" />
        </div>
        <div v-if="actions" class="d-flex gap-2">
          <v-skeleton-loader type="button" width="100" />
          <v-skeleton-loader type="button" width="100" />
        </div>
      </div>

      <!-- Status Chips -->
      <div v-if="chips" class="d-flex gap-2">
        <v-skeleton-loader
          v-for="i in chipsCount"
          :key="i"
          type="chip"
          width="120"
        />
      </div>
    </div>

    <!-- Tabs -->
    <div v-if="tabs">
      <div class="d-flex gap-2 mb-6">
        <v-skeleton-loader
          v-for="i in tabsCount"
          :key="i"
          type="button"
          width="100"
        />
      </div>
    </div>

    <!-- Content Grid -->
    <v-row>
      <v-col
        v-for="i in sections"
        :key="i"
        :cols="12"
        :md="sectionColumns"
      >
        <v-card>
          <v-card-title>
            <v-skeleton-loader type="heading" />
          </v-card-title>
          <v-card-text>
            <v-skeleton-loader
              :type="contentType"
              :loading="true"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
interface Props {
  backButton?: boolean
  avatar?: boolean
  avatarSize?: number
  actions?: boolean
  chips?: boolean
  chipsCount?: number
  tabs?: boolean
  tabsCount?: number
  sections?: number
  sectionColumns?: number
  contentType?: string
}

withDefaults(defineProps<Props>(), {
  backButton: true,
  avatar: true,
  avatarSize: 56,
  actions: true,
  chips: true,
  chipsCount: 3,
  tabs: true,
  tabsCount: 3,
  sections: 2,
  sectionColumns: 6,
  contentType: 'list-item-avatar-three-line@3',
})
</script>

<style scoped>
.detail-skeleton {
  width: 100%;
}
</style>
