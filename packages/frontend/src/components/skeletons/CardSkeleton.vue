<template>
  <v-card :class="cardClass" :variant="variant">
    <v-card-title v-if="!hideTitle">
      <div class="d-flex align-center justify-space-between">
        <v-skeleton-loader type="heading" :width="titleWidth" />
        <v-skeleton-loader
          v-if="headerAction"
          type="button"
          width="80"
        />
      </div>
    </v-card-title>

    <v-card-text>
      <v-skeleton-loader
        :type="contentType"
        :loading="true"
      />
    </v-card-text>

    <v-card-actions v-if="actions">
      <v-skeleton-loader type="button" width="100" />
      <v-spacer />
      <v-skeleton-loader type="button" width="100" />
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
interface Props {
  hideTitle?: boolean
  headerAction?: boolean
  actions?: boolean
  contentType?: string
  titleWidth?: string | number
  variant?: 'elevated' | 'flat' | 'tonal' | 'outlined' | 'text' | 'plain'
  cardClass?: string
}

withDefaults(defineProps<Props>(), {
  hideTitle: false,
  headerAction: false,
  actions: false,
  contentType: 'paragraph@3',
  titleWidth: 200,
  variant: 'elevated',
  cardClass: '',
})
</script>
