<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="600">
    <v-card>
      <v-card-title class="text-h5">
        <v-icon>mdi-account-plus</v-icon>
        {{ t('teams.addMember') }}
      </v-card-title>

      <v-card-subtitle v-if="team">
        {{ t('teams.addMemberTo') }} "{{ team.name }}"
      </v-card-subtitle>

      <v-card-text>
        <v-form ref="formRef" @submit.prevent="addMember">
          <v-text-field
            v-model="userId"
            :label="t('teams.userIdOrEmail')"
            :placeholder="t('teams.userIdPlaceholder')"
            :rules="[rules.required]"
            :error-messages="errorMessage"
            prepend-icon="mdi-account"
            variant="outlined"
            clearable
            autofocus
            @input="errorMessage = ''"
          />

          <v-alert v-if="successMessage" type="success" class="mt-4">
            {{ successMessage }}
          </v-alert>

          <v-alert type="info" class="mt-4">
            <div class="text-caption">
              {{ t('teams.addMemberHint') }}
            </div>
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          color="grey"
          variant="text"
          @click="close"
          :disabled="loading"
        >
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="addMember"
          :loading="loading"
          :disabled="!userId"
        >
          {{ t('teams.add') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { teamsApi } from '@/services/api'
import type { Team } from '@medical-crm/shared'

interface Props {
  modelValue: boolean
  team: Team | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'member-added'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

// State
const userId = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const formRef = ref<any>(null)

// Validation rules
const rules = {
  required: (v: string) => !!v || t('validation.required')
}

// Methods
const addMember = async () => {
  if (!props.team || !userId.value) return

  // Clear previous messages
  errorMessage.value = ''
  successMessage.value = ''

  // Validate form
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  try {
    loading.value = true

    const response = await teamsApi.addTeamMember(props.team.id, userId.value.trim())

    if (response.success) {
      successMessage.value = t('teams.memberAddedSuccess')
      userId.value = ''

      // Emit event to refresh team members
      emit('member-added')

      // Close dialog after a short delay
      setTimeout(() => {
        close()
      }, 1500)
    } else {
      throw new Error('Failed to add member')
    }
  } catch (err: any) {
    console.error('Error adding team member:', err)

    // Handle specific error cases
    const errorCode = err.response?.data?.code
    const errorMsg = err.response?.data?.error?.message

    if (errorCode === 'USER_NOT_FOUND') {
      errorMessage.value = t('teams.errorUserNotFound')
    } else if (errorCode === 'USER_ALREADY_MEMBER') {
      errorMessage.value = t('teams.errorUserAlreadyMember')
    } else {
      errorMessage.value = errorMsg || t('teams.errorAddingMember')
    }
  } finally {
    loading.value = false
  }
}

const close = () => {
  emit('update:modelValue', false)
  // Reset form
  setTimeout(() => {
    userId.value = ''
    errorMessage.value = ''
    successMessage.value = ''
    formRef.value?.reset()
  }, 300)
}

// Watch for dialog close
watch(
  () => props.modelValue,
  (newVal) => {
    if (!newVal) {
      // Reset form when dialog closes
      userId.value = ''
      errorMessage.value = ''
      successMessage.value = ''
    }
  }
)
</script>

<style scoped lang="scss">
.v-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1.5rem 0.5rem;
}

.v-card-subtitle {
  padding: 0 1.5rem 0.5rem;
  opacity: 0.7;
}

.v-card-text {
  padding: 1.5rem;
}

.v-card-actions {
  padding: 1rem 1.5rem 1.5rem;
}
</style>
