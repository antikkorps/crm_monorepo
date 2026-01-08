<template>
  <v-card class="team-card" :class="teamCardClass">
    <v-card-item>
      <div class="team-header">
        <div class="team-info">
          <v-icon icon="mdi-account-group" class="team-icon" />
          <div>
            <h4 class="team-name">{{ team.name }}</h4>
            <p class="team-description" v-if="team.description">{{ team.description }}</p>
          </div>
        </div>
        <div class="team-actions">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click="$emit('edit', team)"
          />
          <v-btn
            icon="mdi-cog"
            size="small"
            variant="text"
            @click="$emit('manage', team)"
          />
        </div>
      </div>
    </v-card-item>

    <v-card-text>
      <div class="team-content">
        <div class="team-stats">
          <div class="stat-item">
            <span class="stat-value">{{ teamMembers.length }}</span>
            <span class="stat-label">{{ t('teams.members') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ activeMembers }}</span>
            <span class="stat-label">{{ t('teams.active') }}</span>
          </div>
        </div>

        <div class="team-members-section">
          <div class="members-header">
            <span class="members-title">{{ t('teams.teamMembers') }}</span>
          </div>
          <div class="members-avatars" v-if="teamMembers.length > 0">
            <v-avatar
              v-for="(member, index) in displayedMembers"
              :key="member.id"
              :size="32"
              class="member-avatar"
              :class="{ 'inactive-member': !member.isActive }"
              :style="{ zIndex: teamMembers.length - index }"
              :color="getMemberAvatarColor(member)"
            >
              <img :src="getUserAvatar(member)" :alt="getUserInitials(member)" />
            </v-avatar>
            <v-avatar
              v-if="hiddenMembersCount > 0"
              :size="32"
              class="member-avatar more-members"
              color="grey-lighten-2"
            >
              +{{ hiddenMembersCount }}
            </v-avatar>
          </div>
          <div class="no-members" v-else>
            <v-icon icon="mdi-account-plus" size="small" />
            <span>{{ t('teams.noMembers') }}</span>
          </div>
        </div>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-account-plus"
        @click="$emit('addMember', team)"
        size="small"
      >
        {{ t('teams.addMember') }}
      </v-btn>
      <v-spacer />
      <v-btn
        color="secondary"
        variant="text"
        @click="$emit('viewDetails', team)"
        size="small"
      >
        {{ t('teams.viewDetails') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Team, User } from "@medical-crm/shared"
import { AvatarService } from "@/services/avatarService"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

interface Props {
  team: Team
  teamMembers: User[]
  maxAvatars?: number
}

interface Emits {
  (e: "edit", team: Team): void
  (e: "manage", team: Team): void
  (e: "addMember", team: Team): void
  (e: "viewDetails", team: Team): void
}

const props = withDefaults(defineProps<Props>(), {
  maxAvatars: 5,
})

const emit = defineEmits<Emits>()

const teamCardClass = computed(() => ({
  "team-empty": props.teamMembers.length === 0,
}))

const activeMembers = computed(() => {
  return props.teamMembers.filter((member) => member.isActive).length
})

const displayedMembers = computed(() => {
  return props.teamMembers.slice(0, props.maxAvatars)
})

const hiddenMembersCount = computed(() => {
  return Math.max(0, props.teamMembers.length - props.maxAvatars)
})

const getUserAvatar = (user: User) => {
  // Si l'utilisateur n'a pas de avatarSeed ou avatarStyle, générer à partir du nom
  if (!user.avatarSeed || !user.avatarStyle) {
    return AvatarService.generateUserAvatar(user.firstName, user.lastName, {
      size: 32
    })
  }

  return AvatarService.generateAvatarFromSeed(user.avatarSeed, {
    style: user.avatarStyle,
    size: 32
  })
}

const getUserInitials = (user: User) => {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

const getMemberAvatarColor = (user: User) => {
  const colors = [
    'primary', 'secondary', 'success', 'info', 'warning', 'error',
    'purple', 'pink', 'indigo', 'teal', 'cyan', 'orange'
  ]
  const name = `${user.firstName}${user.lastName}`
  const index = name.length % colors.length
  return colors[index]
}
</script>

<style scoped>
.team-card {
  transition: all 0.2s ease;
  height: 100%;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.team-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.team-card.team-empty {
  border-left: 4px solid #f59e0b;
}

.team-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.team-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex: 1;
}

.team-icon {
  color: #6366f1;
  margin-top: 0.25rem;
}

.team-name {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1f2937;
}

.team-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
}

.team-actions {
  display: flex;
  gap: 0.25rem;
}

.team-card > .v-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.team-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.team-stats {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.team-members-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.members-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.members-avatars {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.member-avatar {
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.member-avatar:hover {
  transform: scale(1.1);
  z-index: 10 !important;
}

.member-avatar.inactive-member {
  opacity: 0.6;
  filter: grayscale(50%);
}

.more-members {
  background-color: #e5e7eb !important;
  color: #6b7280 !important;
  font-size: 0.75rem;
  font-weight: 500;
}

.no-members {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  font-style: italic;
  padding: 1rem;
  text-align: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px dashed #d1d5db;
}

@media (max-width: 768px) {
  .team-stats {
    gap: 1rem;
  }

  .members-avatars {
    gap: 0.25rem;
  }

  .member-avatar {
    width: 28px !important;
    height: 28px !important;
  }
}
</style>