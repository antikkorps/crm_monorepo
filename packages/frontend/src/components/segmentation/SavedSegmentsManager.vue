<template>
  <div class="saved-segments-manager">
    <v-card>
      <v-card-title class="segment-header">
        <div class="segment-header-title">
          <v-icon class="mr-2">mdi-bookmark-multiple</v-icon>
          {{ $t("segmentation.saved.title") }}
        </div>
        <div class="segment-header-actions">
          <v-text-field
            v-model="searchQuery"
            :label="$t('segmentation.saved.search')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            class="segment-search-field"
          />
          <v-btn
            icon
            variant="text"
            @click="refreshSegments"
            :loading="loading"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <!-- Filter Tabs -->
        <v-tabs v-model="activeTab" class="mb-4" show-arrows>
          <v-tab value="all">{{ $t("segmentation.saved.tabs.all") }}</v-tab>
          <v-tab value="mine">{{ $t("segmentation.saved.tabs.mine") }}</v-tab>
          <v-tab value="team">{{ $t("segmentation.saved.tabs.team") }}</v-tab>
          <v-tab value="shared">{{ $t("segmentation.saved.tabs.shared") }}</v-tab>
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
              :class="[
                { selected: selectedSegments.includes(segment.id) },
                `segment-type-${segment.type}`
              ]"
              @click="toggleSelection(segment.id)"
            >
              <!-- Type indicator bar -->
              <div class="segment-type-bar" :style="{ backgroundColor: getTypeColor(segment.type) }"></div>

              <v-card-title class="segment-card-header">
                <div class="segment-card-header-content">
                  <div class="segment-icon-wrapper" :style="{ backgroundColor: getTypeColor(segment.type) + '20' }">
                    <v-icon :color="getTypeColor(segment.type)" size="20">
                      {{ getTypeIcon(segment.type) }}
                    </v-icon>
                  </div>
                  <div class="segment-title-wrapper">
                    <div class="segment-name text-subtitle-1 font-weight-medium">{{ segment.name }}</div>
                    <v-chip
                      size="x-small"
                      :color="getVisibilityColor(segment.visibility)"
                      variant="tonal"
                      class="segment-visibility-chip"
                    >
                      {{ getVisibilityLabel(segment.visibility) }}
                    </v-chip>
                  </div>
                </div>
              </v-card-title>

              <v-card-text class="segment-card-body">
                <p
                  class="text-body-2 text-medium-emphasis segment-description"
                  v-if="segment.description"
                >
                  {{ segment.description }}
                </p>

                <!-- Stats row -->
                <div class="segment-stats">
                  <div class="segment-stat">
                    <v-icon size="16" color="primary" class="mr-1">mdi-account-group</v-icon>
                    <span class="segment-stat-value">{{ formatNumber(segment.stats?.totalCount || 0) }}</span>
                    <span class="segment-stat-label">{{ $t("segmentation.records") }}</span>
                  </div>
                  <div class="segment-stat">
                    <v-icon size="16" color="secondary" class="mr-1">mdi-filter-variant</v-icon>
                    <span class="segment-stat-value">{{ segment.filterCount || 0 }}</span>
                    <span class="segment-stat-label">{{ $t("segmentation.filters.label") }}</span>
                  </div>
                </div>

                <!-- Meta info -->
                <div class="segment-meta">
                  <div class="segment-owner" v-if="segment.owner">
                    <v-avatar size="20" class="mr-1">
                      <v-img v-if="segment.owner.avatar" :src="segment.owner.avatar" />
                      <span v-else class="text-caption">{{ segment.owner.firstName?.[0] }}{{ segment.owner.lastName?.[0] }}</span>
                    </v-avatar>
                    <span class="text-caption">{{ segment.owner.firstName }} {{ segment.owner.lastName?.[0] }}.</span>
                  </div>
                  <div class="segment-date text-caption text-medium-emphasis">
                    <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(segment.updatedAt) }}
                  </div>
                </div>
              </v-card-text>

              <v-divider />

              <v-card-actions class="segment-actions">
                <v-btn icon small @click.stop="viewSegment(segment)" title="View">
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

        <!-- Bulk Actions Bar - Only visible when segments are selected -->
        <v-slide-y-reverse-transition>
          <v-card
            v-if="selectedSegments.length > 0"
            class="bulk-actions-bar"
            elevation="8"
          >
            <div class="bulk-actions-content">
              <div class="bulk-actions-info">
                <v-chip color="primary" size="small" variant="flat">
                  {{ selectedSegments.length }}
                </v-chip>
                <span class="bulk-actions-label">{{ $t("segmentation.saved.selected") }}</span>
              </div>
              <div class="bulk-actions-buttons">
                <v-btn
                  color="primary"
                  size="small"
                  variant="tonal"
                  @click="executeBulkAction('export')"
                >
                  <v-icon start>mdi-download</v-icon>
                  <span class="d-none d-sm-inline">{{ $t("segmentation.saved.bulkActions.export") }}</span>
                </v-btn>
                <v-btn
                  color="error"
                  size="small"
                  variant="tonal"
                  @click="executeBulkAction('delete')"
                >
                  <v-icon start>mdi-delete</v-icon>
                  <span class="d-none d-sm-inline">{{ $t("segmentation.saved.bulkActions.delete") }}</span>
                </v-btn>
              </div>
              <v-btn
                icon
                size="small"
                variant="text"
                @click="clearSelection"
                class="bulk-actions-close"
              >
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>
          </v-card>
        </v-slide-y-reverse-transition>

        <!-- Empty State -->
        <v-card v-if="filteredSegments.length === 0" class="empty-state text-center" variant="outlined">
          <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-bookmark-off</v-icon>
          <div class="text-subtitle-1 font-weight-medium">{{ $t("segmentation.saved.empty.title") }}</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            {{ $t("segmentation.saved.empty.message") }}
          </div>
          <v-btn color="primary" size="small" @click="$emit('create-new')">
            <v-icon start>mdi-plus</v-icon>
            <span class="d-none d-sm-inline">{{ $t("segmentation.saved.createFirst") }}</span>
            <span class="d-sm-none">{{ $t("segmentation.saved.createFirstShort") }}</span>
          </v-btn>
        </v-card>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "vue-i18n"
import type { Segment, SegmentVisibility, SegmentType } from "@medical-crm/shared"
import { useAuthStore } from "../../stores/auth"

const { t } = useI18n()
const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id)

// Props
interface Props {
  segments: Segment[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

// Emits
const emit = defineEmits<{
  view: [segment: Segment]
  edit: [segment: Segment]
  duplicate: [segment: Segment]
  delete: [segment: Segment]
  "create-new": []
  "bulk-action": [action: string, segmentIds: string[]]
}>()

// Reactive data
const searchQuery = ref("")
const activeTab = ref("all")
const selectedSegments = ref<string[]>([])

// Computed
const filteredSegments = computed(() => {
  let filtered = props.segments

  // Filter by tab
  switch (activeTab.value) {
    case "mine":
      filtered = filtered.filter((segment) => segment.ownerId === currentUserId.value)
      break
    case "team":
      filtered = filtered.filter((segment) => segment.visibility === "team")
      break
    case "shared":
      filtered = filtered.filter((segment) => segment.visibility === "public")
      break
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (segment) =>
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
  return type === "institution" ? "mdi-hospital-building" : "mdi-account-multiple"
}

const getTypeColor = (type: SegmentType): string => {
  return type === "institution" ? "primary" : "secondary"
}

const getVisibilityColor = (visibility: SegmentVisibility): string => {
  const colors: Record<SegmentVisibility, string> = {
    private: "grey",
    team: "warning",
    public: "success",
  }
  return colors[visibility] || "grey"
}

const getVisibilityLabel = (visibility: SegmentVisibility): string => {
  return t(`segmentation.visibility.${visibility}`)
}

const canEdit = (segment: Segment): boolean => {
  return segment.ownerId === currentUserId.value || segment.visibility === "team"
}

const toggleSelection = (segmentId: string) => {
  const index = selectedSegments.value.indexOf(segmentId)
  if (index > -1) {
    selectedSegments.value.splice(index, 1)
  } else {
    selectedSegments.value.push(segmentId)
  }
}

const clearSelection = () => {
  selectedSegments.value = []
}

const viewSegment = (segment: Segment) => {
  emit("view", segment)
}

const editSegment = (segment: Segment) => {
  emit("edit", segment)
}

const duplicateSegment = (segment: Segment) => {
  emit("duplicate", segment)
}

const deleteSegment = (segment: Segment) => {
  emit("delete", segment)
}

const refreshSegments = () => {
  // TODO: Implement refresh functionality
  console.log("Refreshing segments...")
}

const executeBulkAction = (action: string) => {
  emit("bulk-action", action, selectedSegments.value)
  selectedSegments.value = []
}

// Watchers - Clear selection when switching tabs or searching
watch(
  () => activeTab.value,
  () => {
    selectedSegments.value = []
  }
)

watch(
  () => searchQuery.value,
  () => {
    selectedSegments.value = []
  }
)
</script>

<style scoped>
.saved-segments-manager {
  min-height: 400px;
}

/* Empty State */
.empty-state {
  padding: 32px 24px;
}

/* Header layout */
.segment-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}

.segment-header-title {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
  font-weight: 500;
}

.segment-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: flex-end;
  min-width: 200px;
}

.segment-search-field {
  max-width: 300px;
  min-width: 150px;
  flex: 1;
}

/* Responsive: stack on mobile */
@media (max-width: 599px) {
  .segment-header {
    flex-direction: column;
    align-items: stretch;
  }

  .segment-header-title {
    justify-content: center;
  }

  .segment-header-actions {
    justify-content: center;
    width: 100%;
  }

  .segment-search-field {
    max-width: none;
    flex: 1;
  }
}

/* Segment Cards */
.segment-card {
  transition: all 0.2s ease;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.segment-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.segment-card.selected {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.2);
}

.segment-type-bar {
  height: 4px;
  width: 100%;
}

.segment-card-header {
  padding: 12px 16px 8px;
}

.segment-card-header-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.segment-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.segment-title-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.segment-name {
  line-height: 1.3;
  word-break: break-word;
}

.segment-visibility-chip {
  align-self: flex-start;
}

.segment-card-body {
  padding: 0 16px 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.segment-description {
  margin-bottom: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.segment-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.segment-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}

.segment-stat-value {
  font-weight: 600;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.segment-stat-label {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.segment-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.segment-owner {
  display: flex;
  align-items: center;
}

.segment-date {
  display: flex;
  align-items: center;
}

.segment-actions {
  padding: 8px 12px;
  justify-content: flex-start;
  gap: 4px;
}

.segment-actions .v-btn {
  opacity: 0.7;
}

.segment-actions .v-btn:hover {
  opacity: 1;
}

/* Bulk Actions Bar - Fixed at bottom */
.bulk-actions-bar {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  border-radius: 12px;
  max-width: calc(100% - 32px);
  width: auto;
}

.bulk-actions-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.bulk-actions-info {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.bulk-actions-label {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.bulk-actions-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bulk-actions-close {
  margin-left: auto;
}

/* Mobile responsive */
@media (max-width: 599px) {
  .saved-segments-manager :deep(.v-card-text) {
    padding: 12px;
  }

  .segment-header {
    padding: 12px;
  }

  .empty-state {
    padding: 24px 16px;
  }

  .bulk-actions-bar {
    bottom: 8px;
    left: 8px;
    right: 8px;
    transform: none;
    max-width: none;
  }

  .bulk-actions-content {
    padding: 8px 12px;
    gap: 8px;
  }

  .bulk-actions-label {
    display: none;
  }

  .bulk-actions-buttons {
    gap: 4px;
  }

  .segment-card {
    padding-bottom: 6px;
  }

  .segment-actions {
    justify-content: space-between;
  }

  .segment-actions .v-btn {
    transform: scale(0.95);
  }
}
</style>
