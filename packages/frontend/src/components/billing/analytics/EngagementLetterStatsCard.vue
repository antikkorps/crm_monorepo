<template>
  <v-card elevation="2" class="engagement-letter-stats">
    <v-card-title class="d-flex align-center">
      <v-icon icon="mdi-file-sign" class="mr-2" color="indigo" />
      {{ t("billingAnalytics.engagementLetters.title") }}
      <v-spacer />
      <v-btn
        icon="mdi-refresh"
        size="small"
        variant="text"
        @click="loadStats"
        :loading="loading"
      />
    </v-card-title>

    <v-card-text>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <v-progress-circular indeterminate color="indigo" />
      </div>

      <!-- Error State -->
      <v-alert v-else-if="error" type="error" variant="tonal" class="mb-0">
        {{ error }}
      </v-alert>

      <!-- Stats Content -->
      <div v-else-if="stats">
        <!-- Summary KPIs -->
        <v-row class="mb-4">
          <v-col cols="6" sm="3">
            <div class="stat-item">
              <div class="stat-value text-h5 font-weight-bold text-indigo">
                {{ stats.total }}
              </div>
              <div class="stat-label text-caption text-medium-emphasis">
                {{ t("billingAnalytics.engagementLetters.total") }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="stat-item">
              <div class="stat-value text-h5 font-weight-bold text-success">
                {{ stats.byStatus?.accepted || 0 }}
              </div>
              <div class="stat-label text-caption text-medium-emphasis">
                {{ t("billingAnalytics.engagementLetters.accepted") }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="stat-item">
              <div class="stat-value text-h5 font-weight-bold text-info">
                {{ stats.byStatus?.sent || 0 }}
              </div>
              <div class="stat-label text-caption text-medium-emphasis">
                {{ t("billingAnalytics.engagementLetters.pending") }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="stat-item">
              <div class="stat-value text-h5 font-weight-bold">
                {{ acceptanceRateFormatted }}
              </div>
              <div class="stat-label text-caption text-medium-emphasis">
                {{ t("billingAnalytics.engagementLetters.acceptanceRate") }}
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Total Value -->
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="d-flex justify-space-between align-center">
            <span>{{ t("billingAnalytics.engagementLetters.totalAcceptedValue") }}</span>
            <span class="text-h6 font-weight-bold">{{ formatCurrency(stats.totalValue || 0) }}</span>
          </div>
        </v-alert>

        <!-- Status Breakdown -->
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">
            {{ t("billingAnalytics.engagementLetters.byStatus") }}
          </div>
          <div class="status-chips d-flex flex-wrap ga-2">
            <v-chip
              v-for="(count, status) in stats.byStatus"
              :key="status"
              :color="getStatusColor(status)"
              variant="tonal"
              size="small"
            >
              {{ formatStatus(status) }}: {{ count }}
            </v-chip>
          </div>
        </div>

        <!-- Mission Type Breakdown -->
        <div v-if="stats.byMissionType">
          <div class="text-subtitle-2 mb-2">
            {{ t("billingAnalytics.engagementLetters.byMissionType") }}
          </div>
          <div class="mission-type-chips d-flex flex-wrap ga-2">
            <v-chip
              v-for="(count, missionType) in stats.byMissionType"
              :key="missionType"
              :color="getMissionTypeColor(missionType)"
              variant="outlined"
              size="small"
            >
              {{ formatMissionType(missionType) }}: {{ count }}
            </v-chip>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-4 text-medium-emphasis">
        {{ t("billingAnalytics.engagementLetters.noData") }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { engagementLettersApi } from "@/services/api/engagement-letters"
import type { EngagementLetterStatistics } from "@medical-crm/shared"

const { t } = useI18n()

const loading = ref(false)
const error = ref<string | null>(null)
const stats = ref<EngagementLetterStatistics | null>(null)

const acceptanceRateFormatted = computed(() => {
  if (!stats.value?.acceptanceRate) return "N/A"
  return `${stats.value.acceptanceRate.toFixed(1)}%`
})

const loadStats = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await engagementLettersApi.getStatistics()
    if (response.success && response.data) {
      stats.value = response.data
    }
  } catch (err: any) {
    console.error("Failed to load engagement letter stats:", err)
    error.value = err.message || "Erreur lors du chargement des statistiques"
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: "grey",
    sent: "info",
    accepted: "success",
    rejected: "error",
    cancelled: "grey-darken-1",
    completed: "teal",
  }
  return colors[status] || "grey"
}

const formatStatus = (status: string): string => {
  return t(`engagementLetters.status.${status}`) || status
}

const getMissionTypeColor = (missionType: string): string => {
  const colors: Record<string, string> = {
    audit: "purple",
    conseil: "blue",
    formation: "orange",
    autre: "grey",
  }
  return colors[missionType] || "grey"
}

const formatMissionType = (missionType: string): string => {
  return t(`engagementLetters.missionType.${missionType}`) || missionType
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.engagement-letter-stats {
  height: 100%;
}

.stat-item {
  text-align: center;
  padding: 0.5rem;
}

.stat-value {
  line-height: 1.2;
}

.stat-label {
  line-height: 1.4;
}

@media (max-width: 600px) {
  .stat-value {
    font-size: 1.25rem !important;
  }
}
</style>
