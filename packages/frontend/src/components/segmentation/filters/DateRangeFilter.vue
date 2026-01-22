<template>
  <div class="date-range-filter">
    <v-select
      v-model="dateField"
      :items="dateFieldOptions"
      :label="$t('segmentation.filters.dateRange.field')"
      item-title="label"
      item-value="value"
      variant="outlined"
      density="compact"
      class="mb-3"
    />
    <v-row>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="startDate"
          :label="$t('segmentation.filters.dateRange.startDate')"
          type="date"
          variant="outlined"
          density="compact"
          :max="endDate || undefined"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="endDate"
          :label="$t('segmentation.filters.dateRange.endDate')"
          type="date"
          variant="outlined"
          density="compact"
          :min="startDate || undefined"
        />
      </v-col>
    </v-row>
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!startDate || !endDate || !dateField"
      class="mt-2"
    >
      <v-icon start>mdi-plus</v-icon>
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
const startDate = ref<string>('')
const endDate = ref<string>('')
const dateField = ref<string>('')

const dateFieldOptions = [
  { value: 'createdAt', label: t('segmentation.filters.dateRange.fields.createdAt') },
  { value: 'updatedAt', label: t('segmentation.filters.dateRange.fields.updatedAt') },
  { value: 'lastContact', label: t('segmentation.filters.dateRange.fields.lastContact') },
  { value: 'nextAppointment', label: t('segmentation.filters.dateRange.fields.nextAppointment') }
]

// Format date for display
const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString()
}

// Methods
const addFilter = () => {
  if (!startDate.value || !endDate.value || !dateField.value) return

  const fieldLabel = dateFieldOptions.find(f => f.value === dateField.value)?.label || dateField.value

  emit('add-filter', {
    type: 'combined',
    field: dateField.value,
    operator: 'between',
    value: {
      start: startDate.value,
      end: endDate.value
    },
    label: `${fieldLabel}: ${formatDate(startDate.value)} - ${formatDate(endDate.value)}`,
    group: 'combined'
  })

  startDate.value = ''
  endDate.value = ''
  dateField.value = ''
}
</script>

<style scoped>
.date-range-filter {
  min-width: 300px;
}
</style>
