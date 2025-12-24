<template>
  <v-tooltip location="top">
    <template #activator="{ props }">
      <v-chip
        v-bind="props"
        :color="badgeColor"
        :variant="isLocked ? 'flat' : 'outlined'"
        size="small"
        :prepend-icon="badgeIcon"
        class="data-source-badge"
      >
        {{ badgeLabel }}
      </v-chip>
    </template>

    <div class="data-source-tooltip">
      <div class="tooltip-row">
        <strong>Source:</strong> {{ sourceLabel }}
      </div>
      <div class="tooltip-row">
        <strong>Statut:</strong>
        <span :class="lockClass">
          {{ lockStatus }}
        </span>
      </div>
      <div v-if="isLocked && lockedAt" class="tooltip-row">
        <strong>Verrouillé le:</strong> {{ formattedLockDate }}
      </div>
      <div v-if="isLocked && lockedReason" class="tooltip-row">
        <strong>Raison:</strong> {{ lockReasonLabel }}
      </div>
      <div v-if="isLocked" class="tooltip-hint">
        ✅ Les données CRM sont protégées contre les écrasements externes
      </div>
      <div v-else-if="dataSource === 'crm'" class="tooltip-hint">
        ⚠️ Données CRM non verrouillées - Seront protégées à la première modification
      </div>
      <div v-else class="tooltip-hint">
        ⚠️ Les données peuvent être écrasées par les synchronisations externes
      </div>
    </div>
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  dataSource: 'crm' | 'digiforma' | 'sage' | 'import'
  isLocked: boolean
  lockedAt?: Date | string | null
  lockedReason?: string | null
}

const props = defineProps<Props>()

const badgeColor = computed(() => {
  if (props.isLocked) {
    return 'primary' // Bleu pour locked (protégé)
  }

  switch (props.dataSource) {
    case 'crm':
      return 'success' // Vert pour CRM
    case 'digiforma':
      return 'info' // Bleu clair pour Digiforma
    case 'sage':
      return 'warning' // Orange pour Sage
    case 'import':
      return 'secondary' // Gris pour Import
    default:
      return 'default'
  }
})

const badgeIcon = computed(() => {
  if (props.isLocked) {
    return 'mdi-lock'
  }

  switch (props.dataSource) {
    case 'crm':
      return 'mdi-database'
    case 'digiforma':
      return 'mdi-school'
    case 'sage':
      return 'mdi-calculator'
    case 'import':
      return 'mdi-file-import'
    default:
      return 'mdi-help-circle'
  }
})

const badgeLabel = computed(() => {
  if (props.isLocked) {
    return 'CRM'
  }

  switch (props.dataSource) {
    case 'crm':
      return 'CRM'
    case 'digiforma':
      return 'Digiforma'
    case 'sage':
      return 'Sage'
    case 'import':
      return 'Import'
    default:
      return 'Unknown'
  }
})

const sourceLabel = computed(() => {
  switch (props.dataSource) {
    case 'crm':
      return 'CRM (Création manuelle)'
    case 'digiforma':
      return 'Digiforma (Synchronisation)'
    case 'sage':
      return 'Sage (Synchronisation)'
    case 'import':
      return 'Import CSV'
    default:
      return 'Inconnue'
  }
})

const lockStatus = computed(() => {
  return props.isLocked ? 'Verrouillé (Protégé)' : 'Non verrouillé'
})

const lockClass = computed(() => {
  return props.isLocked ? 'locked' : 'unlocked'
})

const formattedLockDate = computed(() => {
  if (!props.lockedAt) return ''
  const date = typeof props.lockedAt === 'string' ? new Date(props.lockedAt) : props.lockedAt
  return format(date, 'dd MMMM yyyy à HH:mm', { locale: fr })
})

const lockReasonLabel = computed(() => {
  switch (props.lockedReason) {
    case 'manual_creation':
      return 'Création manuelle dans le CRM'
    case 'manual_edit':
      return 'Modification manuelle dans le CRM'
    case 'note_created':
      return 'Note ajoutée (enrichissement CRM)'
    case 'meeting_created':
      return 'Réunion créée (enrichissement CRM)'
    default:
      return props.lockedReason || 'Non spécifiée'
  }
})
</script>

<style scoped>
.data-source-badge {
  font-weight: 500;
  cursor: help;
}

.data-source-tooltip {
  max-width: 300px;
  padding: 4px 0;
}

.tooltip-row {
  margin: 4px 0;
  line-height: 1.4;
}

.tooltip-row strong {
  margin-right: 6px;
}

.tooltip-hint {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 0.85em;
  font-style: italic;
  opacity: 0.9;
}

.locked {
  color: #4caf50;
  font-weight: 600;
}

.unlocked {
  color: #ff9800;
  font-weight: 600;
}
</style>
