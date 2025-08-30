<template>
  <Card class="user-card" :class="userCardClass">
    <template #header>
      <div class="user-header">
        <div class="user-avatar-section">
          <Avatar
            :image="avatarUrl"
            :label="userInitials"
            size="large"
            shape="circle"
            class="user-avatar"
          />
          <div class="user-status" :class="statusClass">
            <i :class="statusIcon"></i>
          </div>
        </div>
        <div class="user-actions">
          <Button
            icon="pi pi-pencil"
            size="small"
            text
            rounded
            @click="$emit('edit', user)"
            v-tooltip.top="'Edit User'"
          />
          <Button
            icon="pi pi-cog"
            size="small"
            text
            rounded
            @click="$emit('manage', user)"
            v-tooltip.top="'Manage User'"
          />
        </div>
      </div>
    </template>

    <template #content>
      <div class="user-content">
        <h4 class="user-name">{{ user.firstName }} {{ user.lastName }}</h4>
        <p class="user-email">{{ user.email }}</p>

        <div class="user-meta">
          <div class="user-role">
            <Tag :value="roleLabel" :severity="roleSeverity" :icon="roleIcon" />
          </div>

          <div class="user-team" v-if="user.teamId && teamName">
            <i class="pi pi-users mr-1"></i>
            <span>{{ teamName }}</span>
          </div>

          <div class="user-last-login" v-if="user.lastLoginAt">
            <i class="pi pi-clock mr-1"></i>
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
    </template>

    <template #footer>
      <div class="user-footer">
        <div class="user-territory" v-if="assignedInstitutions.length > 0">
          <small class="territory-label"
            >Territory ({{ assignedInstitutions.length }})</small
          >
          <div class="territory-list">
            <Chip
              v-for="institution in assignedInstitutions.slice(0, 3)"
              :key="institution.id"
              :label="institution.name"
              class="territory-chip"
            />
            <Chip
              v-if="assignedInstitutions.length > 3"
              :label="`+${assignedInstitutions.length - 3} more`"
              class="territory-chip territory-more"
            />
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { User } from "@medical-crm/shared"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Card from "primevue/card"
import Chip from "primevue/chip"
import Tag from "primevue/tag"
import { computed } from "vue"

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
  return `https://api.dicebear.com/7.x/initials/svg?seed=${
    props.user.avatarSeed || props.user.id
  }`
})

const userInitials = computed(() => {
  return `${props.user.firstName.charAt(0)}${props.user.lastName.charAt(0)}`.toUpperCase()
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
  props.user.isActive ? "pi pi-check-circle" : "pi pi-times-circle"
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
    super_admin: "danger",
    team_admin: "warning",
    user: "info",
  }
  return severities[props.user.role] as any
})

const roleIcon = computed(() => {
  const icons = {
    super_admin: "pi pi-crown",
    team_admin: "pi pi-shield",
    user: "pi pi-user",
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
