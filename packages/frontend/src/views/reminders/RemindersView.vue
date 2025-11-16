<template>
  <AppLayout>
    <div class="reminders-view">
      <!-- Header -->
      <div class="reminders-header">
        <div class="header-content">
          <h1 class="page-title">
            <v-icon class="me-2">mdi-bell</v-icon>
            Rappels
          </h1>
          <p class="page-description">
            Gérez vos rappels et restez informé des événements importants
          </p>
        </div>
        <div class="header-actions">
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-plus"
            @click="showCreateDialog = true"
            class="create-reminder-btn"
          >
            <span class="btn-text-desktop">Nouveau rappel</span>
            <span class="btn-text-mobile">Créer</span>
          </v-btn>
        </div>
      </div>

      <!-- Reminder Statistics -->
      <ReminderStats :stats="remindersStore.reminderStats" />

      <!-- Filters -->
      <ReminderFilters
        :filters="remindersStore.filters"
        @update:filters="remindersStore.updateFilters"
      />

      <!-- View Toggle and Sort -->
      <div class="view-controls">
        <div class="view-info">
          <v-chip variant="outlined" size="small">
            {{ remindersStore.filteredReminders.length }} rappel(s)
          </v-chip>
        </div>

        <div class="sort-controls">
          <v-select
            v-model="sortBy"
            :items="sortOptions"
            item-title="label"
            item-value="value"
            label="Trier par"
            @update:modelValue="applySorting"
            class="sort-dropdown"
            density="comfortable"
            variant="outlined"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="remindersStore.loading && remindersStore.filteredReminders.length === 0" class="loading-container">
        <ListSkeleton
          :count="5"
          avatar
          actions
          type="list-item-three-line"
        />
      </div>

      <!-- Error State -->
      <v-alert
        v-else-if="remindersStore.error"
        type="error"
        class="error-message"
        closable
        variant="tonal"
      >
        {{ remindersStore.error }}
        <template #append>
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            @click="loadReminders"
          />
        </template>
      </v-alert>

      <!-- Empty State -->
      <div v-else-if="remindersStore.filteredReminders.length === 0" class="empty-state">
        <div class="empty-content">
          <v-icon class="empty-icon">mdi-bell</v-icon>
          <h3>Aucun rappel trouvé</h3>
          <p v-if="hasActiveFilters">
            Aucun rappel ne correspond à vos critères de recherche.
          </p>
          <p v-else>
            Commencez par créer votre premier rappel.
          </p>
          <div class="empty-actions">
            <v-btn
              v-if="hasActiveFilters"
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-filter-off"
              @click="remindersStore.clearFilters"
            >
              Effacer les filtres
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-plus"
              @click="showCreateDialog = true"
              class="create-reminder-btn"
            >
              <span class="btn-text-desktop">Créer un rappel</span>
              <span class="btn-text-mobile">Créer</span>
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Reminders Content -->
      <div v-else class="reminders-content">
        <div class="reminders-grid">
          <ReminderCard
            v-for="reminder in sortedReminders"
            :key="reminder.id"
            :reminder="reminder"
            @edit="editReminder"
            @delete="confirmDeleteReminder"
            @complete="handleCompleteReminder"
          />
        </div>
      </div>

      <!-- Reminder Form Dialog -->
      <ReminderForm
        v-model="showCreateDialog"
        :loading="formLoading"
        @submit="createReminder"
        @cancel="showCreateDialog = false"
      />

      <ReminderForm
        v-model="showEditDialog"
        :reminder="selectedReminder"
        :loading="formLoading"
        @submit="updateReminder"
        @cancel="showEditDialog = false"
      />

      <!-- Delete Confirmation Dialog -->
      <v-dialog
        v-model="showConfirmDialog"
        max-width="400px"
        persistent
      >
        <v-card>
          <v-card-title class="text-h6">
            Confirmer la suppression
          </v-card-title>

          <v-card-text>
            Êtes-vous sûr de vouloir supprimer ce rappel ?
            Cette action est irréversible.
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn
              color="secondary"
              variant="outlined"
              @click="cancelDelete"
            >
              Annuler
            </v-btn>
            <v-btn
              color="error"
              variant="elevated"
              @click="confirmDelete"
            >
              Supprimer
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import ReminderCard from "@/components/reminders/ReminderCard.vue"
import ReminderFilters from "@/components/reminders/ReminderFilters.vue"
import ReminderForm from "@/components/reminders/ReminderForm.vue"
import ReminderStats from "@/components/reminders/ReminderStats.vue"
import { ListSkeleton } from "@/components/skeletons"
import { useSnackbar } from "@/composables/useSnackbar"
import { useRemindersStore } from "@/stores/reminders"
import type {
  Reminder,
  ReminderCreateRequest,
  ReminderUpdateRequest,
} from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"

const remindersStore = useRemindersStore()
const { showSnackbar } = useSnackbar()

// Component state
const sortBy = ref("reminderDate")
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const selectedReminder = ref<Reminder | null>(null)
const formLoading = ref(false)

// Confirmation dialog state
const showConfirmDialog = ref(false)
const reminderToDelete = ref<Reminder | null>(null)

const sortOptions = computed(() => [
  { label: "Date du rappel (plus proche)", value: "reminderDate" },
  { label: "Priorité (plus haute)", value: "priority" },
  { label: "Date de création (plus récent)", value: "createdAt" },
  { label: "Titre", value: "title" },
])

const hasActiveFilters = computed(() => {
  return Object.keys(remindersStore.filters).some(
    (key) =>
      remindersStore.filters[key as keyof typeof remindersStore.filters] !== undefined &&
      remindersStore.filters[key as keyof typeof remindersStore.filters] !== null &&
      remindersStore.filters[key as keyof typeof remindersStore.filters] !== ""
  )
})

const sortedReminders = computed(() => {
  const reminders = [...remindersStore.filteredReminders]

  return reminders.sort((a, b) => {
    switch (sortBy.value) {
      case "reminderDate":
        return new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime()

      case "priority": {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }

      case "createdAt":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

      case "title":
        return a.title.localeCompare(b.title)

      default:
        return 0
    }
  })
})

const loadReminders = async () => {
  try {
    await remindersStore.fetchReminders()
  } catch (error) {
    showSnackbar("Erreur lors du chargement des rappels", "error")
  }
}

const createReminder = async (reminderData: ReminderCreateRequest) => {
  try {
    formLoading.value = true
    await remindersStore.createReminder(reminderData)
    showCreateDialog.value = false
    showSnackbar("Rappel créé avec succès", "success")
  } catch (error) {
    showSnackbar("Erreur lors de la création du rappel", "error")
  } finally {
    formLoading.value = false
  }
}

const editReminder = (reminder: Reminder) => {
  selectedReminder.value = reminder
  showEditDialog.value = true
}

const updateReminder = async (updates: ReminderUpdateRequest) => {
  if (!selectedReminder.value) return

  try {
    formLoading.value = true
    await remindersStore.updateReminder(selectedReminder.value.id, updates)
    showEditDialog.value = false
    selectedReminder.value = null
    showSnackbar("Rappel mis à jour avec succès", "success")
  } catch (error) {
    showSnackbar("Erreur lors de la mise à jour du rappel", "error")
  } finally {
    formLoading.value = false
  }
}

const confirmDeleteReminder = (reminder: Reminder) => {
  reminderToDelete.value = reminder
  showConfirmDialog.value = true
}

const deleteReminder = async (reminder: Reminder) => {
  try {
    await remindersStore.deleteReminder(reminder.id)
    showSnackbar("Rappel supprimé avec succès", "success")
  } catch (error) {
    showSnackbar("Erreur lors de la suppression du rappel", "error")
  }
}

const confirmDelete = () => {
  if (reminderToDelete.value) {
    deleteReminder(reminderToDelete.value)
  }
  showConfirmDialog.value = false
  reminderToDelete.value = null
}

const cancelDelete = () => {
  showConfirmDialog.value = false
  reminderToDelete.value = null
}

const handleCompleteReminder = async (reminder: Reminder) => {
  try {
    await remindersStore.completeReminder(reminder.id)
    showSnackbar("Rappel marqué comme terminé", "success")
  } catch (error) {
    showSnackbar("Erreur lors de la mise à jour du rappel", "error")
  }
}

const applySorting = () => {
  // Sorting is handled by the computed property
}

onMounted(async () => {
  await loadReminders()
})
</script>

<style scoped>
.reminders-view {
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: 100vh;
}

/* Header */
.reminders-header {
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

.reminders-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #a855f7, #ef4444, #f97316, #3b82f6);
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

.create-reminder-btn {
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
  min-width: 250px;
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

/* Reminders Content */
.reminders-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 2rem;
}

.reminders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .reminders-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }
}

@media (max-width: 1024px) {
  .reminders-view {
    padding: 1.5rem;
  }

  .reminders-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 768px) {
  .reminders-view {
    padding: 0.75rem;
  }

  .reminders-header {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .reminders-header::before {
    height: 3px;
  }

  .header-actions {
    justify-content: center;
    width: 100%;
  }

  .create-reminder-btn {
    width: 100%;
    max-width: 250px;
  }

  .page-title {
    font-size: 1.5rem;
    justify-content: center;
  }

  .reminders-content {
    padding: 1.25rem;
  }

  .reminders-grid {
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
  .reminders-view {
    padding: 0.5rem;
  }

  .reminders-header {
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

  .create-reminder-btn {
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

  .reminders-content {
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
  .reminders-view {
    padding: 0.25rem;
  }

  .empty-actions {
    flex-direction: column;
    gap: 0.75rem;
  }

  .reminders-header {
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

  .reminders-content {
    border-radius: 12px;
  }

  .reminders-grid {
    gap: 0.75rem;
  }

  .create-reminder-btn {
    font-size: 0.9rem;
    padding: 0.75rem 1rem;
  }
}
</style>
