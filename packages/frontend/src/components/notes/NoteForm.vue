<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="800px"
    persistent
  >
    <v-card>
      <v-card-title class="dialog-header">
        <span class="text-h5">{{ isEdit ? $t('notes.edit') : $t('notes.new') }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="handleCancel"
        ></v-btn>
      </v-card-title>

      <v-card-text class="dialog-content">
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <!-- Title -->
          <v-text-field
            v-model="formData.title"
            :label="`${$t('notes.titleField')} *`"
            :placeholder="$t('notes.titlePlaceholder')"
            prepend-inner-icon="mdi-format-title"
            :rules="[required]"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <!-- Content -->
          <v-textarea
            v-model="formData.content"
            :label="`${$t('notes.contentField')} *`"
            :placeholder="$t('notes.contentPlaceholder')"
            prepend-inner-icon="mdi-text"
            :rules="[required]"
            variant="outlined"
            density="comfortable"
            rows="8"
            class="mb-4"
          />

          <!-- Tags -->
          <div class="mb-4">
            <label class="v-label text-subtitle-2 mb-2 d-block">{{ $t('notes.tagsField') }}</label>
            <div class="tags-input-container">
              <v-chip
                v-for="(tag, index) in formData.tags"
                :key="index"
                closable
                @click:close="removeTag(index)"
                class="ma-1"
                color="primary"
                variant="outlined"
              >
                {{ tag }}
              </v-chip>
              <v-text-field
                v-model="newTag"
                :placeholder="$t('notes.tagsPlaceholder')"
                variant="plain"
                density="compact"
                hide-details
                @keydown.enter.prevent="addTag"
                @keydown.space.prevent="addTag"
                class="tag-input"
              />
            </div>
          </div>

          <!-- Institution -->
          <v-select
            v-model="formData.institutionId"
            :items="institutionOptions"
            item-title="label"
            item-value="value"
            :label="$t('notes.institutionField')"
            :placeholder="$t('notes.institutionPlaceholder')"
            prepend-inner-icon="mdi-office-building"
            :clearable="!isInstitutionPreselected"
            :disabled="isInstitutionPreselected"
            :loading="loadingInstitutions"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <!-- Privacy Switch -->
          <div class="privacy-section mb-4">
            <v-switch
              v-model="formData.isPrivate"
              :label="$t('notes.privacySection.private')"
              color="error"
              hide-details
            >
              <template #prepend>
                <v-icon>{{ formData.isPrivate ? 'mdi-lock' : 'mdi-lock-open' }}</v-icon>
              </template>
            </v-switch>
            <p class="privacy-hint">
              {{ $t('notes.privacySection.hint') }}
            </p>
          </div>

          <!-- Share Section -->
          <v-expand-transition>
            <div v-if="!formData.isPrivate" class="share-section">
              <v-divider class="mb-4" />
              <h3 class="share-title mb-3">
                <v-icon class="me-2">mdi-share-variant</v-icon>
                {{ $t('notes.sharingSection.title') }}
              </h3>

              <!-- Share User Selection -->
              <div class="share-user-add mb-3">
                <v-select
                  v-model="selectedUserId"
                  :items="availableUserOptions"
                  item-title="label"
                  item-value="value"
                  :label="$t('notes.sharingSection.selectUser')"
                  :placeholder="$t('notes.sharingSection.selectUserPlaceholder')"
                  prepend-inner-icon="mdi-account-plus"
                  clearable
                  :loading="loadingUsers"
                  variant="outlined"
                  density="comfortable"
                />
                <v-select
                  v-model="selectedPermission"
                  :items="permissionOptions"
                  item-title="label"
                  item-value="value"
                  :label="$t('notes.sharingSection.permission')"
                  variant="outlined"
                  density="comfortable"
                  class="permission-select"
                />
                <v-btn
                  color="primary"
                  variant="elevated"
                  prepend-icon="mdi-plus"
                  @click="addShare"
                  :disabled="!selectedUserId"
                >
                  {{ $t('notes.sharingSection.addUser') }}
                </v-btn>
              </div>

              <!-- Share List -->
              <div v-if="formData.shareWith && formData.shareWith.length > 0" class="share-list">
                <v-card
                  v-for="(share, index) in formData.shareWith"
                  :key="index"
                  variant="outlined"
                  class="share-item mb-2"
                >
                  <v-card-text class="share-item-content">
                    <div class="share-user-info">
                      <v-icon color="primary" class="me-2">mdi-account</v-icon>
                      <span class="share-user-name">{{ getUserName(share.userId) }}</span>
                    </div>
                    <div class="share-controls">
                      <v-chip
                        :color="share.permission === 'write' ? 'success' : 'info'"
                        size="small"
                        variant="flat"
                      >
                        {{ share.permission === 'write' ? $t('notes.sharingSection.permissions.write') : $t('notes.sharingSection.permissions.read') }}
                      </v-chip>
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        color="error"
                        @click="removeShare(index)"
                      />
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>
          </v-expand-transition>
        </v-form>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn
          color="secondary"
          variant="outlined"
          @click="handleCancel"
          :disabled="loading"
        >
          {{ $t('notes.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="handleSubmit"
          :loading="loading"
        >
          {{ isEdit ? $t('notes.update') : $t('notes.create') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { institutionsApi, usersApi } from "@/services/api"
import type { Note, NoteCreateRequest, SharePermission } from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

interface Props {
  modelValue: boolean
  note?: Note
  loading?: boolean
  preselectedInstitutionId?: string
}

interface Emits {
  (e: "update:modelValue", value: boolean): void
  (e: "submit", data: NoteCreateRequest): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref()
const newTag = ref("")
const selectedUserId = ref<string | null>(null)
const selectedPermission = ref<SharePermission>("read")
const loadingUsers = ref(false)
const loadingInstitutions = ref(false)
const userOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])

const formData = ref<NoteCreateRequest>({
  title: "",
  content: "",
  tags: [],
  institutionId: undefined,
  isPrivate: false,
  shareWith: [],
})

const isEdit = computed(() => !!props.note)
const isInstitutionPreselected = computed(() => !!props.preselectedInstitutionId)

const { t } = useI18n()

const permissionOptions = computed(() => [
  { label: t('notes.sharingSection.permissions.read'), value: "read" as SharePermission },
  { label: t('notes.sharingSection.permissions.write'), value: "write" as SharePermission },
])

const availableUserOptions = computed(() => {
  // Filter out users already in shareWith
  const sharedUserIds = formData.value.shareWith?.map((s) => s.userId) || []
  return userOptions.value.filter((user) => !sharedUserIds.includes(user.value))
})

const required = (value: any) => !!value || t('notes.requiredField')

watch(
  () => props.note,
  (newNote) => {
    if (newNote) {
      formData.value = {
        title: newNote.title,
        content: newNote.content,
        tags: [...(newNote.tags || [])],
        institutionId: newNote.institutionId,
        isPrivate: newNote.isPrivate,
        shareWith: newNote.shares?.map((share) => ({
          userId: share.userId,
          permission: share.permission,
        })) || [],
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) {
      resetForm()
    }
  }
)

const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !formData.value.tags?.includes(tag)) {
    if (!formData.value.tags) {
      formData.value.tags = []
    }
    formData.value.tags.push(tag)
    newTag.value = ""
  }
}

const removeTag = (index: number) => {
  formData.value.tags?.splice(index, 1)
}

const addShare = () => {
  if (!selectedUserId.value) return

  if (!formData.value.shareWith) {
    formData.value.shareWith = []
  }

  // Check if user is already added
  const exists = formData.value.shareWith.some((s) => s.userId === selectedUserId.value)
  if (!exists) {
    formData.value.shareWith.push({
      userId: selectedUserId.value,
      permission: selectedPermission.value,
    })
  }

  selectedUserId.value = null
  selectedPermission.value = "read"
}

const removeShare = (index: number) => {
  formData.value.shareWith?.splice(index, 1)
}

const getUserName = (userId: string): string => {
  const user = userOptions.value.find((u) => u.value === userId)
  return user?.label || t('notes.sharingSection.userUnknown')
}

const handleSubmit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  const submitData: NoteCreateRequest = {
    title: formData.value.title,
    content: formData.value.content,
    tags: formData.value.tags,
    institutionId: formData.value.institutionId || undefined,
    isPrivate: formData.value.isPrivate,
    shareWith: formData.value.isPrivate ? [] : formData.value.shareWith,
  }

  emit("submit", submitData)
}

const handleCancel = () => {
  emit("cancel")
  emit("update:modelValue", false)
}

const resetForm = () => {
  if (!props.note) {
    formData.value = {
      title: "",
      content: "",
      tags: [],
      institutionId: props.preselectedInstitutionId || undefined,
      isPrivate: false,
      shareWith: [],
    }
    newTag.value = ""
    selectedUserId.value = null
    selectedPermission.value = "read"
    formRef.value?.resetValidation()
  }
}

const loadUsers = async () => {
  try {
    loadingUsers.value = true
    const response = await usersApi.getAll()
    const usersData = (response as any).data || response

    let usersArray: any[] = []
    if (Array.isArray(usersData)) {
      usersArray = usersData
    } else if (usersData && Array.isArray(usersData.users)) {
      usersArray = usersData.users
    }

    userOptions.value = usersArray.map((user: any) => ({
      label: `${user.firstName} ${user.lastName}`,
      value: user.id,
    }))
  } catch (error) {
    console.error("Error loading users:", error)
    userOptions.value = []
  } finally {
    loadingUsers.value = false
  }
}

const loadInstitutions = async () => {
  try {
    loadingInstitutions.value = true
    const response = await institutionsApi.getAll()
    const data = (response as any).data || response

    let institutionsArray: any[] = []
    if (Array.isArray(data)) {
      institutionsArray = data
    } else if (data && Array.isArray(data.institutions)) {
      institutionsArray = data.institutions
    }

    institutionOptions.value = institutionsArray.map((institution: any) => ({
      label: institution.name,
      value: institution.id,
    }))
  } catch (error) {
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  } finally {
    loadingInstitutions.value = false
  }
}

onMounted(() => {
  loadUsers()
  loadInstitutions()
})
</script>

<style scoped>
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.dialog-content {
  padding: 2rem;
}

.dialog-actions {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.tags-input-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-height: 48px;
  padding: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.38);
  border-radius: 4px;
  gap: 0.5rem;
}

.tags-input-container:focus-within {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
  padding: calc(0.5rem - 1px);
}

.tag-input {
  flex: 1;
  min-width: 150px;
}

.privacy-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
}

.privacy-hint {
  margin: 0.5rem 0 0 3rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.share-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.share-title {
  display: flex;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.share-user-add {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.75rem;
  align-items: start;
}

.permission-select {
  min-width: 180px;
}

.share-list {
  margin-top: 1rem;
}

.share-item {
  transition: all 0.2s ease;
}

.share-item:hover {
  background: #f3f4f6;
}

.share-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem !important;
}

.share-user-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.share-user-name {
  font-weight: 500;
  color: #374151;
}

.share-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .dialog-header {
    padding: 1rem;
  }

  .dialog-content {
    padding: 1rem;
  }

  .share-user-add {
    grid-template-columns: 1fr;
  }

  .permission-select {
    min-width: auto;
  }

  .share-item-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .share-controls {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
