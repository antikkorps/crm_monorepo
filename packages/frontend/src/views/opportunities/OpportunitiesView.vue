<template>
  <AppLayout>
    <div class="opportunities-view">
      <!-- Header -->
      <div class="page-header mb-6">
        <div class="d-flex flex-column flex-md-row align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold">{{ $t("opportunities.title") }}</h1>
            <p class="text-body-1 text-medium-emphasis">
              {{ $t("opportunities.description") }}
            </p>
          </div>
        </div>
        <div class="page-actions mt-4 mt-md-4">
          <v-btn
            prepend-icon="mdi-download"
            variant="outlined"
            class="mr-2"
            :loading="exporting"
            @click="exportOpportunities"
          >
            {{ $t("opportunities.export") }}
          </v-btn>
          <v-btn
            prepend-icon="mdi-account-group"
            variant="outlined"
            class="mr-2"
            @click="toggleCollaboratorStats"
          >
            {{ $t("opportunities.statsByCollaborator.button") }}
          </v-btn>
          <v-btn
            id="tour-opportunities-forecast"
            prepend-icon="mdi-chart-line"
            variant="outlined"
            class="mr-2"
            @click="showForecast = !showForecast"
          >
            {{ $t("opportunities.forecast.title") }}
          </v-btn>
          <v-btn
            id="tour-opportunities-add"
            prepend-icon="mdi-plus"
            color="primary"
            @click="openCreateDialog"
          >
            {{ $t("opportunities.newOpportunity") }}
          </v-btn>
        </div>
      </div>

      <!-- Stats Cards -->
      <v-row id="tour-opportunities-stats" class="mb-6">
        <v-col cols="12" md="6" lg="3">
          <v-card color="primary" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ activeOpportunities.length }}</div>
              <div class="text-body-2">{{ $t("opportunities.stats.active") }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="3">
          <v-card color="success" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ formatCurrency(totalValue) }}</div>
              <div class="text-body-2">{{ $t("opportunities.stats.totalValue") }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="3">
          <v-card color="info" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">
                {{ formatCurrency(weightedValue) }}
              </div>
              <div class="text-body-2">{{ $t("opportunities.stats.weightedValue") }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6" lg="3">
          <v-card color="warning" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">
                {{ overdueOpportunities.length }}
              </div>
              <div class="text-body-2">{{ $t("opportunities.stats.overdue") }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Stats by Collaborator Panel -->
      <v-expand-transition>
        <v-card v-if="showCollaboratorStats" class="mb-6">
          <v-card-title class="d-flex justify-space-between align-center">
            <div>
              <v-icon class="mr-2">mdi-account-group</v-icon>
              {{ $t("opportunities.statsByCollaborator.title") }}
            </div>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              @click="showCollaboratorStats = false"
            />
          </v-card-title>
          <v-card-text>
            <v-table density="compact" v-if="statsByUser.length > 0">
              <thead>
                <tr>
                  <th>{{ $t("opportunities.statsByCollaborator.collaborator") }}</th>
                  <th class="text-right">
                    {{ $t("opportunities.statsByCollaborator.count") }}
                  </th>
                  <th class="text-right">
                    {{ $t("opportunities.statsByCollaborator.totalValue") }}
                  </th>
                  <th class="text-right">
                    {{ $t("opportunities.statsByCollaborator.weightedValue") }}
                  </th>
                  <th class="text-right">
                    {{ $t("opportunities.statsByCollaborator.overdue") }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in statsByUser" :key="stat.userId">
                  <td>
                    <div class="d-flex align-center">
                      <v-avatar
                        size="28"
                        :color="getAvatarColor(stat.userEmail)"
                        class="mr-2"
                      >
                        <span class="text-caption">{{
                          getInitials(
                            stat.userName.split(" ")[0],
                            stat.userName.split(" ")[1],
                          )
                        }}</span>
                      </v-avatar>
                      {{ stat.userName }}
                    </div>
                  </td>
                  <td class="text-right">{{ stat.count }}</td>
                  <td class="text-right">{{ formatCurrency(stat.totalValue) }}</td>
                  <td class="text-right">{{ formatCurrency(stat.weightedValue) }}</td>
                  <td class="text-right">
                    <v-chip v-if="stat.overdueCount > 0" size="x-small" color="error">
                      {{ stat.overdueCount }}
                    </v-chip>
                    <span v-else class="text-medium-emphasis">0</span>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-center py-4 text-medium-emphasis">
              {{ $t("opportunities.statsByCollaborator.noData") }}
            </div>
          </v-card-text>
        </v-card>
      </v-expand-transition>

      <!-- Forecast Panel -->
      <v-expand-transition>
        <v-card v-if="showForecast" class="mb-6">
          <v-card-title>
            <v-icon class="mr-2">mdi-chart-line</v-icon>
            {{ $t("opportunities.forecastTitle") }}
          </v-card-title>
          <v-card-text v-if="forecast">
            <v-row>
              <v-col cols="12" md="4">
                <div class="text-h6">{{ forecast.summary.totalOpportunities }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ $t("opportunities.forecast.opportunities") }}
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="text-h6">
                  {{ formatCurrency(forecast.summary.totalValue) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ $t("opportunities.forecast.totalValue") }}
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="text-h6">
                  {{ formatCurrency(forecast.summary.weightedValue) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ $t("opportunities.forecast.weightedValue") }}
                </div>
              </v-col>
            </v-row>
            <v-divider class="my-4"></v-divider>
            <div class="text-subtitle-2 mb-2">
              {{ $t("opportunities.forecast.byMonth") }}
            </div>
            <v-row>
              <v-col
                v-for="month in forecast.monthlyForecast"
                :key="month.month"
                cols="12"
                sm="6"
                md="4"
              >
                <v-card variant="outlined">
                  <v-card-text>
                    <div class="text-overline">{{ formatMonth(month.month) }}</div>
                    <div class="text-h6">{{ formatCurrency(month.weightedValue) }}</div>
                    <div class="text-caption">
                      {{ month.count }} {{ $t("opportunities.unit") }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-text v-else class="text-center py-8">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="mt-4">{{ $t("opportunities.loading.forecast") }}</p>
          </v-card-text>
        </v-card>
      </v-expand-transition>

      <!-- Kanban Pipeline -->
      <div
        id="tour-opportunities-pipeline"
        v-if="loading && pipeline.length === 0"
        class="text-center py-12"
      >
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4 text-body-1">{{ $t("opportunities.loading.pipeline") }}</p>
      </div>

      <div v-else-if="error" class="text-center py-12">
        <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
        <p class="text-h6 mt-4">{{ error }}</p>
        <v-btn prepend-icon="mdi-refresh" @click="loadPipeline" class="mt-4">{{
          $t("common.retry")
        }}</v-btn>
      </div>

      <div v-else id="tour-opportunities-pipeline">
        <!-- Active pipeline stages -->
        <v-row>
          <v-col
            v-for="stage in pipeline.filter(s => !isClosedStage(s.stage))"
            :key="stage.stage"
            cols="12"
            md="6"
            lg="3"
            class="pipeline-column"
          >
            <v-card class="fill-height">
              <v-card-title
                class="d-flex align-center justify-space-between"
                :style="{ backgroundColor: getStageColor(stage.stage) + '22' }"
              >
                <div>
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ getStageLabel(stage.stage) }}
                  </div>
                  <div class="text-caption">
                    {{ stage.count }} {{ $t("opportunities.unit") }}
                  </div>
                </div>
                <v-chip :color="getStageColor(stage.stage)" size="small">
                  {{ formatCurrency(stage.totalValue) }}
                </v-chip>
              </v-card-title>

              <v-divider></v-divider>

              <v-card-text
                class="pa-2 pipeline-card-content"
                :class="{ 'drag-active': isDragging }"
              >
                <draggable
                  :list="stage.opportunities"
                  group="opportunities"
                  item-key="id"
                  class="draggable-list"
                  ghost-class="opportunity-ghost"
                  drag-class="opportunity-drag"
                  :animation="150"
                  @start="onDragStart"
                  @end="onDragEnd"
                  @change="handleDragChange($event, stage.stage)"
                >
                  <template #item="{ element }">
                    <v-card
                      class="opportunity-card"
                      variant="outlined"
                      @click.stop="openEditDialog(element)"
                    >
                      <v-card-text class="pa-3">
                        <div class="d-flex justify-space-between align-start mb-2">
                          <div class="text-subtitle-2 font-weight-bold flex-grow-1">
                            {{ element.name }}
                          </div>
                          <v-chip
                            size="x-small"
                            :color="getProbabilityColor(element.probability)"
                          >
                            {{ element.probability }}%
                          </v-chip>
                        </div>

                        <div
                          v-if="element.institution"
                          class="text-caption text-medium-emphasis mb-1"
                        >
                          <v-icon size="small" class="mr-1">mdi-domain</v-icon>
                          {{ element.institution.name }}
                        </div>

                        <div class="text-h6 mb-2">
                          {{ formatCurrency(element.value) }}
                        </div>

                        <div class="d-flex justify-space-between align-center">
                          <div class="text-caption">
                            <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                            {{ formatDate(element.expectedCloseDate) }}
                          </div>
                          <v-avatar
                            v-if="element.assignedUser"
                            size="24"
                            :color="getAvatarColor(element.assignedUser.email)"
                          >
                            <span class="text-caption">
                              {{
                                getInitials(
                                  element.assignedUser.firstName,
                                  element.assignedUser.lastName,
                                )
                              }}
                            </span>
                          </v-avatar>
                        </div>

                        <div v-if="isOverdue(element)" class="mt-2">
                          <v-chip size="x-small" color="error" prepend-icon="mdi-alert">{{
                            $t("opportunities.overdue")
                          }}</v-chip>
                        </div>

                        <!-- Quick actions -->
                        <div class="quick-actions mt-2 pt-2">
                          <v-btn
                            size="x-small"
                            color="success"
                            variant="tonal"
                            prepend-icon="mdi-trophy"
                            @click.stop="markAsWon(element)"
                            :loading="closingOpportunityId === element.id"
                          >
                            {{ $t("opportunities.actions.won") }}
                          </v-btn>
                          <v-btn
                            size="x-small"
                            color="error"
                            variant="tonal"
                            prepend-icon="mdi-close-circle"
                            class="ml-2"
                            @click.stop="markAsLost(element)"
                            :loading="closingOpportunityId === element.id"
                          >
                            {{ $t("opportunities.actions.lost") }}
                          </v-btn>
                        </div>
                      </v-card-text>
                    </v-card>
                  </template>
                </draggable>
                <!-- Empty state overlay -->
                <div v-if="stage.opportunities.length === 0" class="empty-state-overlay">
                  <v-icon size="48" color="grey-lighten-2">mdi-inbox-outline</v-icon>
                  <p class="mt-2 text-medium-emphasis">{{ $t("opportunities.empty") }}</p>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Closed stages (Gagné / Perdu) -->
        <v-row class="mt-4">
          <v-col cols="12">
            <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between mb-2 ga-2">
              <div class="text-subtitle-2 text-medium-emphasis">
                <v-icon size="small" class="mr-1">mdi-archive-outline</v-icon>
                {{ $t("opportunities.closedStages") }}
                <span v-if="!showAllArchived">({{ $t("opportunities.last30Days") }})</span>
              </div>
              <v-switch
                v-model="showAllArchived"
                :label="$t('opportunities.showAllArchived')"
                density="compact"
                hide-details
                color="primary"
                class="flex-grow-0"
                @update:model-value="loadPipeline"
              />
            </div>
          </v-col>
          <v-col
            v-for="stage in pipeline.filter(s => isClosedStage(s.stage))"
            :key="stage.stage"
            cols="12"
            md="6"
            class="pipeline-column"
          >
            <v-card
              class="fill-height closed-stage-card"
              :class="stage.stage === 'closed_won' ? 'closed-won' : 'closed-lost'"
            >
              <v-card-title
                class="d-flex align-center justify-space-between"
                :style="{ backgroundColor: getStageColor(stage.stage) + '22' }"
              >
                <div class="d-flex align-center">
                  <v-icon
                    :icon="stage.stage === 'closed_won' ? 'mdi-trophy' : 'mdi-close-circle'"
                    :color="getStageColor(stage.stage)"
                    class="mr-2"
                  />
                  <div>
                    <div class="text-subtitle-1 font-weight-bold">
                      {{ getStageLabel(stage.stage) }}
                    </div>
                    <div class="text-caption">
                      {{ stage.count }} {{ $t("opportunities.unit") }}
                    </div>
                  </div>
                </div>
                <v-chip :color="getStageColor(stage.stage)" size="small">
                  {{ formatCurrency(stage.totalValue) }}
                </v-chip>
              </v-card-title>

              <v-divider></v-divider>

              <v-card-text class="pa-2 pipeline-card-content">
                <draggable
                  :list="stage.opportunities"
                  group="opportunities"
                  item-key="id"
                  class="draggable-list"
                  ghost-class="opportunity-ghost"
                  :sort="false"
                  :animation="150"
                  @change="handleDragChange($event, stage.stage)"
                >
                  <template #item="{ element }">
                    <v-card
                      class="opportunity-card closed-opportunity"
                      variant="outlined"
                      @click.stop="openEditDialog(element)"
                    >
                      <v-card-text class="pa-3">
                        <div class="d-flex justify-space-between align-start mb-2">
                          <div class="text-subtitle-2 font-weight-bold flex-grow-1">
                            {{ element.name }}
                          </div>
                          <v-chip
                            size="x-small"
                            :color="stage.stage === 'closed_won' ? 'success' : 'error'"
                          >
                            {{ stage.stage === 'closed_won' ? '100%' : '0%' }}
                          </v-chip>
                        </div>

                        <div
                          v-if="element.institution"
                          class="text-caption text-medium-emphasis mb-1"
                        >
                          <v-icon size="small" class="mr-1">mdi-domain</v-icon>
                          {{ element.institution.name }}
                        </div>

                        <div class="text-h6 mb-2">
                          {{ formatCurrency(element.value) }}
                        </div>

                        <div class="d-flex justify-space-between align-center">
                          <div class="text-caption text-medium-emphasis">
                            <v-icon size="small" class="mr-1">mdi-calendar-check</v-icon>
                            {{ formatDate(element.actualCloseDate || element.updatedAt) }}
                          </div>
                          <v-avatar
                            v-if="element.assignedUser"
                            size="24"
                            :color="getAvatarColor(element.assignedUser.email)"
                          >
                            <span class="text-caption">
                              {{
                                getInitials(
                                  element.assignedUser.firstName,
                                  element.assignedUser.lastName,
                                )
                              }}
                            </span>
                          </v-avatar>
                        </div>
                      </v-card-text>
                    </v-card>
                  </template>
                </draggable>
                <!-- Empty state overlay -->
                <div v-if="stage.opportunities.length === 0" class="empty-state-overlay">
                  <v-icon
                    size="48"
                    :color="stage.stage === 'closed_won' ? 'success' : 'error'"
                    class="opacity-30"
                  >
                    {{ stage.stage === 'closed_won' ? 'mdi-trophy-outline' : 'mdi-close-circle-outline' }}
                  </v-icon>
                  <p class="mt-2 text-medium-emphasis">{{ $t("opportunities.empty") }}</p>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Create/Edit Dialog -->
      <v-dialog v-model="dialogVisible" max-width="800" persistent>
        <v-card>
          <v-card-title>
            {{
              editingOpportunity
                ? $t("opportunities.editTitle")
                : $t("opportunities.newOpportunity")
            }}
          </v-card-title>
          <v-card-text>
            <OpportunityForm
              :opportunity="editingOpportunity"
              @submit="handleFormSubmit"
              @cancel="closeDialog"
            />
          </v-card-text>
        </v-card>
      </v-dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import OpportunityForm from "@/components/opportunities/OpportunityForm.vue"
import { ExportApiService } from "@/services/api/export"
import { useOpportunitiesStore } from "@/stores/opportunities"
import type { Opportunity, OpportunityStage } from "@medical-crm/shared"
import { storeToRefs } from "pinia"
import { onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import draggable from "vuedraggable"

const opportunitiesStore = useOpportunitiesStore()
const { t } = useI18n()
const {
  pipeline,
  forecast,
  statsByUser,
  loading,
  error,
  activeOpportunities,
  totalValue,
  weightedValue,
  overdueOpportunities,
} = storeToRefs(opportunitiesStore)

const dialogVisible = ref(false)
const editingOpportunity = ref<Opportunity | null>(null)
const showForecast = ref(false)
const showCollaboratorStats = ref(false)
const exporting = ref(false)
const isDragging = ref(false)
const closingOpportunityId = ref<string | null>(null)
const showAllArchived = ref(false)

const loadPipeline = async () => {
  try {
    await opportunitiesStore.fetchPipeline({
      includeArchived: showAllArchived.value,
    })
  } catch (err) {
    console.error("Failed to load pipeline:", err)
  }
}

const loadForecast = async () => {
  if (!showForecast.value) return
  try {
    await opportunitiesStore.fetchForecast({ months: 3 })
  } catch (err) {
    console.error("Failed to load forecast:", err)
  }
}

const toggleCollaboratorStats = async () => {
  showCollaboratorStats.value = !showCollaboratorStats.value
  if (showCollaboratorStats.value && statsByUser.value.length === 0) {
    try {
      await opportunitiesStore.fetchStatsByUser()
    } catch (err) {
      console.error("Failed to load stats by user:", err)
    }
  }
}

const exportOpportunities = async () => {
  exporting.value = true
  try {
    const blob = await ExportApiService.exportOpportunities({
      format: "xlsx",
      includeHeaders: true,
    })
    const filename = ExportApiService.generateFilename("opportunities", "xlsx")
    ExportApiService.downloadBlob(blob, filename)
  } catch (err) {
    console.error("Failed to export opportunities:", err)
  } finally {
    exporting.value = false
  }
}

const openCreateDialog = () => {
  editingOpportunity.value = null
  dialogVisible.value = true
}

const openEditDialog = (opportunity: Opportunity) => {
  editingOpportunity.value = opportunity
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
  editingOpportunity.value = null
}

const handleFormSubmit = async () => {
  closeDialog()
  await loadPipeline()
}

const onDragStart = () => {
  isDragging.value = true
}

const onDragEnd = () => {
  isDragging.value = false
}

const handleDragChange = async (event: any, targetStage: OpportunityStage) => {
  if (event.added) {
    const opportunity = event.added.element
    try {
      await opportunitiesStore.updateStage(opportunity.id, targetStage)
    } catch (err) {
      console.error("Failed to update stage:", err)
      // Reload pipeline on error to reset
      await loadPipeline()
    }
  }
}

const markAsWon = async (opportunity: Opportunity) => {
  closingOpportunityId.value = opportunity.id
  try {
    await opportunitiesStore.updateStage(opportunity.id, "closed_won" as OpportunityStage)
  } catch (err) {
    console.error("Failed to mark as won:", err)
  } finally {
    closingOpportunityId.value = null
  }
}

const markAsLost = async (opportunity: Opportunity) => {
  closingOpportunityId.value = opportunity.id
  try {
    await opportunitiesStore.updateStage(opportunity.id, "closed_lost" as OpportunityStage)
  } catch (err) {
    console.error("Failed to mark as lost:", err)
  } finally {
    closingOpportunityId.value = null
  }
}

const getStageLabel = (stage: OpportunityStage): string => {
  const labelKeys: Record<OpportunityStage, string> = {
    prospecting: "opportunities.stages.prospecting",
    qualification: "opportunities.stages.qualification",
    proposal: "opportunities.stages.proposal",
    negotiation: "opportunities.stages.negotiation",
    closed_won: "opportunities.stages.closedWon",
    closed_lost: "opportunities.stages.closedLost",
  }
  return t(labelKeys[stage] || stage)
}

const getStageColor = (stage: OpportunityStage): string => {
  const colors: Record<OpportunityStage, string> = {
    prospecting: "#2196F3",
    qualification: "#4CAF50",
    proposal: "#FF9800",
    negotiation: "#9C27B0",
    closed_won: "#2E7D32",
    closed_lost: "#C62828",
  }
  return colors[stage] || "#757575"
}

const isClosedStage = (stage: OpportunityStage): boolean => {
  return stage === "closed_won" || stage === "closed_lost"
}

const getProbabilityColor = (probability: number): string => {
  if (probability >= 75) return "success"
  if (probability >= 50) return "info"
  if (probability >= 25) return "warning"
  return "error"
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatDate = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const formatMonth = (month: string): string => {
  const [year, m] = month.split("-")
  const date = new Date(parseInt(year), parseInt(m) - 1)
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
}

const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.charAt(0) || ""
  const last = lastName?.charAt(0) || ""
  return (first + last).toUpperCase()
}

const getAvatarColor = (email?: string): string => {
  if (!email) return "grey"
  const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colors = ["primary", "secondary", "success", "info", "warning", "error"]
  return colors[hash % colors.length]
}

const isOverdue = (opportunity: Opportunity): boolean => {
  if (opportunity.status !== "active") return false
  const expected = new Date(opportunity.expectedCloseDate)
  return expected < new Date()
}

onMounted(async () => {
  // Load both pipeline and opportunities in parallel
  // Pipeline for kanban display, opportunities for stats cards
  await Promise.all([
    loadPipeline(),
    opportunitiesStore.fetchOpportunities()
  ])
})

// Watch showForecast to load data when panel opens
watch(showForecast, (newValue) => {
  if (newValue) {
    loadForecast()
  }
})

// Watch showAllArchived to reload closed stages data
watch(showAllArchived, () => {
  loadPipeline()
})
</script>

<style scoped>
.opportunities-view {
  padding: 1rem;
  max-width: 100%;
  overflow-x: hidden;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Pipeline card content - relative for empty state overlay */
.pipeline-card-content {
  min-height: 250px;
  position: relative;
  transition: background-color 0.2s ease;
  border-radius: 0 0 4px 4px;
}

/* Visual feedback when dragging is active */
.pipeline-card-content.drag-active {
  background-color: rgba(var(--v-theme-primary), 0.03);
}

/* Draggable list - fills the entire card content area */
.draggable-list {
  min-height: 230px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* Prevent text selection while dragging */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Opportunity cards */
.opportunity-card {
  cursor: grab;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  /* Prevent text selection */
  user-select: none;
  -webkit-user-select: none;
}

.opportunity-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.opportunity-card:active {
  cursor: grabbing;
}

/* Element being dragged */
.opportunity-drag {
  opacity: 0.9;
  transform: rotate(1deg) scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  cursor: grabbing;
}

/* Ghost element - placeholder showing where item will drop */
.opportunity-ghost {
  opacity: 0.5;
  background: rgba(var(--v-theme-primary), 0.15) !important;
  border: 2px dashed rgb(var(--v-theme-primary)) !important;
  border-radius: 8px;
}

.opportunity-ghost > * {
  opacity: 0;
}

/* Empty state overlay - doesn't block drag interactions */
.empty-state-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
  z-index: 0;
}

/* Closed stage cards */
.closed-stage-card {
  border-left: 4px solid;
}

.closed-stage-card.closed-won {
  border-left-color: #2E7D32;
}

.closed-stage-card.closed-lost {
  border-left-color: #C62828;
}

.closed-opportunity {
  opacity: 0.85;
  cursor: pointer !important;
}

.closed-opportunity:hover {
  opacity: 1;
}

/* Quick actions - visible on hover */
.quick-actions {
  display: flex;
  gap: 8px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  opacity: 0;
  max-height: 0;
  overflow: hidden;
  transition: all 0.2s ease;
}

.opportunity-card:hover .quick-actions {
  opacity: 1;
  max-height: 50px;
  padding-top: 8px;
}

/* Mobile first styles */
@media (max-width: 599px) {
  .opportunities-view {
    padding: 0.75rem;
  }

  .page-actions {
    width: 100%;
  }

  .page-actions .v-btn {
    flex: 1 1 calc(50% - 0.25rem);
    min-width: 0;
  }
}

/* Tablet and up */
@media (min-width: 960px) {
  .opportunities-view {
    padding: 1.5rem;
  }
}

/* Large screens - 4 columns */
@media (min-width: 1280px) {
  .pipeline-card-content {
    max-height: 600px;
    overflow-y: auto;
  }
}
</style>
