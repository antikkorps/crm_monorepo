# Backend API Overview

This document summarizes the key backend API endpoints relevant to collaboration and institutions, to speed up frontend work.

## Authentication
- All endpoints require authentication via the standard `Authorization: Bearer <token>` header.

## Institutions

- `GET /api/institutions/:id/collaboration`
  - Summary of collaboration data for one institution.
  - Response: stats + recent items (notes, meetings, calls, reminders, open tasks).

- `GET /api/institutions/:id/timeline`
  - Chronological timeline of all interactions related to an institution.
  - Query params:
    - `limit` (default 50), `offset` (default 0)
    - `startDate`, `endDate` (ISO strings)

- `GET /api/institutions/search/unified`
  - Unified search across institutions, tasks, notes, meetings, calls, reminders.
  - Query params:
    - `q` (required): search term
    - `type`: `institutions|tasks|notes|meetings|calls|reminders|all` (default all)
    - `institutionId`: filter by institution
    - `limit` (default 20, max 100), `offset` (default 0)
    - `startDate`, `endDate` (reserved for date filtering)
    - `scope`: `own|team|all` (see Scope behavior)
  - Scope behavior (RBAC-aware):
    - `super_admin`: default `all`; accepts `own|team|all`
    - `team_admin`: default `team`; accepts `own|team` (treats `all` as `team`)
    - `user`: default `own`; accepts `own` (treats `team|all` as `own`)
  - Access rules by type:
    - Tasks: own, team (assigneeId/creatorId in team), or all
    - Notes: respects privacy and sharing
      - own, public, shared-with-user; for team scope, includes team-created public notes
    - Meetings: organizer in scope or participant in scope
    - Calls/Reminders: `userId` in scope

## Collaboration Models

- Notes
  - Private notes are visible only to creator and explicitly-shared users.
  - Sharing permissions: `read|write`.

- Meetings
  - Organizer has full control; participants can view.

- Calls/Reminders
  - Owned by a user; team admins can view within team scope.

## Errors
- Consistent JSON error format with `code` and `message`.

## Security
- RBAC enforced by middleware and controller-level filters.
- Team-based filtering applied in list/search endpoints.

This file is a living document; please extend as new endpoints are added.
