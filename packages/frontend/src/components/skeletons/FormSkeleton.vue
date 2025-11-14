<template>
  <div class="form-skeleton">
    <v-card :variant="variant">
      <v-card-title v-if="!hideTitle">
        <v-skeleton-loader type="heading" />
      </v-card-title>

      <v-card-text>
        <!-- Tabs if needed -->
        <div v-if="tabs" class="mb-4">
          <div class="d-flex gap-2">
            <v-skeleton-loader
              v-for="i in tabsCount"
              :key="i"
              type="button"
              width="120"
            />
          </div>
          <v-divider class="mt-4" />
        </div>

        <!-- Form Fields -->
        <v-row>
          <v-col
            v-for="i in fields"
            :key="i"
            :cols="12"
            :md="fieldColumns"
          >
            <v-skeleton-loader type="text" class="mb-2" width="100" />
            <v-skeleton-loader type="text-field" />
          </v-col>
        </v-row>

        <!-- Additional Sections -->
        <div v-if="sections > 1" class="mt-6">
          <v-skeleton-loader type="heading" class="mb-4" width="150" />
          <v-row>
            <v-col
              v-for="i in Math.floor(fields / 2)"
              :key="`section-${i}`"
              :cols="12"
              :md="fieldColumns"
            >
              <v-skeleton-loader type="text" class="mb-2" width="100" />
              <v-skeleton-loader type="text-field" />
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <v-card-actions v-if="actions">
        <v-spacer />
        <v-skeleton-loader type="button" width="100" />
        <v-skeleton-loader type="button" width="120" />
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
interface Props {
  hideTitle?: boolean
  tabs?: boolean
  tabsCount?: number
  fields?: number
  fieldColumns?: number
  sections?: number
  actions?: boolean
  variant?: 'elevated' | 'flat' | 'tonal' | 'outlined' | 'text' | 'plain'
}

withDefaults(defineProps<Props>(), {
  hideTitle: false,
  tabs: false,
  tabsCount: 3,
  fields: 6,
  fieldColumns: 6,
  sections: 1,
  actions: true,
  variant: 'elevated',
})
</script>

<style scoped>
.form-skeleton {
  width: 100%;
}
</style>
