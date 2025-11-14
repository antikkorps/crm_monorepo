/**
 * Skeleton Loading Components
 *
 * Reusable skeleton components for consistent loading states across the application.
 * These provide better UX than spinners by showing the structure of upcoming content.
 *
 * Usage:
 * ```vue
 * <script setup>
 * import { ListSkeleton, DetailSkeleton } from '@/components/skeletons'
 * </script>
 *
 * <template>
 *   <ListSkeleton v-if="loading" :count="5" avatar actions />
 *   <div v-else><!-- Actual content --></div>
 * </template>
 * ```
 */

export { default as ListSkeleton } from './ListSkeleton.vue'
export { default as TableSkeleton } from './TableSkeleton.vue'
export { default as DetailSkeleton } from './DetailSkeleton.vue'
export { default as CardSkeleton } from './CardSkeleton.vue'
export { default as FormSkeleton } from './FormSkeleton.vue'
export { default as DashboardSkeleton } from './DashboardSkeleton.vue'
