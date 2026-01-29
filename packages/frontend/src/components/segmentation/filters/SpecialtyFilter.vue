<template>
  <div class="specialty-filter">
    <v-autocomplete
      v-model="selectedSpecialties"
      :items="specialtyOptions"
      :label="$t('segmentation.filters.specialty.label')"
      :placeholder="$t('segmentation.filters.specialty.placeholder')"
      item-title="label"
      item-value="value"
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      :loading="loading"
      :no-data-text="$t('segmentation.filters.specialty.noData')"
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="selectedSpecialties.length === 0"
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
const selectedSpecialties = ref<string[]>([])
const specialtyOptions = ref<Array<{ value: string; label: string }>>([])
const loading = ref(false)

// Translate specialty value to localized label
const getSpecialtyLabel = (specialty: string): string => {
  // Normalize to lowercase for translation key lookup
  const key = specialty.toLowerCase().replace(/\s+/g, '_')
  const translationKey = `segmentation.filters.specialty.specialties.${key}`
  const translated = t(translationKey)
  // If translation exists (not equal to the key), use it; otherwise use original value
  return translated !== translationKey ? translated : specialty
}

// Load specialties from API on mount
onMounted(async () => {
  loading.value = true
  try {
    const response = await filterOptionsApi.getSpecialties()
    const specialties = response.data || []

    specialtyOptions.value = specialties.map((specialty: string) => ({
      value: specialty,
      label: getSpecialtyLabel(specialty)
    }))
  } catch (error) {
    console.error('Error loading specialties:', error)
    specialtyOptions.value = []
  } finally {
    loading.value = false
  }
})

// Methods
const addFilter = () => {
  if (selectedSpecialties.value.length === 0) return

  // Build label with translated specialty names
  const specialtyLabels = selectedSpecialties.value
    .map(s => getSpecialtyLabel(s))
    .join(', ')

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
