<template>
  <v-card v-bind="$attrs">
    <template v-if="$slots.title">
      <v-card-title><slot name="title" /></v-card-title>
    </template>
    <v-card-text>
      <slot name="content">
        <slot />
      </slot>
    </v-card-text>
    <template v-if="$slots.actions">
      <v-card-actions><slot name="actions" /></v-card-actions>
    </template>
  </v-card>
</template>

<script setup lang="ts">
defineOptions({ name: "Card" })
// Provide TS-friendly slot typings
defineSlots<{
  title?: () => any
  content?: () => any
  actions?: () => any
  default?: () => any
}>()
</script>

