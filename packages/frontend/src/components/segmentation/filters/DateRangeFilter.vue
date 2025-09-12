<template>
  <div class="date-range-filter">
    <v-row>
      <v-col cols="6">
        <v-date-picker
          v-model="startDate"
          :label="$t('segmentation.filters.dateRange.startDate')"
          outlined
          dense
          class="mb-3"
        />
      </v-col>
      <v-col cols="6">
        <v-date-picker
          v-model="endDate"
          :label="$t('segmentation.filters.dateRange.endDate')"
          :min="startDate"
          outlined
          dense
          class="mb-3"
        />
      </v-col>
    </v-row>
    <v-select
      v-model="dateField"
      :items="dateFieldOptions"
      :label="$t('segmentation.filters.dateRange.field')"
      item-title="label"
      item-value="value"
      outlined
      dense
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!startDate || !endDate || !dateField"
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
const startDate = ref<string>('')
const endDate = ref<string>('')
const dateField = ref<string>('')

const dateFieldOptions = [
  { value: 'createdAt', label: t('segmentation.filters.dateRange.fields.createdAt') },
  { value: 'updatedAt', label: t('segmentation.filters.dateRange.fields.updatedAt') },
  { value: 'lastContact', label: t('segmentation.filters.dateRange.fields.lastContact') },
  { value: 'nextAppointment', label: t('segmentation.filters.dateRange.fields.nextAppointment') }
]

// Methods
const addFilter = () => {
  if (!startDate.value || !endDate.value || !dateField.value) return

  emit('add-filter', {
    type: 'combined',
    field: dateField.value,
    operator: 'between',
    value: {
      start: startDate.value,
      end: endDate.value
    },
    label: `${t('segmentation.filters.dateRange.label')}: ${dateFieldOptions.find(f => f.value === dateField.value)?.label}`,
    group: 'combined'
  })

  startDate.value = ''
  endDate.value = ''
  dateField.value = ''
}
</script>