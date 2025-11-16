import { notesApi, type NoteFilters } from "@/services/api/notes"
import type {
  Note,
  NoteCreateRequest,
  NoteUpdateRequest,
  SharePermission,
} from "@medical-crm/shared"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

export const useNotesStore = defineStore("notes", () => {
  // State
  const notes = ref<Note[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<NoteFilters>({})

  // Getters
  const filteredNotes = computed(() => {
    let result = [...notes.value]

    // Apply filters
    if (filters.value.creatorId) {
      result = result.filter((note) => note.creatorId === filters.value.creatorId)
    }

    if (filters.value.institutionId) {
      result = result.filter((note) => note.institutionId === filters.value.institutionId)
    }

    if (filters.value.isPrivate !== undefined) {
      result = result.filter((note) => note.isPrivate === filters.value.isPrivate)
    }

    if (filters.value.tags && filters.value.tags.length > 0) {
      result = result.filter((note) =>
        filters.value.tags!.some((tag) => note.tags.includes(tag))
      )
    }

    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase()
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm) ||
          note.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
      )
    }

    return result
  })

  const myNotes = computed(() => {
    // Note: creatorId would typically be the current user's ID
    // This will need to be filtered by the current user in the component
    return notes.value.filter((note) => !note.shares || note.shares.length === 0)
  })

  const sharedNotes = computed(() => {
    return notes.value.filter((note) => note.shares && note.shares.length > 0)
  })

  const notesByTag = computed(() => {
    const tagMap = new Map<string, Note[]>()

    notes.value.forEach((note) => {
      note.tags.forEach((tag) => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, [])
        }
        tagMap.get(tag)!.push(note)
      })
    })

    return tagMap
  })

  const todayNotes = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return notes.value
      .filter((note) => {
        const noteDate = new Date(note.createdAt)
        return noteDate >= today && noteDate < tomorrow
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  const noteStats = computed(() => ({
    total: notes.value.length,
    private: notes.value.filter((note) => note.isPrivate).length,
    shared: sharedNotes.value.length,
    today: todayNotes.value.length,
  }))

  // Actions
  const fetchNotes = async (customFilters?: NoteFilters) => {
    try {
      loading.value = true
      error.value = null
      const response = await notesApi.getAll(customFilters || filters.value)
      notes.value = (response as any)?.data || (response as any)
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch notes"
      console.error("Error fetching notes:", err)
    } finally {
      loading.value = false
    }
  }

  const fetchSharedWithMe = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await notesApi.getSharedWithMe()
      const sharedNotes = (response as any)?.data || (response as any)
      // Merge shared notes with existing notes
      sharedNotes.forEach((sharedNote: Note) => {
        const index = notes.value.findIndex((n) => n.id === sharedNote.id)
        if (index === -1) {
          notes.value.push(sharedNote)
        }
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch shared notes"
      console.error("Error fetching shared notes:", err)
    } finally {
      loading.value = false
    }
  }

  const createNote = async (noteData: NoteCreateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await notesApi.create(noteData)
      const newNote = (response as any)?.data || (response as any)
      notes.value.push(newNote)
      return newNote
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create note"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateNote = async (noteId: string, updates: NoteUpdateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await notesApi.update(noteId, updates)
      const updatedNote = (response as any)?.data || (response as any)

      const index = notes.value.findIndex((note) => note.id === noteId)
      if (index !== -1) {
        notes.value[index] = updatedNote
      }

      return updatedNote
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update note"
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      loading.value = true
      error.value = null
      await notesApi.delete(noteId)

      const index = notes.value.findIndex((note) => note.id === noteId)
      if (index !== -1) {
        notes.value.splice(index, 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete note"
      throw err
    } finally {
      loading.value = false
    }
  }

  const shareNote = async (
    noteId: string,
    shares: Array<{ userId: string; permission: SharePermission }>
  ) => {
    try {
      loading.value = true
      error.value = null
      await notesApi.shareNote(noteId, shares)

      // Refresh the note to get updated shares
      const response = await notesApi.getById(noteId)
      const updatedNote = (response as any)?.data || (response as any)

      const index = notes.value.findIndex((note) => note.id === noteId)
      if (index !== -1) {
        notes.value[index] = updatedNote
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to share note"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateShare = async (
    noteId: string,
    shareId: string,
    permission: SharePermission
  ) => {
    try {
      loading.value = true
      error.value = null
      await notesApi.updateShare(noteId, shareId, permission)

      // Refresh the note to get updated shares
      const response = await notesApi.getById(noteId)
      const updatedNote = (response as any)?.data || (response as any)

      const index = notes.value.findIndex((note) => note.id === noteId)
      if (index !== -1) {
        notes.value[index] = updatedNote
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update share"
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeShare = async (noteId: string, shareId: string) => {
    try {
      loading.value = true
      error.value = null
      await notesApi.removeShare(noteId, shareId)

      // Refresh the note to get updated shares
      const response = await notesApi.getById(noteId)
      const updatedNote = (response as any)?.data || (response as any)

      const index = notes.value.findIndex((note) => note.id === noteId)
      if (index !== -1) {
        notes.value[index] = updatedNote
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to remove share"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateFilters = (newFilters: Partial<NoteFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {}
  }

  const getNoteById = (noteId: string) => {
    return notes.value.find((note) => note.id === noteId)
  }

  return {
    // State
    notes,
    loading,
    error,
    filters,

    // Getters
    filteredNotes,
    myNotes,
    sharedNotes,
    notesByTag,
    todayNotes,
    noteStats,

    // Actions
    fetchNotes,
    fetchSharedWithMe,
    createNote,
    updateNote,
    deleteNote,
    shareNote,
    updateShare,
    removeShare,
    updateFilters,
    clearFilters,
    getNoteById,
  }
})
