<template>
  <div class="role-filter">
    <v-autocomplete
      v-model="selectedRoles"
      :items="roleOptions"
      :label="$t('segmentation.filters.role.label')"
      item-title="label"
      item-value="value"
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      :loading="loading"
      :no-data-text="$t('segmentation.filters.role.noData')"
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="selectedRoles.length === 0"
      class="mt-2"
    >
      <v-icon start>mdi-plus</v-icon>
      {{ $t('segmentation.filters.addFilter') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { filterOptionsApi } from '@/services/api'

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
const roleOptions = ref<Array<{ value: string; label: string }>>([])
const loading = ref(false)

// Load roles from API
onMounted(async () => {
  try {
    loading.value = true
    const response = await filterOptionsApi.getContactRoles()
    roleOptions.value = (response.data || []).map((role: string) => ({
      value: role,
      label: role
    }))
  } catch (error) {
    console.error('Error loading roles:', error)
    roleOptions.value = []
  } finally {
    loading.value = false
  }
})

// Methods
const addFilter = () => {
  if (selectedRoles.value.length === 0) return

  const roleLabels = selectedRoles.value.map(role =>
    roleOptions.value.find(opt => opt.value === role)?.label || role
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
