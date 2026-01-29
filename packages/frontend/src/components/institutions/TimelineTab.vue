<template>
  <div class="timeline-tab">
    <!-- Filters and Search -->
    <v-card class="mb-4" elevation="0" variant="outlined">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              density="compact"
              prepend-inner-icon="mdi-magnify"
              :placeholder="t('timeline.searchPlaceholder')"
              variant="outlined"
              hide-details
              clearable
              @update:model-value="debouncedSearch"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-chip-group
              v-model="selectedTypes"
              multiple
              selected-class="text-primary"
              column
            >
              <v-chip filter variant="outlined" value="all" size="small">
                <v-icon start>mdi-all-inclusive</v-icon>
                {{ t('timeline.filters.all') }}
              </v-chip>
              <v-chip filter variant="outlined" value="meeting" size="small">
                <v-icon start>mdi-calendar-account</v-icon>
                {{ t('timeline.filters.meetings') }}
              </v-chip>
              <v-chip filter variant="outlined" value="call" size="small">
                <v-icon start>mdi-phone</v-icon>
                {{ t('timeline.filters.calls') }}
              </v-chip>
              <v-chip filter variant="outlined" value="note" size="small">
                <v-icon start>mdi-note-text</v-icon>
                {{ t('timeline.filters.notes') }}
              </v-chip>
              <v-chip filter variant="outlined" value="reminder" size="small">
                <v-icon start>mdi-bell-alert</v-icon>
                {{ t('timeline.filters.reminders') }}
              </v-chip>
              <v-chip filter variant="outlined" value="task" size="small">
                <v-icon start>mdi-checkbox-marked-circle-outline</v-icon>
                {{ t('timeline.filters.tasks') }}
              </v-chip>
              <v-chip filter variant="outlined" value="quote" size="small">
                <v-icon start>mdi-file-document-outline</v-icon>
                {{ t('timeline.filters.quotes') }}
              </v-chip>
              <v-chip filter variant="outlined" value="invoice" size="small">
                <v-icon start>mdi-receipt</v-icon>
                {{ t('timeline.filters.invoices') }}
              </v-chip>
              <v-chip filter variant="outlined" value="engagement_letter" size="small">
                <v-icon start>mdi-file-sign</v-icon>
                {{ t('timeline.filters.engagementLetters') }}
              </v-chip>
              <v-chip filter variant="outlined" value="external" size="small">
                <v-icon start>mdi-link-variant</v-icon>
                {{ t('timeline.filters.external') }}
              </v-chip>
            </v-chip-group>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Timeline Items -->
    <div v-if="error" class="text-center py-12">
      <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
      <p class="text-h6 mt-4">{{ error }}</p>
      <v-btn prepend-icon="mdi-refresh" @click="loadTimeline(true)" class="mt-4">{{ t('timeline.retry') }}</v-btn>
    </div>

    <div v-else-if="filteredItems.length === 0 && !loading">
      <v-card elevation="0" variant="outlined">
        <v-card-text class="text-center py-12">
          <v-icon size="64" color="grey-lighten-2">mdi-timeline-clock-outline</v-icon>
          <p class="text-h6 mt-4">{{ t('timeline.empty.title') }}</p>
          <p class="text-medium-emphasis">{{ t('timeline.empty.description') }}</p>
        </v-card-text>
      </v-card>
    </div>

    <v-timeline v-else side="end" truncate-line="both">
      <v-timeline-item
        v-for="item in filteredItems"
        :key="`${item.type}-${item.id}`"
        :dot-color="getItemColor(item.type)"
        size="small"
      >
        <template v-slot:icon>
          <v-icon size="small">{{ getItemIcon(item.type) }}</v-icon>
        </template>

        <v-card :class="`timeline-item-${item.type}`" elevation="2">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-chip :color="getItemColor(item.type)" variant="tonal" size="small" class="mr-2">
                {{ getItemLabel(item.type) }}
              </v-chip>
              <v-chip
                v-if="item.isExternal || isSimplifiedType(item.type)"
                color="orange"
                variant="tonal"
                size="small"
                class="mr-2"
                prepend-icon="mdi-link-variant"
              >
                {{ t('timeline.external') }}
              </v-chip>
              <span class="text-body-1">{{ getDisplayTitle(item) }}</span>
            </div>
            <v-chip size="x-small" variant="text">
              {{ formatRelativeTime(item.createdAt) }}
            </v-chip>
          </v-card-title>

          <v-card-text>
            <!-- Only show description for notes, tasks, meetings, reminders, calls - not for billing documents -->
            <div v-if="item.description && !isBillingDocumentType(item.type)" class="text-body-2 mb-3">
              {{ item.description }}
            </div>

            <div class="d-flex flex-wrap ga-2 mb-2">
              <!-- User info -->
              <v-chip v-if="item.user" size="small" variant="tonal" prepend-icon="mdi-account-outline">
                {{ item.user.firstName }} {{ item.user.lastName }}
              </v-chip>

              <!-- Assignee info for tasks -->
              <v-chip v-if="item.assignee" size="small" variant="tonal" color="secondary" prepend-icon="mdi-account-check">
                {{ t('timeline.assignedTo') }}: {{ item.assignee.firstName }} {{ item.assignee.lastName }}
              </v-chip>

              <!-- Type-specific metadata -->
              <template v-if="item.type === 'meeting'">
                <v-chip v-if="item.metadata.startDate" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  {{ formatDateTime(item.metadata.startDate) }}
                </v-chip>
                <v-chip v-if="item.metadata.location" size="small" variant="outlined" prepend-icon="mdi-map-marker">
                  {{ item.metadata.location }}
                </v-chip>
                <v-chip v-if="item.metadata.status" size="small" :color="getMeetingStatusColor(item.metadata.status)" variant="tonal">
                  {{ formatMeetingStatus(item.metadata.status) }}
                </v-chip>
              </template>

              <template v-if="item.type === 'call'">
                <v-chip v-if="item.metadata.phoneNumber" size="small" variant="outlined" prepend-icon="mdi-phone">
                  {{ item.metadata.phoneNumber }}
                </v-chip>
                <v-chip v-if="item.metadata.duration" size="small" variant="outlined" prepend-icon="mdi-clock-outline">
                  {{ formatDuration(item.metadata.duration) }}
                </v-chip>
                <v-chip v-if="item.metadata.callType" size="small" :color="getCallTypeColor(item.metadata.callType)" variant="tonal">
                  {{ formatCallType(item.metadata.callType) }}
                </v-chip>
              </template>

              <template v-if="item.type === 'reminder'">
                <v-chip v-if="item.metadata.dueDate" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  {{ formatDateTime(item.metadata.dueDate) }}
                </v-chip>
                <v-chip v-if="item.metadata.priority" size="small" :color="getPriorityColor(item.metadata.priority)" variant="tonal">
                  {{ formatPriority(item.metadata.priority) }}
                </v-chip>
                <v-chip v-if="item.metadata.isCompleted" size="small" color="success" variant="tonal" prepend-icon="mdi-check">
                  {{ t('timeline.completed') }}
                </v-chip>
              </template>

              <template v-if="item.type === 'task'">
                <v-chip v-if="item.metadata.status" size="small" :color="getTaskStatusColor(item.metadata.status)" variant="tonal">
                  {{ formatTaskStatus(item.metadata.status) }}
                </v-chip>
                <v-chip v-if="item.metadata.priority" size="small" :color="getPriorityColor(item.metadata.priority)" variant="tonal">
                  {{ formatPriority(item.metadata.priority) }}
                </v-chip>
                <v-chip v-if="item.metadata.dueDate" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  {{ t('timeline.dueDate') }}: {{ formatDate(item.metadata.dueDate) }}
                </v-chip>
              </template>

              <template v-if="item.type === 'note'">
                <v-chip v-if="item.metadata.isPrivate" size="small" color="error" variant="tonal" prepend-icon="mdi-lock">
                  {{ t('timeline.private') }}
                </v-chip>
                <v-chip v-if="item.metadata.tags && item.metadata.tags.length" size="small" variant="outlined" prepend-icon="mdi-tag">
                  {{ item.metadata.tags.join(", ") }}
                </v-chip>
              </template>

              <template v-if="item.type === 'quote'">
                <v-chip size="small" :color="getQuoteStatusColor(item.metadata.status)" variant="tonal">
                  {{ formatQuoteStatus(item.metadata.status) }}
                </v-chip>
                <v-chip size="small" variant="outlined" prepend-icon="mdi-currency-eur">
                  {{ formatCurrency(item.metadata.total) }}
                </v-chip>
                <v-chip v-if="item.metadata.validUntil" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  {{ t('timeline.validUntil') }}: {{ formatDate(item.metadata.validUntil) }}
                </v-chip>
                <v-chip v-if="item.metadata.orderNumber" size="small" color="success" variant="tonal" prepend-icon="mdi-cart-check">
                  {{ item.metadata.orderNumber }}
                </v-chip>
              </template>

              <template v-if="item.type === 'invoice'">
                <v-chip size="small" :color="getInvoiceStatusColor(item.metadata.status)" variant="tonal">
                  {{ formatInvoiceStatus(item.metadata.status) }}
                </v-chip>
                <v-chip size="small" variant="outlined" prepend-icon="mdi-currency-eur">
                  {{ formatCurrency(item.metadata.total) }}
                </v-chip>
                <v-chip v-if="item.metadata.dueDate" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  {{ t('timeline.dueDate') }}: {{ formatDate(item.metadata.dueDate) }}
                </v-chip>
                <v-chip v-if="item.metadata.paidAt" size="small" color="success" variant="tonal" prepend-icon="mdi-check-circle">
                  {{ t('timeline.paidOn') }}: {{ formatDate(item.metadata.paidAt) }}
                </v-chip>
                <v-chip v-if="item.metadata.remainingAmount > 0" size="small" color="warning" variant="tonal" prepend-icon="mdi-cash-clock">
                  {{ t('timeline.remaining') }}: {{ formatCurrency(item.metadata.remainingAmount) }}
                </v-chip>
              </template>

              <template v-if="item.type === 'engagement_letter'">
                <v-chip size="small" :color="getEngagementLetterStatusColor(item.metadata.status)" variant="tonal">
                  {{ formatEngagementLetterStatus(item.metadata.status) }}
                </v-chip>
                <v-chip size="small" variant="outlined" prepend-icon="mdi-currency-eur">
                  {{ formatCurrency(item.metadata.estimatedTotal) }}
                </v-chip>
                <v-chip v-if="item.metadata.missionType" size="small" variant="outlined" prepend-icon="mdi-briefcase">
                  {{ formatMissionType(item.metadata.missionType) }}
                </v-chip>
                <v-chip v-if="item.metadata.validUntil" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  {{ t('timeline.validUntil') }}: {{ formatDate(item.metadata.validUntil) }}
                </v-chip>
                <v-chip v-if="item.metadata.acceptedAt" size="small" color="success" variant="tonal" prepend-icon="mdi-check-circle">
                  {{ t('timeline.acceptedOn') }}: {{ formatDate(item.metadata.acceptedAt) }}
                </v-chip>
              </template>

              <!-- Simplified transactions (external references) -->
              <template v-if="isSimplifiedType(item.type)">
                <v-chip size="small" :color="getSimplifiedStatusColor(item.metadata.status, item.type)" variant="tonal">
                  {{ formatSimplifiedStatus(item.metadata.status, item.type) }}
                </v-chip>
                <v-chip size="small" variant="outlined" prepend-icon="mdi-currency-eur">
                  {{ formatCurrency(item.metadata.amountTtc) }}
                </v-chip>
                <v-chip v-if="item.metadata.referenceNumber" size="small" variant="outlined" prepend-icon="mdi-identifier">
                  {{ item.metadata.referenceNumber }}
                </v-chip>
                <v-chip v-if="item.metadata.date" size="small" variant="outlined" prepend-icon="mdi-calendar">
                  {{ formatDate(item.metadata.date) }}
                </v-chip>
                <!-- Invoice specific -->
                <v-chip v-if="item.type === 'simplified_invoice' && item.metadata.paymentStatus" size="small" :color="getPaymentStatusColor(item.metadata.paymentStatus)" variant="tonal" prepend-icon="mdi-cash">
                  {{ formatPaymentStatus(item.metadata.paymentStatus) }}
                </v-chip>
                <v-chip v-if="item.type === 'simplified_invoice' && item.metadata.dueDate" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  {{ t('timeline.dueDate') }}: {{ formatDate(item.metadata.dueDate) }}
                </v-chip>
                <!-- Contract specific -->
                <v-chip v-if="item.type === 'simplified_contract' && item.metadata.contractType" size="small" variant="outlined" prepend-icon="mdi-file-document-edit">
                  {{ formatContractType(item.metadata.contractType) }}
                </v-chip>
                <v-chip v-if="item.type === 'simplified_contract' && item.metadata.contractStartDate" size="small" variant="outlined" prepend-icon="mdi-calendar-start">
                  {{ formatDate(item.metadata.contractStartDate) }} - {{ item.metadata.contractEndDate ? formatDate(item.metadata.contractEndDate) : t('timeline.ongoing') }}
                </v-chip>
              </template>
            </div>

            <div class="text-caption text-medium-emphasis">
              <v-icon size="x-small" class="mr-1">mdi-clock-outline</v-icon>
              {{ formatDateTime(item.createdAt) }}
            </div>
          </v-card-text>
        </v-card>
      </v-timeline-item>

      <!-- Loading more indicator (shown when loading additional items) -->
      <v-timeline-item v-if="loading && items.length > 0" dot-color="primary">
        <v-card elevation="1" class="loading-more-card">
          <v-card-text class="text-center py-4">
            <v-progress-circular indeterminate color="primary" size="32" />
            <p class="text-body-2 mt-2 font-weight-medium">{{ t('timeline.loadingMore') }}</p>
            <p class="text-caption text-medium-emphasis">
              {{ t('timeline.itemsLoaded', { loaded: items.length, total: total }) }}
            </p>
          </v-card-text>
        </v-card>
      </v-timeline-item>

      <!-- Intersection observer trigger for infinite scroll -->
      <v-timeline-item v-if="hasMore && !loading" dot-color="grey-lighten-2">
        <v-card v-intersect="onIntersect" elevation="0" variant="outlined" class="load-trigger-card">
          <v-card-text class="text-center py-3">
            <v-icon color="grey" class="mb-1">mdi-dots-horizontal</v-icon>
            <p class="text-caption text-medium-emphasis">
              {{ t('timeline.scrollForMore', { remaining: total - items.length }) }}
            </p>
          </v-card-text>
        </v-card>
      </v-timeline-item>

      <!-- Initial loading skeleton -->
      <v-timeline-item v-if="loading && items.length === 0" v-for="i in 3" :key="`skeleton-${i}`" dot-color="grey">
        <v-card elevation="2">
          <v-card-title>
            <v-skeleton-loader type="text" width="200" />
          </v-card-title>
          <v-card-text>
            <v-skeleton-loader type="paragraph" />
          </v-card-text>
        </v-card>
      </v-timeline-item>
    </v-timeline>

    <!-- Items count indicator -->
    <div v-if="items.length > 0 && !loading" class="text-center mt-4 mb-2">
      <v-chip size="small" variant="tonal" color="grey">
        {{ t('timeline.showingItems', { count: filteredItems.length, total: total }) }}
      </v-chip>
    </div>

    <!-- Load more button (fallback for users who prefer clicking) -->
    <div v-if="hasMore && !loading && filteredItems.length > 0" class="text-center mt-2">
      <v-btn variant="text" size="small" prepend-icon="mdi-chevron-down" @click="loadMore">
        {{ t('timeline.loadMore') }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "vue-i18n"
import { timelineApi } from "@/services/api"
import type { TimelineItem, TimelineItemType } from "@/services/api/timeline"

const { t } = useI18n()

const props = defineProps<{
  institutionId: string
  isActive?: boolean // For lazy loading - only load when tab is active
}>()

// Track if data has been loaded at least once
const hasLoadedOnce = ref(false)

// State
const items = ref<TimelineItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const offset = ref(0)
const total = ref(0)
const limit = 15 // Load fewer items initially for better UX
const searchQuery = ref("")
const selectedTypes = ref<(TimelineItemType | "all" | "external")[]>(["all"])

// Computed
const hasMore = computed(() => items.value.length < total.value)

const filteredItems = computed(() => {
  let filtered = items.value

  // Filter by type (client-side)
  if (!selectedTypes.value.includes("all")) {
    filtered = filtered.filter((item) => {
      // Handle "external" filter - matches all simplified transaction types
      if (selectedTypes.value.includes("external" as TimelineItemType)) {
        if (isSimplifiedType(item.type)) {
          return true
        }
      }
      // Handle specific type filters - also match simplified versions
      // e.g., "quote" filter should match both "quote" and "simplified_quote"
      for (const selectedType of selectedTypes.value) {
        if (selectedType === "external") continue
        if (item.type === selectedType) return true
        // Also match simplified version of the type
        if (item.type === `simplified_${selectedType}`) return true
      }
      return false
    })
  }

  // Filter by search query (client-side for loaded items)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Methods
const loadTimeline = async (reset = false) => {
  if (loading.value) return

  if (reset) {
    items.value = []
    offset.value = 0
    total.value = 0
  }

  loading.value = true
  error.value = null

  try {
    const response = await timelineApi.getInstitutionTimeline(props.institutionId, {
      limit,
      offset: offset.value,
    })

    // Check if response and required properties exist
    if (!response || !response.items || !response.pagination) {
      console.warn("Invalid timeline data structure returned from API:", response)
      error.value = "Format de données invalide"
      loading.value = false
      return
    }

    if (reset) {
      items.value = response.items
    } else {
      items.value = [...items.value, ...response.items]
    }

    offset.value = items.value.length
    total.value = response.pagination.total
  } catch (err: any) {
    error.value = err.message || "Impossible de charger la timeline"
    console.error("Failed to load timeline:", err)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (hasMore.value && !loading.value) {
    loadTimeline()
  }
}

const onIntersect = (isIntersecting: boolean, entries: IntersectionObserverEntry[]) => {
  // Vuetify 3 v-intersect passes isIntersecting as first param
  if (isIntersecting && hasMore.value && !loading.value) {
    loadMore()
  }
}

// Debounced search
let searchTimeout: number | null = null
const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    // For now, search is client-side on loaded items
    // Could be enhanced to trigger server-side search
  }, 300)
}

// Formatters
const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatRelativeTime = (date: string): string => {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return t("timeline.relativeTime.now")
  if (diffMins < 60) return t("timeline.relativeTime.minutes", { n: diffMins })
  if (diffHours < 24) return t("timeline.relativeTime.hours", { n: diffHours })
  if (diffDays < 7) return t("timeline.relativeTime.days", { n: diffDays })
  return formatDate(date)
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

const formatCallType = (type: string): string => {
  return t(`timeline.callTypes.${type}`) || type
}

// Format the title displayed for a call based on its type
const formatCallTitle = (item: TimelineItem): string => {
  const callType = item.metadata?.callType
  const phoneNumber = item.title // Backend now sends phoneNumber as title

  if (callType === "incoming") {
    return t("timeline.callFrom", { phone: phoneNumber })
  } else if (callType === "outgoing") {
    return t("timeline.callTo", { phone: phoneNumber })
  } else if (callType === "missed") {
    return t("timeline.callMissed", { phone: phoneNumber })
  }
  return phoneNumber
}

// Get the display title for a timeline item (handles call special case)
const getDisplayTitle = (item: TimelineItem): string => {
  if (item.type === "call") {
    return formatCallTitle(item)
  }
  return item.title
}

const formatMeetingStatus = (status: string): string => {
  return t(`timeline.meetingStatus.${status}`) || status
}

const formatTaskStatus = (status: string): string => {
  return t(`timeline.taskStatus.${status}`) || status
}

const formatPriority = (priority: string): string => {
  return t(`timeline.priorities.${priority}`) || priority
}

// Icon and color helpers
const getItemIcon = (type: TimelineItemType): string => {
  const icons: Record<TimelineItemType, string> = {
    note: "mdi-note-text",
    meeting: "mdi-calendar-account",
    call: "mdi-phone",
    reminder: "mdi-bell-alert",
    task: "mdi-checkbox-marked-circle-outline",
    quote: "mdi-file-document-outline",
    invoice: "mdi-receipt",
    engagement_letter: "mdi-file-sign",
    simplified_quote: "mdi-file-document-outline",
    simplified_invoice: "mdi-receipt",
    simplified_engagement_letter: "mdi-file-sign",
    simplified_contract: "mdi-file-document-edit-outline",
  }
  return icons[type] || "mdi-circle"
}

const getItemColor = (type: TimelineItemType): string => {
  const colors: Record<TimelineItemType, string> = {
    note: "warning",
    meeting: "primary",
    call: "success",
    reminder: "info",
    task: "secondary",
    quote: "purple",
    invoice: "teal",
    engagement_letter: "indigo",
    simplified_quote: "purple",
    simplified_invoice: "teal",
    simplified_engagement_letter: "indigo",
    simplified_contract: "deep-purple",
  }
  return colors[type] || "grey"
}

const getItemLabel = (type: TimelineItemType): string => {
  return t(`timeline.labels.${type}`) || type
}

// Helper to check if a type is a simplified transaction type
const isSimplifiedType = (type: TimelineItemType): boolean => {
  return type.startsWith("simplified_")
}

// Helper to check if a type is a billing document (internal or external)
const isBillingDocumentType = (type: TimelineItemType): boolean => {
  return ["quote", "invoice", "engagement_letter", "simplified_quote", "simplified_invoice", "simplified_engagement_letter", "simplified_contract"].includes(type)
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

// Quote status helpers
const getQuoteStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: "grey",
    sent: "info",
    accepted: "success",
    rejected: "error",
    expired: "warning",
    cancelled: "grey-darken-1",
    ordered: "purple",
  }
  return colors[status] || "grey"
}

const formatQuoteStatus = (status: string): string => {
  return t(`quotes.status.${status}`) || status
}

// Invoice status helpers
const getInvoiceStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: "grey",
    sent: "info",
    paid: "success",
    partial: "warning",
    overdue: "error",
    cancelled: "grey-darken-1",
  }
  return colors[status] || "grey"
}

const formatInvoiceStatus = (status: string): string => {
  return t(`invoices.status.${status}`) || status
}

// Engagement letter status helpers
const getEngagementLetterStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: "grey",
    sent: "info",
    accepted: "success",
    rejected: "error",
    cancelled: "grey-darken-1",
    completed: "teal",
  }
  return colors[status] || "grey"
}

const formatEngagementLetterStatus = (status: string): string => {
  return t(`engagementLetters.status.${status}`) || status
}

const formatMissionType = (missionType: string): string => {
  return t(`engagementLetters.missionType.${missionType}`) || missionType
}

const getCallTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    incoming: "success",
    outgoing: "info",
    missed: "error",
  }
  return colors[type] || "grey"
}

const getMeetingStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    scheduled: "primary",
    completed: "success",
    cancelled: "error",
  }
  return colors[status] || "grey"
}

const getTaskStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "warning",
    in_progress: "info",
    blocked: "error",
    completed: "success",
    cancelled: "grey",
  }
  return colors[status] || "grey"
}

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    low: "info",
    medium: "warning",
    high: "error",
    urgent: "purple",
  }
  return colors[priority] || "grey"
}

// Simplified transaction helpers
const getSimplifiedStatusColor = (status: string, type: TimelineItemType): string => {
  // For invoices
  if (type === "simplified_invoice") {
    const colors: Record<string, string> = {
      pending: "warning",
      paid: "success",
      partial: "orange",
      overdue: "error",
      cancelled: "grey",
    }
    return colors[status] || "grey"
  }
  // For quotes and engagement letters
  if (type === "simplified_quote" || type === "simplified_engagement_letter") {
    const colors: Record<string, string> = {
      draft: "grey",
      sent: "info",
      accepted: "success",
      rejected: "error",
      expired: "warning",
    }
    return colors[status] || "grey"
  }
  // For contracts
  if (type === "simplified_contract") {
    const colors: Record<string, string> = {
      active: "success",
      expired: "warning",
      terminated: "error",
    }
    return colors[status] || "grey"
  }
  return "grey"
}

const formatSimplifiedStatus = (status: string, _type: TimelineItemType): string => {
  return t(`simplifiedTransactions.status.${status}`) || status
}

const getPaymentStatusColor = (paymentStatus: string): string => {
  const colors: Record<string, string> = {
    pending: "warning",
    partial: "orange",
    paid: "success",
  }
  return colors[paymentStatus] || "grey"
}

const formatPaymentStatus = (paymentStatus: string): string => {
  return t(`simplifiedTransactions.paymentStatus.${paymentStatus}`) || paymentStatus
}

const formatContractType = (contractType: string): string => {
  return t(`simplifiedTransactions.contractType.${contractType}`) || contractType
}

// Watch for filter changes - deselect "all" when specific filters are selected
watch(
  () => selectedTypes.value,
  (newTypes, oldTypes) => {
    if (!oldTypes) return

    // If "all" was not selected and now a specific type is selected, make sure "all" is not selected
    const hadAll = oldTypes.includes("all")
    const hasAll = newTypes.includes("all")
    const specificTypes = newTypes.filter((t) => t !== "all")

    if (hadAll && specificTypes.length > 0 && hasAll) {
      // User selected a specific filter while "all" was selected - remove "all"
      selectedTypes.value = specificTypes
    } else if (!hadAll && hasAll && specificTypes.length > 0) {
      // User selected "all" while specific filters were selected - keep only "all"
      selectedTypes.value = ["all"]
    } else if (newTypes.length === 0) {
      // If nothing selected, default to "all"
      selectedTypes.value = ["all"]
    }
  },
  { deep: true }
)

// Lazy loading - only load when tab becomes active for the first time
watch(
  () => props.isActive,
  (isActive) => {
    if (isActive && !hasLoadedOnce.value) {
      hasLoadedOnce.value = true
      loadTimeline(true)
    }
  },
  { immediate: true }
)

// Also load if isActive is not provided (backwards compatibility)
if (props.isActive === undefined) {
  hasLoadedOnce.value = true
  loadTimeline(true)
}
</script>

<style scoped>
.timeline-tab {
  padding: 0.5rem;
}

.v-timeline {
  padding-top: 0;
}

.loading-more-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  border: 1px dashed rgba(var(--v-theme-primary), 0.3);
}

.load-trigger-card {
  border-style: dashed;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.load-trigger-card:hover {
  opacity: 1;
}
</style>
