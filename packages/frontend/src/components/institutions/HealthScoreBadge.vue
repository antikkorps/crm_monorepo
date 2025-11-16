<template>
  <div class="health-score-badge">
    <v-tooltip location="bottom">
      <template v-slot:activator="{ props: tooltipProps }">
        <v-card
          v-bind="tooltipProps"
          :color="healthScore?.color || '#9E9E9E'"
          variant="tonal"
          class="health-score-card"
          :class="{ 'health-score-loading': loading }"
          @click="showDetails = !showDetails"
        >
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-caption text-medium-emphasis">Santé Client</div>
                <div class="text-h4 font-weight-bold">
                  {{ loading ? "..." : healthScore?.total || 0 }}
                  <span class="text-h6">/100</span>
                </div>
                <v-chip
                  v-if="!loading && healthScore"
                  :color="healthScore.color"
                  variant="flat"
                  size="x-small"
                  class="mt-1"
                >
                  {{ formatLevel(healthScore.level) }}
                </v-chip>
              </div>
              <div>
                <v-progress-circular
                  v-if="!loading && healthScore"
                  :model-value="healthScore.total"
                  :color="healthScore.color"
                  :size="80"
                  :width="8"
                >
                  <v-icon size="32">{{ getLevelIcon(healthScore.level) }}</v-icon>
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
    <v-dialog v-model="showDetails" max-width="700">
      <v-card v-if="healthScore">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon :color="healthScore.color" class="mr-2" size="large">
              {{ getLevelIcon(healthScore.level) }}
            </v-icon>
            <span>Détails du Health Score</span>
          </div>
          <v-chip :color="healthScore.color" variant="tonal">
            {{ healthScore.total }}/100
          </v-chip>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <!-- Score Breakdown -->
          <div class="mb-6">
            <h3 class="text-h6 mb-3">Répartition du score</h3>
            <v-row>
              <v-col cols="12" sm="6" md="3">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="primary" size="large" class="mb-2">mdi-chart-line</v-icon>
                    <div class="text-h5 font-weight-bold">{{ healthScore.activityScore }}</div>
                    <div class="text-caption">Activité (30)</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="success" size="large" class="mb-2">mdi-clock-outline</v-icon>
                    <div class="text-h5 font-weight-bold">{{ healthScore.recencyScore }}</div>
                    <div class="text-caption">Récence (20)</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="warning" size="large" class="mb-2">mdi-currency-eur</v-icon>
                    <div class="text-h5 font-weight-bold">{{ healthScore.revenueScore }}</div>
                    <div class="text-caption">Revenus (30)</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-card variant="outlined">
                  <v-card-text class="text-center pa-3">
                    <v-icon color="info" size="large" class="mb-2">mdi-account-heart</v-icon>
                    <div class="text-h5 font-weight-bold">{{ healthScore.engagementScore }}</div>
                    <div class="text-caption">Engagement (20)</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <v-divider class="my-4" />

          <!-- Factors -->
          <div>
            <h3 class="text-h6 mb-3">Facteurs d'influence</h3>
            <v-list>
              <v-list-item density="compact">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-chart-timeline-variant</v-icon>
                </template>
                <v-list-item-title>Interactions totales</v-list-item-title>
                <v-list-item-subtitle>{{ healthScore.factors.totalInteractions }} interactions</v-list-item-subtitle>
              </v-list-item>

              <v-list-item density="compact">
                <template v-slot:prepend>
                  <v-icon :color="getRecencyColor(healthScore.factors.lastInteractionDays)">
                    mdi-clock-outline
                  </v-icon>
                </template>
                <v-list-item-title>Dernière interaction</v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatLastInteraction(healthScore.factors.lastInteractionDays) }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item density="compact">
                <template v-slot:prepend>
                  <v-icon color="success">mdi-cash-multiple</v-icon>
                </template>
                <v-list-item-title>Lifetime Value (LTV)</v-list-item-title>
                <v-list-item-subtitle>{{ formatCurrency(healthScore.factors.lifetimeValue) }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item density="compact">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-percent</v-icon>
                </template>
                <v-list-item-title>Taux de conversion</v-list-item-title>
                <v-list-item-subtitle>{{ healthScore.factors.conversionRate }}%</v-list-item-subtitle>
              </v-list-item>

              <v-list-item density="compact" v-if="healthScore.factors.overdueAmount > 0">
                <template v-slot:prepend>
                  <v-icon color="error">mdi-alert-circle-outline</v-icon>
                </template>
                <v-list-item-title>Montant en retard</v-list-item-title>
                <v-list-item-subtitle>{{ formatCurrency(healthScore.factors.overdueAmount) }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item density="compact">
                <template v-slot:prepend>
                  <v-icon :color="healthScore.factors.pendingTasks > 5 ? 'warning' : 'success'">
                    mdi-clipboard-check-outline
                  </v-icon>
                </template>
                <v-list-item-title>Tâches en cours</v-list-item-title>
                <v-list-item-subtitle>{{ healthScore.factors.pendingTasks }} tâches ouvertes</v-list-item-subtitle>
              </v-list-item>

              <v-list-item density="compact">
                <template v-slot:prepend>
                  <v-icon :color="getCompletionColor(healthScore.factors.completionRate)">
                    mdi-chart-donut
                  </v-icon>
                </template>
                <v-list-item-title>Taux de complétion</v-list-item-title>
                <v-list-item-subtitle>{{ healthScore.factors.completionRate }}% des tâches terminées</v-list-item-subtitle>
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
import { ref, onMounted } from "vue"
import { healthScoreApi } from "@/services/api"
import type { HealthScoreBreakdown, HealthScoreLevel } from "@/services/api/healthScore"

const props = defineProps<{
  institutionId: string
}>()

const healthScore = ref<HealthScoreBreakdown | null>(null)
const loading = ref(false)
const showDetails = ref(false)

const loadHealthScore = async () => {
  loading.value = true

  try {
    const response = await healthScoreApi.getInstitutionHealthScore(props.institutionId)
    healthScore.value = response.data.data
  } catch (err: any) {
    console.error("Failed to load health score:", err)
  } finally {
    loading.value = false
  }
}

const formatLevel = (level: HealthScoreLevel): string => {
  const labels: Record<HealthScoreLevel, string> = {
    excellent: "Excellent",
    good: "Bon",
    fair: "Moyen",
    poor: "Faible",
    critical: "Critique",
  }
  return labels[level] || level
}

const getLevelIcon = (level: HealthScoreLevel): string => {
  const icons: Record<HealthScoreLevel, string> = {
    excellent: "mdi-heart",
    good: "mdi-thumb-up",
    fair: "mdi-minus-circle",
    poor: "mdi-alert",
    critical: "mdi-alert-octagon",
  }
  return icons[level] || "mdi-help-circle"
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatLastInteraction = (days: number): string => {
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return "Hier"
  if (days < 7) return `Il y a ${days} jours`
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`
  return `Il y a ${Math.floor(days / 365)} ans`
}

const getRecencyColor = (days: number): string => {
  if (days <= 7) return "success"
  if (days <= 30) return "warning"
  return "error"
}

const getCompletionColor = (rate: number): string => {
  if (rate >= 70) return "success"
  if (rate >= 40) return "warning"
  return "error"
}

onMounted(() => {
  loadHealthScore()
})
</script>

<style scoped>
.health-score-badge {
  max-width: 300px;
}

.health-score-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.health-score-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.health-score-loading {
  opacity: 0.6;
}
</style>
