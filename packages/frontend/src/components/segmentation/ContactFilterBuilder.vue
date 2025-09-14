<template>
  <div class="contact-filter-builder">
    <!-- Available Filters -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-chip-group
          v-model="selectedFilterType"
          column
          mandatory
        >
          <v-chip
            v-for="filterType in availableFilterTypes"
            :key="filterType.value"
            :value="filterType.value"
            filter
            outlined
          >
            <v-icon left small>{{ filterType.icon }}</v-icon>
            {{ filterType.label }}
          </v-chip>
        </v-chip-group>
      </v-col>
    </v-row>

    <!-- Filter Configuration -->
    <v-card outlined class="mb-4">
      <v-card-text>
        <component
          :is="currentFilterComponent"
          v-if="selectedFilterType"
          :filter-type="selectedFilterType"
          @add-filter="addFilter"
        />
      </v-card-text>
    </v-card>

    <!-- Active Filters List -->
    <div v-if="filters.length > 0">
      <h4 class="text-h6 mb-3">{{ $t('segmentation.builder.activeFilters') }}</h4>
      <v-chip-group column>
        <v-chip
          v-for="(filter, index) in filters"
          :key="filter.id"
          close
          @click:close="removeFilter(index)"
          class="mb-2"
        >
          <v-icon left small>{{ getFilterIcon(filter.field) }}</v-icon>
          {{ getFilterLabel(filter) }}
        </v-chip>
      </v-chip-group>
    </div>

    <!-- No filters message -->
    <v-alert
      v-else
      type="info"
      outlined
      class="mb-4"
    >
      {{ $t('segmentation.builder.noFilters') }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SegmentBuilderFilter } from '@medical-crm/shared'
import RoleFilter from './filters/RoleFilter.vue'
import DepartmentFilter from './filters/DepartmentFilter.vue'
import TitleFilter from './filters/TitleFilter.vue'
import PrimaryContactFilter from './filters/PrimaryContactFilter.vue'
import ContactMethodFilter from './filters/ContactMethodFilter.vue'
import ActivityLevelFilter from './filters/ActivityLevelFilter.vue'

const { t } = useI18n()

// Props
interface Props {
  modelValue: SegmentBuilderFilter[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: SegmentBuilderFilter[]]
  'filter-added': []
  'filter-removed': []
}>()

// Reactive data
const selectedFilterType = ref<string>('')
const filters = ref<SegmentBuilderFilter[]>([...props.modelValue])

// Computed
const availableFilterTypes = computed(() => [
  { value: 'role', label: t('segmentation.filters.role.label'), icon: 'mdi-account-star' },
  { value: 'department', label: t('segmentation.filters.department.label'), icon: 'mdi-office-building' },
  { value: 'title', label: t('segmentation.filters.title.label'), icon: 'mdi-card-account-details' },
  { value: 'primary', label: t('segmentation.filters.primary.label'), icon: 'mdi-star' },
  { value: 'contactMethod', label: t('segmentation.filters.contactMethod.label'), icon: 'mdi-phone' },
  { value: 'activityLevel', label: t('segmentation.filters.activityLevel.label'), icon: 'mdi-chart-line' }
])

const currentFilterComponent = computed(() => {
  switch (selectedFilterType.value) {
    case 'role': return RoleFilter
    case 'department': return DepartmentFilter
    case 'title': return TitleFilter
    case 'primary': return PrimaryContactFilter
    case 'contactMethod': return ContactMethodFilter
    case 'activityLevel': return ActivityLevelFilter
    default: return null
  }
})

// Methods
const addFilter = (filter: Omit<SegmentBuilderFilter, 'id'>) => {
  const newFilter: SegmentBuilderFilter = {
    ...filter,
    id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  filters.value.push(newFilter)
  emit('update:modelValue', filters.value)
  emit('filter-added')
  selectedFilterType.value = ''
}

const removeFilter = (index: number) => {
  filters.value.splice(index, 1)
  emit('update:modelValue', filters.value)
  emit('filter-removed')
}

const getFilterIcon = (field: string): string => {
  const filterType = availableFilterTypes.value.find(type => type.value === field)
  return filterType?.icon || 'mdi-filter'
}

const getFilterLabel = (filter: SegmentBuilderFilter): string => {
  const operatorLabels: Record<string, string> = {
    'equals': '=',
    'contains': 'contains',
    'greater_than': '>',
    'less_than': '<',
    'between': 'between',
    'in': 'in',
    'not_in': 'not in'
  }

  const operator = operatorLabels[filter.operator] || filter.operator
  const value = Array.isArray(filter.value) ? filter.value.join(', ') : filter.value

  return `${filter.label}: ${operator} ${value}`
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  filters.value = [...newValue]
})
</script>

<style scoped>
.contact-filter-builder {
  min-height: 200px;
}

.v-chip-group .v-chip {
  margin-bottom: 8px;
}
</style>
