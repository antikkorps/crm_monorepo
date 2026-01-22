<template>
  <v-card class="segment-builder">
    <v-card-title class="builder-header">
      <div class="builder-title">
        <v-icon start>mdi-filter-variant</v-icon>
        <span>{{ $t('segmentation.builder.title') }}</span>
      </div>
      <v-btn
        icon
        variant="text"
        size="small"
        @click="resetBuilder"
        :disabled="!hasFilters"
        class="refresh-btn"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text>
      <!-- Segment Type Selector -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-select
            v-model="segmentType"
            :items="segmentTypeOptions"
            :label="$t('segmentation.builder.segmentType')"
            variant="outlined"
            density="compact"
            @update:model-value="onSegmentTypeChange"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="segmentName"
            :label="$t('segmentation.builder.segmentName')"
            variant="outlined"
            density="compact"
            :rules="nameRules"
          />
        </v-col>
      </v-row>

      <!-- Filter Groups -->
      <div class="filter-groups">
        <v-expansion-panels v-model="activePanels" multiple>
          <!-- Institution Filters -->
          <v-expansion-panel v-if="segmentType === 'institution'">
            <v-expansion-panel-title>
              <v-icon start>mdi-hospital-building</v-icon>
              {{ $t('segmentation.builder.institutionFilters') }}
              <v-chip
                size="small"
                class="ml-2"
                color="primary"
                v-if="institutionFilters.length > 0"
              >
                {{ institutionFilters.length }}
              </v-chip>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <InstitutionFilterBuilder
                v-model="institutionFilters"
                @filter-added="onFilterAdded"
                @filter-removed="onFilterRemoved"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Contact Filters -->
          <v-expansion-panel v-if="segmentType === 'contact'">
            <v-expansion-panel-title>
              <v-icon start>mdi-account-multiple</v-icon>
              {{ $t('segmentation.builder.contactFilters') }}
              <v-chip
                size="small"
                class="ml-2"
                color="primary"
                v-if="contactFilters.length > 0"
              >
                {{ contactFilters.length }}
              </v-chip>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <ContactFilterBuilder
                v-model="contactFilters"
                @filter-added="onFilterAdded"
                @filter-removed="onFilterRemoved"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Combined Filters -->
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon start>mdi-link</v-icon>
              {{ $t('segmentation.builder.combinedFilters') }}
              <v-chip
                size="small"
                class="ml-2"
                color="primary"
                v-if="combinedFilters.length > 0"
              >
                {{ combinedFilters.length }}
              </v-chip>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <CombinedFilterBuilder
                v-model="combinedFilters"
                @filter-added="onFilterAdded"
                @filter-removed="onFilterRemoved"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- Real-time Preview -->
      <v-card class="mt-4" outlined>
        <v-card-title class="text-h6">
          <v-icon start>mdi-eye</v-icon>
          {{ $t('segmentation.builder.preview.title') }}
        </v-card-title>
        <v-card-text>
          <SegmentPreview
            :segment-type="segmentType"
            :criteria="currentCriteria"
            :loading="previewLoading"
            @preview-updated="onPreviewUpdated"
          />
        </v-card-text>
      </v-card>

      <!-- Action Buttons -->
      <div class="action-buttons mt-4">
        <v-btn
          variant="outlined"
          @click="$emit('cancel')"
          :disabled="saving"
          class="action-btn cancel-btn"
        >
          <v-icon start>mdi-close</v-icon>
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          @click="saveSegment"
          :loading="saving"
          :disabled="!canSave"
          class="action-btn save-btn"
        >
          <v-icon start>mdi-content-save</v-icon>
          {{ $t('segmentation.builder.saveSegment') }}
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SegmentType, SegmentCriteria, SegmentBuilderFilter } from '@medical-crm/shared'
import InstitutionFilterBuilder from './InstitutionFilterBuilder.vue'
import ContactFilterBuilder from './ContactFilterBuilder.vue'
import CombinedFilterBuilder from './CombinedFilterBuilder.vue'
import SegmentPreview from './SegmentPreview.vue'

const { t } = useI18n()

// Props
interface Props {
  modelValue?: SegmentCriteria
  initialType?: SegmentType
  initialName?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  initialType: 'institution',
  initialName: ''
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: SegmentCriteria]
  'save': [segment: { name: string; type: SegmentType; criteria: SegmentCriteria }]
  'cancel': []
}>()

// Reactive data
const segmentType = ref<SegmentType>(props.initialType)
const segmentName = ref(props.initialName)
const institutionFilters = ref<SegmentBuilderFilter[]>([])
const contactFilters = ref<SegmentBuilderFilter[]>([])
const combinedFilters = ref<SegmentBuilderFilter[]>([])
const activePanels = ref([0])
const saving = ref(false)
const previewLoading = ref(false)

// Computed
const segmentTypeOptions = computed(() => [
  { title: t('segmentation.types.institution'), value: 'institution' },
  { title: t('segmentation.types.contact'), value: 'contact' }
])

const nameRules = computed(() => [
  (v: string) => !!v || t('validation.required'),
  (v: string) => v.length >= 3 || t('validation.minLength', { min: 3 }),
  (v: string) => v.length <= 100 || t('validation.maxLength', { max: 100 })
])

const hasFilters = computed(() => {
  return institutionFilters.value.length > 0 ||
         contactFilters.value.length > 0 ||
         combinedFilters.value.length > 0
})

const canSave = computed(() => {
  return segmentName.value.trim().length >= 3 && hasFilters.value
})

const currentCriteria = computed((): SegmentCriteria => {
  const criteria: SegmentCriteria = {}

  if (segmentType.value === 'institution' && institutionFilters.value.length > 0) {
    criteria.institutionFilters = buildInstitutionFilters()
  }

  if (segmentType.value === 'contact' && contactFilters.value.length > 0) {
    criteria.contactFilters = buildContactFilters()
  }

  if (combinedFilters.value.length > 0) {
    criteria.combinedFilters = buildCombinedFilters()
  }

  return criteria
})

// Methods
const onSegmentTypeChange = () => {
  // Reset filters when segment type changes
  institutionFilters.value = []
  contactFilters.value = []
  combinedFilters.value = []

  // Update active panels
  activePanels.value = segmentType.value === 'institution' ? [0, 2] : [1, 2]
}

const onFilterAdded = () => {
  console.log('SegmentBuilder: Filter added, updating criteria')
  emit('update:modelValue', currentCriteria.value)
}

const onFilterRemoved = () => {
  console.log('SegmentBuilder: Filter removed, updating criteria')
  emit('update:modelValue', currentCriteria.value)
}

const onPreviewUpdated = (data: any) => {
  previewLoading.value = false
}

const buildInstitutionFilters = () => {
  // Convert builder filters to institution search filters
  const filters: any = {}

  institutionFilters.value.forEach(filter => {
    switch (filter.field) {
      case 'name':
        filters.name = filter.value
        break
      case 'type':
        filters.type = filter.value
        break
      case 'city':
        filters.city = filter.value
        break
      case 'state':
        filters.state = filter.value
        break
      case 'specialties':
        filters.specialties = filter.value
        break
      case 'minBedCapacity':
        filters.minBedCapacity = filter.value
        break
      case 'maxBedCapacity':
        filters.maxBedCapacity = filter.value
        break
      case 'complianceStatus':
        filters.complianceStatus = filter.value
        break
    }
  })

  return filters
}

const buildContactFilters = () => {
  // Convert builder filters to contact filters
  const filters: any = {}

  contactFilters.value.forEach(filter => {
    switch (filter.field) {
      case 'role':
        filters.role = filter.value
        break
      case 'department':
        filters.department = filter.value
        break
      case 'title':
        filters.title = filter.value
        break
      case 'isPrimary':
        filters.isPrimary = filter.value
        break
      case 'hasPhone':
        filters.hasPhone = filter.value
        break
      case 'hasEmail':
        filters.hasEmail = filter.value
        break
      case 'activityLevel':
        filters.activityLevel = filter.value
        break
      case 'preferredContactMethod':
        // Convert contact method selection to hasEmail/hasPhone booleans
        if (Array.isArray(filter.value)) {
          if (filter.value.includes('email')) {
            filters.hasEmail = true
          }
          if (filter.value.includes('phone') || filter.value.includes('mobile')) {
            filters.hasPhone = true
          }
        }
        break
    }
  })

  return filters
}

const buildCombinedFilters = () => {
  // Convert builder filters to combined filters
  const filters: any = {}

  combinedFilters.value.forEach(filter => {
    switch (filter.field) {
      case 'hasActiveContacts':
        filters.hasActiveContacts = filter.value
        break
      case 'hasMedicalProfile':
        filters.hasMedicalProfile = filter.value
        break
      case 'assignedToTeam':
        filters.assignedToTeam = filter.value
        break
    }
  })

  return filters
}

const resetBuilder = () => {
  segmentName.value = ''
  institutionFilters.value = []
  contactFilters.value = []
  combinedFilters.value = []
  emit('update:modelValue', {})
}

const saveSegment = async () => {
  if (!canSave.value) return

  saving.value = true

  try {
    const segment = {
      name: segmentName.value.trim(),
      type: segmentType.value,
      criteria: currentCriteria.value
    }

    console.log('SegmentBuilder: Saving segment with criteria:', JSON.stringify(segment.criteria, null, 2))
    console.log('SegmentBuilder: Contact filters raw:', contactFilters.value)
    console.log('SegmentBuilder: Institution filters raw:', institutionFilters.value)
    console.log('SegmentBuilder: Combined filters raw:', combinedFilters.value)

    emit('save', segment)
  } catch (error) {
    console.error('Error saving segment:', error)
  } finally {
    saving.value = false
  }
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    console.log('SegmentBuilder: modelValue changed:', newValue)
    // Load existing criteria into builder
    // This would need to be implemented based on the specific filter structure
  }
}, { deep: true })

// Initialize
onMounted(() => {
  activePanels.value = segmentType.value === 'institution' ? [0, 2] : [1, 2]
})
</script>

<style scoped>
.segment-builder {
  max-width: 1200px;
  margin: 0 auto;
}

.builder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.builder-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  font-weight: 500;
  min-width: 0;
  flex: 1;
}

.builder-title span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.refresh-btn {
  flex-shrink: 0;
}

/* Action buttons */
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.action-btn {
  min-width: 120px;
  text-transform: none;
  font-weight: 500;
}

.filter-groups {
  margin-bottom: 16px;
}

.v-expansion-panel-title {
  padding: 16px;
}

.v-expansion-panel-content {
  padding: 0 16px 16px;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .segment-builder {
    margin: 0;
  }

  /* Builder header - title and refresh button */
  .builder-header {
    padding: 10px 12px !important;
    gap: 4px;
  }

  .builder-title {
    font-size: 1rem;
    gap: 6px;
  }

  .builder-title .v-icon {
    font-size: 1.25rem;
  }

  .refresh-btn {
    width: 32px;
    height: 32px;
  }

  .segment-builder :deep(.v-card-text) {
    padding: 12px;
  }

  .segment-builder .v-row.mb-4 {
    margin-bottom: 8px !important;
  }

  .filter-groups {
    margin-bottom: 8px;
  }

  .filter-groups :deep(.v-expansion-panel-title) {
    padding: 12px;
    min-height: 44px;
  }

  .filter-groups :deep(.v-expansion-panel-text__wrapper) {
    padding: 8px 12px 12px;
  }

  /* Reduce nested card padding for preview */
  .segment-builder :deep(.v-card.mt-4 .v-card-title) {
    padding: 10px 12px;
    font-size: 1rem;
  }

  .segment-builder :deep(.v-card.mt-4 .v-card-text) {
    padding: 8px;
  }

  /* Preview stats cards */
  .segment-builder :deep(.segment-preview .v-card) {
    margin-bottom: 8px;
  }

  .segment-builder :deep(.segment-preview .v-card .v-card-text) {
    padding: 10px;
  }

  /* Action buttons on mobile */
  .action-buttons {
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
  }

  .action-btn {
    width: 100%;
    min-width: unset;
  }

  /* Reverse order: Save first, Cancel second */
  .action-buttons {
    flex-direction: column-reverse;
  }
}
</style>
