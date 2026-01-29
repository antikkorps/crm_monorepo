<template>
  <div class="department-filter">
    <v-autocomplete
      v-model="selectedDepartments"
      :items="departmentOptions"
      :label="$t('segmentation.filters.department.label')"
      item-title="label"
      item-value="value"
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      :loading="loading"
      :no-data-text="$t('segmentation.filters.department.noData')"
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="selectedDepartments.length === 0"
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
const selectedDepartments = ref<string[]>([])
const departmentOptions = ref<Array<{ value: string; label: string }>>([])
const loading = ref(false)

// Load departments from API
onMounted(async () => {
  try {
    loading.value = true
    const response = await filterOptionsApi.getContactDepartments()
    departmentOptions.value = (response.data || []).map((dept: string) => ({
      value: dept,
      label: dept
    }))
  } catch (error) {
    console.error('Error loading departments:', error)
    departmentOptions.value = []
  } finally {
    loading.value = false
  }
})

// Methods
const addFilter = () => {
  if (selectedDepartments.value.length === 0) return

  const departmentLabels = selectedDepartments.value.map(dept =>
    departmentOptions.value.find(opt => opt.value === dept)?.label || dept
  ).join(', ')

  emit('add-filter', {
    type: 'contact',
    field: 'department',
    operator: 'in',
    value: selectedDepartments.value,
    label: `${t('segmentation.filters.department.label')}: ${departmentLabels}`,
    group: 'contact'
  })

  selectedDepartments.value = []
}
</script>
