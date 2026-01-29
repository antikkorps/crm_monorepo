<template>
  <div class="type-filter">
    <v-autocomplete
      v-model="selectedTypes"
      :items="institutionTypeOptions"
      :label="$t('segmentation.filters.type.label')"
      :placeholder="$t('segmentation.filters.type.placeholder')"
      item-title="text"
      item-value="value"
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      :loading="loading"
      :no-data-text="$t('segmentation.filters.type.noData')"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="selectedTypes.length === 0"
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
const selectedTypes = ref<string[]>([])
const institutionTypeOptions = ref<Array<{ text: string; value: string }>>([])
const loading = ref(false)

// Map type values to translation keys
const getTypeLabel = (type: string): string => {
  const typeKey = type.toLowerCase().replace(/_/g, '')
  const translationKey = `institution.types.${typeKey}`
  const translated = t(translationKey)
  // If translation not found, return the original type formatted nicely
  if (translated === translationKey) {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }
  return translated
}

// Load types from API on mount
onMounted(async () => {
  loading.value = true
  try {
    const response = await filterOptionsApi.getInstitutionTypes()
    const types = response.data || []

    institutionTypeOptions.value = types.map((type: string) => ({
      value: type,
      text: getTypeLabel(type)
    }))
  } catch (error) {
    console.error('Error loading institution types:', error)
    institutionTypeOptions.value = []
  } finally {
    loading.value = false
  }
})

// Methods
const addFilter = () => {
  if (selectedTypes.value.length === 0) return

  const typeLabels = selectedTypes.value
    .map(type => institutionTypeOptions.value.find(opt => opt.value === type)?.text || type)
    .join(', ')

  emit('add-filter', {
    type: 'institution',
    field: 'type',
    operator: 'in',
    value: selectedTypes.value,
    label: `${t('segmentation.filters.type.label')}: ${typeLabels}`,
    group: 'institution'
  })

  selectedTypes.value = []
}
</script>
