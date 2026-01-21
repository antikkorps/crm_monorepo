<template>
  <AppLayout>
    <div class="segmentation-view">
      <v-container fluid class="pa-0">
        <v-card class="main-card">
          <v-card-title class="d-flex align-center flex-wrap">
            <div class="d-flex align-center flex-grow-1">
              <v-icon left>mdi-filter-variant</v-icon>
              <span class="text-truncate">{{ $t("segmentation.title") }}</span>
            </div>
            <v-btn
              color="primary"
              @click="startCreateSegment"
              class="ml-2 mt-2 mt-sm-0"
              size="small"
            >
              <v-icon left size="small">mdi-plus</v-icon>
              <span class="d-none d-sm-inline">{{ $t("segmentation.createSegment") }}</span>
              <span class="d-sm-none">Créer</span>
            </v-btn>
          </v-card-title>

          <v-card-text>
            <!-- Error Banner -->
            <div v-if="error" class="error-banner">
              <v-icon left>mdi-alert-circle</v-icon>
              {{ error }}
              <v-btn 
                icon 
                small 
                class="ml-2" 
                @click="clearError"
              >
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>

            <!-- Loading Indicator -->
            <v-progress-linear 
              v-if="loading" 
              indeterminate 
              color="primary" 
              class="mb-4"
            />

            <!-- Segments Management Tabs -->
            <v-tabs v-model="activeTab" class="mb-4">
              <v-tab value="list">{{ $t("segmentation.tabs.list") }}</v-tab>
              <v-tab value="builder">{{ $t("segmentation.tabs.builder") }}</v-tab>
              <v-tab value="analytics">{{ $t("segmentation.tabs.analytics") }}</v-tab>
              <v-tab value="comparison">{{ $t("segmentation.tabs.comparison") }}</v-tab>
            </v-tabs>

            <v-window v-model="activeTab">
              <!-- Segments List -->
              <v-window-item value="list">
                <SavedSegmentsManager
                  :segments="segments"
                  :loading="loading"
                  @view="viewSegment"
                  @edit="editSegment"
                  @duplicate="handleDuplicateSegment"
                  @share="handleShareSegment"
                  @delete="handleDeleteSegment"
                  @bulk-action="onBulkAction"
                  @create-new="startCreateSegment"
                />
              </v-window-item>

              <!-- Segment Builder -->
              <v-window-item value="builder">
                <div v-if="showCreateDialog">
                  <SegmentBuilder
                    ref="segmentBuilderRef"
                    :model-value="editingSegment?.criteria || {}"
                    :initial-type="editingSegment?.type || SegmentType.INSTITUTION"
                    :initial-name="editingSegment?.name || ''"
                    @save="onSegmentSave"
                    @cancel="showCreateDialog = false"
                  />
                </div>
                <div v-else class="text-center pa-8">
                  <v-icon size="64" color="grey lighten-1"
                    >mdi-filter-variant-plus</v-icon
                  >
                  <div class="mt-4 text-h6">
                    {{ $t("segmentation.builder.empty.title") }}
                  </div>
                  <div class="text-body-1 text-medium-emphasis mb-4">
                    {{ $t("segmentation.builder.empty.message") }}
                  </div>
                  <v-btn color="primary" @click="showCreateDialog = true">
                    <v-icon left>mdi-plus</v-icon>
                    {{ $t("segmentation.builder.createNew") }}
                  </v-btn>
                </div>
              </v-window-item>

              <!-- Analytics Dashboard -->
              <v-window-item value="analytics">
                <SegmentAnalyticsDashboard :segment-id="selectedSegment?.id" />
              </v-window-item>

              <!-- Comparison Tool -->
              <v-window-item value="comparison">
                <SegmentComparisonTool
                  :segments="segments"
                  @segments-selected="onSegmentsSelected"
                />
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-container>

    <!-- Bulk Actions Dialog -->
    <v-dialog v-model="showBulkDialog" max-width="800px">
      <BulkActionsDialog
        v-if="selectedSegment"
        :segment="selectedSegment"
        @close="showBulkDialog = false"
        @action-completed="onBulkActionCompleted"
      />
    </v-dialog>

    <!-- Confirm Delete Dialog -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      :title="$t('segmentation.confirmDelete', { name: deleteTargetNames.length === 1 ? deleteTargetNames[0] : deleteTargetNames.length + ' ' + $t('segmentation.records') })"
      :message="deleteTargetNames.length > 1 ? deleteTargetNames.join(', ') : ''"
      type="error"
      :confirm-text="$t('common.delete')"
      :cancel-text="$t('common.cancel')"
      @confirm="confirmDelete"
    />

    <!-- Share Dialog Placeholder -->
    <ShareSegmentDialog v-model="showShareDialog" :count="deleteTargetIds.length || 1" />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import { defineAsyncComponent } from 'vue'

// Load segmentation components asynchronously for better performance
const BulkActionsDialog = defineAsyncComponent(() => 
  import("@/components/segmentation/BulkActionsDialog.vue")
)
const SavedSegmentsManager = defineAsyncComponent(() => 
  import("@/components/segmentation/SavedSegmentsManager.vue")
)
const SegmentAnalyticsDashboard = defineAsyncComponent(() => 
  import("@/components/segmentation/SegmentAnalyticsDashboard.vue")
)
const SegmentBuilder = defineAsyncComponent(() => 
  import("@/components/segmentation/SegmentBuilder.vue")
)
const SegmentComparisonTool = defineAsyncComponent(() => 
  import("@/components/segmentation/SegmentComparisonTool.vue")
)
const ConfirmDialog = defineAsyncComponent(() => 
  import("@/components/common/ConfirmDialog.vue")
)
const ShareSegmentDialog = defineAsyncComponent(() => 
  import("@/components/segmentation/ShareSegmentDialog.vue")
)
import { useSegmentation } from "@/composables/useSegmentation"
import type { Segment } from "@medical-crm/shared"
import { SegmentType, SegmentVisibility } from "@medical-crm/shared"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const {
  segments,
  loading,
  error,
  loadSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  duplicateSegment,
  shareSegment,
  exportSegment,
  clearError,
} = useSegmentation()

// Local reactive data
const activeTab = ref("list")
const showCreateDialog = ref(false)
const showBulkDialog = ref(false)
const showDeleteDialog = ref(false)
const showShareDialog = ref(false)
const editingSegment = ref<Segment | null>(null)
const selectedSegment = ref<Segment | null>(null)
const segmentBuilderRef = ref()
const deleteTargetIds = ref<string[]>([])
const deleteTargetNames = ref<string[]>([])

// Load segments is now handled by the composable

const startCreateSegment = () => {
  editingSegment.value = null
  showCreateDialog.value = true
  activeTab.value = "builder"
}

const viewSegment = (segment: Segment) => {
  selectedSegment.value = segment
  activeTab.value = "analytics"
}

const editSegment = (segment: Segment) => {
  editingSegment.value = segment
  showCreateDialog.value = true
}

const handleDuplicateSegment = async (segment: Segment) => {
  try {
    await duplicateSegment(segment.id)
    try { showSnackbar('Segment dupliqué', 'success') } catch {}
  } catch (error) {
    console.error("Error duplicating segment:", error)
    try { showSnackbar('Erreur lors de la duplication du segment', 'error') } catch {}
  }
}

const handleShareSegment = async (_segment: Segment) => {
  // Placeholder until sharing workflow is implemented
  alert('Partage: fonctionnalité à venir')
}

// Bulk actions handler - removed as not used in template

const handleDeleteSegment = (segment: Segment) => {
  deleteTargetIds.value = [segment.id]
  deleteTargetNames.value = [segment.name]
  showDeleteDialog.value = true
}

const onSegmentSave = async (segmentData: {
  name: string
  type: SegmentType
  criteria: any
}) => {
  try {
    if (editingSegment.value) {
      // Update existing segment
      await updateSegment(editingSegment.value.id, segmentData)
      try { showSnackbar('Segment mis à jour', 'success') } catch {}
    } else {
      // Create new segment
      await createSegment(segmentData)
      try { showSnackbar('Segment créé', 'success') } catch {}
    }

    showCreateDialog.value = false
    editingSegment.value = null
  } catch (error) {
    console.error("Error saving segment:", error)
    try { showSnackbar('Erreur lors de l\'enregistrement du segment', 'error') } catch {}
  }
}

const onBulkActionCompleted = () => {
  showBulkDialog.value = false
  // Refresh data if needed
}

const onSegmentsSelected = (_segmentIds: string[]) => {
  // Handle segments selected for comparison
  // This could trigger analytics or comparison view updates
}

// Confirm delete action
const confirmDelete = async () => {
  try {
    for (const id of deleteTargetIds.value) {
      try {
        await deleteSegment(id)
        try { showSnackbar('Segment supprimé', 'success') } catch {}
      } catch (e) {
        console.error('Delete failed', id, e)
        try { showSnackbar('Suppression impossible pour un segment', 'error') } catch {}
      }
    }
  } finally {
    deleteTargetIds.value = []
    deleteTargetNames.value = []
  }
}

// Handle bulk actions emitted from SavedSegmentsManager
const onBulkAction = async (action: string, segmentIds: string[]) => {
  try {
    if (segmentIds.length === 0) return
    if (action === 'delete') {
      deleteTargetIds.value = [...segmentIds]
      deleteTargetNames.value = segments.value
        .filter(s => segmentIds.includes(s.id))
        .map(s => s.name)
      showDeleteDialog.value = true
    } else if (action === 'share') {
      showShareDialog.value = true
    } else if (action === 'export') {
      for (const id of segmentIds) {
        try {
          await exportSegment(id, 'csv')
          try { showSnackbar('Export CSV lancé', 'success') } catch {}
        } catch (e) {
          console.error('Export failed for segment', id, e)
          try { showSnackbar('Export impossible pour un segment', 'error') } catch {}
        }
      }
    }
  } catch (e) {
    console.error('Bulk action error:', e)
  }
}

// Lifecycle
onMounted(() => {
  loadSegments()
})
</script>

<style scoped>
.segmentation-view {
  padding: 0.5rem;
  min-height: 100vh;
  background: var(--p-surface-50);

  @media (min-width: 768px) {
    padding: 1.5rem;
  }

  @media (max-width: 600px) {
    padding: 0.25rem;
  }
}

.main-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  border: 1px solid var(--p-surface-border);

  @media (max-width: 600px) {
    border-radius: 8px;
    margin-bottom: 1rem;
  }
}

.segmentation-view :deep(.v-card) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  border: 1px solid var(--p-surface-border);
}

.segmentation-view :deep(.v-card-title) {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid var(--p-surface-border);

  @media (max-width: 600px) {
    font-size: 1.25rem;
    padding: 1rem 1rem 0.75rem 1rem;
  }
}

.segmentation-view :deep(.v-card-text) {
  padding: 2rem;

  @media (max-width: 600px) {
    padding: 1rem;
  }
}

.segmentation-view :deep(.v-tabs) {
  background: var(--p-surface-0);
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  @media (max-width: 600px) {
    margin-bottom: 1rem;
    border-radius: 4px;
  }
}

.segmentation-view :deep(.v-tab) {
  font-weight: 500;
  text-transform: none;
  color: var(--p-text-muted-color);
  transition: all 0.2s ease;
}

.segmentation-view :deep(.v-tab--selected) {
  color: var(--p-primary-color);
  background: var(--p-primary-50);
}

.segmentation-view :deep(.v-btn) {
  text-transform: none;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.segmentation-view :deep(.v-btn:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Empty state styling */
.text-center.pa-8 {
  background: var(--p-surface-0);
  border-radius: 12px;
  border: 2px dashed var(--p-surface-border);
  margin: 2rem 0;
  padding: 3rem 2rem !important;
}

.text-center.pa-8 .v-icon {
  opacity: 0.6;
  margin-bottom: 1rem;
}

.text-center.pa-8 .text-h6 {
  color: var(--p-text-color);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.text-center.pa-8 .text-body-1 {
  color: var(--p-text-muted-color);
  max-width: 400px;
  margin: 0 auto 2rem auto;
  line-height: 1.6;
}

/* Dialog styling */
.segmentation-view :deep(.v-dialog .v-card) {
  max-width: 1200px;
  width: 90vw;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .segmentation-view {
    padding: 1rem;
  }

  .segmentation-view :deep(.v-card-title) {
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    font-size: 1.25rem;
  }

  .segmentation-view :deep(.v-card-text) {
    padding: 1.5rem;
  }

  .text-center.pa-8 {
    padding: 2rem 1rem !important;
  }
}

/* Loading state */
.segmentation-view :deep(.v-progress-linear) {
  border-radius: 4px;
}

/* Error state */
.error-banner {
  background: var(--p-red-50);
  color: var(--p-red-600);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid var(--p-red-500);
}
</style>
