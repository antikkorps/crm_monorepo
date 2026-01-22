<template>
  <div class="combined-filter-builder">
    <!-- Available Filters -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-chip-group v-model="selectedFilterType" column>
          <v-chip
            v-for="filterType in availableFilterTypes"
            :key="filterType.value"
            :value="filterType.value"
            filter
            :variant="isFilterApplied(filterType.value) ? 'flat' : 'outlined'"
            :color="isFilterApplied(filterType.value) ? 'primary' : undefined"
            :disabled="isFilterApplied(filterType.value)"
          >
            <v-icon start size="small">{{ filterType.icon }}</v-icon>
            {{ filterType.label }}
            <v-icon v-if="isFilterApplied(filterType.value)" end size="small">mdi-check</v-icon>
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
      <h4 class="text-h6 mb-3">{{ $t("segmentation.builder.activeFilters") }}</h4>
      <v-chip-group column>
        <v-chip
          v-for="(filter, index) in filters"
          :key="filter.id"
          closable
          @click:close="removeFilter(index)"
          class="mb-2"
        >
          <v-icon start size="small">{{ getFilterIcon(filter.field) }}</v-icon>
          {{ getFilterLabel(filter) }}
        </v-chip>
      </v-chip-group>
    </div>

    <!-- No filters message -->
    <v-alert v-else type="info" outlined class="mb-4">
      {{ $t("segmentation.builder.noFilters") }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import type { SegmentBuilderFilter } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import ActiveContactsFilter from "./filters/ActiveContactsFilter.vue"
import DateRangeFilter from "./filters/DateRangeFilter.vue"
import MedicalProfileFilter from "./filters/MedicalProfileFilter.vue"
import TeamAssignmentFilter from "./filters/TeamAssignmentFilter.vue"

const { t } = useI18n()

// Props
interface Props {
  modelValue: SegmentBuilderFilter[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  "update:modelValue": [value: SegmentBuilderFilter[]]
  "filter-added": []
  "filter-removed": []
}>()

// Reactive data
const selectedFilterType = ref<string>("")
const filters = ref<SegmentBuilderFilter[]>([...props.modelValue])

// Computed
const availableFilterTypes = computed(() => [
  {
    value: "activeContacts",
    label: t("segmentation.filters.activeContacts.label"),
    icon: "mdi-account-check",
  },
  {
    value: "medicalProfile",
    label: t("segmentation.filters.medicalProfile.label"),
    icon: "mdi-clipboard-account",
  },
  {
    value: "teamAssignment",
    label: t("segmentation.filters.teamAssignment.label"),
    icon: "mdi-account-group",
  },
  {
    value: "dateRange",
    label: t("segmentation.filters.dateRange.label"),
    icon: "mdi-calendar-range",
  },
])

const currentFilterComponent = computed(() => {
  switch (selectedFilterType.value) {
    case "activeContacts":
      return ActiveContactsFilter
    case "medicalProfile":
      return MedicalProfileFilter
    case "teamAssignment":
      return TeamAssignmentFilter
    case "dateRange":
      return DateRangeFilter
    default:
      return null
  }
})

// Field mapping: chip value -> possible filter field names
const filterFieldMapping: Record<string, string[]> = {
  'activeContacts': ['activeContacts', 'hasActiveContacts'],
  'medicalProfile': ['medicalProfile', 'hasMedicalProfile'],
  'teamAssignment': ['teamAssignment'],
  'dateRange': ['dateRange', 'createdAt', 'updatedAt', 'lastContact', 'nextAppointment']
}

// Methods
const isFilterApplied = (filterType: string): boolean => {
  const possibleFields = filterFieldMapping[filterType] || [filterType]
  return filters.value.some(f => possibleFields.includes(f.field))
}

const addFilter = (filter: Omit<SegmentBuilderFilter, "id">) => {
  // Check if a filter for the same field already exists
  const existingIndex = filters.value.findIndex(f => f.field === filter.field)

  if (existingIndex !== -1) {
    // Replace existing filter with new one (merge values for array types)
    const existingFilter = filters.value[existingIndex]
    if (Array.isArray(existingFilter.value) && Array.isArray(filter.value)) {
      // Merge arrays and remove duplicates
      const mergedValue = [...new Set([...existingFilter.value, ...filter.value])]
      filters.value[existingIndex] = {
        ...existingFilter,
        value: mergedValue,
        label: filter.label,
      }
    } else {
      // Replace with new filter
      filters.value[existingIndex] = {
        ...filter,
        id: existingFilter.id,
      }
    }
  } else {
    // Add new filter
    const newFilter: SegmentBuilderFilter = {
      ...filter,
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
    filters.value.push(newFilter)
  }

  emit("update:modelValue", [...filters.value])
  emit("filter-added")
  selectedFilterType.value = ""
}

const removeFilter = (index: number) => {
  filters.value.splice(index, 1)
  emit("update:modelValue", [...filters.value])
  emit("filter-removed")
}

const getFilterIcon = (field: string): string => {
  const filterType = availableFilterTypes.value.find((type) => type.value === field)
  return filterType?.icon || "mdi-filter"
}

const getFilterLabel = (filter: SegmentBuilderFilter): string => {
  // If the label already contains a colon with value info, use it as-is
  if (filter.label && filter.label.includes(':')) {
    return filter.label
  }

  // For simple filters, build the label with operator and value
  const operatorLabels: Record<string, string> = {
    equals: "=",
    contains: "contient",
    greater_than: ">",
    less_than: "<",
    greater_than_or_equal: "≥",
    less_than_or_equal: "≤",
    between: "entre",
    in: "dans",
    not_in: "pas dans",
  }

  const operator = operatorLabels[filter.operator] || filter.operator

  // Handle different value types
  let valueStr: string
  if (filter.value === null || filter.value === undefined) {
    valueStr = ''
  } else if (typeof filter.value === 'object' && !Array.isArray(filter.value)) {
    if ('min' in filter.value && 'max' in filter.value) {
      valueStr = `${filter.value.min} - ${filter.value.max}`
    } else if ('start' in filter.value && 'end' in filter.value) {
      // Date range
      valueStr = `${filter.value.start} - ${filter.value.end}`
    } else {
      valueStr = Object.values(filter.value).filter(Boolean).join(', ')
    }
  } else if (Array.isArray(filter.value)) {
    valueStr = filter.value.join(", ")
  } else if (typeof filter.value === 'boolean') {
    valueStr = filter.value ? 'Oui' : 'Non'
  } else {
    valueStr = String(filter.value)
  }

  return `${filter.label}: ${operator} ${valueStr}`
}

// Watchers - Only sync when external changes occur
watch(
  () => props.modelValue,
  (newValue) => {
    // Only update if the array reference is different and lengths differ
    if (newValue.length !== filters.value.length) {
      filters.value = [...newValue]
    }
  },
  { deep: false }
)
</script>

<style scoped>
.combined-filter-builder {
  min-height: 200px;
}

.v-chip-group .v-chip {
  margin-bottom: 8px;
}
</style>
