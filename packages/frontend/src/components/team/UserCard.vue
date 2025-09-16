<template>
  <v-card class="user-card" :class="userCardClass">
    <v-card-item>
      <div class="user-header">
        <div class="user-avatar-section">
          <v-avatar
            size="64"
            class="user-avatar"
            :color="showImage ? undefined : avatarColor"
          >
            <img v-if="showImage" :src="avatarUrl" :alt="userInitials" @error="onImageError" />
            <span v-else>{{ userInitials }}</span>
          </v-avatar>
          <div class="user-status" :class="statusClass">
            <v-icon :icon="statusIcon" size="small" />
          </div>
        </div>
        <div class="user-actions">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click="$emit('edit', user)"
          />
          <v-btn
            icon="mdi-cog"
            size="small"
            variant="text"
            @click="$emit('manage', user)"
          />
        </div>
      </div>
    </v-card-item>

    <v-card-text>
      <div class="user-content">
        <h4 class="user-name">{{ user.firstName }} {{ user.lastName }}</h4>
        <p class="user-email">{{ user.email }}</p>

        <div class="user-meta">
          <div class="user-role">
            <v-chip :color="roleSeverity" size="small" :prepend-icon="roleIcon">
              {{ roleLabel }}
            </v-chip>
          </div>

          <div class="user-team" v-if="user.teamId && teamName">
            <v-icon icon="mdi-account-group" size="small" class="me-1" />
            <span>{{ teamName }}</span>
          </div>

          <div class="user-last-login" v-if="user.lastLoginAt">
            <v-icon icon="mdi-clock-outline" size="small" class="me-1" />
            <span>{{ formatLastLogin(user.lastLoginAt) }}</span>
          </div>
        </div>

        <div class="user-stats" v-if="showStats">
          <div class="stat-item">
            <span class="stat-label">Tasks Assigned</span>
            <span class="stat-value">{{ userStats.assignedTasks }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Tasks Completed</span>
            <span class="stat-value">{{ userStats.completedTasks }}</span>
          </div>
        </div>
      </div>
    </v-card-text>

    <v-card-actions v-if="assignedInstitutions.length > 0">
      <div class="user-footer">
        <div class="user-territory">
          <small class="territory-label">
            Territory ({{ assignedInstitutions.length }})
          </small>
          <div class="territory-list">
            <v-chip
              v-for="institution in assignedInstitutions.slice(0, 3)"
              :key="institution.id"
              size="small"
              variant="outlined"
              class="territory-chip"
            >
              {{ institution.name }}
            </v-chip>
            <v-chip
              v-if="assignedInstitutions.length > 3"
              size="small"
              variant="outlined"
              class="territory-chip territory-more"
            >
              +{{ assignedInstitutions.length - 3 }} more
            </v-chip>
          </div>
        </div>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { User } from "@medical-crm/shared"
import { AvatarService } from "@/services/avatarService"
import { computed, ref } from "vue"

interface Props {
  user: User
  teamName?: string
  assignedInstitutions?: Array<{ id: string; name: string }>
  userStats?: {
    assignedTasks: number
    completedTasks: number
  }
  showStats?: boolean
}

interface Emits {
  (e: "edit", user: User): void
  (e: "manage", user: User): void
}

const props = withDefaults(defineProps<Props>(), {
  assignedInstitutions: () => [],
  userStats: () => ({ assignedTasks: 0, completedTasks: 0 }),
  showStats: true,
})

const emit = defineEmits<Emits>()

const avatarUrl = computed(() => {
  console.log('UserCard - User data:', props.user)
  console.log('UserCard - avatarSeed:', props.user.avatarSeed)
  console.log('UserCard - avatarStyle:', props.user.avatarStyle)

  // Si l'utilisateur n'a pas de avatarSeed ou avatarStyle, générer à partir du nom
  if (!props.user.avatarSeed || !props.user.avatarStyle) {
    const fallbackUrl = AvatarService.generateUserAvatar(props.user.firstName, props.user.lastName, {
      size: 64
    })
    console.log('UserCard - Using fallback avatar:', fallbackUrl)
    return fallbackUrl
  }

  const avatarUrl = AvatarService.generateAvatarFromSeed(props.user.avatarSeed, {
    style: props.user.avatarStyle,
    size: 64
  })
  console.log('UserCard - Using seed avatar:', avatarUrl)
  return avatarUrl
})

const userInitials = computed(() => {
  return `${props.user.firstName.charAt(0)}${props.user.lastName.charAt(0)}`.toUpperCase()
})

const showImage = ref(true)

const onImageError = (event: Event) => {
  console.log('Avatar image failed to load:', event)
  console.log('Failed URL:', avatarUrl.value)
  showImage.value = false
}

const avatarColor = computed(() => {
  // Générer une couleur basée sur les initiales de l'utilisateur
  const colors = [
    'primary', 'secondary', 'success', 'info', 'warning', 'error',
    'purple', 'pink', 'indigo', 'teal', 'cyan', 'orange'
  ]
  const name = `${props.user.firstName}${props.user.lastName}`
  const index = name.length % colors.length
  return colors[index]
})

const userCardClass = computed(() => ({
  "user-inactive": !props.user.isActive,
  "user-admin": props.user.role === "super_admin" || props.user.role === "team_admin",
}))

const statusClass = computed(() => ({
  "status-active": props.user.isActive,
  "status-inactive": !props.user.isActive,
}))

const statusIcon = computed(() =>
  props.user.isActive ? "mdi-check-circle" : "mdi-close-circle"
)

const roleLabel = computed(() => {
  const labels = {
    super_admin: "Super Admin",
    team_admin: "Team Admin",
    user: "User",
  }
  return labels[props.user.role]
})

const roleSeverity = computed(() => {
  const severities = {
    super_admin: "error",
    team_admin: "warning",
    user: "primary",
  }
  return severities[props.user.role] as any
})

const roleIcon = computed(() => {
  const icons = {
    super_admin: "mdi-crown",
    team_admin: "mdi-shield-account",
    user: "mdi-account",
  }
  return icons[props.user.role]
})

const formatLastLogin = (date: Date | string) => {
  const loginDate = new Date(date)
  const now = new Date()
  const diffTime = now.getTime() - loginDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

  return loginDate.toLocaleDateString()
}
</script>

<style scoped>
.user-card {
  transition: all 0.2s ease;
  height: 100%;
}

.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user-card.user-inactive {
  opacity: 0.7;
}

.user-card.user-admin {
  border-left: 4px solid #f59e0b;
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 1rem 0;
}

.user-avatar-section {
  position: relative;
}

.user-avatar {
  border: 3px solid #e5e7eb;
}

.user-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  font-size: 0.75rem;
}

.status-active {
  background-color: #10b981;
  color: white;
}

.status-inactive {
  background-color: #ef4444;
  color: white;
}

.user-actions {
  display: flex;
  gap: 0.25rem;
}

.user-content {
  padding: 0 1rem 1rem;
}

.user-name {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.user-email {
  margin: 0 0 1rem 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.user-role,
.user-team,
.user-last-login {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: #6b7280;
}

.user-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.user-footer {
  padding: 0 1rem 1rem;
}

.user-territory {
  margin-top: 0.75rem;
}

.territory-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.territory-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.territory-chip {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
}

.territory-more {
  background-color: #e5e7eb;
  color: #6b7280;
}

@media (max-width: 768px) {
  .user-stats {
    grid-template-columns: 1fr;
  }

  .user-name {
    font-size: 1rem;
  }

  .territory-list {
    flex-direction: column;
  }
}
</style>
