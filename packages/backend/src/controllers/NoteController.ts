import {
  NoteCreateRequest,
  NoteSearchFilters,
  NoteUpdateRequest,
  SharePermission,
} from "@medical-crm/shared"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Note } from "../models/Note"
import { NoteShare } from "../models/NoteShare"
import { User } from "../models/User"
import { Context } from "../types/koa"

export class NoteController {
  // GET /api/notes - Get all notes with optional filtering
  static async getNotes(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const {
        creatorId,
        institutionId,
        tags,
        isPrivate,
        search,
        sharedWithUserId,
        page = 1,
        limit = 50,
      } = ctx.query

      // Build filters based on user permissions and query parameters
      const filters: NoteSearchFilters = {}

      // Apply role-based filtering
      if (user.role === "user") {
        // Regular users can only see notes they have access to
        filters.userId = user.id
      } else if (user.role === "team_admin" && user.teamId) {
        // Team admins can see notes from their team members
        const teamMembers = await User.findByTeam(user.teamId)
        const teamMemberIds = teamMembers.map((member) => member.id)

        // If creatorId is specified and not in team, restrict access
        if (creatorId && !teamMemberIds.includes(creatorId as string)) {
          filters.creatorId = user.id // Fallback to own notes
        } else if (creatorId) {
          filters.creatorId = creatorId as string
        }
        // By default still restrict access to what this user can access unless super admin
        filters.userId = user.id
      } else if (user.role === "super_admin") {
        // Super admins can see all notes, but still need to respect access control
        if (creatorId) filters.creatorId = creatorId as string
      }

      // Apply query filters
      if (institutionId) filters.institutionId = institutionId as string
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags]
        filters.tags = tagArray as string[]
      }
      if (isPrivate !== undefined) filters.isPrivate = isPrivate === "true"
      if (search) filters.search = search as string
      if (sharedWithUserId) filters.sharedWithUserId = sharedWithUserId as string

      const notes = await Note.searchNotes(filters)

      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit)
      const endIndex = startIndex + Number(limit)
      const paginatedNotes = notes.slice(startIndex, endIndex)

      ctx.body = {
        success: true,
        data: paginatedNotes,
        meta: {
          total: notes.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(notes.length / Number(limit)),
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "NOTE_FETCH_ERROR",
          message: "Failed to fetch notes",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/notes/:id - Get a specific note
  static async getNote(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const note = await Note.findByPk(id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      if (!note) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "NOTE_NOT_FOUND",
            message: "Note not found",
          },
        }
        return
      }

      // Check permissions
      const canAccess = await note.canUserAccess(user.id)
      if (!canAccess) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to access this note",
          },
        }
        return
      }

      // Include shares if user is the creator or has admin privileges
      let noteWithShares = note
      if (
        note.creatorId === user.id ||
        user.role === "super_admin" ||
        (user.role === "team_admin" && user.teamId)
      ) {
        const shares = await note.getShares()
        noteWithShares = { ...note.toJSON(), shares }
      }

      ctx.body = {
        success: true,
        data: noteWithShares,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "NOTE_FETCH_ERROR",
          message: "Failed to fetch note",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/notes - Create a new note
  static async createNote(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const noteData = ctx.request.body as NoteCreateRequest

      // Validate required fields
      if (!noteData.title || !noteData.content) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Title and content are required",
          },
        }
        return
      }

      // Verify institution exists if provided
      if (noteData.institutionId) {
        const institution = await MedicalInstitution.findByPk(noteData.institutionId)
        if (!institution) {
          ctx.status = 400
          ctx.body = {
            success: false,
            error: {
              code: "INVALID_INSTITUTION",
              message: "Institution not found",
            },
          }
          return
        }
      }

      // Validate share recipients if provided
      if (noteData.shareWith && noteData.shareWith.length > 0) {
        for (const share of noteData.shareWith) {
          const recipient = await User.findByPk(share.userId)
          if (!recipient) {
            ctx.status = 400
            ctx.body = {
              success: false,
              error: {
                code: "INVALID_SHARE_RECIPIENT",
                message: `User with id ${share.userId} not found`,
              },
            }
            return
          }

          // Check if user can share with this recipient
          const canShare = await NoteController.canShareWithUser(user, recipient)
          if (!canShare) {
            ctx.status = 403
            ctx.body = {
              success: false,
              error: {
                code: "INSUFFICIENT_PERMISSIONS",
                message: `You don't have permission to share with user ${recipient.email}`,
              },
            }
            return
          }
        }
      }

      const note = await Note.create({
        title: noteData.title,
        content: noteData.content,
        tags: noteData.tags || [],
        creatorId: user.id,
        institutionId: noteData.institutionId,
        isPrivate: noteData.isPrivate || false,
      })

      // Handle sharing if specified
      if (noteData.shareWith && noteData.shareWith.length > 0) {
        await NoteShare.shareNoteWithUsers(note.id, noteData.shareWith)
      }

      // Fetch the created note with associations
      const createdNote = await Note.findByPk(note.id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      ctx.status = 201
      ctx.body = {
        success: true,
        data: createdNote,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "NOTE_CREATE_ERROR",
          message: "Failed to create note",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // PUT /api/notes/:id - Update a note
  static async updateNote(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const updateData = ctx.request.body as NoteUpdateRequest

      const note = await Note.findByPk(id)
      if (!note) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "NOTE_NOT_FOUND",
            message: "Note not found",
          },
        }
        return
      }

      // Check permissions
      const canEdit = await note.canUserEdit(user.id)
      if (!canEdit) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to edit this note",
          },
        }
        return
      }

      // Validate institution if being changed
      if (updateData.institutionId && updateData.institutionId !== note.institutionId) {
        const institution = await MedicalInstitution.findByPk(updateData.institutionId)
        if (!institution) {
          ctx.status = 400
          ctx.body = {
            success: false,
            error: {
              code: "INVALID_INSTITUTION",
              message: "Institution not found",
            },
          }
          return
        }
      }

      // Update the note
      await note.update({
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.content && { content: updateData.content }),
        ...(updateData.tags !== undefined && { tags: updateData.tags }),
        ...(updateData.institutionId !== undefined && {
          institutionId: updateData.institutionId,
        }),
        ...(updateData.isPrivate !== undefined && { isPrivate: updateData.isPrivate }),
      })

      // Fetch the updated note with associations
      const updatedNote = await Note.findByPk(note.id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "firstName", "lastName", "email"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name", "type"],
          },
        ],
      })

      ctx.body = {
        success: true,
        data: updatedNote,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "NOTE_UPDATE_ERROR",
          message: "Failed to update note",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // DELETE /api/notes/:id - Delete a note
  static async deleteNote(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const note = await Note.findByPk(id)
      if (!note) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "NOTE_NOT_FOUND",
            message: "Note not found",
          },
        }
        return
      }

      // Check permissions - only creator or super admin can delete
      const canDelete = await NoteController.canDeleteNote(user, note)
      if (!canDelete) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to delete this note",
          },
        }
        return
      }

      // Delete associated shares first
      await NoteShare.destroy({ where: { noteId: id } })

      // Delete the note
      await note.destroy()

      ctx.body = {
        success: true,
        message: "Note deleted successfully",
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "NOTE_DELETE_ERROR",
          message: "Failed to delete note",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/notes/:id/share - Share a note with users
  static async shareNote(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const { shares } = ctx.request.body as {
        shares: Array<{ userId: string; permission: SharePermission }>
      }

      if (!shares || !Array.isArray(shares) || shares.length === 0) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Shares array is required and must not be empty",
          },
        }
        return
      }

      const note = await Note.findByPk(id)
      if (!note) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "NOTE_NOT_FOUND",
            message: "Note not found",
          },
        }
        return
      }

      // Check permissions - only creator can share
      if (note.creatorId !== user.id) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only the note creator can share the note",
          },
        }
        return
      }

      // Validate all share recipients
      for (const share of shares) {
        const recipient = await User.findByPk(share.userId)
        if (!recipient) {
          ctx.status = 400
          ctx.body = {
            success: false,
            error: {
              code: "INVALID_SHARE_RECIPIENT",
              message: `User with id ${share.userId} not found`,
            },
          }
          return
        }

        const canShare = await NoteController.canShareWithUser(user, recipient)
        if (!canShare) {
          ctx.status = 403
          ctx.body = {
            success: false,
            error: {
              code: "INSUFFICIENT_PERMISSIONS",
              message: `You don't have permission to share with user ${recipient.email}`,
            },
          }
          return
        }
      }

      // Create or update shares
      const createdShares = await NoteShare.shareNoteWithUsers(id, shares)

      ctx.body = {
        success: true,
        data: createdShares,
        message: "Note shared successfully",
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "NOTE_SHARE_ERROR",
          message: "Failed to share note",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // DELETE /api/notes/:id/share/:userId - Remove share access for a user
  static async removeNoteShare(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id, userId } = ctx.params

      const note = await Note.findByPk(id)
      if (!note) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "NOTE_NOT_FOUND",
            message: "Note not found",
          },
        }
        return
      }

      // Check permissions - only creator can remove shares
      if (note.creatorId !== user.id) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "Only the note creator can remove share access",
          },
        }
        return
      }

      // Remove the share
      const removedCount = await NoteShare.removeNoteShares(id, [userId])

      if (removedCount === 0) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "SHARE_NOT_FOUND",
            message: "Share not found for this user",
          },
        }
        return
      }

      ctx.body = {
        success: true,
        message: "Share access removed successfully",
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "NOTE_UNSHARE_ERROR",
          message: "Failed to remove share access",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/notes/:id/shares - Get all shares for a note
  static async getNoteShares(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const note = await Note.findByPk(id)
      if (!note) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "NOTE_NOT_FOUND",
            message: "Note not found",
          },
        }
        return
      }

      // Check permissions - only creator or users with access can view shares
      const canAccess = await note.canUserAccess(user.id)
      if (!canAccess) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to view note shares",
          },
        }
        return
      }

      const shares = await NoteShare.getUsersWithAccess(id)

      ctx.body = {
        success: true,
        data: shares,
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "NOTE_SHARES_FETCH_ERROR",
          message: "Failed to fetch note shares",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/notes/shared-with-me - Get notes shared with the current user
  static async getSharedNotes(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { page = 1, limit = 50 } = ctx.query

      const filters: NoteSearchFilters = {
        sharedWithUserId: user.id,
      }

      const notes = await Note.searchNotes(filters)

      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit)
      const endIndex = startIndex + Number(limit)
      const paginatedNotes = notes.slice(startIndex, endIndex)

      ctx.body = {
        success: true,
        data: paginatedNotes,
        meta: {
          total: notes.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(notes.length / Number(limit)),
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "SHARED_NOTES_FETCH_ERROR",
          message: "Failed to fetch shared notes",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/notes/by-institution/:institutionId - Get notes for a specific institution
  static async getNotesByInstitution(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { institutionId } = ctx.params
      const { page = 1, limit = 50 } = ctx.query

      // Verify institution exists
      const institution = await MedicalInstitution.findByPk(institutionId)
      if (!institution) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: {
            code: "INSTITUTION_NOT_FOUND",
            message: "Institution not found",
          },
        }
        return
      }

      const filters: NoteSearchFilters = {
        institutionId,
        userId: user.id, // Apply access control
      }

      const notes = await Note.searchNotes(filters)

      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit)
      const endIndex = startIndex + Number(limit)
      const paginatedNotes = notes.slice(startIndex, endIndex)

      ctx.body = {
        success: true,
        data: paginatedNotes,
        meta: {
          total: notes.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(notes.length / Number(limit)),
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "INSTITUTION_NOTES_FETCH_ERROR",
          message: "Failed to fetch notes for institution",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/notes/by-tags - Get notes filtered by tags
  static async getNotesByTags(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { tags, page = 1, limit = 50 } = ctx.query

      if (!tags) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Tags parameter is required",
          },
        }
        return
      }

      const tagArray = Array.isArray(tags) ? tags : [tags]
      const filters: NoteSearchFilters = {
        tags: tagArray as string[],
        userId: user.id, // Apply access control
      }

      const notes = await Note.searchNotes(filters)

      // Apply pagination
      const startIndex = (Number(page) - 1) * Number(limit)
      const endIndex = startIndex + Number(limit)
      const paginatedNotes = notes.slice(startIndex, endIndex)

      ctx.body = {
        success: true,
        data: paginatedNotes,
        meta: {
          total: notes.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(notes.length / Number(limit)),
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "TAGGED_NOTES_FETCH_ERROR",
          message: "Failed to fetch notes by tags",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // Permission helper methods
  private static async canDeleteNote(user: User, note: Note): Promise<boolean> {
    // Super admins can delete all notes
    if (user.role === "super_admin") return true

    // Only creators can delete their notes
    if (note.creatorId === user.id) return true

    return false
  }

  private static async canShareWithUser(user: User, recipient: User): Promise<boolean> {
    // Super admins can share with anyone
    if (user.role === "super_admin") return true

    // Team admins can share with their team members
    if (user.role === "team_admin" && user.teamId === recipient.teamId) return true

    // Users can share with team members
    if (user.teamId && user.teamId === recipient.teamId) return true

    return false
  }
}
