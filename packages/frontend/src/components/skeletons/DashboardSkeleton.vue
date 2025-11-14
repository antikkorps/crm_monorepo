<template>
  <div class="dashboard-skeleton">
    <!-- Page Header -->
    <div class="mb-6">
      <v-skeleton-loader type="heading" class="mb-2" />
      <v-skeleton-loader type="text" width="300" />
    </div>

    <!-- KPI Cards Row -->
    <v-row class="mb-6">
      <v-col
        v-for="i in kpiCount"
        :key="`kpi-${i}`"
        cols="12"
        :sm="6"
        :md="12 / kpiCount"
      >
        <v-card variant="tonal">
          <v-card-text class="text-center">
            <v-skeleton-loader type="text" width="80" class="mx-auto mb-2" />
            <v-skeleton-loader type="heading" width="100" class="mx-auto mb-2" />
            <v-skeleton-loader type="chip" width="60" class="mx-auto" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Content Grid -->
    <v-row>
      <v-col
        v-for="(widget, index) in widgets"
        :key="`widget-${index}`"
        :cols="widget.cols || 12"
        :md="widget.md || 6"
        :lg="widget.lg || 4"
      >
        <v-card :height="widget.height || 'auto'">
          <v-card-title>
            <div class="d-flex align-center justify-space-between">
              <v-skeleton-loader type="heading" width="150" />
              <v-skeleton-loader type="button" width="40" />
            </div>
          </v-card-title>
          <v-card-text>
            <v-skeleton-loader
              :type="widget.type || 'list-item-three-line@3'"
              :loading="true"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
interface WidgetConfig {
  cols?: number
  md?: number
  lg?: number
  height?: string
  type?: string
}

interface Props {
  kpiCount?: number
  widgets?: WidgetConfig[]
}

withDefaults(defineProps<Props>(), {
  kpiCount: 4,
  widgets: () => [
    { md: 8, type: 'table' },
    { md: 4, type: 'list-item-two-line@4' },
    { md: 6, type: 'card' },
    { md: 6, type: 'image' },
  ],
})
</script>

<style scoped>
.dashboard-skeleton {
  width: 100%;
}
</style>
