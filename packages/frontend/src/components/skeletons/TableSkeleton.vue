<template>
  <div class="table-skeleton">
    <v-card :variant="variant">
      <!-- Table Header -->
      <v-card-title v-if="!hideHeader" class="skeleton-header">
        <div class="skeleton-shimmer" style="width: 40%; height: 28px; border-radius: 4px;" />
      </v-card-title>

      <!-- Table Toolbar -->
      <v-card-text v-if="toolbar" class="d-flex align-center gap-3 pb-4">
        <div class="skeleton-shimmer" style="width: 100px; height: 36px; border-radius: 4px;" />
        <div class="skeleton-shimmer" style="width: 100px; height: 36px; border-radius: 4px;" />
        <v-spacer />
        <div class="skeleton-shimmer" style="width: 200px; height: 40px; border-radius: 4px;" />
      </v-card-text>

      <!-- Table Rows -->
      <v-card-text class="pt-0">
        <div v-for="i in rows" :key="i" class="table-row">
          <div class="d-flex align-center gap-3 py-3">
            <div
              v-if="checkbox"
              class="skeleton-shimmer"
              style="width: 24px; height: 24px; border-radius: 4px;"
            />
            <div
              v-for="col in columns"
              :key="col"
              class="skeleton-shimmer"
              :style="{ width: getColumnWidth(col), height: '20px', borderRadius: '4px' }"
            />
            <div
              v-if="actions"
              class="skeleton-shimmer"
              style="width: 100px; height: 32px; border-radius: 4px;"
            />
          </div>
          <v-divider v-if="i < rows" />
        </div>
      </v-card-text>

      <!-- Pagination -->
      <v-card-actions v-if="pagination" class="pt-0">
        <v-spacer />
        <div class="skeleton-shimmer" style="width: 120px; height: 20px; border-radius: 4px; margin-right: 12px;" />
        <div class="skeleton-shimmer" style="width: 80px; height: 36px; border-radius: 4px;" />
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

const getColumnWidth = (index: number): string => {
  // Make columns have varied widths for natural look
  const widths = ['120px', '180px', '100px', '150px', '90px', '140px', '110px']
  return widths[index % widths.length]
}
</script>

<style scoped>
.table-skeleton {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-surface-variant), 0.4) 0%,
    rgba(var(--v-theme-surface-variant), 0.6) 50%,
    rgba(var(--v-theme-surface-variant), 0.4) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-header {
  padding-top: 20px;
  padding-bottom: 16px;
}

.table-row {
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
}
</style>
