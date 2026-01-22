<template>
  <div class="collaboration-tab">
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-body-1">{{ t("collaboration.loading") }}</p>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
      <p class="text-h6 mt-4">{{ error }}</p>
      <v-btn prepend-icon="mdi-refresh" @click="loadData" class="mt-4">{{
        t("collaboration.retry")
      }}</v-btn>
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

      <v-row align="stretch">
        <!-- Upcoming Meetings -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary">mdi-calendar-account</v-icon>
                <span>{{ t("collaboration.upcomingMeetings") }}</span>
                <v-chip class="ml-2" size="small" color="primary" variant="tonal">
                  {{ collaborationData.stats.upcomingMeetings }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="primary"
                @click="openMeetingForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="collaborationData.upcomingMeetings.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-calendar-blank</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noUpcomingMeetings") }}
              </p>
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
                <v-list-item-title class="font-weight-medium">{{
                  meeting.title
                }}</v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(meeting.startDate) }} -
                    {{ formatTime(meeting.startDate) }}
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
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="success">mdi-phone</v-icon>
                <span>{{ t("collaboration.recentCalls") }}</span>
                <v-chip class="ml-2" size="small" color="success" variant="tonal">
                  {{ collaborationData.stats.totalCalls }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="success"
                @click="openCallForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="collaborationData.recentCalls.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-phone-off</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noRecentCalls") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="call in collaborationData.recentCalls"
                :key="call.id"
                @click="navigateTo('/calls')"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getCallColor(call.callType)" variant="tonal">
                    <v-icon>{{ getCallIcon(call.callType) }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ formatCallType(call.callType) }}
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    :color="getCallColor(call.callType)"
                    variant="tonal"
                  >
                    {{ call.duration ? formatDuration(call.duration) : "N/A" }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(call.createdAt) }} - {{ formatTime(call.createdAt) }}
                  </div>
                  <div v-if="call.summary" class="text-truncate mt-1">
                    {{ call.summary }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Recent Notes -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="warning">mdi-note-text</v-icon>
                <span>{{ t("collaboration.recentNotes") }}</span>
                <v-chip class="ml-2" size="small" color="warning" variant="tonal">
                  {{ collaborationData.stats.totalNotes }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="warning"
                @click="openNoteForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="collaborationData.recentNotes.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-note-off-outline</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noRecentNotes") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="note in collaborationData.recentNotes"
                :key="note.id"
                @click="navigateTo('/notes')"
              >
                <template v-slot:prepend>
                  <v-avatar color="warning" variant="tonal">
                    <v-icon>{{ note.isPrivate ? "mdi-lock" : "mdi-note-text" }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ note.title }}
                  <v-chip
                    v-if="note.isPrivate"
                    size="x-small"
                    class="ml-2"
                    color="error"
                    variant="tonal"
                  >
                    <v-icon size="x-small" start>mdi-lock</v-icon>
                    {{ t("collaboration.private") }}
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
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="info">mdi-bell-alert</v-icon>
                <span>{{ t("collaboration.pendingReminders") }}</span>
                <v-chip class="ml-2" size="small" color="info" variant="tonal">
                  {{ collaborationData.stats.pendingReminders }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="info"
                @click="openReminderForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="collaborationData.pendingReminders.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-bell-off-outline</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noPendingReminders") }}
              </p>
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
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    :color="getPriorityColor(reminder.priority)"
                    variant="tonal"
                  >
                    {{ formatPriority(reminder.priority) }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(reminder.reminderDate) }} -
                    {{ formatTime(reminder.reminderDate) }}
                  </div>
                  <div v-if="reminder.description" class="text-truncate mt-1">
                    {{ reminder.description }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Open Tasks -->
        <v-col cols="12" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="secondary"
                  >mdi-checkbox-marked-circle-outline</v-icon
                >
                <span>{{ t("tasks.open") }}</span>
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
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div v-if="collaborationData.openTasks.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2"
                >mdi-checkbox-marked-circle-outline</v-icon
              >
              <p class="mt-2 text-medium-emphasis">{{ t("tasks.noOpenTasks") }}</p>
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
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    :color="getTaskStatusColor(task.status)"
                    variant="tonal"
                  >
                    {{ formatTaskStatus(task.status) }}
                  </v-chip>
                  <v-chip
                    v-if="task.priority"
                    size="x-small"
                    class="ml-1"
                    :color="getPriorityColor(task.priority)"
                    variant="tonal"
                  >
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
                    {{ t("tasks.dueDate") }}: {{ formatDate(task.dueDate) }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Quick Add Dialogs -->
    <CallForm
      v-model="showCallForm"
      :loading="formLoading"
      :preselected-institution-id="props.institutionId"
      @submit="handleCallSubmit"
      @cancel="showCallForm = false"
    />

    <MeetingForm
      v-model="showMeetingForm"
      :loading="formLoading"
      :preselected-institution-id="props.institutionId"
      @submit="handleMeetingSubmit"
      @cancel="showMeetingForm = false"
    />

    <NoteForm
      v-model="showNoteForm"
      :loading="formLoading"
      :preselected-institution-id="props.institutionId"
      @submit="handleNoteSubmit"
      @cancel="showNoteForm = false"
    />

    <ReminderForm
      v-model="showReminderForm"
      :loading="formLoading"
      :preselected-institution-id="props.institutionId"
      @submit="handleReminderSubmit"
      @cancel="showReminderForm = false"
    />
  </div>
</template>

<script setup lang="ts">
import CallForm from "@/components/calls/CallForm.vue"
import MeetingForm from "@/components/meetings/MeetingForm.vue"
import NoteForm from "@/components/notes/NoteForm.vue"
import ReminderForm from "@/components/reminders/ReminderForm.vue"
import { callsApi, institutionsApi, meetingsApi, notesApi, remindersApi } from "@/services/api"
import type {
  CallCreateRequest,
  CallUpdateRequest,
  MeetingCreateRequest,
  MeetingUpdateRequest,
  NoteCreateRequest,
  ReminderCreateRequest,
} from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

interface Props {
  institutionId: string
}

const props = defineProps<Props>()
const router = useRouter()
const { t } = useI18n()

const collaborationData = ref<any>(null)
const loading = ref(false)
const error = ref("")

// Quick add dialog states
const showCallForm = ref(false)
const showMeetingForm = ref(false)
const showNoteForm = ref(false)
const showReminderForm = ref(false)
const formLoading = ref(false)

const statsCards = computed(() => {
  if (!collaborationData.value) return []
  const stats = collaborationData.value.stats
  return [
    {
      label: t("collaboration.stats.meetings"),
      value: stats.totalMeetings,
      icon: "mdi-calendar-account",
      color: "primary",
    },
    {
      label: t("collaboration.stats.calls"),
      value: stats.totalCalls,
      icon: "mdi-phone",
      color: "success",
    },
    {
      label: t("collaboration.stats.notes"),
      value: stats.totalNotes,
      icon: "mdi-note-text",
      color: "warning",
    },
    {
      label: t("collaboration.stats.reminders"),
      value: stats.totalReminders,
      icon: "mdi-bell-alert",
      color: "info",
    },
    {
      label: t("collaboration.stats.tasks"),
      value: stats.totalTasks,
      icon: "mdi-clipboard-text",
      color: "secondary",
    },
    {
      label: t("collaboration.stats.upcoming"),
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
    const response = await institutionsApi.getCollaboration(props.institutionId) as { data?: any }
    collaborationData.value = response.data || response
  } catch (err) {
    console.error("Error loading collaboration data:", err)
    error.value = t("collaboration.loadError")
  } finally {
    loading.value = false
  }
}

const navigateTo = (path: string) => {
  // Navigate with institution filter
  router.push({
    path,
    query: { institutionId: props.institutionId },
  })
}

// Open form dialogs
const openCallForm = () => {
  showCallForm.value = true
}

const openMeetingForm = () => {
  showMeetingForm.value = true
}

const openNoteForm = () => {
  showNoteForm.value = true
}

const openReminderForm = () => {
  showReminderForm.value = true
}

// Form submit handlers
const handleCallSubmit = async (data: CallCreateRequest | CallUpdateRequest) => {
  formLoading.value = true
  try {
    await callsApi.create({
      ...data,
      institutionId: props.institutionId,
    } as CallCreateRequest)
    showCallForm.value = false
    loadData() // Reload data to show new call
  } catch (err) {
    console.error("Error creating call:", err)
  } finally {
    formLoading.value = false
  }
}

const handleMeetingSubmit = async (data: MeetingCreateRequest | MeetingUpdateRequest) => {
  formLoading.value = true
  try {
    await meetingsApi.create({
      ...data,
      institutionId: props.institutionId,
    } as MeetingCreateRequest)
    showMeetingForm.value = false
    loadData()
  } catch (err) {
    console.error("Error creating meeting:", err)
  } finally {
    formLoading.value = false
  }
}

const handleNoteSubmit = async (data: NoteCreateRequest) => {
  formLoading.value = true
  try {
    await notesApi.create({
      ...data,
      institutionId: props.institutionId,
    })
    showNoteForm.value = false
    loadData()
  } catch (err) {
    console.error("Error creating note:", err)
  } finally {
    formLoading.value = false
  }
}

const handleReminderSubmit = async (data: ReminderCreateRequest) => {
  formLoading.value = true
  try {
    await remindersApi.create({
      ...data,
      institutionId: props.institutionId,
    })
    showReminderForm.value = false
    loadData()
  } catch (err) {
    console.error("Error creating reminder:", err)
  } finally {
    formLoading.value = false
  }
}

const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return t("common.noDate")
  const d = new Date(date)
  if (isNaN(d.getTime())) return t("common.noDate")
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const formatTime = (date: string | Date | null | undefined): string => {
  if (!date) return ""
  const d = new Date(date)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

const formatCallType = (type: string): string => {
  const typeMap: Record<string, string> = {
    incoming: t("collaboration.callTypes.incoming"),
    outgoing: t("collaboration.callTypes.outgoing"),
    missed: t("collaboration.callTypes.missed"),
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
    low: t("tasks.priority.low"),
    medium: t("tasks.priority.medium"),
    high: t("tasks.priority.high"),
    urgent: t("tasks.priority.urgent"),
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
    pending: t("tasks.status.pending"),
    in_progress: t("tasks.status.in_progress"),
    blocked: t("tasks.status.blocked"),
    completed: t("tasks.status.completed"),
    cancelled: t("tasks.status.cancelled"),
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
  overflow: hidden;
}

.v-card {
  overflow-x: hidden;
  overflow-y: visible;
}

.v-card :deep(.v-list) {
  overflow-x: hidden;
}

.v-card :deep(.v-list-item) {
  cursor: pointer;
}

.v-card :deep(.v-list-item:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
