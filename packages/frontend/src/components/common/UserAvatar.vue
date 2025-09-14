<template>
  <v-avatar :size="avatarSize">
    <img :src="avatarUrl" :alt="altText" />
  </v-avatar>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AvatarService } from '@/services/avatarService'

interface Props {
  seed: string
  style?: string
  size?: 'small' | 'medium' | 'large' | 'xlarge' | number
  alt?: string
}

const props = withDefaults(defineProps<Props>(), {
  style: 'avataaars',
  size: 'medium',
  alt: 'User Avatar'
})

const avatarSize = computed(() => {
  if (typeof props.size === 'number') {
    return props.size
  }

  const sizeMap = {
    small: 32,
    medium: 64,
    large: 120,
    xlarge: 200
  }

  return sizeMap[props.size]
})

const avatarUrl = computed(() => {
  return AvatarService.generateAvatarFromSeed(props.seed, {
    style: props.style,
    size: avatarSize.value
  })
})

const altText = computed(() => {
  return props.alt || 'User Avatar'
})
</script>

<style scoped>
/* Avatar component styles if needed */
</style>