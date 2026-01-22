<template>
  <div class="lead-score-badge">
    <v-tooltip location="bottom">
      <template v-slot:activator="{ props: tooltipProps }">
        <v-card
          v-bind="tooltipProps"
          :color="leadScore?.color || '#9E9E9E'"
          variant="tonal"
          class="lead-score-card"
          :class="{ 'lead-score-loading': loading }"
          @click="showDetails = !showDetails"
        >
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">{{ t('leadScore.title') }}</div>
                <div class="text-h4 font-weight-bold">
                  {{ loading ? "..." : error ? t('leadScore.noData') : leadScore?.score || 0 }}
                  <span class="text-h6" v-if="!error">/100</span>
                </div>
                <v-chip
                  v-if="!loading && leadScore"
                  :color="leadScore.color"
                  variant="flat"
                  size="x-small"
                  class="mt-1"
                >
                  {{ formatLevel(leadScore.level) }}
                </v-chip>
              </div>
              <div>
                <v-progress-circular
                  v-if="!loading && leadScore"
                  :model-value="leadScore.score"
                  :color="leadScore.color"
                  :size="80"
                  :width="8"
                >
                  <v-icon size="32">{{ getLevelIcon(leadScore.level) }}</v-icon>
                </v-progress-circular>
                <v-progress-circular v-else-if="loading" indeterminate color="grey" :size="80" />
                <v-icon v-else-if="error" size="80" color="error">mdi-alert-circle-outline</v-icon>
                <v-icon v-else size="80" color="grey">mdi-help-circle-outline</v-icon>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </template>
      <span>{{ t('leadScore.clickForDetails') }}</span>
    </v-tooltip>

    <!-- Details Dialog -->
    <v-dialog v-model="showDetails" max-width="800">
      <v-card v-if="leadScore">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon :color="leadScore.color" class="mr-2" size="large">
              {{ getLevelIcon(leadScore.level) }}
            </v-icon>
            <span>{{ t('leadScore.detailsTitle') }}</span>
          </div>
          <v-chip :color="leadScore.color" variant="tonal">
            {{ leadScore.score }}/100 - {{ formatLevel(leadScore.level) }}
          </v-chip>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <!-- Score Breakdown -->
          <div class="mb-6">
            <h3 class="text-h6 mb-3">{{ t('leadScore.scoreBreakdown') }}</h3>
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="primary" size="large" class="mb-2">mdi-domain</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.sizeScore }}</div>
                    <div class="text-caption">{{ t('leadScore.factors.size') }} ({{ t('leadScore.factors.sizeMax') }})</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="success" size="large" class="mb-2">mdi-medical-bag</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.specialtyMatchScore }}</div>
                    <div class="text-caption">{{ t('leadScore.factors.specialty') }} ({{ t('leadScore.factors.specialtyMax') }})</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="warning" size="large" class="mb-2">mdi-chart-timeline-variant</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.engagementScore }}</div>
                    <div class="text-caption">{{ t('leadScore.factors.engagement') }} ({{ t('leadScore.factors.engagementMax') }})</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="info" size="large" class="mb-2">mdi-cash-multiple</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.budgetScore }}</div>
                    <div class="text-caption">{{ t('leadScore.factors.budget') }} ({{ t('leadScore.factors.budgetMax') }})</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="purple" size="large" class="mb-2">mdi-clock-fast</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.responseScore }}</div>
                    <div class="text-caption">{{ t('leadScore.factors.response') }} ({{ t('leadScore.factors.responseMax') }})</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <v-divider class="my-4" />

          <!-- Signals -->
          <div v-if="leadScore.signals && leadScore.signals.length > 0" class="mb-6">
            <h3 class="text-h6 mb-3">{{ t('leadScore.signals') }}</h3>
            <v-list>
              <v-list-item
                v-for="(signal, index) in leadScore.signals"
                :key="index"
                density="compact"
              >
                <template v-slot:prepend>
                  <v-icon :color="getSignalColor(signal.type)">
                    {{ getSignalIcon(signal.type) }}
                  </v-icon>
                </template>
                <v-list-item-title>{{ t(`leadScore.signalMessages.${signal.signalKey}`, signal.signalParams || {}) }}</v-list-item-title>
                <template v-slot:append>
                  <v-chip
                    :color="getSignalColor(signal.type)"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ t('leadScore.impact') }}: {{ signal.impact > 0 ? '+' : '' }}{{ signal.impact }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <v-divider class="my-4" v-if="leadScore.recommendations && leadScore.recommendations.length > 0" />

          <!-- Recommendations -->
          <div v-if="leadScore.recommendations && leadScore.recommendations.length > 0">
            <h3 class="text-h6 mb-3">{{ t('leadScore.recommendations') }}</h3>
            <v-list>
              <v-list-item
                v-for="(recommendation, index) in leadScore.recommendations"
                :key="index"
                density="compact"
              >
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-lightbulb-outline</v-icon>
                </template>
                <v-list-item-title>{{ t(`leadScore.recommendationMessages.${recommendation.key}`, recommendation.params || {}) }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDetails = false">{{ t('leadScore.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useI18n } from "vue-i18n"
import { analyticsApi } from "@/services/api"
import type { LeadScore } from "@/services/api/analytics"

const { t } = useI18n()

const props = defineProps<{
  institutionId: string
}>()

const leadScore = ref<LeadScore & { color: string } | null>(null)
const loading = ref(false)
const showDetails = ref(false)
const error = ref(false)
const loadedOnce = ref(false)

const loadLeadScore = async () => {
  // Only load once per component mount, prevent duplicate calls
  if (!props.institutionId || loading.value || loadedOnce.value) {
    return
  }

  loading.value = true
  loadedOnce.value = true
  error.value = false

  try {
    const response = await analyticsApi.getLeadScore(props.institutionId)
    // apiClient (fetch) returns JSON directly: { success, data }
    const data = response.data

    // Check if data exists before accessing properties
    if (!data) {
      console.warn("No lead score data returned from API")
      leadScore.value = null
      return
    }

    // Add color based on level
    leadScore.value = {
      ...data,
      color: getLevelColor(data.level),
    }
  } catch (err) {
    console.error("Failed to load lead score:", err)
    error.value = true
  } finally {
    loading.value = false
  }
}

const levelIcons: Record<"hot" | "warm" | "cold", string> = {
  hot: "🔥",
  warm: "🌡️",
  cold: "❄️",
}

const formatLevel = (level: "hot" | "warm" | "cold"): string => {
  const icon = levelIcons[level] || ""
  return `${icon} ${t(`leadScore.levels.${level}`)}`
}

const getLevelIcon = (level: "hot" | "warm" | "cold"): string => {
  const icons: Record<"hot" | "warm" | "cold", string> = {
    hot: "mdi-fire",
    warm: "mdi-thermometer",
    cold: "mdi-snowflake",
  }
  return icons[level] || "mdi-help-circle"
}

const getLevelColor = (level: "hot" | "warm" | "cold"): string => {
  const colors: Record<"hot" | "warm" | "cold", string> = {
    hot: "#EF5350", // Red
    warm: "#FFA726", // Orange
    cold: "#42A5F5", // Blue
  }
  return colors[level] || "#9E9E9E"
}

const getSignalColor = (type: "positive" | "negative" | "neutral"): string => {
  const colors: Record<"positive" | "negative" | "neutral", string> = {
    positive: "success",
    negative: "error",
    neutral: "info",
  }
  return colors[type] || "grey"
}

const getSignalIcon = (type: "positive" | "negative" | "neutral"): string => {
  const icons: Record<"positive" | "negative" | "neutral", string> = {
    positive: "mdi-arrow-up-circle",
    negative: "mdi-arrow-down-circle",
    neutral: "mdi-minus-circle",
  }
  return icons[type] || "mdi-help-circle"
}

onMounted(() => {
  loadLeadScore()
})
</script>

<style scoped>
.lead-score-badge {
  max-width: 300px;
}

.lead-score-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.lead-score-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.lead-score-loading {
  opacity: 0.6;
}
</style>
