<template>
  <div class="location-filter">
    <v-autocomplete
      v-model="selectedState"
      :items="stateOptions"
      :label="$t('segmentation.filters.location.region')"
      item-title="label"
      item-value="value"
      variant="outlined"
      density="compact"
      clearable
      :loading="loadingStates"
      :no-data-text="$t('segmentation.filters.location.noStates')"
      class="mb-3"
    />
    <v-autocomplete
      v-model="selectedCity"
      :items="cityOptions"
      :label="$t('segmentation.filters.location.city')"
      item-title="label"
      item-value="value"
      variant="outlined"
      density="compact"
      clearable
      :loading="loadingCities"
      :no-data-text="$t('segmentation.filters.location.noCities')"
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!selectedState && !selectedCity"
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
const selectedState = ref<string>('')
const selectedCity = ref<string>('')
const stateOptions = ref<Array<{ value: string; label: string }>>([])
const cityOptions = ref<Array<{ value: string; label: string }>>([])
const loadingStates = ref(false)
const loadingCities = ref(false)

// Load options from API on mount
onMounted(async () => {
  await Promise.all([loadStates(), loadCities()])
})

const loadStates = async () => {
  loadingStates.value = true
  try {
    const response = await filterOptionsApi.getStates()
    const states = response.data || []

    stateOptions.value = states.map((state: string) => ({
      value: state,
      label: state
    }))
  } catch (error) {
    console.error('Error loading states:', error)
    stateOptions.value = []
  } finally {
    loadingStates.value = false
  }
}

const loadCities = async () => {
  loadingCities.value = true
  try {
    const response = await filterOptionsApi.getCities()
    const cities = response.data || []

    cityOptions.value = cities.map((city: string) => ({
      value: city,
      label: city
    }))
  } catch (error) {
    console.error('Error loading cities:', error)
    cityOptions.value = []
  } finally {
    loadingCities.value = false
  }
}

// Methods
const addFilter = () => {
  if (!selectedState.value && !selectedCity.value) return

  const locationParts: string[] = []
  const filterValue: { state?: string; city?: string } = {}

  if (selectedState.value) {
    locationParts.push(selectedState.value)
    filterValue.state = selectedState.value
  }

  if (selectedCity.value) {
    locationParts.push(selectedCity.value)
    filterValue.city = selectedCity.value
  }

  emit('add-filter', {
    type: 'institution',
    field: 'location',
    operator: 'equals',
    value: filterValue,
    label: `${t('segmentation.filters.location.label')}: ${locationParts.join(', ')}`,
    group: 'institution'
  })

  selectedState.value = ''
  selectedCity.value = ''
}
</script>
