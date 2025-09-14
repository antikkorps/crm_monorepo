<template>
  <v-card class="avatar-selector">
    <v-card-title>
      <v-icon start>mdi-account-circle</v-icon>
      Choisir un avatar
    </v-card-title>

    <v-card-text>
      <div class="current-avatar mb-4">
        <div class="mx-auto d-block" style="width: 120px; display: flex; justify-content: center;">
          <UserAvatar
            :seed="user.avatarSeed"
            :style="user.avatarStyle"
            size="large"
            :alt="user.firstName + ' ' + user.lastName"
          />
        </div>
        <p class="text-center mt-2 text-body-2 text-medium-emphasis">
          Avatar actuel
        </p>
      </div>

      <v-divider class="mb-4" />

      <div class="style-selection">
        <h4 class="text-subtitle-1 mb-3">Style d'avatar</h4>
        <v-select
          v-model="selectedStyle"
          :items="avatarStyles"
          item-title="label"
          item-value="value"
          density="comfortable"
          variant="outlined"
          @update:model-value="generatePreview"
        />
      </div>

      <div class="preview-gallery mt-4">
        <h4 class="text-subtitle-1 mb-3">Aperçu des variations</h4>
        <div class="avatar-grid">
          <div
            v-for="(preview, index) in previewAvatars"
            :key="index"
            class="avatar-option"
            :class="{ selected: selectedAvatarSeed === preview.seed }"
            @click="selectAvatar(preview)"
          >
            <v-avatar size="80">
              <img :src="preview.url" :alt="`Avatar ${index + 1}`" />
            </v-avatar>
          </div>
        </div>
      </div>

      <div class="actions mt-4">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-refresh"
          @click="generateNewVariations"
          :loading="isGenerating"
        >
          Nouvelles variations
        </v-btn>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn variant="text" @click="$emit('cancel')">
        Annuler
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        @click="saveAvatar"
        :disabled="!selectedAvatarSeed || selectedAvatarSeed === user.avatarSeed"
        :loading="isSaving"
      >
        Enregistrer
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { AvatarService } from '@/services/avatarService'
import UserAvatar from '@/components/common/UserAvatar.vue'

interface AvatarPreview {
  seed: string
  url: string
  style: string
}

interface AvatarStyle {
  label: string
  value: string
}

const emit = defineEmits<{
  cancel: []
  saved: [avatar: AvatarPreview]
}>()

const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const user = computed(() => authStore.user!)
const selectedStyle = ref(user.value.avatarStyle || 'avataaars')
const selectedAvatarSeed = ref('')
const previewAvatars = ref<AvatarPreview[]>([])
const isGenerating = ref(false)
const isSaving = ref(false)

const avatarStyles: AvatarStyle[] = [
  { label: 'Avataaars', value: 'avataaars' },
  { label: 'Big Ears', value: 'big-ears' },
  { label: 'Big Ears Neutral', value: 'big-ears-neutral' },
  { label: 'Big Smile', value: 'big-smile' },
  { label: 'Bottts', value: 'bottts' },
  { label: 'Croodles', value: 'croodles' },
  { label: 'Croodles Neutral', value: 'croodles-neutral' },
  { label: 'Fun Emoji', value: 'fun-emoji' },
  { label: 'Icons', value: 'icons' },
  { label: 'Identicon', value: 'identicon' },
  { label: 'Initials', value: 'initials' },
  { label: 'Lorelei', value: 'lorelei' },
  { label: 'Lorelei Neutral', value: 'lorelei-neutral' },
  { label: 'Micah', value: 'micah' },
  { label: 'Miniavs', value: 'miniavs' },
  { label: 'Open Peeps', value: 'open-peeps' },
  { label: 'Personas', value: 'personas' },
  { label: 'Pixel Art', value: 'pixel-art' },
  { label: 'Pixel Art Neutral', value: 'pixel-art-neutral' },
  { label: 'Shapes', value: 'shapes' },
  { label: 'Thumbs', value: 'thumbs' },
]

const currentAvatar = computed(() => ({
  seed: user.value.avatarSeed,
  url: AvatarService.generateAvatarFromSeed(user.value.avatarSeed, {
    style: selectedStyle.value,
    size: 200
  }),
  style: selectedStyle.value
}))

const generateAvatarUrl = (seed: string, style: string = selectedStyle.value): string => {
  return AvatarService.generateAvatarFromSeed(seed, { style, size: 200 })
}

const generateRandomSeed = (): string => {
  return AvatarService.generateRandomSeed()
}

const generateSeedFromName = (firstName: string, lastName: string): string => {
  return AvatarService.generateSeedFromName(firstName, lastName)
}

const generatePreview = async () => {
  isGenerating.value = true

  try {
    const previews: AvatarPreview[] = []

    // Current user's actual avatar seed with selected style
    const userActualSeed = user.value.avatarSeed
    previews.push({
      seed: userActualSeed,
      url: generateAvatarUrl(userActualSeed, selectedStyle.value),
      style: selectedStyle.value
    })

    // Generate 5 additional random variations
    for (let i = 0; i < 5; i++) {
      const seed = generateRandomSeed()
      previews.push({
        seed,
        url: generateAvatarUrl(seed, selectedStyle.value),
        style: selectedStyle.value
      })
    }

    previewAvatars.value = previews

    // Select the user's current avatar by default (first in the list)
    if (!selectedAvatarSeed.value) {
      selectedAvatarSeed.value = userActualSeed
    }
  } finally {
    isGenerating.value = false
  }
}

const generateNewVariations = () => {
  generatePreview()
}

const selectAvatar = (avatar: AvatarPreview) => {
  selectedAvatarSeed.value = avatar.seed
}

const saveAvatar = async () => {
  if (!selectedAvatarSeed.value) return

  isSaving.value = true

  try {
    const updatedUser = await authStore.updateProfile({
      avatarSeed: selectedAvatarSeed.value,
      avatarStyle: selectedStyle.value
    })

    notificationStore.showSuccess('Avatar mis à jour avec succès')

    const selectedAvatar = previewAvatars.value.find(
      avatar => avatar.seed === selectedAvatarSeed.value
    )

    if (selectedAvatar) {
      // Update the selected avatar with the actual URL from backend
      selectedAvatar.url = updatedUser.avatarUrl || selectedAvatar.url
      emit('saved', selectedAvatar)
    }
  } catch (error: any) {
    notificationStore.showError(
      error.response?.data?.message || 'Erreur lors de la mise à jour de l\'avatar'
    )
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  generatePreview()
})
</script>

<style scoped>
.avatar-selector {
  max-width: 600px;
}

.current-avatar {
  text-align: center;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.avatar-option {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}

.avatar-option:hover {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.avatar-option.selected {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.2);
}

.actions {
  display: flex;
  justify-content: center;
}
</style>