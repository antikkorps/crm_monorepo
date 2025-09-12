<template>
  <div class="role-filter">
    <v-select
      v-model="selectedRoles"
      :items="roleOptions"
      :label="$t('segmentation.filters.role.label')"
      item-title="label"
      item-value="value"
      multiple
      chips
      outlined
      dense
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="selectedRoles.length === 0"
      class="mt-2"
    >
      <v-icon left>mdi-plus</v-icon>
      {{ $t('segmentation.filters.addFilter') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Props
interface Props {
  filterType: string
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'add-filter': [filter: { type: string; field: string; operator: string; value: any; label: string; group: string }]
}>()

// Reactive data
const selectedRoles = ref<string[]>([])

// Mock role data - in real implementation, this would come from API
const roleOptions = [
  { value: 'admin', label: t('segmentation.filters.role.roles.admin') },
  { value: 'manager', label: t('segmentation.filters.role.roles.manager') },
  { value: 'doctor', label: t('segmentation.filters.role.roles.doctor') },
  { value: 'nurse', label: t('segmentation.filters.role.roles.nurse') },
  { value: 'receptionist', label: t('segmentation.filters.role.roles.receptionist') },
  { value: 'specialist', label: t('segmentation.filters.role.roles.specialist') },
  { value: 'coordinator', label: t('segmentation.filters.role.roles.coordinator') },
  { value: 'assistant', label: t('segmentation.filters.role.roles.assistant') }
]

// Methods
const addFilter = () => {
  if (selectedRoles.value.length === 0) return

  const roleLabels = selectedRoles.value.map(role => 
    roleOptions.find(opt => opt.value === role)?.label || role
  ).join(', ')

  emit('add-filter', {
    type: 'contact',
    field: 'role',
    operator: 'in',
    value: selectedRoles.value,
    label: `${t('segmentation.filters.role.label')}: ${roleLabels}`,
    group: 'contact'
  })

  selectedRoles.value = []
}
</script>