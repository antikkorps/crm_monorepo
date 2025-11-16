<template>
  <AppLayout>
    <div class="opportunities-view">
      <!-- Header -->
      <div class="page-header mb-6">
        <div class="d-flex flex-column flex-md-row align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-bold">{{ $t('opportunities.title') }}</h1>
            <p class="text-body-1 text-medium-emphasis">{{ $t('opportunities.description') }}</p>
          </div>
          <div class="page-actions mt-4 mt-md-0">
            <v-btn
              prepend-icon="mdi-chart-line"
              variant="outlined"
              class="mr-2"
              @click="showForecast = !showForecast"
            >
              {{ $t('opportunities.forecast') }}
            </v-btn>
            <v-btn prepend-icon="mdi-plus" color="primary" @click="openCreateDialog">
              {{ $t('opportunities.newOpportunity') }}
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <v-row class="mb-6">
        <v-col cols="12" sm="6" md="3">
          <v-card color="primary" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{
 activeOpportunities.length }}</div>
              <div class="text-body-2">{{ $t('opportunities.stats.active') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card color="success" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ formatCurrency(totalValue) }}</div>
              <div class="text-body-2">{{ $t('opportunities.stats.totalValue') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card color="info" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ formatCurrency(weightedValue) }}</div>
              <div class="text-body-2">{{ $t('opportunities.stats.weightedValue') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card color="warning" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4 font-weight-bold">{{ overdueOpportunities.length }}</div>
              <div class="text-body-2">{{ $t('opportunities.stats.overdue') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Forecast Panel -->
      <v-expand-transition>
        <v-card v-if="showForecast" class="mb-6">
          <v-card-title>
            <v-icon class="mr-2">mdi-chart-line</v-icon>
            {{ $t('opportunities.forecastTitle') }}
          </v-card-title>
          <v-card-text v-if="forecast">
            <v-row>
              <v-col cols="12" md="4">
                <div class="text-h6">{{ forecast.summary.totalOpportunities }}</div>
                <div class="text-caption text-medium-emphasis">{{ $t('opportunities.forecast.opportunities') }}</div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="text-h6">{{ formatCurrency(forecast.summary.totalValue) }}</div>
                <div class="text-caption text-medium-emphasis">{{ $t('opportunities.forecast.totalValue') }}</div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="text-h6">{{ formatCurrency(forecast.summary.weightedValue) }}</div>
                <div class="text-caption text-medium-emphasis">{{ $t('opportunities.forecast.weightedValue') }}</div>
              </v-col>
            </v-row>
            <v-divider class="my-4"></v-divider>
            <div class="text-subtitle-2 mb-2">{{ $t('opportunities.forecast.byMonth') }}</div>
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
                    <div class="text-caption">{{ month.count }} {{ $t('opportunities.unit') }}</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-text v-else class="text-center py-8">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="mt-4">{{ $t('opportunities.loading.forecast') }}</p>
          </v-card-text>
        </v-card>
      </v-expand-transition>

      <!-- Kanban Pipeline -->
      <div v-if="loading && pipeline.length === 0" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4 text-body-1">{{ $t('opportunities.loading.pipeline') }}</p>
      </div>

      <div v-else-if="error" class="text-center py-12">
        <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
        <p class="text-h6 mt-4">{{ error }}</p>
        <v-btn prepend-icon="mdi-refresh" @click="loadPipeline" class="mt-4">{{ $t('common.retry') }}</v-btn>
      </div>

      <div v-else class="pipeline-kanban">
        <v-row class="pipeline-columns">
          <v-col
            v-for="stage in pipeline"
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
                  <div class="text-subtitle-1 font-weight-bold">{{ getStageLabel(stage.stage) }}</div>
                  <div class="text-caption">{{ stage.count }} {{ $t('opportunities.unit') }}</div>
                </div>
                <v-chip :color="getStageColor(stage.stage)" size="small">
                  {{ formatCurrency(stage.totalValue) }}
                </v-chip>
              </v-card-title>

              <v-divider></v-divider>

              <v-card-text class="pa-2" style="min-height: 400px; max-height: 600px; overflow-y: auto">
                <div
                  v-if="stage.opportunities.length === 0"
                  class="text-center py-8 text-medium-emphasis"
                >
                  <v-icon size="48" color="grey-lighten-2">mdi-inbox-outline</v-icon>
                  <p class="mt-2">{{ $t('opportunities.empty') }}</p>
                </div>

                <draggable
                  v-else
                  :list="stage.opportunities"
                  group="opportunities"
                  item-key="id"
                  class="draggable-list"
                  @change="handleDragChange($event, stage.stage)"
                >
                  <template #item="{ element }">
                    <v-card
                      class="opportunity-card mb-2"
                      variant="outlined"
                      @click="openEditDialog(element)"
                    >
                      <v-card-text class="pa-3">
                        <div class="d-flex justify-space-between align-start mb-2">
                          <div class="text-subtitle-2 font-weight-bold flex-grow-1">
                            {{ element.name }}
                          </div>
                          <v-chip size="x-small" :color="getProbabilityColor(element.probability)">
                            {{ element.probability }}%
                          </v-chip>
                        </div>

                        <div v-if="element.institution" class="text-caption text-medium-emphasis mb-1">
                          <v-icon size="small" class="mr-1">mdi-domain</v-icon>
                          {{ element.institution.name }}
                        </div>

                        <div class="text-h6 mb-2">{{ formatCurrency(element.value) }}</div>

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
                              {{ getInitials(element.assignedUser.firstName, element.assignedUser.lastName) }}
                            </span>
                          </v-avatar>
                        </div>

                        <div v-if="isOverdue(element)" class="mt-2">
                          <v-chip size="x-small" color="error" prepend-icon="mdi-alert">{{ $t('opportunities.overdue') }}</v-chip>
                        </div>
                      </v-card-text>
                    </v-card>
                  </template>
                </draggable>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Create/Edit Dialog -->
      <v-dialog v-model="dialogVisible" max-width="800" persistent>
        <v-card>
          <v-card-title>
            {{ editingOpportunity ? $t('opportunities.editTitle') : $t('opportunities.newOpportunity') }}
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
import { ref, computed, onMounted, watch } from "vue"
import { storeToRefs } from "pinia"
import draggable from "vuedraggable"
import { useI18n } from "vue-i18n"
import AppLayout from "@/components/layout/AppLayout.vue"
import OpportunityForm from "@/components/opportunities/OpportunityForm.vue"
import { useOpportunitiesStore } from "@/stores/opportunities"
import type { Opportunity, OpportunityStage } from "@medical-crm/shared"

const opportunitiesStore = useOpportunitiesStore()
const { t } = useI18n()
const {
  pipeline,
  forecast,
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

const loadPipeline = async () => {
  try {
    await opportunitiesStore.fetchPipeline()
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
    closed_won: "#4CAF50",
    closed_lost: "#F44336",
  }
  return colors[stage] || "#757575"
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
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
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
  await loadPipeline()
})

// Watch showForecast to load data when panel opens
watch(showForecast, (newValue) => {
  if (newValue) {
    loadForecast()
  }
})
</script>

<style scoped>
.opportunities-view {
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-actions {
  display: flex;
  gap: 0.75rem;
}

.pipeline-kanban {
  overflow-x: auto;
}

.pipeline-columns {
  min-width: 800px;
}

.pipeline-column {
  min-width: 300px;
}

.opportunity-card {
  cursor: pointer;
  transition: all 0.2s;
}

.opportunity-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.draggable-list {
  min-height: 50px;
}

@media (max-width: 768px) {
  .opportunities-view {
    padding: 1rem;
  }

  .page-actions {
    width: 100%;
    flex-direction: column;
  }

  .pipeline-column {
    min-width: 100%;
  }
}
</style>
