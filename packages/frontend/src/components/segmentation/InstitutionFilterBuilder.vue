<template>
  <div class="institution-filter-builder">
    <!-- Available Filters -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-chip-group v-model="selectedFilterType" column mandatory>
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
      <h4 class="text-h6 mb-3">{{ $t("segmentation.builder.activeFilters") }}</h4>
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
    <v-alert v-else type="info" outlined class="mb-4">
      {{ $t("segmentation.builder.noFilters") }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import type { SegmentBuilderFilter } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import CapacityFilter from "./filters/CapacityFilter.vue"
import ComplianceFilter from "./filters/ComplianceFilter.vue"
import LocationFilter from "./filters/LocationFilter.vue"
import NameFilter from "./filters/NameFilter.vue"
import SpecialtyFilter from "./filters/SpecialtyFilter.vue"
import TypeFilter from "./filters/TypeFilter.vue"

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
  { value: "name", label: t("segmentation.filters.name.label"), icon: "mdi-text-box-outline" },
  { value: "type", label: t("segmentation.filters.type.label"), icon: "mdi-hospital-building" },
  {
    value: "location",
    label: t("segmentation.filters.location.label"),
    icon: "mdi-map-marker",
  },
  {
    value: "specialty",
    label: t("segmentation.filters.specialty.label"),
    icon: "mdi-stethoscope",
  },
  { value: "capacity", label: t("segmentation.filters.capacity.label"), icon: "mdi-bed" },
  {
    value: "compliance",
    label: t("segmentation.filters.compliance.label"),
    icon: "mdi-shield-check",
  },
])

const currentFilterComponent = computed(() => {
  switch (selectedFilterType.value) {
    case "name":
      return NameFilter
    case "type":
      return TypeFilter
    case "location":
      return LocationFilter
    case "specialty":
      return SpecialtyFilter
    case "capacity":
      return CapacityFilter
    case "compliance":
      return ComplianceFilter
    default:
      return null
  }
})

// Methods
const addFilter = (filter: Omit<SegmentBuilderFilter, "id">) => {
  const newFilter: SegmentBuilderFilter = {
    ...filter,
    id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }

  filters.value.push(newFilter)
  emit("update:modelValue", filters.value)
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
  const operatorLabels: Record<string, string> = {
    equals: "=",
    contains: "contains",
    greater_than: ">",
    less_than: "<",
    between: "between",
    in: "in",
    not_in: "not in",
  }

  const operator = operatorLabels[filter.operator] || filter.operator
  const value = Array.isArray(filter.value) ? filter.value.join(", ") : filter.value

  return `${filter.label}: ${operator} ${value}`
}

// Watchers
watch(
  () => props.modelValue,
  (newValue) => {
    filters.value = [...newValue]
  }
)
</script>

<style scoped>
.institution-filter-builder {
  min-height: 200px;
}

.v-chip-group .v-chip {
  margin-bottom: 8px;
}
</style>
