<template>
  <AppLayout>
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-6">
            <v-icon start size="large">mdi-account-circle</v-icon>
            {{ t('profile.title') }}
          </h1>
        </v-col>
      </v-row>

      <v-row>
        <!-- Profile Information Card -->
        <v-col cols="12" lg="8">
          <v-card class="profile-info-card">
            <v-card-title class="d-flex align-center">
              <v-icon start>mdi-account</v-icon>
              {{ t('profile.personalInfo') }}
              <v-spacer />
              <v-btn
                variant="text"
                color="primary"
                prepend-icon="mdi-pencil"
                @click="toggleEditMode"
                :disabled="isLoading"
              >
                {{ isEditing ? t('profile.cancel') : t('profile.edit') }}
              </v-btn>
            </v-card-title>

            <v-card-text>
              <v-form ref="profileFormRef" v-model="isProfileFormValid">
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="profileForm.firstName"
                      :label="t('profile.firstName')"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      :rules="firstNameRules"
                      prepend-inner-icon="mdi-account"
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="profileForm.lastName"
                      :label="t('profile.lastName')"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      :rules="lastNameRules"
                      prepend-inner-icon="mdi-account"
                    />
                  </v-col>
                </v-row>

                <v-row>
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="profileForm.email"
                      :label="t('profile.email')"
                      type="email"
                      variant="outlined"
                      density="comfortable"
                      :readonly="!isEditing"
                      :rules="emailRules"
                      prepend-inner-icon="mdi-email"
                    />
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-select
                      v-model="profileForm.role"
                      :items="roleOptions"
                      :label="t('profile.role')"
                      variant="outlined"
                      density="comfortable"
                      readonly
                      prepend-inner-icon="mdi-shield-account"
                    />
                  </v-col>
                </v-row>

                <v-row v-if="isEditing">
                  <v-col cols="12">
                    <div class="d-flex justify-end gap-2">
                      <v-btn
                        variant="text"
                        @click="cancelEdit"
                        :disabled="isLoading"
                      >
                        {{ t('profile.cancel') }}
                      </v-btn>
                      <v-btn
                        color="primary"
                        variant="elevated"
                        @click="saveProfile"
                        :disabled="!isProfileFormValid"
                        :loading="isLoading"
                      >
                        {{ t('profile.save') }}
                      </v-btn>
                    </div>
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Avatar Card -->
        <v-col cols="12" lg="4">
          <v-card class="avatar-card">
            <v-card-title>
              <v-icon start>mdi-account-circle</v-icon>
              {{ t('profile.avatar') }}
            </v-card-title>
            <v-card-text class="text-center">
              <div class="mb-4">
                <UserAvatar
                  :seed="user.avatarSeed"
                  :style="user.avatarStyle"
                  size="large"
                  :alt="user.firstName + ' ' + user.lastName"
                />
              </div>
              <div class="mb-4">
                <p class="text-body-2 text-medium-emphasis">
                  {{ user.firstName }} {{ user.lastName }}
                </p>
                <p class="text-caption text-medium-emphasis">
                  {{ roleLabels[user.role] }}
                </p>
              </div>
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-camera"
                @click="showAvatarSelector = true"
                block
              >
                {{ t('profile.changeAvatar') }}
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <!-- Security Card -->
        <v-col cols="12" lg="6">
          <v-card class="security-card">
            <v-card-title>
              <v-icon start>mdi-security</v-icon>
              {{ t('profile.security') }}
            </v-card-title>
            <v-card-text>
              <div class="security-info mb-4">
                <p class="text-body-2 mb-2">
                  <strong>{{ t('profile.lastLogin') }}</strong>
                  {{ formatLastLogin(user.lastLoginAt) }}
                </p>
                <p class="text-body-2">
                  <strong>{{ t('profile.accountCreated') }}</strong>
                  {{ formatDate(user.createdAt) }}
                </p>
              </div>
              <v-btn
                color="warning"
                variant="outlined"
                prepend-icon="mdi-lock"
                @click="showPasswordChange = true"
                block
              >
                {{ t('profile.changePassword') }}
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Account Settings Card -->
        <v-col cols="12" lg="6">
          <v-card class="settings-card">
            <v-card-title>
              <v-icon start>mdi-cog</v-icon>
              {{ t('profile.accountSettings') }}
            </v-card-title>
            <v-card-text>
              <v-switch
                v-model="accountSettings.isActive"
                :label="t('profile.accountActive')"
                color="primary"
                readonly
                disabled
                class="mb-2"
              />
              <v-divider class="my-4" />
              <div class="text-body-2 text-medium-emphasis">
                <p class="mb-2">
                  <strong>{{ t('profile.userId') }}</strong> {{ user.id }}
                </p>
                <p v-if="user.teamId" class="mb-2">
                  <strong>{{ t('profile.team') }}</strong> {{ user.teamId }}
                </p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Avatar Selector Dialog -->
    <v-dialog v-model="showAvatarSelector" max-width="700px">
      <AvatarSelector
        @cancel="showAvatarSelector = false"
        @saved="handleAvatarSaved"
      />
    </v-dialog>

    <!-- Password Change Dialog -->
    <v-dialog v-model="showPasswordChange" max-width="600px">
      <PasswordChangeForm
        @cancel="showPasswordChange = false"
        @success="handlePasswordChanged"
      />
    </v-dialog>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import AppLayout from '@/components/layout/AppLayout.vue'
import AvatarSelector from '@/components/profile/AvatarSelector.vue'
import PasswordChangeForm from '@/components/profile/PasswordChangeForm.vue'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { useI18n } from 'vue-i18n'

interface ProfileForm {
  firstName: string
  lastName: string
  email: string
  role: string
}

interface AccountSettings {
  isActive: boolean
}

const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const { t } = useI18n()

const user = computed(() => authStore.user!)
const profileFormRef = ref()
const isProfileFormValid = ref(false)
const isEditing = ref(false)
const isLoading = ref(false)
const showAvatarSelector = ref(false)
const showPasswordChange = ref(false)

const profileForm = reactive<ProfileForm>({
  firstName: '',
  lastName: '',
  email: '',
  role: ''
})

const accountSettings = reactive<AccountSettings>({
  isActive: true
})

const roleOptions = [
  { title: 'Super Admin', value: 'super_admin' },
  { title: 'Admin', value: 'admin' },
  { title: 'Team Admin', value: 'team_admin' },
  { title: 'Manager', value: 'manager' },
  { title: 'User', value: 'user' }
]

const roleLabels: Record<string, string> = {
  super_admin: t('profile.roles.super_admin'),
  admin: t('profile.roles.admin'),
  team_admin: t('profile.roles.team_admin'),
  manager: t('profile.roles.manager'),
  user: t('profile.roles.user')
}

// Validation rules
const firstNameRules = [
  (v: string) => !!v || t('profile.validation.firstNameRequired'),
  (v: string) => (v && v.length >= 2) || t('profile.validation.firstNameMinLength'),
  (v: string) => (v && v.length <= 50) || t('profile.validation.firstNameMaxLength')
]

const lastNameRules = [
  (v: string) => !!v || t('profile.validation.lastNameRequired'),
  (v: string) => (v && v.length >= 2) || t('profile.validation.lastNameMinLength'),
  (v: string) => (v && v.length <= 50) || t('profile.validation.lastNameMaxLength')
]

const emailRules = [
  (v: string) => !!v || t('profile.validation.emailRequired'),
  (v: string) => /.+@.+\..+/.test(v) || t('profile.validation.emailInvalid')
]

const initializeForm = () => {
  if (user.value) {
    profileForm.firstName = user.value.firstName
    profileForm.lastName = user.value.lastName
    profileForm.email = user.value.email
    profileForm.role = user.value.role
    accountSettings.isActive = user.value.isActive
  }
}

const toggleEditMode = () => {
  if (isEditing.value) {
    cancelEdit()
  } else {
    isEditing.value = true
  }
}

const cancelEdit = () => {
  isEditing.value = false
  initializeForm()
  profileFormRef.value?.resetValidation()
}

const saveProfile = async () => {
  if (!isProfileFormValid.value) return

  isLoading.value = true

  try {
    await authStore.updateProfile({
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      email: profileForm.email
    })

    notificationStore.showSuccess(t('profile.updated'))
    isEditing.value = false
  } catch (error: any) {
    notificationStore.showError(
      error.response?.data?.message || t('profile.updateError')
    )
  } finally {
    isLoading.value = false
  }
}

const handleAvatarSaved = () => {
  showAvatarSelector.value = false
}

const handlePasswordChanged = () => {
  showPasswordChange.value = false
}

const formatDate = (dateString: string | Date) => {
  if (!dateString) return t('profile.notAvailable')
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatLastLogin = (dateString: string | Date | null) => {
  if (!dateString) return t('profile.neverLoggedIn')
  return formatDate(dateString)
}

onMounted(() => {
  initializeForm()
})
</script>

<style scoped>
.profile-view {
  min-height: calc(100vh - 64px);
}

.profile-info-card,
.avatar-card,
.security-card,
.settings-card {
  height: 100%;
}

.avatar-card .v-card-text {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.security-info {
  padding: 16px;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
}

.gap-2 {
  gap: 8px;
}
</style>
