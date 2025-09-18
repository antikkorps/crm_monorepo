<template>
  <div class="logo-thumb-container">
    <!-- Skeleton loader pendant le chargement -->
    <div v-if="isLoading" class="logo-thumb-skeleton">
      <v-skeleton-loader type="image" />
    </div>

    <!-- Image chargée -->
    <img
      v-else-if="dataUrl"
      :src="dataUrl"
      alt="Logo"
      class="logo-thumb-image"
    />

    <!-- Placeholder en cas d'erreur -->
    <div v-else class="logo-thumb-error">
      <v-icon>mdi-image-broken</v-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useImageLoader } from '../../composables/useImageLoader'

interface Props {
  url: string
}

const props = defineProps<Props>()

// Normaliser l'URL si nécessaire
const normalizedUrl = computed(() => {
  if (!props.url) return ''

  // Handle old format /logos/ -> convert to new API format
  if (props.url.startsWith('/logos/')) {
    const filename = props.url.replace('/logos/', '')
    return `/api/templates/logos/${filename}`
  }

  return props.url
})

const { useImage } = useImageLoader()
const { dataUrl, isLoading } = useImage(normalizedUrl)
</script>

<style scoped>
.logo-thumb-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.logo-thumb-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.logo-thumb-skeleton {
  width: 100%;
  height: 80px;
}

.logo-thumb-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 80px;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.5;
}
</style>