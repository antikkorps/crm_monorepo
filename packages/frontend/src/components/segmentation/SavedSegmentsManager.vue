<template>
  <div class="saved-segments-manager">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-bookmark-multiple</v-icon>
        {{ $t('segmentation.saved.title') }}
        <v-spacer />
        <v-text-field
          v-model="searchQuery"
          :label="$t('segmentation.saved.search')"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          class="mr-2"
          style="max-width: 300px"
        />
        <v-btn
          icon
          @click="refreshSegments"
          :loading="loading"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Filter Tabs -->
        <v-tabs v-model="activeTab" class="mb-4">
          <v-tab value="all">{{ $t('segmentation.saved.tabs.all') }}</v-tab>
          <v-tab value="mine">{{ $t('segmentation.saved.tabs.mine') }}</v-tab>
          <v-tab value="team">{{ $t('segmentation.saved.tabs.team') }}</v-tab>
          <v-tab value="shared">{{ $t('segmentation.saved.tabs.shared') }}</v-tab>
        </v-tabs>

        <!-- Segments Grid -->
        <v-row>
          <v-col
            v-for="segment in filteredSegments"
            :key="segment.id"
            cols="12"
            md="6"
            lg="4"
          >
            <v-card
              class="segment-card"
              :class="{ 'selected': selectedSegments.includes(segment.id) }"
              @click="toggleSelection(segment.id)"
            >
              <v-card-title class="pb-2">
                <div class="d-flex align-center">
                  <v-icon
                    :color="getTypeColor(segment.type)"
                    left
                    small
                  >
                    {{ getTypeIcon(segment.type) }}
                  </v-icon>
                  <div class="flex-grow-1">
                    <div class="text-h6">{{ segment.name }}</div>
                    <div class="text-caption text-medium-emphasis" v-if="segment.description">
                      {{ segment.description }}
                    </div>
                  </div>
                </div>
              </v-card-title>

              <v-card-text class="pt-0">
                <v-row dense class="mb-2">
                  <v-col cols="6">
                    <div class="text-center">
                      <div class="text-h6 font-weight-bold primary--text">
                        {{ formatNumber(segment.stats?.totalCount || 0) }}
                      </div>
                      <div class="text-caption">{{ $t('segmentation.records') }}</div>
                    </div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-center">
                      <div class="text-h6 font-weight-bold success--text">
                        {{ segment.filterCount }}
                      </div>
                      <div class="text-caption">{{ $t('segmentation.filters') }}</div>
                    </div>
                  </v-col>
                </v-row>

                <div class="d-flex align-center justify-space-between mb-2">
                  <v-chip
                    small
                    :color="getVisibilityColor(segment.visibility)"
                    outlined
                  >
                    {{ getVisibilityLabel(segment.visibility) }}
                  </v-chip>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatDate(segment.updatedAt) }}
                  </div>
                </div>

                <div class="d-flex align-center mb-2" v-if="segment.owner">
                  <v-avatar size="24" class="mr-2">
                    <v-img :src="segment.owner.avatar" />
                  </v-avatar>
                  <div class="text-caption">{{ segment.owner.firstName }} {{ segment.owner.lastName }}</div>
                </div>
              </v-card-text>

              <v-card-actions class="pt-0">
                <v-btn
                  icon
                  small
                  @click.stop="viewSegment(segment)"
                  title="View"
                >
                  <v-icon>mdi-eye</v-icon>
                </v-btn>
                <v-btn
                  icon
                  small
                  @click.stop="editSegment(segment)"
                  title="Edit"
                  :disabled="!canEdit(segment)"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  icon
                  small
                  @click.stop="duplicateSegment(segment)"
                  title="Duplicate"
                >
                  <v-icon>mdi-content-copy</v-icon>
                </v-btn>
                <v-btn
                  icon
                  small
                  @click.stop="shareSegment(segment)"
                  title="Share"
                  :disabled="!canShare(segment)"
                >
                  <v-icon>mdi-share-variant</v-icon>
                </v-btn>
                <v-spacer />
                <v-btn
                  icon
                  small
                  @click.stop="deleteSegment(segment)"
                  title="Delete"
                  :disabled="!canEdit(segment)"
                  color="error"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Bulk Actions Bar -->
        <v-bottom-sheet v-model="showBulkActions" persistent>
          <v-card>
            <v-card-title>
              {{ $t('segmentation.saved.bulkActions.title') }}
              <v-spacer />
              <v-btn icon @click="showBulkActions = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-title>
            <v-card-text>
              <div class="d-flex align-center mb-4">
                <v-chip class="mr-2">
                  {{ selectedSegments.length }} {{ $t('segmentation.saved.selected') }}
                </v-chip>
                <v-spacer />
                <v-btn
                  color="primary"
                  @click="executeBulkAction('export')"
                  :disabled="selectedSegments.length === 0"
                >
                  <v-icon left>mdi-download</v-icon>
                  {{ $t('segmentation.saved.bulkActions.export') }}
                </v-btn>
                <v-btn
                  color="secondary"
                  @click="executeBulkAction('share')"
                  :disabled="selectedSegments.length === 0"
                  class="ml-2"
                >
                  <v-icon left>mdi-share-variant</v-icon>
                  {{ $t('segmentation.saved.bulkActions.share') }}
                </v-btn>
                <v-btn
                  color="error"
                  @click="executeBulkAction('delete')"
                  :disabled="selectedSegments.length === 0"
                  class="ml-2"
                >
                  <v-icon left>mdi-delete</v-icon>
                  {{ $t('segmentation.saved.bulkActions.delete') }}
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-bottom-sheet>

        <!-- Empty State -->
        <v-card v-if="filteredSegments.length === 0" class="text-center pa-8" outlined>
          <v-icon size="64" color="grey lighten-1">mdi-bookmark-off</v-icon>
          <div class="mt-4 text-h6">{{ $t('segmentation.saved.empty.title') }}</div>
          <div class="text-body-1 text-medium-emphasis mb-4">
            {{ $t('segmentation.saved.empty.message') }}
          </div>
          <v-btn color="primary" @click="$emit('create-new')">
            <v-icon left>mdi-plus</v-icon>
            {{ $t('segmentation.saved.createFirst') }}
          </v-btn>
        </v-card>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Segment, SegmentVisibility, SegmentType } from '@medical-crm/shared'

const { t } = useI18n()

// Props
interface Props {
  segments: Segment[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  'view': [segment: Segment]
  'edit': [segment: Segment]
  'duplicate': [segment: Segment]
  'share': [segment: Segment]
  'delete': [segment: Segment]
  'create-new': []
  'bulk-action': [action: string, segmentIds: string[]]
}>()

// Reactive data
const searchQuery = ref('')
const activeTab = ref('all')
const selectedSegments = ref<string[]>([])
const showBulkActions = ref(false)

// Computed
const filteredSegments = computed(() => {
  let filtered = props.segments

  // Filter by tab
  switch (activeTab.value) {
    case 'mine':
      filtered = filtered.filter(segment => segment.ownerId === 'current-user-id')
      break
    case 'team':
      filtered = filtered.filter(segment => segment.visibility === 'team')
      break
    case 'shared':
      filtered = filtered.filter(segment => segment.visibility === 'public')
      break
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(segment =>
      segment.name.toLowerCase().includes(query) ||
      (segment.description && segment.description.toLowerCase().includes(query))
    )
  }

  return filtered
})

// Methods
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num)
}

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString()
}

const getTypeIcon = (type: SegmentType): string => {
  return type === 'institution' ? 'mdi-hospital-building' : 'mdi-account-multiple'
}

const getTypeColor = (type: SegmentType): string => {
  return type === 'institution' ? 'primary' : 'secondary'
}

const getVisibilityColor = (visibility: SegmentVisibility): string => {
  const colors: Record<SegmentVisibility, string> = {
    'private': 'grey',
    'team': 'warning',
    'public': 'success'
  }
  return colors[visibility] || 'grey'
}

const getVisibilityLabel = (visibility: SegmentVisibility): string => {
  return t(`segmentation.visibility.${visibility}`)
}

const canEdit = (segment: Segment): boolean => {
  // TODO: Implement proper permission checking
  return segment.ownerId === 'current-user-id' || segment.visibility === 'team'
}

const canShare = (segment: Segment): boolean => {
  return canEdit(segment)
}

const toggleSelection = (segmentId: string) => {
  const index = selectedSegments.value.indexOf(segmentId)
  if (index > -1) {
    selectedSegments.value.splice(index, 1)
  } else {
    selectedSegments.value.push(segmentId)
  }

  showBulkActions.value = selectedSegments.value.length > 0
}

const viewSegment = (segment: Segment) => {
  emit('view', segment)
}

const editSegment = (segment: Segment) => {
  emit('edit', segment)
}

const duplicateSegment = (segment: Segment) => {
  emit('duplicate', segment)
}

const shareSegment = (segment: Segment) => {
  emit('share', segment)
}

const deleteSegment = (segment: Segment) => {
  emit('delete', segment)
}

const refreshSegments = () => {
  // TODO: Implement refresh functionality
  console.log('Refreshing segments...')
}

const executeBulkAction = (action: string) => {
  emit('bulk-action', action, selectedSegments.value)
  selectedSegments.value = []
  showBulkActions.value = false
}

// Watchers
watch(() => activeTab.value, () => {
  selectedSegments.value = []
  showBulkActions.value = false
})

watch(() => searchQuery.value, () => {
  selectedSegments.value = []
  showBulkActions.value = false
})
</script>

<style scoped>
.saved-segments-manager {
  min-height: 400px;
}

.segment-card {
  transition: all 0.2s ease;
  cursor: pointer;
}

.segment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.segment-card.selected {
  border-color: var(--v-primary-base);
  border-width: 2px;
}
</style>