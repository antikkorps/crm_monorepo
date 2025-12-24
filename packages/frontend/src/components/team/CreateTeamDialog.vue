<template>
  <v-dialog
    v-model="isOpen"
    max-width="600"
    persistent
    @keydown.esc="cancel"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h5">
          <v-icon class="mr-2">mdi-account-multiple-plus</v-icon>
          Créer une nouvelle équipe
        </span>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="cancel"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="py-6">
        <v-form ref="formRef" @submit.prevent="submit">
          <v-text-field
            v-model="form.name"
            label="Nom de l'équipe *"
            placeholder="Ex: Équipe Commerciale Paris"
            :rules="[rules.required, rules.minLength]"
            variant="outlined"
            prepend-inner-icon="mdi-account-group"
            class="mb-4"
            :error-messages="errors.name"
            @input="errors.name = []"
          />

          <v-textarea
            v-model="form.description"
            label="Description"
            placeholder="Description de l'équipe et de ses objectifs"
            variant="outlined"
            prepend-inner-icon="mdi-text"
            rows="3"
            class="mb-4"
            :error-messages="errors.description"
            @input="errors.description = []"
          />

          <v-switch
            v-model="form.isActive"
            label="Équipe active"
            color="success"
            inset
            hide-details
          >
            <template #label>
              <span class="text-body-1">
                Équipe active
                <span class="text-caption text-medium-emphasis d-block">
                  Les équipes inactives ne peuvent pas être assignées à de nouvelles institutions
                </span>
              </span>
            </template>
          </v-switch>
        </v-form>

        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="cancel"
          :disabled="loading"
        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="loading"
          @click="submit"
        >
          <v-icon start>mdi-check</v-icon>
          Créer l'équipe
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { teamsApi } from '@/services/api'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'team-created', team: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOpen = ref(props.modelValue)
const loading = ref(false)
const errorMessage = ref('')
const formRef = ref<any>(null)

const form = ref({
  name: '',
  description: '',
  isActive: true
})

const errors = ref<{
  name: string[]
  description: string[]
}>({
  name: [],
  description: []
})

const rules = {
  required: (v: string) => !!v || 'Ce champ est obligatoire',
  minLength: (v: string) => (v && v.length >= 3) || 'Minimum 3 caractères'
}

watch(() => props.modelValue, (newValue) => {
  isOpen.value = newValue
  if (newValue) {
    resetForm()
  }
})

watch(isOpen, (newValue) => {
  emit('update:modelValue', newValue)
})

function resetForm() {
  form.value = {
    name: '',
    description: '',
    isActive: true
  }
  errors.value = {
    name: [],
    description: []
  }
  errorMessage.value = ''
  formRef.value?.resetValidation()
}

function cancel() {
  isOpen.value = false
  resetForm()
}

async function submit() {
  const { valid } = await formRef.value.validate()

  if (!valid) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await teamsApi.createTeam({
      name: form.value.name.trim(),
      description: form.value.description?.trim() || undefined,
      isActive: form.value.isActive
    })

    if (response.success && response.data) {
      emit('team-created', response.data)
      isOpen.value = false
      resetForm()
    } else {
      throw new Error(response.error?.message || 'Erreur lors de la création de l\'équipe')
    }
  } catch (error: any) {
    console.error('Error creating team:', error)
    errorMessage.value = error.message || 'Une erreur est survenue lors de la création de l\'équipe'

    // Handle validation errors
    if (error.response?.data?.details) {
      const details = error.response.data.details
      if (details.name) errors.value.name = [details.name]
      if (details.description) errors.value.description = [details.description]
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.v-text-field :deep(.v-field__prepend-inner) {
  padding-top: 8px;
}

.v-textarea :deep(.v-field__prepend-inner) {
  padding-top: 12px;
}
</style>
