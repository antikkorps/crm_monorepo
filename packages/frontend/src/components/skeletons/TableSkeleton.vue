<template>
  <div class="table-skeleton">
    <v-card :variant="variant">
      <!-- Table Header -->
      <v-card-title v-if="!hideHeader">
        <v-skeleton-loader type="heading" />
      </v-card-title>

      <!-- Table Toolbar -->
      <v-card-text v-if="toolbar" class="d-flex align-center gap-2 pb-0">
        <v-skeleton-loader type="button" width="100" />
        <v-skeleton-loader type="button" width="100" />
        <v-spacer />
        <v-skeleton-loader type="text" width="200" />
      </v-card-text>

      <!-- Table Rows -->
      <v-card-text>
        <div v-for="i in rows" :key="i" class="table-row mb-3">
          <div class="d-flex align-center gap-4">
            <v-skeleton-loader
              v-if="checkbox"
              type="avatar"
              width="24"
              height="24"
            />
            <v-skeleton-loader
              v-for="col in columns"
              :key="col"
              :type="getColumnType(col)"
              :width="getColumnWidth(col)"
              class="flex-grow-1"
            />
            <v-skeleton-loader
              v-if="actions"
              type="button"
              width="80"
            />
          </div>
        </div>
      </v-card-text>

      <!-- Pagination -->
      <v-card-actions v-if="pagination">
        <v-spacer />
        <v-skeleton-loader type="text" width="150" />
        <v-skeleton-loader type="button" width="100" />
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
interface Props {
  rows?: number
  columns?: number
  checkbox?: boolean
  actions?: boolean
  toolbar?: boolean
  pagination?: boolean
  hideHeader?: boolean
  variant?: 'elevated' | 'flat' | 'tonal' | 'outlined' | 'text' | 'plain'
}

const props = withDefaults(defineProps<Props>(), {
  rows: 5,
  columns: 4,
  checkbox: false,
  actions: true,
  toolbar: true,
  pagination: true,
  hideHeader: false,
  variant: 'elevated',
})

const getColumnType = (index: number): string => {
  // First column is usually text, others can vary
  if (index === 0) return 'text'
  if (index === props.columns - 1) return 'chip'
  return 'text'
}

const getColumnWidth = (index: number): string | undefined => {
  // Make columns have varied widths for natural look
  const widths = ['150', '200', '120', '180', '100']
  return widths[index % widths.length]
}
</script>

<style scoped>
.table-row {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  padding: 8px 0;
}

.table-row:last-child {
  border-bottom: none;
}
</style>
