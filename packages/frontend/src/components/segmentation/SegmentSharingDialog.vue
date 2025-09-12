<template>
  <v-dialog
    v-model="dialog"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-share-variant</v-icon>
        {{ $t('segmentation.sharing.title') }}
        <v-spacer />
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <div class="mb-4">
          <div class="text-h6 mb-2">{{ segment?.name }}</div>
          <div class="text-body-2 text-medium-emphasis" v-if="segment?.description">
            {{ segment.description }}
          </div>
        </div>

        <!-- Current Visibility -->
        <v-row class="mb-4">
          <v-col cols="12">
            <v-alert
              :type="getVisibilityAlertType(segment?.visibility)"
              outlined
              dense
            >
              <div class="d-flex align-center">
                <v-icon left>{{ getVisibilityIcon(segment?.visibility) }}</v-icon>
                <div>
                  <div class="font-weight-medium">
                    {{ $t('segmentation.sharing.currentVisibility') }}
                  </div>
                  <div class="text-body-2">
                    {{ getVisibilityDescription(segment?.visibility) }}
                  </div>
                </div>
              </div>
            </v-alert>
          </v-col>
        </v-row>

        <!-- Visibility Settings -->
        <v-row class="mb-4">
          <v-col cols="12">
            <v-select
              v-model="newVisibility"
              :items="visibilityOptions"
              :label="$t('segmentation.sharing.changeVisibility')"
              outlined
              dense
              :disabled="!canChangeVisibility"
            />
          </v-col>
        </v-row>

        <!-- Team Members (for team visibility) -->
        <v-row v-if="newVisibility === 'team'" class="mb-4">
          <v-col cols="12">
            <v-select
              v-model="selectedTeam"
              :items="teamOptions"
              :label="$t('segmentation.sharing.selectTeam')"
              outlined
              dense
              :disabled="!canChangeTeam"
            />
          </v-col>
        </v-row>

        <!-- Specific Users (for custom sharing) -->
        <v-row v-if="newVisibility === 'custom'" class="mb-4">
          <v-col cols="12">
            <v-combobox
              v-model="sharedUsers"
              :items="userOptions"
              :label="$t('segmentation.sharing.shareWithUsers')"
              multiple
              chips
              outlined
              dense
              item-text="name"
              item-value="id"
            >
              <template v-slot:selection="{ attrs, item, select, selected }">
                <v-chip
                  v-bind="attrs"
                  :input-value="selected"
                  close
                  @click="select"
                  @click:close="removeUser(item)"
                  small
                >
                  <v-avatar left size="24">
                    <v-img :src="item.avatar" />
                  </v-avatar>
                  {{ item.name }}
                </v-chip>
              </template>
            </v-combobox>
          </v-col>
        </v-row>

        <!-- Sharing Permissions -->
        <v-row class="mb-4">
          <v-col cols="12">
            <v-card outlined>
              <v-card-title class="text-h6 pb-2">
                {{ $t('segmentation.sharing.permissions.title') }}
              </v-card-title>
              <v-card-text class="pt-0">
                <v-checkbox
                  v-model="permissions.canView"
                  :label="$t('segmentation.sharing.permissions.canView')"
                  dense
                  disabled
                />
                <v-checkbox
                  v-model="permissions.canEdit"
                  :label="$t('segmentation.sharing.permissions.canEdit')"
                  dense
                  :disabled="!canGrantEditPermission"
                />
                <v-checkbox
                  v-model="permissions.canDelete"
                  :label="$t('segmentation.sharing.permissions.canDelete')"
                  dense
                  :disabled="!canGrantDeletePermission"
                />
                <v-checkbox
                  v-model="permissions.canShare"
                  :label="$t('segmentation.sharing.permissions.canShare')"
                  dense
                  :disabled="!canGrantSharePermission"
                />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Sharing Link -->
        <v-row v-if="newVisibility === 'public'" class="mb-4">
          <v-col cols="12">
            <v-text-field
              v-model="shareLink"
              :label="$t('segmentation.sharing.shareLink')"
              outlined
              dense
              readonly
              append-icon="mdi-content-copy"
              @click:append="copyShareLink"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="close">
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          @click="saveSharing"
          :loading="saving"
        >
          <v-icon left>mdi-share-variant</v-icon>
          {{ $t('segmentation.sharing.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Segment, SegmentVisibility } from '@medical-crm/shared'

const { t } = useI18n()

// Props
interface Props {
  modelValue: boolean
  segment: Segment | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': [segmentId: string, sharingSettings: any]
}>()

// Reactive data
const dialog = ref(false)
const newVisibility = ref<SegmentVisibility>('private')
const selectedTeam = ref('')
const sharedUsers = ref<any[]>([])
const permissions = ref({
  canView: true,
  canEdit: false,
  canDelete: false,
  canShare: false
})
const shareLink = ref('')
const saving = ref(false)

// Mock data
const teamOptions = ref([
  { text: 'Sales Team', value: 'team-1' },
  { text: 'Marketing Team', value: 'team-2' },
  { text: 'Support Team', value: 'team-3' }
])

const userOptions = ref([
  { id: 'user-1', name: 'John Doe', avatar: '/avatars/john.jpg' },
  { id: 'user-2', name: 'Jane Smith', avatar: '/avatars/jane.jpg' },
  { id: 'user-3', name: 'Bob Johnson', avatar: '/avatars/bob.jpg' }
])

// Computed
const visibilityOptions = computed(() => [
  { text: t('segmentation.visibility.private'), value: 'private' },
  { text: t('segmentation.visibility.team'), value: 'team' },
  { text: t('segmentation.visibility.public'), value: 'public' },
  { text: t('segmentation.visibility.custom'), value: 'custom' }
])

const canChangeVisibility = computed(() => {
  // TODO: Implement proper permission checking
  return props.segment?.ownerId === 'current-user-id'
})

const canChangeTeam = computed(() => {
  return canChangeVisibility.value
})

const canGrantEditPermission = computed(() => {
  return canChangeVisibility.value && newVisibility.value !== 'public'
})

const canGrantDeletePermission = computed(() => {
  return canChangeVisibility.value && newVisibility.value !== 'public'
})

const canGrantSharePermission = computed(() => {
  return canChangeVisibility.value && newVisibility.value !== 'public'
})

// Methods
const getVisibilityAlertType = (visibility?: SegmentVisibility): string => {
  const types: Record<SegmentVisibility, string> = {
    'private': 'grey',
    'team': 'warning',
    'public': 'success',
    'custom': 'info'
  }
  return types[visibility || 'private'] || 'grey'
}

const getVisibilityIcon = (visibility?: SegmentVisibility): string => {
  const icons: Record<SegmentVisibility, string> = {
    'private': 'mdi-lock',
    'team': 'mdi-account-group',
    'public': 'mdi-earth',
    'custom': 'mdi-account-multiple'
  }
  return icons[visibility || 'private'] || 'mdi-lock'
}

const getVisibilityDescription = (visibility?: SegmentVisibility): string => {
  return t(`segmentation.sharing.descriptions.${visibility || 'private'}`)
}

const removeUser = (user: any) => {
  const index = sharedUsers.value.findIndex(u => u.id === user.id)
  if (index > -1) {
    sharedUsers.value.splice(index, 1)
  }
}

const copyShareLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    // TODO: Show success notification
  } catch (error) {
    console.error('Failed to copy link:', error)
  }
}

const saveSharing = async () => {
  if (!props.segment) return

  saving.value = true

  try {
    const sharingSettings = {
      visibility: newVisibility.value,
      teamId: selectedTeam.value,
      sharedUsers: sharedUsers.value,
      permissions: permissions.value
    }

    emit('saved', props.segment.id, sharingSettings)
    close()
  } catch (error) {
    console.error('Error saving sharing settings:', error)
  } finally {
    saving.value = false
  }
}

const close = () => {
  dialog.value = false
  emit('update:modelValue', false)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  dialog.value = newValue
  if (newValue && props.segment) {
    newVisibility.value = props.segment.visibility
    selectedTeam.value = props.segment.teamId || ''
    sharedUsers.value = []
    permissions.value = {
      canView: true,
      canEdit: false,
      canDelete: false,
      canShare: false
    }
    shareLink.value = `${window.location.origin}/segmentation/shared/${props.segment.id}`
  }
})

watch(dialog, (newValue) => {
  if (!newValue) {
    emit('update:modelValue', false)
  }
})

// Initialize
onMounted(() => {
  dialog.value = props.modelValue
})
</script>