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
                <div class="text-caption text-medium-emphasis">Lead Score</div>
                <div class="text-h4 font-weight-bold">
                  {{ loading ? "..." : leadScore?.score || 0 }}
                  <span class="text-h6">/100</span>
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
                <v-progress-circular v-else indeterminate color="grey" :size="80" />
              </div>
            </div>
          </v-card-text>
        </v-card>
      </template>
      <span>Cliquez pour plus de détails</span>
    </v-tooltip>

    <!-- Details Dialog -->
    <v-dialog v-model="showDetails" max-width="800">
      <v-card v-if="leadScore">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon :color="leadScore.color" class="mr-2" size="large">
              {{ getLevelIcon(leadScore.level) }}
            </v-icon>
            <span>Détails du Lead Score</span>
          </div>
          <v-chip :color="leadScore.color" variant="tonal">
            {{ leadScore.score }}/100 - {{ formatLevel(leadScore.level) }}
          </v-chip>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <!-- Score Breakdown -->
          <div class="mb-6">
            <h3 class="text-h6 mb-3">Répartition du score</h3>
            <v-row>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="primary" size="large" class="mb-2">mdi-domain</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.sizeScore }}</div>
                    <div class="text-caption">Taille (20)</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="success" size="large" class="mb-2">mdi-medical-bag</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.specialtyMatchScore }}</div>
                    <div class="text-caption">Spécialité (20)</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="warning" size="large" class="mb-2">mdi-chart-timeline-variant</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.engagementScore }}</div>
                    <div class="text-caption">Engagement (30)</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="info" size="large" class="mb-2">mdi-cash-multiple</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.budgetScore }}</div>
                    <div class="text-caption">Budget (20)</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="purple" size="large" class="mb-2">mdi-clock-fast</v-icon>
                    <div class="text-h5 font-weight-bold">{{ leadScore.factors.responseScore }}</div>
                    <div class="text-caption">Réactivité (10)</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <v-divider class="my-4" />

          <!-- Signals -->
          <div v-if="leadScore.signals && leadScore.signals.length > 0" class="mb-6">
            <h3 class="text-h6 mb-3">Signaux détectés</h3>
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
                <v-list-item-title>{{ signal.signal }}</v-list-item-title>
                <template v-slot:append>
                  <v-chip
                    :color="getSignalColor(signal.type)"
                    size="x-small"
                    variant="tonal"
                  >
                    Impact: {{ signal.impact > 0 ? '+' : '' }}{{ signal.impact }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <v-divider class="my-4" v-if="leadScore.recommendations && leadScore.recommendations.length > 0" />

          <!-- Recommendations -->
          <div v-if="leadScore.recommendations && leadScore.recommendations.length > 0">
            <h3 class="text-h6 mb-3">Recommandations</h3>
            <v-list>
              <v-list-item
                v-for="(recommendation, index) in leadScore.recommendations"
                :key="index"
                density="compact"
              >
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-lightbulb-outline</v-icon>
                </template>
                <v-list-item-title>{{ recommendation }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDetails = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { analyticsApi } from "@/services/api"
import type { LeadScore } from "@/services/api/analytics"

const props = defineProps<{
  institutionId: string
}>()

const leadScore = ref<LeadScore & { color: string } | null>(null)
const loading = ref(false)
const showDetails = ref(false)

const loadLeadScore = async () => {
  loading.value = true

  try {
    const response = await analyticsApi.getLeadScore(props.institutionId)
    const data = response.data.data

    // Add color based on level
    leadScore.value = {
      ...data,
      color: getLevelColor(data.level),
    }
  } catch (err: any) {
    console.error("Failed to load lead score:", err)
  } finally {
    loading.value = false
  }
}

const formatLevel = (level: "hot" | "warm" | "cold"): string => {
  const labels: Record<"hot" | "warm" | "cold", string> = {
    hot: "🔥 Chaud",
    warm: "🌡️ Tiède",
    cold: "❄️ Froid",
  }
  return labels[level] || level
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
