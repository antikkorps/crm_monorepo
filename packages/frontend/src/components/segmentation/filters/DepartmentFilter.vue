<template>
  <div class="department-filter">
    <v-select
      v-model="selectedDepartments"
      :items="departmentOptions"
      :label="$t('segmentation.filters.department.label')"
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
      :disabled="selectedDepartments.length === 0"
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
const selectedDepartments = ref<string[]>([])

// Mock department data - in real implementation, this would come from API
const departmentOptions = [
  { value: 'administration', label: t('segmentation.filters.department.departments.administration') },
  { value: 'medical', label: t('segmentation.filters.department.departments.medical') },
  { value: 'nursing', label: t('segmentation.filters.department.departments.nursing') },
  { value: 'support', label: t('segmentation.filters.department.departments.support') },
  { value: 'it', label: t('segmentation.filters.department.departments.it') },
  { value: 'finance', label: t('segmentation.filters.department.departments.finance') },
  { value: 'hr', label: t('segmentation.filters.department.departments.hr') },
  { value: 'marketing', label: t('segmentation.filters.department.departments.marketing') }
]

// Methods
const addFilter = () => {
  if (selectedDepartments.value.length === 0) return

  const departmentLabels = selectedDepartments.value.map(dept => 
    departmentOptions.find(opt => opt.value === dept)?.label || dept
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