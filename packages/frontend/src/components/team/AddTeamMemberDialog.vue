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
          <v-autocomplete
            v-model="selectedUser"
            :items="availableUsers"
            :loading="loadingUsers"
            :label="t('teams.selectUser')"
            :placeholder="t('teams.selectUserPlaceholder')"
            :rules="[rules.required]"
            :error-messages="errorMessage"
            :item-title="userDisplayText"
            item-value="id"
            return-object
            prepend-icon="mdi-account"
            variant="outlined"
            clearable
            @update:model-value="errorMessage = ''"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps" :title="userDisplayText(item.raw)">
                <template #prepend>
                  <v-avatar size="32">
                    <img :src="getUserAvatar(item.raw)" :alt="getUserInitials(item.raw)" />
                  </v-avatar>
                </template>
                <template #subtitle>
                  {{ item.raw.role }}
                </template>
              </v-list-item>
            </template>

            <template #no-data>
              <v-list-item>
                <v-list-item-title v-if="loadingUsers">
                  {{ t('common.messages.loading') }}
                </v-list-item-title>
                <v-list-item-title v-else>
                  {{ t('teams.noAvailableUsers') }}
                </v-list-item-title>
              </v-list-item>
            </template>
          </v-autocomplete>

          <v-alert v-if="errorMessage" type="error" class="mt-4">
            {{ errorMessage }}
          </v-alert>

          <v-alert type="info" class="mt-4">
            <div class="text-caption">
              {{ t('teams.selectUserHint') }}
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
          :disabled="!selectedUser"
        >
          {{ t('teams.add') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { teamsApi, usersApi } from '@/services/api'
import { AvatarService } from '@/services/avatarService'
import type { Team, User, ApiResponse } from '@medical-crm/shared'

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
const selectedUser = ref<User | null>(null)
const allUsers = ref<User[]>([])
const loadingUsers = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const formRef = ref<any>(null)

// Computed
const teamMemberIds = computed(() => {
  if (!props.team?.members) return []
  return props.team.members.map((m: any) => m.id)
})

const availableUsers = computed(() => {
  return allUsers.value.filter(user =>
    user.isActive && !teamMemberIds.value.includes(user.id)
  )
})

const userDisplayText = (user: User) => {
  return `${user.firstName} ${user.lastName} (${user.email})`
}

const getUserAvatar = (user: User) => {
  // Use DiceBear avatar if available, otherwise generate from name
  if (!user.avatarSeed || !user.avatarStyle) {
    return AvatarService.generateUserAvatar(user.firstName, user.lastName, {
      size: 32
    })
  }

  return AvatarService.generateAvatarFromSeed(user.avatarSeed, {
    style: user.avatarStyle,
    size: 32
  })
}

const getUserInitials = (user: User) => {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

// Validation rules
const rules = {
  required: (v: any) => !!v || t('validation.required')
}

// Methods
const loadUsers = async () => {
  try {
    loadingUsers.value = true
    const response = await usersApi.getAll() as ApiResponse<User[]>
    const data = response.data || response
    allUsers.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('Error loading users:', err)
    allUsers.value = []
  } finally {
    loadingUsers.value = false
  }
}

const addMember = async () => {
  if (!props.team || !selectedUser.value) return

  // Clear previous messages
  errorMessage.value = ''

  // Validate form
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  try {
    loading.value = true

    const response = await teamsApi.addTeamMember(props.team.id, selectedUser.value.id) as ApiResponse

    if (response.success) {
      // Emit event to refresh team members
      emit('member-added')

      // Close dialog immediately
      close()
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
    selectedUser.value = null
    errorMessage.value = ''
    formRef.value?.reset()
  }, 300)
}

// Watch for dialog open/close
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      // Load users when dialog opens
      loadUsers()
    } else {
      // Reset form when dialog closes
      selectedUser.value = null
      errorMessage.value = ''
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
