<template>
  <v-card class="segment-builder">
    <v-card-title class="d-flex align-center">
      <v-icon left>mdi-filter-variant</v-icon>
      {{ $t('segmentation.builder.title') }}
      <v-spacer />
      <v-btn
        icon
        @click="resetBuilder"
        :disabled="!hasFilters"
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
            outlined
            dense
            @change="onSegmentTypeChange"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="segmentName"
            :label="$t('segmentation.builder.segmentName')"
            outlined
            dense
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
              <v-icon left>mdi-hospital-building</v-icon>
              {{ $t('segmentation.builder.institutionFilters') }}
              <v-chip
                small
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
              <v-icon left>mdi-account-multiple</v-icon>
              {{ $t('segmentation.builder.contactFilters') }}
              <v-chip
                small
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
              <v-icon left>mdi-link</v-icon>
              {{ $t('segmentation.builder.combinedFilters') }}
              <v-chip
                small
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
          <v-icon left>mdi-eye</v-icon>
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
      <v-card-actions class="mt-4">
        <v-spacer />
        <v-btn
          @click="$emit('cancel')"
          :disabled="saving"
        >
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          @click="saveSegment"
          :loading="saving"
          :disabled="!canSave"
        >
          <v-icon left>mdi-content-save</v-icon>
          {{ $t('segmentation.builder.saveSegment') }}
        </v-btn>
      </v-card-actions>
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

.filter-groups {
  margin-bottom: 16px;
}

.v-expansion-panel-title {
  padding: 16px;
}

.v-expansion-panel-content {
  padding: 0 16px 16px;
}
</style>
