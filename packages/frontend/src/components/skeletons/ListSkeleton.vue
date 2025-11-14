<template>
  <div class="list-skeleton">
    <v-card
      v-for="i in count"
      :key="i"
      :class="['mb-3', { 'elevation-0': flat, 'outlined': outlined }]"
      :variant="variant"
    >
      <v-card-text>
        <div class="d-flex align-center">
          <v-skeleton-loader
            v-if="avatar"
            type="avatar"
            class="mr-4"
          />
          <div class="flex-grow-1">
            <v-skeleton-loader
              :type="type"
              :loading="true"
            />
          </div>
          <v-skeleton-loader
            v-if="actions"
            type="button"
            class="ml-4"
          />
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
interface Props {
  count?: number
  avatar?: boolean
  actions?: boolean
  type?: string
  flat?: boolean
  outlined?: boolean
  variant?: 'elevated' | 'flat' | 'tonal' | 'outlined' | 'text' | 'plain'
}

withDefaults(defineProps<Props>(), {
  count: 3,
  avatar: false,
  actions: false,
  type: 'list-item-two-line',
  flat: false,
  outlined: false,
  variant: 'elevated',
})
</script>

<style scoped>
.list-skeleton {
  width: 100%;
}
</style>
