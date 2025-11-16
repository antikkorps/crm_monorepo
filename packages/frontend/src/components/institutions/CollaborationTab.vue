<template>
  <div class="collaboration-tab">
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-body-1">Chargement des données de collaboration...</p>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
      <p class="text-h6 mt-4">{{ error }}</p>
      <v-btn prepend-icon="mdi-refresh" @click="loadData" class="mt-4">Réessayer</v-btn>
    </div>

    <div v-else-if="collaborationData">
      <!-- Stats Cards -->
      <v-row class="mb-6">
        <v-col cols="6" sm="4" md="3" lg="2" v-for="stat in statsCards" :key="stat.label">
          <v-card :color="stat.color" variant="tonal" class="text-center fill-height">
            <v-card-text>
              <v-icon size="32" class="mb-2">{{ stat.icon }}</v-icon>
              <div class="text-h4 font-weight-bold">{{ stat.value }}</div>
              <div class="text-body-2">{{ stat.label }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <!-- Upcoming Meetings -->
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary">mdi-calendar-account</v-icon>
                <span>Réunions à venir</span>
                <v-chip class="ml-2" size="small" color="primary" variant="tonal">
                  {{ collaborationData.stats.upcomingMeetings }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="primary"
                @click="navigateTo('/meetings')"
              >
                Ajouter
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div v-if="collaborationData.upcomingMeetings.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2">mdi-calendar-blank</v-icon>
              <p class="mt-2 text-medium-emphasis">Aucune réunion à venir</p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="meeting in collaborationData.upcomingMeetings"
                :key="meeting.id"
                @click="navigateTo('/meetings')"
              >
                <template v-slot:prepend>
                  <v-avatar color="primary" variant="tonal">
                    <v-icon>mdi-calendar-account</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">{{ meeting.title }}</v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(meeting.startDate) }} - {{ formatTime(meeting.startDate) }}
                  </div>
                  <div v-if="meeting.organizer" class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-account-outline</v-icon>
                    {{ meeting.organizer.firstName }} {{ meeting.organizer.lastName }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Recent Calls -->
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="success">mdi-phone</v-icon>
                <span>Appels récents</span>
                <v-chip class="ml-2" size="small" color="success" variant="tonal">
                  {{ collaborationData.stats.totalCalls }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="success"
                @click="navigateTo('/calls')"
              >
                Ajouter
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div v-if="collaborationData.recentCalls.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2">mdi-phone-off</v-icon>
              <p class="mt-2 text-medium-emphasis">Aucun appel récent</p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="call in collaborationData.recentCalls"
                :key="call.id"
                @click="navigateTo('/calls')"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getCallColor(call.type)" variant="tonal">
                    <v-icon>{{ getCallIcon(call.type) }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ formatCallType(call.type) }}
                  <v-chip size="x-small" class="ml-2" :color="getCallColor(call.type)" variant="tonal">
                    {{ call.duration ? formatDuration(call.duration) : 'N/A' }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(call.callDate) }} - {{ formatTime(call.callDate) }}
                  </div>
                  <div v-if="call.subject" class="text-truncate mt-1">{{ call.subject }}</div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Recent Notes -->
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="warning">mdi-note-text</v-icon>
                <span>Notes récentes</span>
                <v-chip class="ml-2" size="small" color="warning" variant="tonal">
                  {{ collaborationData.stats.totalNotes }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="warning"
                @click="navigateTo('/notes')"
              >
                Ajouter
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div v-if="collaborationData.recentNotes.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2">mdi-note-off-outline</v-icon>
              <p class="mt-2 text-medium-emphasis">Aucune note récente</p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="note in collaborationData.recentNotes"
                :key="note.id"
                @click="navigateTo('/notes')"
              >
                <template v-slot:prepend>
                  <v-avatar color="warning" variant="tonal">
                    <v-icon>{{ note.isPrivate ? 'mdi-lock' : 'mdi-note-text' }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ note.title }}
                  <v-chip v-if="note.isPrivate" size="x-small" class="ml-2" color="error" variant="tonal">
                    <v-icon size="x-small" start>mdi-lock</v-icon>
                    Privé
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="text-truncate">{{ stripHtml(note.content) }}</div>
                  <div class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(note.createdAt) }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Pending Reminders -->
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="info">mdi-bell-alert</v-icon>
                <span>Rappels en attente</span>
                <v-chip class="ml-2" size="small" color="info" variant="tonal">
                  {{ collaborationData.stats.pendingReminders }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="info"
                @click="navigateTo('/reminders')"
              >
                Ajouter
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div v-if="collaborationData.pendingReminders.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2">mdi-bell-off-outline</v-icon>
              <p class="mt-2 text-medium-emphasis">Aucun rappel en attente</p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="reminder in collaborationData.pendingReminders"
                :key="reminder.id"
                @click="navigateTo('/reminders')"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getPriorityColor(reminder.priority)" variant="tonal">
                    <v-icon>mdi-bell-alert</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ reminder.title }}
                  <v-chip size="x-small" class="ml-2" :color="getPriorityColor(reminder.priority)" variant="tonal">
                    {{ formatPriority(reminder.priority) }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(reminder.reminderDate) }} - {{ formatTime(reminder.reminderDate) }}
                  </div>
                  <div v-if="reminder.description" class="text-truncate mt-1">{{ reminder.description }}</div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Open Tasks -->
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="secondary">mdi-checkbox-marked-circle-outline</v-icon>
                <span>Tâches ouvertes</span>
                <v-chip class="ml-2" size="small" color="secondary" variant="tonal">
                  {{ collaborationData.stats.openTasks }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="secondary"
                @click="navigateTo('/tasks')"
              >
                Ajouter
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div v-if="collaborationData.openTasks.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2">mdi-checkbox-marked-circle-outline</v-icon>
              <p class="mt-2 text-medium-emphasis">Aucune tâche ouverte</p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="task in collaborationData.openTasks"
                :key="task.id"
                @click="navigateTo('/tasks')"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getTaskStatusColor(task.status)" variant="tonal">
                    <v-icon>mdi-clipboard-text</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ task.title }}
                  <v-chip size="x-small" class="ml-2" :color="getTaskStatusColor(task.status)" variant="tonal">
                    {{ formatTaskStatus(task.status) }}
                  </v-chip>
                  <v-chip v-if="task.priority" size="x-small" class="ml-1" :color="getPriorityColor(task.priority)" variant="tonal">
                    {{ formatPriority(task.priority) }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div v-if="task.assignee" class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-account-outline</v-icon>
                    {{ task.assignee.firstName }} {{ task.assignee.lastName }}
                  </div>
                  <div v-if="task.dueDate" class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-calendar-clock</v-icon>
                    Échéance: {{ formatDate(task.dueDate) }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { institutionsApi } from "@/services/api"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"

interface Props {
  institutionId: string
}

const props = defineProps<Props>()
const router = useRouter()

const collaborationData = ref<any>(null)
const loading = ref(false)
const error = ref("")

const statsCards = computed(() => {
  if (!collaborationData.value) return []
  const stats = collaborationData.value.stats
  return [
    {
      label: "Réunions",
      value: stats.totalMeetings,
      icon: "mdi-calendar-account",
      color: "primary",
    },
    {
      label: "Appels",
      value: stats.totalCalls,
      icon: "mdi-phone",
      color: "success",
    },
    {
      label: "Notes",
      value: stats.totalNotes,
      icon: "mdi-note-text",
      color: "warning",
    },
    {
      label: "Rappels",
      value: stats.totalReminders,
      icon: "mdi-bell-alert",
      color: "info",
    },
    {
      label: "Tâches",
      value: stats.totalTasks,
      icon: "mdi-clipboard-text",
      color: "secondary",
    },
    {
      label: "À venir",
      value: stats.upcomingMeetings,
      icon: "mdi-calendar-clock",
      color: "primary",
    },
  ]
})

const loadData = async () => {
  loading.value = true
  error.value = ""

  try {
    const response = await institutionsApi.getCollaboration(props.institutionId)
    collaborationData.value = response.data || response
  } catch (err) {
    console.error("Error loading collaboration data:", err)
    error.value = "Impossible de charger les données de collaboration"
  } finally {
    loading.value = false
  }
}

const navigateTo = (path: string) => {
  router.push(path)
}

const formatDate = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

const formatTime = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

const formatCallType = (type: string): string => {
  const typeMap: Record<string, string> = {
    incoming: "Appel entrant",
    outgoing: "Appel sortant",
    missed: "Appel manqué",
  }
  return typeMap[type] || type
}

const getCallColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    incoming: "success",
    outgoing: "info",
    missed: "error",
  }
  return colorMap[type] || "grey"
}

const getCallIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    incoming: "mdi-phone-incoming",
    outgoing: "mdi-phone-outgoing",
    missed: "mdi-phone-missed",
  }
  return iconMap[type] || "mdi-phone"
}

const getPriorityColor = (priority: string): string => {
  const colorMap: Record<string, string> = {
    low: "info",
    medium: "warning",
    high: "error",
    urgent: "purple",
  }
  return colorMap[priority] || "grey"
}

const formatPriority = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    low: "Basse",
    medium: "Moyenne",
    high: "Haute",
    urgent: "Urgente",
  }
  return priorityMap[priority] || priority
}

const getTaskStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: "warning",
    in_progress: "info",
    blocked: "error",
    completed: "success",
    cancelled: "grey",
  }
  return colorMap[status] || "grey"
}

const formatTaskStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: "En attente",
    in_progress: "En cours",
    blocked: "Bloquée",
    completed: "Terminée",
    cancelled: "Annulée",
  }
  return statusMap[status] || status
}

const stripHtml = (html: string): string => {
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ""
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.collaboration-tab {
  padding: 0;
}

.v-list-item {
  cursor: pointer;
}

.v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
