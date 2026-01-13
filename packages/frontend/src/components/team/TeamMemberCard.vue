<template>
  <v-card class="team-member-card" :class="{ 'inactive-member': !member.isActive }">
    <v-card-item>
      <div class="member-header">
        <v-avatar :size="56" :color="getAvatarColor">
          <img v-if="avatarUrl" :src="avatarUrl" :alt="memberName" />
          <span v-else class="avatar-initials">{{ memberInitials }}</span>
        </v-avatar>

        <div class="member-info">
          <h4 class="member-name">{{ memberName }}</h4>
          <p class="member-email">{{ member.email }}</p>
          <div class="member-status">
            <v-chip :color="member.isActive ? 'success' : 'grey'" size="small">
              {{ member.isActive ? t("common.active") : t("common.inactive") }}
            </v-chip>
            <v-chip v-if="isAdmin" color="primary" size="small" class="ml-1">
              {{ t("teams.admin") }}
            </v-chip>
          </div>
        </div>
      </div>
    </v-card-item>

    <v-card-actions>
      <v-btn
        color="error"
        variant="text"
        prepend-icon="mdi-account-remove"
        @click="confirmRemove"
        size="small"
        :disabled="removing"
      >
        {{ t("teams.removeMember") }}
      </v-btn>
    </v-card-actions>

    <!-- Confirm Remove Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          {{ t("teams.confirmRemoveTitle") }}
        </v-card-title>
        <v-card-text>
          {{
            t("teams.confirmRemoveMessage", {
              name: memberName,
            })
          }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showConfirmDialog = false"
            :disabled="removing"
          >
            {{ t("common.cancel") }}
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            @click="removeMember"
            :loading="removing"
          >
            {{ t("teams.removeMember") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { useSnackbar } from "@/composables/useSnackbar"
import { teamsApi } from "@/services/api"
import { AvatarService } from "@/services/avatarService"
import type { User } from "@medical-crm/shared"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

interface Props {
  member: User
  teamId: string
}

interface Emits {
  (e: "remove", userId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const { showSnackbar } = useSnackbar()

// State
const showConfirmDialog = ref(false)
const removing = ref(false)

// Computed
const memberName = computed(() => {
  return `${props.member.firstName} ${props.member.lastName}`.trim() || props.member.email
})

const memberInitials = computed(() => {
  const firstName = props.member.firstName || ""
  const lastName = props.member.lastName || ""
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U"
})

const avatarUrl = computed(() => {
  // Generate avatar URL from user's name
  if (props.member.firstName && props.member.lastName) {
    return AvatarService.generateUserAvatar(
      props.member.firstName,
      props.member.lastName,
      { size: 56 }
    )
  }
  return null
})

const getAvatarColor = computed(() => {
  // Generate color based on user email
  const colors = [
    "blue",
    "green",
    "orange",
    "purple",
    "pink",
    "teal",
    "indigo",
    "deep-orange",
  ]
  const index = props.member.email.charCodeAt(0) % colors.length
  return colors[index]
})

const isAdmin = computed(() => {
  return props.member.role === "admin"
})

// Methods
const confirmRemove = () => {
  showConfirmDialog.value = true
}

const removeMember = async () => {
  try {
    removing.value = true

    const response = await teamsApi.removeTeamMember(props.teamId, props.member.id)

    if (response.success) {
      showSnackbar(t("teams.memberRemovedSuccess"), "success")
      showConfirmDialog.value = false
      emit("remove", props.member.id)
    } else {
      throw new Error("Failed to remove member")
    }
  } catch (err: any) {
    console.error("Error removing team member:", err)

    // Handle specific error cases
    if (err.response?.data?.code === "USER_NOT_MEMBER") {
      showSnackbar(t("teams.errorUserNotMember"), "error")
    } else {
      showSnackbar(
        err.response?.data?.error?.message || t("teams.errorRemovingMember"),
        "error"
      )
    }
  } finally {
    removing.value = false
  }
}
</script>

<style scoped>
.team-member-card {
  transition: all 0.3s ease;
}

.team-member-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.team-member-card.inactive-member {
  opacity: 0.6;
}

.member-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
}

.member-header .member-info {
  flex: 1;
  min-width: 0;
}

.member-header .member-info .member-name {
  font-size: 1rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0 0 0.25rem;
}

.member-header .member-info .member-email {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0 0 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-header .member-info .member-status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.avatar-initials {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
}

.v-card-actions {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
</style>
