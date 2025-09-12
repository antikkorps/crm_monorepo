<template>
  <div class="specialty-filter">
    <v-select
      v-model="selectedSpecialties"
      :items="specialtyOptions"
      :label="$t('segmentation.filters.specialty.label')"
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
      :disabled="selectedSpecialties.length === 0"
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
const selectedSpecialties = ref<string[]>([])

// Mock specialty data - in real implementation, this would come from API
const specialtyOptions = [
  { value: 'cardiology', label: t('segmentation.filters.specialty.specialties.cardiology') },
  { value: 'neurology', label: t('segmentation.filters.specialty.specialties.neurology') },
  { value: 'orthopedics', label: t('segmentation.filters.specialty.specialties.orthopedics') },
  { value: 'pediatrics', label: t('segmentation.filters.specialty.specialties.pediatrics') },
  { value: 'oncology', label: t('segmentation.filters.specialty.specialties.oncology') },
  { value: 'radiology', label: t('segmentation.filters.specialty.specialties.radiology') },
  { value: 'surgery', label: t('segmentation.filters.specialty.specialties.surgery') },
  { value: 'emergency', label: t('segmentation.filters.specialty.specialties.emergency') }
]

// Methods
const addFilter = () => {
  if (selectedSpecialties.value.length === 0) return

  const specialtyLabels = selectedSpecialties.value.map(specialty => 
    specialtyOptions.find(opt => opt.value === specialty)?.label || specialty
  ).join(', ')

  emit('add-filter', {
    type: 'institution',
    field: 'specialty',
    operator: 'in',
    value: selectedSpecialties.value,
    label: `${t('segmentation.filters.specialty.label')}: ${specialtyLabels}`,
    group: 'institution'
  })

  selectedSpecialties.value = []
}
</script>