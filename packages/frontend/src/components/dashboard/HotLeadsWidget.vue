<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-fire" color="error" class="mr-2" />
        Leads Chauds
      </div>
      <v-btn
        text="Voir tout"
        prepend-icon="mdi-arrow-right"
        color="primary"
        variant="text"
        size="small"
        @click="$router.push('/hot-leads')"
      />
    </v-card-title>

    <v-divider />

    <!-- Loading State -->
    <v-card-text v-if="loading">
      <div class="d-flex justify-center py-8">
        <v-progress-circular indeterminate color="primary" size="48" />
      </div>
    </v-card-text>

    <!-- Error State -->
    <v-card-text v-else-if="error">
      <v-alert type="error" variant="tonal" density="compact">
        {{ error }}
        <template v-slot:append>
          <v-btn variant="text" size="small" @click="loadHotLeads">Réessayer</v-btn>
        </template>
      </v-alert>
    </v-card-text>

    <!-- Empty State -->
    <v-card-text v-else-if="!hotLeads || hotLeads.length === 0">
      <div class="text-center py-8">
        <v-icon size="48" color="grey-lighten-1">mdi-snowflake</v-icon>
        <p class="mt-4 text-body-2 text-medium-emphasis">Aucun lead chaud pour le moment</p>
      </div>
    </v-card-text>

    <!-- Hot Leads List -->
    <v-card-text v-else class="pa-0">
      <v-list>
        <v-list-item
          v-for="(lead, index) in hotLeads"
          :key="lead.institutionId"
          :class="{ 'bg-red-lighten-5': index === 0 }"
          @click="goToInstitution(lead.institutionId)"
          class="hot-lead-item"
        >
          <template v-slot:prepend>
            <v-avatar :color="getScoreColor(lead.level)" size="48">
              <div class="d-flex flex-column align-center">
                <span class="text-caption font-weight-bold" style="line-height: 1">{{ lead.score }}</span>
                <v-icon size="16">{{ getLevelIcon(lead.level) }}</v-icon>
              </div>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ lead.institutionName }}
            <v-chip
              v-if="index === 0"
              color="error"
              size="x-small"
              variant="flat"
              class="ml-2"
            >
              <v-icon start size="x-small">mdi-trophy</v-icon>
              Top Lead
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle>
            <div class="d-flex flex-wrap gap-1 mt-1">
              <v-chip size="x-small" variant="tonal" color="primary">
                <v-icon start size="x-small">mdi-domain</v-icon>
                {{ lead.factors.sizeScore }}
              </v-chip>
              <v-chip size="x-small" variant="tonal" color="success">
                <v-icon start size="x-small">mdi-chart-timeline-variant</v-icon>
                {{ lead.factors.engagementScore }}
              </v-chip>
              <v-chip size="x-small" variant="tonal" color="warning">
                <v-icon start size="x-small">mdi-cash-multiple</v-icon>
                {{ lead.factors.budgetScore }}
              </v-chip>
            </div>
          </v-list-item-subtitle>

          <template v-slot:append>
            <div class="d-flex flex-column gap-1 align-end">
              <v-chip
                :color="getScoreColor(lead.level)"
                size="small"
                variant="flat"
              >
                {{ formatLevel(lead.level) }}
              </v-chip>
              <div class="d-flex gap-1">
                <v-btn
                  icon="mdi-phone"
                  size="x-small"
                  variant="text"
                  color="success"
                  @click.stop="createCall(lead)"
                />
                <v-btn
                  icon="mdi-chart-line"
                  size="x-small"
                  variant="text"
                  color="primary"
                  @click.stop="createOpportunity(lead)"
                />
              </div>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>

    <v-divider v-if="hotLeads && hotLeads.length > 0" />

    <v-card-actions v-if="hotLeads && hotLeads.length > 0">
      <v-spacer />
      <v-btn
        variant="text"
        color="primary"
        prepend-icon="mdi-fire"
        @click="$router.push('/hot-leads')"
      >
        Voir tous les leads chauds
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { analyticsApi } from "@/services/api"
import type { LeadScore } from "@/services/api/analytics"

const router = useRouter()

const hotLeads = ref<LeadScore[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const loadHotLeads = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await analyticsApi.getHotLeads(5)
    // Filter only hot leads (score >= 70)
    const data = response?.data?.data || []
    hotLeads.value = data.filter(lead => lead.score >= 70).slice(0, 5)
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

const getLevelIcon = (level: "hot" | "warm" | "cold"): string => {
  const icons: Record<"hot" | "warm" | "cold", string> = {
    hot: "mdi-fire",
    warm: "mdi-thermometer",
    cold: "mdi-snowflake",
  }
  return icons[level] || "mdi-help-circle"
}

const getScoreColor = (level: "hot" | "warm" | "cold"): string => {
  const colors: Record<"hot" | "warm" | "cold", string> = {
    hot: "error",
    warm: "warning",
    cold: "info",
  }
  return colors[level] || "grey"
}

const goToInstitution = (institutionId: string) => {
  router.push(`/institutions/${institutionId}`)
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

onMounted(() => {
  loadHotLeads()
})
</script>

<style scoped>
.hot-lead-item {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.hot-lead-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.bg-red-lighten-5 {
  background-color: rgba(244, 67, 54, 0.05);
}

.bg-red-lighten-5:hover {
  background-color: rgba(244, 67, 54, 0.1);
}
</style>
