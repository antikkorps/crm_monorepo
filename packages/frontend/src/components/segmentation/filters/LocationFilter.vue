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
      :disabled="!region"
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
  if (!region.value) return []
  
  const cities: Record<string, Array<{ value: string; label: string }>> = {
    ca: [
      { value: 'la', label: 'Los Angeles' },
      { value: 'sf', label: 'San Francisco' }
    ],
    ny: [
      { value: 'nyc', label: 'New York City' },
      { value: 'buffalo', label: 'Buffalo' }
    ],
    on: [
      { value: 'toronto', label: 'Toronto' },
      { value: 'ottawa', label: 'Ottawa' }
    ],
    idf: [
      { value: 'paris', label: 'Paris' },
      { value: 'versailles', label: 'Versailles' }
    ]
  }
  
  return cities[region.value] || []
})

// Methods
const onCountryChange = () => {
  region.value = ''
  city.value = ''
}

const onRegionChange = () => {
  city.value = ''
}

const addFilter = () => {
  if (!country.value) return

  const locationParts = []
  if (country.value) {
    const countryLabel = countryOptions.find(c => c.value === country.value)?.label
    locationParts.push(countryLabel)
  }
  if (region.value) {
    const regionLabel = regionOptions.value.find(r => r.value === region.value)?.label
    locationParts.push(regionLabel)
  }
  if (city.value) {
    const cityLabel = cityOptions.value.find(c => c.value === city.value)?.label
    locationParts.push(cityLabel)
  }

  emit('add-filter', {
    type: 'institution',
    field: 'location',
    operator: 'equals',
    value: {
      country: country.value,
      region: region.value,
      city: city.value
    },
    label: `${t('segmentation.filters.location.label')}: ${locationParts.join(', ')}`,
    group: 'institution'
  })

  country.value = ''
  region.value = ''
  city.value = ''
}
</script>