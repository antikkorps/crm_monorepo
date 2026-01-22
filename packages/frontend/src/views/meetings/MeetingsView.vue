<template>
  <AppLayout>
    <div class="meetings-view">
      <!-- Back to Institution Button -->
      <v-btn
        v-if="isFilteredByInstitution"
        variant="text"
        color="primary"
        prepend-icon="mdi-arrow-left"
        class="mb-4"
        @click="goBackToInstitution"
      >
        {{ $t("common.backToInstitution") }}
      </v-btn>

      <!-- Header -->
      <div class="meetings-header">
        <div class="header-content">
          <h1 class="page-title">
            <v-icon class="me-2">mdi-calendar-multiple</v-icon>
            {{ $t("meetings.title") }}
          </h1>
          <p class="page-description">
            {{ $t("meetings.description") }}
          </p>
        </div>
        <div class="header-actions">
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-plus"
            @click="showCreateDialog = true"
            class="create-meeting-btn"
          >
            <span class="btn-text-desktop">{{ $t("meetings.newMeeting") }}</span>
            <span class="btn-text-mobile">{{ $t("common.create") }}</span>
          </v-btn>
        </div>
      </div>

      <!-- Meeting Statistics -->
      <MeetingStats :stats="meetingsStore.meetingStats" />

      <!-- Filters -->
      <MeetingFilters
        :filters="meetingsStore.filters"
        @update:filters="meetingsStore.updateFilters"
      />

      <!-- View Toggle and Sort -->
      <div class="view-controls">
        <div class="view-info">
          <v-chip variant="outlined" size="small">
            {{ meetingsStore.filteredMeetings.length }} {{ $t("meetings.unit") }}
          </v-chip>
        </div>

        <div class="sort-controls">
          <v-select
            v-model="sortBy"
            :items="sortOptions"
            item-title="label"
            item-value="value"
            :label="$t('common.sortBy')"
            @update:modelValue="applySorting"
            class="sort-dropdown"
            density="comfortable"
            variant="outlined"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="meetingsStore.loading && meetingsStore.filteredMeetings.length === 0"
        class="loading-container"
      >
        <ListSkeleton :count="5" avatar actions type="list-item-three-line" />
      </div>

      <!-- Error State -->
      <v-alert
        v-else-if="meetingsStore.error"
        type="error"
        class="error-message"
        closable
        variant="tonal"
      >
        {{ meetingsStore.error }}
        <template #append>
          <v-btn icon="mdi-refresh" size="small" variant="text" @click="loadMeetings" />
        </template>
      </v-alert>

      <!-- Empty State -->
      <div v-else-if="meetingsStore.filteredMeetings.length === 0" class="empty-state">
        <div class="empty-content">
          <v-icon class="empty-icon">mdi-calendar-multiple</v-icon>
          <h3>{{ $t("meetings.empty.title") }}</h3>
          <p v-if="hasActiveFilters">
            {{ $t("meetings.empty.noFilter") }}
          </p>
          <p v-else>
            {{ $t("meetings.empty.noData") }}
          </p>
          <div class="empty-actions">
            <v-btn
              v-if="hasActiveFilters"
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-filter-off"
              @click="meetingsStore.clearFilters"
            >
              {{ $t("common.clearFilters") }}
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-plus"
              @click="showCreateDialog = true"
              class="create-meeting-btn"
            >
              <span class="btn-text-desktop">{{ $t("meetings.createMeeting") }}</span>
              <span class="btn-text-mobile">{{ $t("common.create") }}</span>
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Meetings Content -->
      <div v-else class="meetings-content">
        <div class="meetings-grid">
          <MeetingCard
            v-for="meeting in sortedMeetings"
            :key="meeting.id"
            :meeting="meeting"
            @edit="editMeeting"
            @delete="confirmDeleteMeeting"
            @export="exportMeeting"
            @send-invitation="sendInvitation"
            @status-change="updateMeetingStatus"
          />
        </div>
      </div>

      <!-- Meeting Form Dialog -->
      <MeetingForm
        v-model="showCreateDialog"
        :loading="formLoading"
        @submit="createMeeting"
        @cancel="showCreateDialog = false"
      />

      <MeetingForm
        v-model="showEditDialog"
        :meeting="selectedMeeting"
        :loading="formLoading"
        @submit="updateMeeting"
        @cancel="showEditDialog = false"
      />

      <!-- Delete Confirmation Dialog -->
      <v-dialog v-model="showConfirmDialog" max-width="400px" persistent>
        <v-card>
          <v-card-title class="text-h6">
            {{ $t("common.confirmDelete") }}
          </v-card-title>

          <v-card-text>
            {{ $t("meetings.deleteConfirm", { name: meetingToDelete?.title || "" }) }}
            {{ $t("common.irreversible") }}
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn color="secondary" variant="outlined" @click="cancelDelete">
              {{ $t("common.cancel") }}
            </v-btn>
            <v-btn color="error" variant="elevated" @click="confirmDelete">
              {{ $t("common.delete") }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Send Invitation Dialog -->
      <v-dialog v-model="showInvitationDialog" max-width="500px" persistent>
        <v-card>
          <v-card-title class="text-h6">
            {{ $t("meetings.invitation.title") }}
          </v-card-title>

          <v-card-text>
            <v-textarea
              v-model="invitationEmails"
              :label="$t('meetings.invitation.emailsLabel')"
              placeholder="email1@example.com, email2@example.com"
              :hint="$t('meetings.invitation.hint')"
              persistent-hint
              rows="3"
              variant="outlined"
              class="mb-4"
            />
            <v-textarea
              v-model="invitationMessage"
              :label="$t('meetings.invitation.message')"
              :placeholder="$t('quotes.sendDialog.messagePlaceholder')"
              rows="4"
              variant="outlined"
            />
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn color="secondary" variant="outlined" @click="cancelInvitation">
              {{ $t("common.cancel") }}
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :loading="invitationLoading"
              @click="confirmSendInvitation"
            >
              {{ $t("meetings.invitation.send") }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import MeetingCard from "@/components/meetings/MeetingCard.vue"
import MeetingFilters from "@/components/meetings/MeetingFilters.vue"
import MeetingForm from "@/components/meetings/MeetingForm.vue"
import MeetingStats from "@/components/meetings/MeetingStats.vue"
import { ListSkeleton } from "@/components/skeletons"
import { useSnackbar } from "@/composables/useSnackbar"
import { meetingsApi } from "@/services/api/meetings"
import { useMeetingsStore } from "@/stores/meetings"
import type {
  Meeting,
  MeetingCreateRequest,
  MeetingStatus,
  MeetingUpdateRequest,
} from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

const meetingsStore = useMeetingsStore()
const { showSnackbar } = useSnackbar()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// Check if filtered by institution from query params
const institutionId = computed(() => route.query.institutionId as string | undefined)
const isFilteredByInstitution = computed(() => !!institutionId.value)

// Component state
const sortBy = ref("startDate")
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const selectedMeeting = ref<Meeting | null>(null)
const formLoading = ref(false)

// Confirmation dialog state
const showConfirmDialog = ref(false)
const meetingToDelete = ref<Meeting | null>(null)

// Invitation dialog state
const showInvitationDialog = ref(false)
const invitationEmails = ref("")
const invitationMessage = ref("")
const invitationLoading = ref(false)

const sortOptions = computed(() => [
  { label: t("meetings.sort.byStartDate"), value: "startDate" },
  { label: t("meetings.sort.byEndDate"), value: "endDate" },
  { label: t("meetings.sort.byTitle"), value: "title" },
  { label: t("meetings.sort.byStatus"), value: "status" },
  { label: t("meetings.sort.byCreated"), value: "createdAt" },
])

const hasActiveFilters = computed(() => {
  return Object.keys(meetingsStore.filters).some(
    (key) =>
      meetingsStore.filters[key as keyof typeof meetingsStore.filters] !== undefined &&
      meetingsStore.filters[key as keyof typeof meetingsStore.filters] !== null &&
      meetingsStore.filters[key as keyof typeof meetingsStore.filters] !== ""
  )
})

const sortedMeetings = computed(() => {
  const meetings = [...meetingsStore.filteredMeetings]

  return meetings.sort((a, b) => {
    switch (sortBy.value) {
      case "startDate":
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()

      case "endDate":
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime()

      case "title":
        return a.title.localeCompare(b.title)

      case "status":
        const statusOrder = { scheduled: 0, in_progress: 1, completed: 2, cancelled: 3 }
        return statusOrder[a.status] - statusOrder[b.status]

      case "createdAt":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()

      default:
        return 0
    }
  })
})

const loadMeetings = async () => {
  try {
    await meetingsStore.fetchMeetings()
  } catch (error) {
    showSnackbar(t("meetings.errors.load"), "error")
  }
}

const createMeeting = async (
  meetingData: MeetingCreateRequest | MeetingUpdateRequest
) => {
  try {
    formLoading.value = true
    await meetingsStore.createMeeting(meetingData as MeetingCreateRequest)
    showCreateDialog.value = false
    showSnackbar(t("meetings.success.created"), "success")
  } catch (error) {
    showSnackbar(t("meetings.errors.create"), "error")
  } finally {
    formLoading.value = false
  }
}

const editMeeting = async (meeting: Meeting) => {
  try {
    // Fetch full meeting with participants
    const response = await meetingsApi.getById(meeting.id)
    selectedMeeting.value = (response as any)?.data || (response as any)
    showEditDialog.value = true
  } catch (error) {
    console.error("Error loading meeting details:", error)
    showSnackbar(t("meetings.errors.load"), "error")
  }
}

const updateMeeting = async (updates: MeetingUpdateRequest) => {
  if (!selectedMeeting.value) return

  try {
    formLoading.value = true
    await meetingsStore.updateMeeting(selectedMeeting.value.id, updates)
    showEditDialog.value = false
    selectedMeeting.value = null
    showSnackbar(t("meetings.success.updated"), "success")
  } catch (error) {
    showSnackbar(t("meetings.errors.update"), "error")
  } finally {
    formLoading.value = false
  }
}

const updateMeetingStatus = async (meeting: Meeting, newStatus: MeetingStatus) => {
  try {
    await meetingsStore.updateMeetingStatus(meeting.id, newStatus)
    showSnackbar(
      t("meetings.success.statusUpdated", { status: t(`meetings.status.${newStatus}`) }),
      "success"
    )
  } catch (error) {
    showSnackbar(t("meetings.errors.statusUpdate"), "error")
  }
}

const confirmDeleteMeeting = (meeting: Meeting) => {
  meetingToDelete.value = meeting
  showConfirmDialog.value = true
}

const deleteMeeting = async (meeting: Meeting) => {
  try {
    await meetingsStore.deleteMeeting(meeting.id)
    showSnackbar(t("meetings.success.deleted"), "success")
  } catch (error) {
    showSnackbar(t("meetings.errors.delete"), "error")
  }
}

const confirmDelete = () => {
  if (meetingToDelete.value) {
    deleteMeeting(meetingToDelete.value)
  }
  showConfirmDialog.value = false
  meetingToDelete.value = null
}

const cancelDelete = () => {
  showConfirmDialog.value = false
  meetingToDelete.value = null
}

const exportMeeting = async (meeting: Meeting) => {
  try {
    await meetingsStore.exportToIcs(meeting.id)
    showSnackbar(t("meetings.success.exported"), "success")
  } catch (error) {
    showSnackbar(t("meetings.errors.export"), "error")
  }
}

const sendInvitation = (meeting: Meeting) => {
  selectedMeeting.value = meeting
  invitationEmails.value = ""
  invitationMessage.value = ""
  showInvitationDialog.value = true
}

const confirmSendInvitation = async () => {
  if (!selectedMeeting.value) return

  try {
    invitationLoading.value = true

    // Parse additional emails if provided
    let emails: string[] | undefined
    if (invitationEmails.value.trim()) {
      emails = invitationEmails.value
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0)
    }

    // Get custom message if provided
    const message = invitationMessage.value.trim() || undefined

    await meetingsStore.sendInvitation(selectedMeeting.value.id, emails, message)
    showSnackbar(t("meetings.success.invitationSent"), "success")
    showInvitationDialog.value = false
    selectedMeeting.value = null
    invitationEmails.value = ""
    invitationMessage.value = ""
  } catch (error) {
    showSnackbar(t("meetings.errors.invitationSend"), "error")
  } finally {
    invitationLoading.value = false
  }
}

const cancelInvitation = () => {
  showInvitationDialog.value = false
  selectedMeeting.value = null
  invitationEmails.value = ""
  invitationMessage.value = ""
}

const applySorting = () => {
  // Sorting is handled by the computed property
}

// Navigation helpers
const goBackToInstitution = () => {
  if (institutionId.value) {
    router.push(`/institutions/${institutionId.value}`)
  }
}

onMounted(async () => {
  // Apply institution filter if present in query
  if (institutionId.value) {
    meetingsStore.updateFilters({ institutionId: institutionId.value })
  }
  await loadMeetings()
})
</script>

<style scoped>
.meetings-view {
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: 100vh;
}

/* Header */
.meetings-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.meetings-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981);
}

.header-content {
  flex: 1;
}

.page-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-description {
  margin: 0;
  color: #6b7280;
  font-size: 1rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.create-meeting-btn {
  white-space: nowrap;
}

/* Button text responsive */
.btn-text-mobile {
  display: none;
}

.btn-text-desktop {
  display: inline;
}

/* View Controls */
.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.view-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sort-dropdown {
  min-width: 180px;
}

/* Loading and Error States */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  text-align: center;
}

.loading-container p {
  margin-top: 1rem;
  color: #6b7280;
  font-size: 1.1rem;
}

.error-message {
  margin-bottom: 2rem;
  border-radius: 12px;
}

/* Empty State */
.empty-state {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  padding: 4rem 2rem;
  text-align: center;
}

.empty-content {
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 3rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.empty-content h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
}

.empty-content p {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Meetings Content */
.meetings-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 2rem;
}

.meetings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .meetings-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }
}

@media (max-width: 1024px) {
  .meetings-view {
    padding: 1.5rem;
  }

  .meetings-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 768px) {
  .meetings-view {
    padding: 0.75rem;
  }

  .meetings-header {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .meetings-header::before {
    height: 3px;
  }

  .header-actions {
    justify-content: center;
    width: 100%;
  }

  .create-meeting-btn {
    width: 100%;
    max-width: 250px;
  }

  .page-title {
    font-size: 1.5rem;
    justify-content: center;
  }

  .meetings-content {
    padding: 1.25rem;
  }

  .meetings-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .view-controls {
    padding: 1rem;
    margin-bottom: 1.25rem;
    flex-direction: column;
    gap: 1rem;
  }

  .view-info {
    justify-content: center;
  }

  .sort-controls {
    justify-content: center;
    width: 100%;
  }

  .sort-dropdown {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .meetings-view {
    padding: 0.5rem;
  }

  .meetings-header {
    padding: 1rem;
    border-radius: 12px;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .header-content {
    order: 1;
  }

  .header-actions {
    order: 2;
    justify-content: center;
    width: 100%;
  }

  .create-meeting-btn {
    width: 100%;
    max-width: 200px;
  }

  /* Switch button text on mobile */
  .btn-text-desktop {
    display: none;
  }

  .btn-text-mobile {
    display: inline;
  }

  .meetings-content {
    padding: 0.75rem;
  }

  .loading-container,
  .empty-state {
    padding: 2rem 1rem;
    border-radius: 12px;
  }

  .view-controls {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .sort-dropdown {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .meetings-view {
    padding: 0.25rem;
  }

  .empty-actions {
    flex-direction: column;
    gap: 0.75rem;
  }

  .meetings-header {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .page-title {
    font-size: 1.25rem;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page-description {
    font-size: 0.9rem;
  }

  .loading-container,
  .empty-state {
    padding: 1.5rem 0.75rem;
  }

  .meetings-content {
    border-radius: 12px;
  }

  .meetings-grid {
    gap: 0.75rem;
  }

  .create-meeting-btn {
    font-size: 0.9rem;
    padding: 0.75rem 1rem;
  }
}
</style>
