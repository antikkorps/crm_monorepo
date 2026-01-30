<template>
  <div class="collaboration-tab">
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-body-1">{{ t("collaboration.loading") }}</p>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
      <p class="text-h6 mt-4">{{ error }}</p>
      <v-btn prepend-icon="mdi-refresh" @click="loadData" class="mt-4">{{
        t("collaboration.retry")
      }}</v-btn>
    </div>

    <div v-else-if="collaborationData">
      <!-- Stats Cards -->
      <v-row class="mb-6">
        <v-col cols="6" sm="4" md="3" lg="2" v-for="stat in statsCards" :key="stat.label">
          <v-card :color="stat.color" variant="tonal" class="text-center fill-height">
            <v-card-text>
              <v-icon size="32" class="mb-2">{{ stat.icon }}</v-icon>
              <div class="text-h4 font-weight-bold">{{ stat.value }}</div>
              <div class="text-body-2">{{ stat.label }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row align="stretch">
        <!-- Upcoming Meetings -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="primary">mdi-calendar-account</v-icon>
                <span>{{ t("collaboration.upcomingMeetings") }}</span>
                <v-chip class="ml-2" size="small" color="primary" variant="tonal">
                  {{ collaborationData.stats.upcomingMeetings }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="primary"
                @click="openMeetingForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="collaborationData.upcomingMeetings.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-calendar-blank</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noUpcomingMeetings") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="meeting in collaborationData.upcomingMeetings"
                :key="meeting.id"
                @click="openMeetingForEdit(meeting)"
              >
                <template v-slot:prepend>
                  <v-avatar color="primary" variant="tonal">
                    <v-icon>mdi-calendar-account</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">{{
                  meeting.title
                }}</v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(meeting.startDate) }} -
                    {{ formatTime(meeting.startDate) }}
                  </div>
                  <div v-if="meeting.organizer" class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-account-outline</v-icon>
                    {{ meeting.organizer.firstName }} {{ meeting.organizer.lastName }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Recent Calls -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="success">mdi-phone</v-icon>
                <span>{{ t("collaboration.recentCalls") }}</span>
                <v-chip class="ml-2" size="small" color="success" variant="tonal">
                  {{ collaborationData.stats.totalCalls }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="success"
                @click="openCallForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="collaborationData.recentCalls.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-phone-off</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noRecentCalls") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="call in collaborationData.recentCalls"
                :key="call.id"
                @click="openCallForEdit(call)"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getCallColor(call.callType)" variant="tonal">
                    <v-icon>{{ getCallIcon(call.callType) }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium d-flex align-center">
                  {{ formatCallType(call.callType) }}
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    :color="getCallColor(call.callType)"
                    variant="tonal"
                  >
                    {{ call.duration ? formatDuration(call.duration) : "N/A" }}
                  </v-chip>
                  <!-- User avatar -->
                  <v-chip v-if="call.user" size="small" variant="tonal" color="primary" class="ml-2">
                    <v-avatar start size="18" :image="getUserAvatarUrl(call.user)" />
                    {{ call.user.firstName }} {{ call.user.lastName }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(call.createdAt) }} - {{ formatTime(call.createdAt) }}
                  </div>
                  <div v-if="call.summary" class="text-truncate mt-1">
                    {{ call.summary }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Recent Notes -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="warning">mdi-note-text</v-icon>
                <span>{{ t("collaboration.recentNotes") }}</span>
                <v-chip class="ml-2" size="small" color="warning" variant="tonal">
                  {{ collaborationData.stats.totalNotes }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="warning"
                @click="openNoteForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="collaborationData.recentNotes.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-note-off-outline</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noRecentNotes") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="note in collaborationData.recentNotes"
                :key="note.id"
                @click="openNoteForEdit(note)"
              >
                <template v-slot:prepend>
                  <v-avatar color="warning" variant="tonal">
                    <v-icon>{{ note.isPrivate ? "mdi-lock" : "mdi-note-text" }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ note.title }}
                  <v-chip
                    v-if="note.isPrivate"
                    size="x-small"
                    class="ml-2"
                    color="error"
                    variant="tonal"
                  >
                    <v-icon size="x-small" start>mdi-lock</v-icon>
                    {{ t("collaboration.private") }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="text-truncate">{{ stripHtml(note.content) }}</div>
                  <div class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(note.createdAt) }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Pending Reminders -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="info">mdi-bell-alert</v-icon>
                <span>{{ t("collaboration.pendingReminders") }}</span>
                <v-chip class="ml-2" size="small" color="info" variant="tonal">
                  {{ collaborationData.stats.pendingReminders }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="info"
                @click="openReminderForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="collaborationData.pendingReminders.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-bell-off-outline</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noPendingReminders") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="reminder in collaborationData.pendingReminders"
                :key="reminder.id"
                @click="openReminderForEdit(reminder)"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getPriorityColor(reminder.priority)" variant="tonal">
                    <v-icon>mdi-bell-alert</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ reminder.title }}
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    :color="getPriorityColor(reminder.priority)"
                    variant="tonal"
                  >
                    {{ formatPriority(reminder.priority) }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                    {{ formatDate(reminder.reminderDate) }} -
                    {{ formatTime(reminder.reminderDate) }}
                  </div>
                  <div v-if="reminder.description" class="text-truncate mt-1">
                    {{ reminder.description }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Open Tasks -->
        <v-col cols="12" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="secondary"
                  >mdi-checkbox-marked-circle-outline</v-icon
                >
                <span>{{ t("tasks.open") }}</span>
                <v-chip class="ml-2" size="small" color="secondary" variant="tonal">
                  {{ collaborationData.stats.openTasks }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="secondary"
                @click="openTaskForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div v-if="collaborationData.openTasks.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-2"
                >mdi-checkbox-marked-circle-outline</v-icon
              >
              <p class="mt-2 text-medium-emphasis">{{ t("tasks.noOpenTasks") }}</p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="task in collaborationData.openTasks"
                :key="task.id"
                @click="openTaskForEdit(task)"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getTaskStatusColor(task.status)" variant="tonal">
                    <v-icon>mdi-clipboard-text</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ task.title }}
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    :color="getTaskStatusColor(task.status)"
                    variant="tonal"
                  >
                    {{ formatTaskStatus(task.status) }}
                  </v-chip>
                  <v-chip
                    v-if="task.priority"
                    size="x-small"
                    class="ml-1"
                    :color="getPriorityColor(task.priority)"
                    variant="tonal"
                  >
                    {{ formatPriority(task.priority) }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div v-if="task.assignee" class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-account-outline</v-icon>
                    {{ task.assignee.firstName }} {{ task.assignee.lastName }}
                  </div>
                  <div v-if="task.dueDate" class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-calendar-clock</v-icon>
                    {{ t("tasks.dueDate") }}: {{ formatDate(task.dueDate) }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Recent Quotes -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="purple">mdi-file-document-outline</v-icon>
                <span>{{ t("collaboration.recentQuotes") }}</span>
                <v-chip class="ml-2" size="small" color="purple" variant="tonal">
                  {{ collaborationData.stats.totalQuotes ?? 0 }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="purple"
                @click="navigateTo('/quotes')"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="!collaborationData.recentQuotes || collaborationData.recentQuotes.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-file-document-outline</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noRecentQuotes") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="quote in collaborationData.recentQuotes"
                :key="quote.id"
                @click="navigateToItem('/quotes', quote.id)"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getQuoteStatusColor(quote.status)" variant="tonal">
                    <v-icon>mdi-file-document-outline</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ quote.quoteNumber }} - {{ quote.title }}
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    :color="getQuoteStatusColor(quote.status)"
                    variant="tonal"
                  >
                    {{ formatQuoteStatus(quote.status) }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-currency-eur</v-icon>
                    {{ formatCurrency(quote.total) }}
                  </div>
                  <div v-if="quote.validUntil" class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-calendar-clock</v-icon>
                    {{ t("collaboration.validUntil") }}: {{ formatDate(quote.validUntil) }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Recent Invoices -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="teal">mdi-receipt</v-icon>
                <span>{{ t("collaboration.recentInvoices") }}</span>
                <v-chip class="ml-2" size="small" color="teal" variant="tonal">
                  {{ collaborationData.stats.totalInvoices ?? 0 }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="teal"
                @click="navigateTo('/invoices')"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="!collaborationData.recentInvoices || collaborationData.recentInvoices.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-receipt</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noRecentInvoices") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="invoice in collaborationData.recentInvoices"
                :key="invoice.id"
                @click="navigateToItem(`/invoices/${invoice.id}`, invoice.id)"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getInvoiceStatusColor(invoice.status)" variant="tonal">
                    <v-icon>mdi-receipt</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ invoice.invoiceNumber }} - {{ invoice.title }}
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    :color="getInvoiceStatusColor(invoice.status)"
                    variant="tonal"
                  >
                    {{ formatInvoiceStatus(invoice.status) }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-currency-eur</v-icon>
                    {{ formatCurrency(invoice.total) }}
                    <span v-if="invoice.remainingAmount > 0" class="ml-2 text-error">
                      ({{ t("collaboration.remaining") }}: {{ formatCurrency(invoice.remainingAmount) }})
                    </span>
                  </div>
                  <div v-if="invoice.dueDate" class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-calendar-clock</v-icon>
                    {{ t("collaboration.dueDate") }}: {{ formatDate(invoice.dueDate) }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Engagement Letters -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="indigo">mdi-briefcase-outline</v-icon>
                <span>{{ t("collaboration.engagementLetters") }}</span>
                <v-chip class="ml-2" size="small" color="indigo" variant="tonal">
                  {{ collaborationData.stats.totalEngagementLetters ?? 0 }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="indigo"
                @click="navigateTo('/engagement-letters')"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="!collaborationData.recentEngagementLetters || collaborationData.recentEngagementLetters.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-briefcase-outline</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("collaboration.noEngagementLetters") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="letter in collaborationData.recentEngagementLetters"
                :key="letter.id"
                @click="navigateToItem('/engagement-letters', letter.id)"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getEngagementLetterStatusColor(letter.status)" variant="tonal">
                    <v-icon>mdi-briefcase-outline</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ letter.letterNumber }} - {{ letter.title }}
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    :color="getEngagementLetterStatusColor(letter.status)"
                    variant="tonal"
                  >
                    {{ formatEngagementLetterStatus(letter.status) }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-currency-eur</v-icon>
                    {{ formatCurrency(letter.estimatedTotal) }}
                  </div>
                  <div v-if="letter.validUntil" class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-calendar-clock</v-icon>
                    {{ t("collaboration.validUntil") }}: {{ formatDate(letter.validUntil) }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- External References (Simplified Transactions) -->
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="flex-grow-1">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="orange">mdi-link-variant</v-icon>
                <span>{{ t("simplifiedTransactions.title") }}</span>
                <v-chip class="ml-2" size="small" color="orange" variant="tonal">
                  {{ collaborationData.stats.totalSimplifiedTransactions ?? 0 }}
                </v-chip>
              </div>
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-plus"
                color="orange"
                @click="openSimplifiedTransactionForm"
              >
                {{ t("collaboration.add") }}
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <div
              v-if="!collaborationData.recentSimplifiedTransactions || collaborationData.recentSimplifiedTransactions.length === 0"
              class="text-center py-8"
            >
              <v-icon size="48" color="grey-lighten-2">mdi-link-variant</v-icon>
              <p class="mt-2 text-medium-emphasis">
                {{ t("simplifiedTransactions.noTransactionsFound") }}
              </p>
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="tx in collaborationData.recentSimplifiedTransactions"
                :key="tx.id"
                @click="openSimplifiedTransactionForEdit(tx)"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getSimplifiedTypeColor(tx.type)" variant="tonal">
                    <v-icon>{{ getSimplifiedTypeIcon(tx.type) }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium">
                  {{ tx.referenceNumber ? `${tx.referenceNumber} - ` : '' }}{{ tx.title }}
                  <v-chip
                    size="x-small"
                    class="ml-2"
                    color="orange"
                    variant="tonal"
                  >
                    {{ t("simplifiedTransactions.externalBadge") }}
                  </v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  <div class="d-flex align-center">
                    <v-icon size="small" class="mr-1">mdi-currency-eur</v-icon>
                    {{ formatCurrency(tx.amountTtc) }}
                  </div>
                  <div class="d-flex align-center mt-1">
                    <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
                    {{ formatDate(tx.date) }}
                  </div>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Quick Add/Edit Dialogs -->
    <CallForm
      v-model="showCallForm"
      :call="selectedCall"
      :loading="formLoading"
      :preselected-institution-id="props.institutionId"
      @submit="handleCallSubmit"
      @cancel="showCallForm = false; selectedCall = null"
    />

    <MeetingForm
      v-model="showMeetingForm"
      :meeting="selectedMeeting"
      :loading="formLoading"
      :preselected-institution-id="props.institutionId"
      @submit="handleMeetingSubmit"
      @cancel="showMeetingForm = false; selectedMeeting = null"
    />

    <NoteForm
      v-model="showNoteForm"
      :note="selectedNote"
      :loading="formLoading"
      :preselected-institution-id="props.institutionId"
      @submit="handleNoteSubmit"
      @cancel="showNoteForm = false; selectedNote = null"
    />

    <ReminderForm
      v-model="showReminderForm"
      :reminder="selectedReminder"
      :loading="formLoading"
      :preselected-institution-id="props.institutionId"
      @submit="handleReminderSubmit"
      @cancel="showReminderForm = false; selectedReminder = null"
    />

    <TaskForm
      v-model="showTaskForm"
      :task="selectedTask"
      :loading="formLoading"
      :preselected-institution-id="props.institutionId"
      @submit="handleTaskSubmit"
      @cancel="showTaskForm = false; selectedTask = null"
    />

    <SimplifiedTransactionForm
      v-model="showSimplifiedTransactionForm"
      :transaction="selectedSimplifiedTransaction"
      :institution-id="props.institutionId"
      @saved="handleSimplifiedTransactionSaved"
      @cancelled="showSimplifiedTransactionForm = false; selectedSimplifiedTransaction = null"
    />
  </div>
</template>

<script setup lang="ts">
import CallForm from "@/components/calls/CallForm.vue"
import MeetingForm from "@/components/meetings/MeetingForm.vue"
import NoteForm from "@/components/notes/NoteForm.vue"
import ReminderForm from "@/components/reminders/ReminderForm.vue"
import TaskForm from "@/components/tasks/TaskForm.vue"
import SimplifiedTransactionForm from "@/components/billing/simplified/SimplifiedTransactionForm.vue"
import { callsApi, institutionsApi, meetingsApi, notesApi, remindersApi, tasksApi } from "@/services/api"
import type {
  CallCreateRequest,
  CallUpdateRequest,
  MeetingCreateRequest,
  MeetingUpdateRequest,
  NoteCreateRequest,
  NoteUpdateRequest,
  ReminderCreateRequest,
  ReminderUpdateRequest,
  TaskCreateRequest,
  TaskUpdateRequest,
} from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

interface Props {
  institutionId: string
}

const props = defineProps<Props>()
const router = useRouter()
const { t } = useI18n()

const collaborationData = ref<any>(null)
const loading = ref(false)
const error = ref("")

// Quick add/edit dialog states
const showCallForm = ref(false)
const showMeetingForm = ref(false)
const showNoteForm = ref(false)
const showReminderForm = ref(false)
const showTaskForm = ref(false)
const showSimplifiedTransactionForm = ref(false)
const selectedCall = ref<any>(null)
const selectedMeeting = ref<any>(null)
const selectedNote = ref<any>(null)
const selectedReminder = ref<any>(null)
const selectedTask = ref<any>(null)
const selectedSimplifiedTransaction = ref<any>(null)
const formLoading = ref(false)

const statsCards = computed(() => {
  if (!collaborationData.value) return []
  const stats = collaborationData.value.stats
  return [
    {
      label: t("collaboration.stats.meetings"),
      value: stats.totalMeetings,
      icon: "mdi-calendar-account",
      color: "primary",
    },
    {
      label: t("collaboration.stats.calls"),
      value: stats.totalCalls,
      icon: "mdi-phone",
      color: "success",
    },
    {
      label: t("collaboration.stats.notes"),
      value: stats.totalNotes,
      icon: "mdi-note-text",
      color: "warning",
    },
    {
      label: t("collaboration.stats.reminders"),
      value: stats.totalReminders,
      icon: "mdi-bell-alert",
      color: "info",
    },
    {
      label: t("collaboration.stats.tasks"),
      value: stats.totalTasks,
      icon: "mdi-clipboard-text",
      color: "secondary",
    },
    {
      label: t("collaboration.stats.quotes"),
      value: stats.totalQuotes ?? 0,
      icon: "mdi-file-document-outline",
      color: "purple",
    },
    {
      label: t("collaboration.stats.invoices"),
      value: stats.totalInvoices ?? 0,
      icon: "mdi-receipt",
      color: "teal",
    },
    {
      label: t("collaboration.stats.engagementLetters"),
      value: stats.totalEngagementLetters ?? 0,
      icon: "mdi-briefcase-outline",
      color: "indigo",
    },
    {
      label: t("collaboration.stats.externalReferences"),
      value: stats.totalSimplifiedTransactions ?? 0,
      icon: "mdi-link-variant",
      color: "orange",
    },
    {
      label: t("collaboration.stats.upcoming"),
      value: stats.upcomingMeetings,
      icon: "mdi-calendar-clock",
      color: "primary",
    },
  ]
})

const loadData = async () => {
  loading.value = true
  error.value = ""

  try {
    const response = await institutionsApi.getCollaboration(props.institutionId) as { data?: any }
    collaborationData.value = response.data || response
  } catch (err) {
    console.error("Error loading collaboration data:", err)
    error.value = t("collaboration.loadError")
  } finally {
    loading.value = false
  }
}

const navigateTo = (path: string) => {
  // Navigate with institution filter
  router.push({
    path,
    query: { institutionId: props.institutionId },
  })
}

// Open form dialogs (create mode)
const openCallForm = () => {
  selectedCall.value = null
  showCallForm.value = true
}

const openMeetingForm = () => {
  selectedMeeting.value = null
  showMeetingForm.value = true
}

const openNoteForm = () => {
  selectedNote.value = null
  showNoteForm.value = true
}

const openReminderForm = () => {
  selectedReminder.value = null
  showReminderForm.value = true
}

const openTaskForm = () => {
  selectedTask.value = null
  showTaskForm.value = true
}

const openSimplifiedTransactionForm = () => {
  selectedSimplifiedTransaction.value = null
  showSimplifiedTransactionForm.value = true
}

// Open form dialogs (edit mode)
const openCallForEdit = (call: any) => {
  selectedCall.value = call
  showCallForm.value = true
}

const openMeetingForEdit = (meeting: any) => {
  selectedMeeting.value = meeting
  showMeetingForm.value = true
}

const openNoteForEdit = (note: any) => {
  selectedNote.value = note
  showNoteForm.value = true
}

const openReminderForEdit = (reminder: any) => {
  selectedReminder.value = reminder
  showReminderForm.value = true
}

const openTaskForEdit = (task: any) => {
  selectedTask.value = task
  showTaskForm.value = true
}

const openSimplifiedTransactionForEdit = (tx: any) => {
  selectedSimplifiedTransaction.value = tx
  showSimplifiedTransactionForm.value = true
}

const handleSimplifiedTransactionSaved = () => {
  showSimplifiedTransactionForm.value = false
  selectedSimplifiedTransaction.value = null
  loadData()
}

// Navigate to specific item with context
const navigateToItem = (path: string, itemId: string) => {
  // If the path already contains the ID (like /invoices/:id), just add the query
  const hasIdInPath = path.includes(itemId)
  router.push({
    path: hasIdInPath ? path : path,
    query: {
      ...(hasIdInPath ? {} : { id: itemId }),
      fromInstitution: props.institutionId
    },
  })
}

// Form submit handlers
const handleCallSubmit = async (data: CallCreateRequest | CallUpdateRequest) => {
  formLoading.value = true
  try {
    if (selectedCall.value) {
      // Update existing call
      await callsApi.update(selectedCall.value.id, data)
    } else {
      // Create new call
      await callsApi.create({
        ...data,
        institutionId: props.institutionId,
      } as CallCreateRequest)
    }
    showCallForm.value = false
    selectedCall.value = null
    loadData()
  } catch (err) {
    console.error("Error saving call:", err)
  } finally {
    formLoading.value = false
  }
}

const handleMeetingSubmit = async (data: MeetingCreateRequest | MeetingUpdateRequest) => {
  formLoading.value = true
  try {
    if (selectedMeeting.value) {
      // Update existing meeting
      await meetingsApi.update(selectedMeeting.value.id, data)
    } else {
      // Create new meeting
      await meetingsApi.create({
        ...data,
        institutionId: props.institutionId,
      } as MeetingCreateRequest)
    }
    showMeetingForm.value = false
    selectedMeeting.value = null
    loadData()
  } catch (err) {
    console.error("Error saving meeting:", err)
  } finally {
    formLoading.value = false
  }
}

const handleNoteSubmit = async (data: NoteCreateRequest | NoteUpdateRequest) => {
  formLoading.value = true
  try {
    if (selectedNote.value) {
      // Update existing note
      await notesApi.update(selectedNote.value.id, data)
    } else {
      // Create new note
      await notesApi.create({
        ...(data as NoteCreateRequest),
        institutionId: props.institutionId,
      })
    }
    showNoteForm.value = false
    selectedNote.value = null
    loadData()
  } catch (err) {
    console.error("Error saving note:", err)
  } finally {
    formLoading.value = false
  }
}

const handleReminderSubmit = async (data: ReminderCreateRequest | ReminderUpdateRequest) => {
  formLoading.value = true
  try {
    if (selectedReminder.value) {
      // Update existing reminder
      await remindersApi.update(selectedReminder.value.id, data)
    } else {
      // Create new reminder
      await remindersApi.create({
        ...(data as ReminderCreateRequest),
        institutionId: props.institutionId,
      })
    }
    showReminderForm.value = false
    selectedReminder.value = null
    loadData()
  } catch (err) {
    console.error("Error saving reminder:", err)
  } finally {
    formLoading.value = false
  }
}

const handleTaskSubmit = async (data: TaskCreateRequest | TaskUpdateRequest) => {
  formLoading.value = true
  try {
    if (selectedTask.value) {
      // Update existing task
      await tasksApi.update(selectedTask.value.id, data)
    } else {
      // Create new task
      await tasksApi.create({
        ...data,
        institutionId: props.institutionId,
      })
    }
    showTaskForm.value = false
    selectedTask.value = null
    loadData()
  } catch (err) {
    console.error("Error saving task:", err)
  } finally {
    formLoading.value = false
  }
}

const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return t("common.noDate")
  const d = new Date(date)
  if (isNaN(d.getTime())) return t("common.noDate")
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const formatTime = (date: string | Date | null | undefined): string => {
  if (!date) return ""
  const d = new Date(date)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

const formatCallType = (type: string): string => {
  const typeMap: Record<string, string> = {
    incoming: t("collaboration.callTypes.incoming"),
    outgoing: t("collaboration.callTypes.outgoing"),
    missed: t("collaboration.callTypes.missed"),
  }
  return typeMap[type] || type
}

const getCallColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    incoming: "success",
    outgoing: "info",
    missed: "error",
  }
  return colorMap[type] || "grey"
}

const getCallIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    incoming: "mdi-phone-incoming",
    outgoing: "mdi-phone-outgoing",
    missed: "mdi-phone-missed",
  }
  return iconMap[type] || "mdi-phone"
}

const getUserAvatarUrl = (user: { id: string; firstName?: string; lastName?: string }): string => {
  // Use first name + last name as seed so DiceBear shows correct initials
  const seed = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.id
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`
}

const getPriorityColor = (priority: string): string => {
  const colorMap: Record<string, string> = {
    low: "info",
    medium: "warning",
    high: "error",
    urgent: "purple",
  }
  return colorMap[priority] || "grey"
}

const formatPriority = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    low: t("tasks.priority.low"),
    medium: t("tasks.priority.medium"),
    high: t("tasks.priority.high"),
    urgent: t("tasks.priority.urgent"),
  }
  return priorityMap[priority] || priority
}

const getTaskStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: "warning",
    in_progress: "info",
    blocked: "error",
    completed: "success",
    cancelled: "grey",
  }
  return colorMap[status] || "grey"
}

const formatTaskStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: t("tasks.status.pending"),
    in_progress: t("tasks.status.in_progress"),
    blocked: t("tasks.status.blocked"),
    completed: t("tasks.status.completed"),
    cancelled: t("tasks.status.cancelled"),
  }
  return statusMap[status] || status
}

const stripHtml = (html: string): string => {
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ""
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return "0,00 €"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const getQuoteStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    draft: "grey",
    pending: "warning",
    sent: "info",
    accepted: "success",
    rejected: "error",
    expired: "grey-darken-1",
    ordered: "purple",
  }
  return colorMap[status] || "grey"
}

const formatQuoteStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: t("quotes.status.draft"),
    pending: t("quotes.status.pending"),
    sent: t("quotes.status.sent"),
    accepted: t("quotes.status.accepted"),
    rejected: t("quotes.status.rejected"),
    expired: t("quotes.status.expired"),
    ordered: t("quotes.status.ordered"),
  }
  return statusMap[status] || status
}

const getInvoiceStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    draft: "grey",
    pending: "warning",
    sent: "info",
    partial: "orange",
    paid: "success",
    overdue: "error",
    cancelled: "grey-darken-1",
  }
  return colorMap[status] || "grey"
}

const formatInvoiceStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: t("invoices.status.draft"),
    pending: t("invoices.status.pending"),
    sent: t("invoices.status.sent"),
    partial: t("invoices.status.partial"),
    paid: t("invoices.status.paid"),
    overdue: t("invoices.status.overdue"),
    cancelled: t("invoices.status.cancelled"),
  }
  return statusMap[status] || status
}

const getEngagementLetterStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    draft: "grey",
    sent: "blue",
    accepted: "success",
    rejected: "error",
    cancelled: "grey-darken-1",
    completed: "purple",
  }
  return colorMap[status] || "grey"
}

const formatEngagementLetterStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: t("engagementLetters.status.draft"),
    sent: t("engagementLetters.status.sent"),
    accepted: t("engagementLetters.status.accepted"),
    rejected: t("engagementLetters.status.rejected"),
    cancelled: t("engagementLetters.status.cancelled"),
    completed: t("engagementLetters.status.completed"),
  }
  return statusMap[status] || status
}

// Simplified Transaction helpers
const getSimplifiedTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    quote: "purple",
    invoice: "teal",
    engagement_letter: "indigo",
    contract: "deep-purple",
  }
  return colorMap[type] || "grey"
}

const getSimplifiedTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    quote: "mdi-file-document-outline",
    invoice: "mdi-receipt",
    engagement_letter: "mdi-briefcase-outline",
    contract: "mdi-file-document-edit-outline",
  }
  return iconMap[type] || "mdi-link-variant"
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.collaboration-tab {
  padding: 0;
  overflow: hidden;
}

.v-card {
  overflow-x: hidden;
  overflow-y: visible;
}

.v-card :deep(.v-list) {
  overflow-x: hidden;
}

.v-card :deep(.v-list-item) {
  cursor: pointer;
}

.v-card :deep(.v-list-item:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
