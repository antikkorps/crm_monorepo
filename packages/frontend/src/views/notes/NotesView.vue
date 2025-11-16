<template>
  <AppLayout>
    <div class="notes-view">
      <!-- Header -->
      <div class="notes-header">
        <div class="header-content">
          <h1 class="page-title">
            <v-icon class="me-2">mdi-note-text</v-icon>
            {{ $t('notes.title') }}
          </h1>
          <p class="page-description">
            {{ $t('notes.description') }}
          </p>
        </div>
        <div class="header-actions">
          <v-btn
            color="primary"
            variant="elevated"
            prepend-icon="mdi-plus"
            @click="showCreateDialog = true"
            class="create-note-btn"
          >
            <span class="btn-text-desktop">{{ $t('notes.newNote') }}</span>
            <span class="btn-text-mobile">{{ $t('common.create') }}</span>
          </v-btn>
        </div>
      </div>

      <!-- Note Statistics -->
      <NoteStats :stats="notesStore.noteStats" />

      <!-- Filters -->
      <NoteFilters
        :filters="notesStore.filters"
        :available-tags="allTags"
        @update:filters="notesStore.updateFilters"
      />

      <!-- View Toggle and Sort -->
      <div class="view-controls">
        <div class="view-info">
          <v-chip variant="outlined" size="small">
            {{ notesStore.filteredNotes.length }} {{ $t('notes.unit') }}
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
      <div v-if="notesStore.loading && notesStore.filteredNotes.length === 0" class="loading-container">
        <ListSkeleton
          :count="5"
          avatar
          actions
          type="list-item-three-line"
        />
      </div>

      <!-- Error State -->
      <v-alert
        v-else-if="notesStore.error"
        type="error"
        class="error-message"
        closable
        variant="tonal"
      >
        {{ notesStore.error }}
        <template #append>
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            @click="loadNotes"
          />
        </template>
      </v-alert>

      <!-- Empty State -->
      <div v-else-if="notesStore.filteredNotes.length === 0" class="empty-state">
        <div class="empty-content">
          <v-icon class="empty-icon">mdi-note-text</v-icon>
          <h3>{{ $t('notes.empty.title') }}</h3>
          <p v-if="hasActiveFilters">
            {{ $t('notes.empty.noFilter') }}
          </p>
          <p v-else>
            {{ $t('notes.empty.noData') }}
          </p>
          <div class="empty-actions">
            <v-btn
              v-if="hasActiveFilters"
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-filter-off"
              @click="notesStore.clearFilters"
            >
              {{ $t('common.clearFilters') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-plus"
              @click="showCreateDialog = true"
              class="create-note-btn"
            >
              <span class="btn-text-desktop">{{ $t('notes.createNote') }}</span>
              <span class="btn-text-mobile">{{ $t('common.create') }}</span>
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Notes Content -->
      <div v-else class="notes-content">
        <div class="notes-grid">
          <NoteCard
            v-for="note in sortedNotes"
            :key="note.id"
            :note="note"
            @edit="editNote"
            @delete="confirmDeleteNote"
            @share="openShareDialog"
          />
        </div>
      </div>

      <!-- Note Form Dialog -->
      <NoteForm
        v-model="showCreateDialog"
        :loading="formLoading"
        @submit="createNote"
        @cancel="showCreateDialog = false"
      />

      <NoteForm
        v-model="showEditDialog"
        :note="selectedNote"
        :loading="formLoading"
        @submit="updateNote"
        @cancel="showEditDialog = false"
      />

      <!-- Share Dialog -->
      <v-dialog
        v-model="showShareDialog"
        max-width="600px"
        persistent
      >
        <v-card>
          <v-card-title class="text-h6">
            {{ $t('notes.share.title') }}
          </v-card-title>

          <v-card-text>
            <p class="mb-4">
              <strong>{{ selectedNote?.title }}</strong>
            </p>

            <div v-if="selectedNote?.shares && selectedNote.shares.length > 0" class="current-shares mb-4">
              <h4 class="mb-2">{{ $t('notes.share.current') }}</h4>
              <v-list>
                <v-list-item
                  v-for="share in selectedNote.shares"
                  :key="share.id"
                  class="share-list-item"
                >
                  <template #prepend>
                    <v-icon>mdi-account</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ share.user?.firstName }} {{ share.user?.lastName }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ share.permission === 'write' ? $t('notes.share.write') : $t('notes.share.read') }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      variant="text"
                      color="error"
                      @click="removeNoteShare(share.id)"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </div>

            <p class="text-caption text-grey">
              {{ $t('notes.share.help') }}
            </p>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn
              color="secondary"
              variant="outlined"
              @click="showShareDialog = false"
            >
              {{ $t('common.close') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Confirmation Dialog -->
      <v-dialog
        v-model="showConfirmDialog"
        max-width="400px"
        persistent
      >
        <v-card>
          <v-card-title class="text-h6">
            {{ $t('common.confirmDelete') }}
          </v-card-title>

          <v-card-text>
            {{ $t('notes.deleteConfirm') }}
            {{ $t('common.irreversible') }}
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn
              color="secondary"
              variant="outlined"
              @click="cancelDelete"
            >
              {{ $t('common.cancel') }}
            </v-btn>
            <v-btn
              color="error"
              variant="elevated"
              @click="confirmDelete"
            >
              {{ $t('common.delete') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import NoteCard from "@/components/notes/NoteCard.vue"
import NoteFilters from "@/components/notes/NoteFilters.vue"
import NoteForm from "@/components/notes/NoteForm.vue"
import NoteStats from "@/components/notes/NoteStats.vue"
import { ListSkeleton } from "@/components/skeletons"
import { useSnackbar } from "@/composables/useSnackbar"
import { useNotesStore } from "@/stores/notes"
import { useI18n } from "vue-i18n"
import type {
  Note,
  NoteCreateRequest,
  NoteUpdateRequest,
} from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"

const notesStore = useNotesStore()
const { showSnackbar } = useSnackbar()
const { t } = useI18n()

// Component state
const sortBy = ref("createdAt")
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showShareDialog = ref(false)
const selectedNote = ref<Note | null>(null)
const formLoading = ref(false)

// Confirmation dialog state
const showConfirmDialog = ref(false)
const noteToDelete = ref<Note | null>(null)

const sortOptions = computed(() => [
  { label: t('notes.sort.byDate'), value: "createdAt" },
  { label: t('notes.sort.byTitle'), value: "title" },
  { label: t('notes.sort.byUpdated'), value: "updatedAt" },
])

const hasActiveFilters = computed(() => {
  return Object.keys(notesStore.filters).some(
    (key) =>
      notesStore.filters[key as keyof typeof notesStore.filters] !== undefined &&
      notesStore.filters[key as keyof typeof notesStore.filters] !== null &&
      notesStore.filters[key as keyof typeof notesStore.filters] !== ""
  )
})

const allTags = computed(() => {
  const tags = new Set<string>()
  notesStore.notes.forEach((note) => {
    note.tags.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags).sort()
})

const sortedNotes = computed(() => {
  const notes = [...notesStore.filteredNotes]

  return notes.sort((a, b) => {
    switch (sortBy.value) {
      case "createdAt":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

      case "updatedAt":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()

      case "title":
        return a.title.localeCompare(b.title)

      default:
        return 0
    }
  })
})

const loadNotes = async () => {
  try {
    await notesStore.fetchNotes()
  } catch (error) {
    showSnackbar(t('notes.errors.load'), "error")
  }
}

const createNote = async (noteData: NoteCreateRequest) => {
  try {
    formLoading.value = true
    await notesStore.createNote(noteData)
    showCreateDialog.value = false
    showSnackbar(t('notes.success.created'), "success")
  } catch (error) {
    showSnackbar(t('notes.errors.create'), "error")
  } finally {
    formLoading.value = false
  }
}

const editNote = (note: Note) => {
  selectedNote.value = note
  showEditDialog.value = true
}

const updateNote = async (updates: NoteUpdateRequest) => {
  if (!selectedNote.value) return

  try {
    formLoading.value = true
    await notesStore.updateNote(selectedNote.value.id, updates)
    showEditDialog.value = false
    selectedNote.value = null
    showSnackbar(t('notes.success.updated'), "success")
  } catch (error) {
    showSnackbar(t('notes.errors.update'), "error")
  } finally {
    formLoading.value = false
  }
}

const confirmDeleteNote = (note: Note) => {
  noteToDelete.value = note
  showConfirmDialog.value = true
}

const deleteNote = async (note: Note) => {
  try {
    await notesStore.deleteNote(note.id)
    showSnackbar(t('notes.success.deleted'), "success")
  } catch (error) {
    showSnackbar(t('notes.errors.delete'), "error")
  }
}

const confirmDelete = () => {
  if (noteToDelete.value) {
    deleteNote(noteToDelete.value)
  }
  showConfirmDialog.value = false
  noteToDelete.value = null
}

const cancelDelete = () => {
  showConfirmDialog.value = false
  noteToDelete.value = null
}

const openShareDialog = (note: Note) => {
  selectedNote.value = note
  showShareDialog.value = true
}

const removeNoteShare = async (shareId: string) => {
  if (!selectedNote.value) return

  try {
    await notesStore.removeShare(selectedNote.value.id, shareId)
    showSnackbar(t('notes.success.shareRemoved'), "success")
    // Refresh the selected note
    const updatedNote = notesStore.getNoteById(selectedNote.value.id)
    if (updatedNote) {
      selectedNote.value = updatedNote
    }
  } catch (error) {
    showSnackbar(t('notes.errors.shareRemove'), "error")
  }
}

const applySorting = () => {
  // Sorting is handled by the computed property
}

onMounted(async () => {
  await loadNotes()
})
</script>

<style scoped>
.notes-view {
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: 100vh;
}

/* Header */
.notes-header {
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

.notes-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #10b981, #3b82f6, #ef4444);
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

.create-note-btn {
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
  min-width: 200px;
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

/* Notes Content */
.notes-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 2rem;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

/* Share Dialog */
.current-shares {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: #f9fafb;
}

.share-list-item {
  background: white;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .notes-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }
}

@media (max-width: 1024px) {
  .notes-view {
    padding: 1.5rem;
  }

  .notes-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 768px) {
  .notes-view {
    padding: 0.75rem;
  }

  .notes-header {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .notes-header::before {
    height: 3px;
  }

  .header-actions {
    justify-content: center;
    width: 100%;
  }

  .create-note-btn {
    width: 100%;
    max-width: 250px;
  }

  .page-title {
    font-size: 1.5rem;
    justify-content: center;
  }

  .notes-content {
    padding: 1.25rem;
  }

  .notes-grid {
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
  .notes-view {
    padding: 0.5rem;
  }

  .notes-header {
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

  .create-note-btn {
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

  .notes-content {
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
  .notes-view {
    padding: 0.25rem;
  }

  .empty-actions {
    flex-direction: column;
    gap: 0.75rem;
  }

  .notes-header {
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

  .notes-content {
    border-radius: 12px;
  }

  .notes-grid {
    gap: 0.75rem;
  }

  .create-note-btn {
    font-size: 0.9rem;
    padding: 0.75rem 1rem;
  }
}
</style>
