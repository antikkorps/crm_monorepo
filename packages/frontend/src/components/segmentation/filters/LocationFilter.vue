<template>
  <div class="location-filter">
    <v-select
      v-model="country"
      :items="countryOptions"
      :label="$t('segmentation.filters.location.country')"
      item-title="label"
      item-value="value"
      outlined
      dense
      class="mb-3"
      @update:modelValue="onCountryChange"
    />
    <v-select
      v-model="region"
      :items="regionOptions"
      :label="$t('segmentation.filters.location.region')"
      item-title="label"
      item-value="value"
      outlined
      dense
      class="mb-3"
      :disabled="!country"
      @update:modelValue="onRegionChange"
    />
    <v-select
      v-model="city"
      :items="cityOptions"
      :label="$t('segmentation.filters.location.city')"
      item-title="label"
      item-value="value"
      outlined
      dense
      class="mb-3"
      :disabled="!country"
      clearable
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!country"
      class="mt-2"
    >
      <v-icon left>mdi-plus</v-icon>
      {{ $t('segmentation.filters.addFilter') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
const country = ref<string>('')
const region = ref<string>('')
const city = ref<string>('')

// Mock location data - in real implementation, this would come from API
const countryOptions = [
  { value: 'us', label: t('segmentation.filters.location.countries.us') },
  { value: 'ca', label: t('segmentation.filters.location.countries.ca') },
  { value: 'fr', label: t('segmentation.filters.location.countries.fr') }
]

const regionOptions = computed(() => {
  if (!country.value) return []
  
  const regions: Record<string, Array<{ value: string; label: string }>> = {
    us: [
      { value: 'ca', label: 'California' },
      { value: 'ny', label: 'New York' },
      { value: 'tx', label: 'Texas' }
    ],
    ca: [
      { value: 'on', label: 'Ontario' },
      { value: 'qc', label: 'Quebec' },
      { value: 'bc', label: 'British Columbia' }
    ],
    fr: [
      { value: 'idf', label: 'Île-de-France' },
      { value: 'paca', label: 'Provence-Alpes-Côte d\'Azur' },
      { value: 'auv', label: 'Auvergne-Rhône-Alpes' }
    ]
  }
  
  return regions[country.value] || []
})

const cityOptions = computed(() => {
  if (!country.value) return []
  
  const cities: Record<string, Array<{ value: string; label: string }>> = {
    us: [
      { value: 'la', label: 'Los Angeles' },
      { value: 'sf', label: 'San Francisco' },
      { value: 'nyc', label: 'New York City' },
      { value: 'buffalo', label: 'Buffalo' },
      { value: 'houston', label: 'Houston' },
      { value: 'chicago', label: 'Chicago' }
    ],
    ca: [
      { value: 'toronto', label: 'Toronto' },
      { value: 'ottawa', label: 'Ottawa' },
      { value: 'vancouver', label: 'Vancouver' },
      { value: 'montreal', label: 'Montreal' }
    ],
    fr: [
      { value: 'paris', label: 'Paris' },
      { value: 'versailles', label: 'Versailles' },
      { value: 'lyon', label: 'Lyon' },
      { value: 'marseille', label: 'Marseille' },
      { value: 'nice', label: 'Nice' }
    ]
  }
  
  return cities[country.value] || []
})

// Methods
const onCountryChange = () => {
  region.value = ''
  city.value = ''
}

const onRegionChange = () => {
  // Don't clear city when region changes to allow independent selection
}

const addFilter = () => {
  if (!country.value && !city.value) return

  const locationParts = []
  let filterValue: any = {}

  if (country.value) {
    const countryLabel = countryOptions.find(c => c.value === country.value)?.label
    locationParts.push(countryLabel)
    filterValue.country = country.value
  }
  
  if (region.value) {
    const regionLabel = regionOptions.value.find(r => r.value === region.value)?.label
    locationParts.push(regionLabel)
    filterValue.region = region.value
  }
  
  if (city.value) {
    const cityLabel = cityOptions.value.find(c => c.value === city.value)?.label
    locationParts.push(cityLabel)
    filterValue.city = city.value
  }

  // If only city is selected, we need to determine the country from the city
  if (!country.value && city.value) {
    // Find which country this city belongs to
    for (const [countryCode, cities] of Object.entries(cityOptions.value)) {
      if (cities.some(c => c.value === city.value)) {
        filterValue.country = countryCode
        const countryLabel = countryOptions.find(c => c.value === countryCode)?.label
        if (countryLabel) {
          locationParts.unshift(countryLabel)
        }
        break
      }
    }
  }

  emit('add-filter', {
    type: 'institution',
    field: 'location',
    operator: 'equals',
    value: filterValue,
    label: `${t('segmentation.filters.location.label')}: ${locationParts.join(', ')}`,
    group: 'institution'
  })

  country.value = ''
  region.value = ''
  city.value = ''
}
</script>