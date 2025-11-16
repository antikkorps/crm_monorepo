<template>
  <AppLayout>
    <div class="hot-leads-view pa-4">
      <div class="page-header mb-6">
        <h1 class="text-h4 font-weight-bold">🔥 Leads Chauds</h1>
        <p class="text-body-1 text-medium-emphasis">Prospects à fort potentiel commercial</p>
      </div>

      <!-- Filters -->
      <v-card class="mb-6">
        <v-card-text>
          <v-row>
            <v-col cols="12" md="3">
              <v-select
                v-model="minScore"
                :items="scoreThresholds"
                label="Score minimum"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="limit"
                :items="limitOptions"
                label="Nombre de résultats"
                density="compact"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6" class="d-flex align-center justify-end gap-2">
              <v-btn
                prepend-icon="mdi-refresh"
                variant="outlined"
                @click="loadHotLeads"
              >
                Actualiser
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Chargement des leads chauds...</p>
      </div>

      <!-- Error State -->
      <v-alert v-else-if="error" type="error" variant="tonal" class="mb-6">
        <v-alert-title>Erreur</v-alert-title>
        {{ error }}
        <template v-slot:append>
          <v-btn variant="text" @click="loadHotLeads">Réessayer</v-btn>
        </template>
      </v-alert>

      <!-- Empty State -->
      <v-card v-else-if="!hotLeads || hotLeads.length === 0">
        <v-card-text class="text-center py-12">
          <v-icon size="64" color="grey-lighten-1">mdi-snowflake</v-icon>
          <p class="mt-4 text-h6">Aucun lead chaud trouvé</p>
          <p class="text-medium-emphasis">Aucune institution ne dépasse le seuil de {{ minScore }} points</p>
        </v-card-text>
      </v-card>

      <!-- Hot Leads Table -->
      <v-card v-else>
        <v-card-title>
          <div class="d-flex align-center justify-space-between">
            <span>{{ hotLeads.length }} lead(s) identifié(s)</span>
            <v-chip color="error" variant="tonal">
              <v-icon start>mdi-fire</v-icon>
              Top {{ limit }} leads
            </v-chip>
          </div>
        </v-card-title>

        <v-divider />

        <v-table>
          <thead>
            <tr>
              <th>Score</th>
              <th>Institution</th>
              <th>Niveau</th>
              <th>Facteurs Clés</th>
              <th>Recommandations</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in hotLeads" :key="lead.institutionId">
              <!-- Score Column -->
              <td>
                <div class="d-flex align-center">
                  <v-progress-circular
                    :model-value="lead.score"
                    :color="getScoreColor(lead.level)"
                    :size="50"
                    :width="6"
                  >
                    <span class="text-caption font-weight-bold">{{ lead.score }}</span>
                  </v-progress-circular>
                </div>
              </td>

              <!-- Institution Column -->
              <td>
                <div class="font-weight-medium">{{ lead.institutionName }}</div>
                <div class="text-caption text-medium-emphasis">ID: {{ lead.institutionId.slice(0, 8) }}...</div>
              </td>

              <!-- Level Column -->
              <td>
                <v-chip :color="getScoreColor(lead.level)" variant="flat" size="small">
                  {{ formatLevel(lead.level) }}
                </v-chip>
              </td>

              <!-- Key Factors Column -->
              <td>
                <div class="d-flex flex-column gap-1">
                  <v-chip size="x-small" variant="tonal" color="primary">
                    <v-icon start size="x-small">mdi-domain</v-icon>
                    Taille: {{ lead.factors.sizeScore }}
                  </v-chip>
                  <v-chip size="x-small" variant="tonal" color="success">
                    <v-icon start size="x-small">mdi-chart-timeline-variant</v-icon>
                    Engagement: {{ lead.factors.engagementScore }}
                  </v-chip>
                  <v-chip size="x-small" variant="tonal" color="warning">
                    <v-icon start size="x-small">mdi-cash-multiple</v-icon>
                    Budget: {{ lead.factors.budgetScore }}
                  </v-chip>
                </div>
              </td>

              <!-- Recommendations Column -->
              <td>
                <v-tooltip v-if="lead.recommendations && lead.recommendations.length > 0" location="left">
                  <template v-slot:activator="{ props }">
                    <v-chip v-bind="props" size="small" color="info" variant="tonal">
                      <v-icon start>mdi-lightbulb-outline</v-icon>
                      {{ lead.recommendations.length }} conseil(s)
                    </v-chip>
                  </template>
                  <div class="pa-2">
                    <div v-for="(rec, index) in lead.recommendations" :key="index" class="text-caption mb-1">
                      • {{ rec }}
                    </div>
                  </div>
                </v-tooltip>
                <span v-else class="text-caption text-medium-emphasis">-</span>
              </td>

              <!-- Actions Column -->
              <td>
                <div class="d-flex gap-1">
                  <v-btn
                    icon="mdi-eye"
                    size="small"
                    variant="text"
                    color="primary"
                    :to="`/institutions/${lead.institutionId}`"
                  />
                  <v-btn
                    icon="mdi-phone"
                    size="small"
                    variant="text"
                    color="success"
                    @click="createCall(lead)"
                  />
                  <v-btn
                    icon="mdi-chart-line"
                    size="small"
                    variant="text"
                    color="warning"
                    @click="createOpportunity(lead)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import { analyticsApi } from "@/services/api"
import type { LeadScore } from "@/services/api/analytics"
import AppLayout from "@/components/layout/AppLayout.vue"

const router = useRouter()

const hotLeads = ref<LeadScore[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const minScore = ref(70)
const limit = ref(20)

const scoreThresholds = [
  { title: "Tous (> 0)", value: 0 },
  { title: "Moyens (> 50)", value: 50 },
  { title: "Bons (> 60)", value: 60 },
  { title: "Chauds (> 70)", value: 70 },
  { title: "Très chauds (> 80)", value: 80 },
]

const limitOptions = [
  { title: "Top 10", value: 10 },
  { title: "Top 20", value: 20 },
  { title: "Top 50", value: 50 },
  { title: "Top 100", value: 100 },
]

const loadHotLeads = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await analyticsApi.getHotLeads(limit.value)
    // Filter by minScore
    hotLeads.value = response.data.data.filter(lead => lead.score >= minScore.value)
  } catch (err: any) {
    error.value = err.message || "Impossible de charger les leads chauds"
    console.error("Failed to load hot leads:", err)
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

const getScoreColor = (level: "hot" | "warm" | "cold"): string => {
  const colors: Record<"hot" | "warm" | "cold", string> = {
    hot: "error",
    warm: "warning",
    cold: "info",
  }
  return colors[level] || "grey"
}

const createCall = (lead: LeadScore) => {
  router.push({
    name: "Calls",
    query: { institutionId: lead.institutionId },
  })
}

const createOpportunity = (lead: LeadScore) => {
  router.push({
    name: "Opportunities",
    query: { create: "true", institutionId: lead.institutionId },
  })
}

// Watch for filter changes
watch([minScore, limit], () => {
  loadHotLeads()
})

onMounted(() => {
  loadHotLeads()
})
</script>

<style scoped>
.hot-leads-view {
  max-width: 1600px;
  margin: 0 auto;
}
</style>
