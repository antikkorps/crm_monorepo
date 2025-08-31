<template>
  <v-card elevation="2" v-if="data">
    <v-card-title class="d-flex align-center">
      <v-icon icon="mdi-alert-circle-outline" color="warning" class="mr-2"></v-icon>
      <span>Outstanding Invoices</span>
    </v-card-title>

    <v-card-text>
      <!-- Summary Metrics -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-sheet rounded color="orange-lighten-5" class="text-center pa-3">
            <div class="text-warning font-weight-medium mb-1">Total Outstanding</div>
            <div class="text-h4 font-weight-bold text-orange-darken-4">
              {{ formatCurrency(data.totalOutstanding) }}
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <!-- Breakdown -->
      <v-row class="mb-4">
        <v-col cols="6">
          <v-sheet rounded color="red-lighten-5" class="text-center pa-2">
            <div class="text-error text-body-2 font-weight-medium mb-1">Overdue</div>
            <div class="text-h6 font-weight-bold text-red-darken-4">
              {{ formatCurrency(data.overdueAmount) }}
            </div>
            <div class="text-caption text-error">{{ data.overdueCount }} invoices</div>
          </v-sheet>
        </v-col>
        <v-col cols="6">
          <v-sheet rounded color="yellow-lighten-5" class="text-center pa-2">
            <div class="text-warning text-body-2 font-weight-medium mb-1">Partial</div>
            <div class="text-h6 font-weight-bold text-yellow-darken-4">
              {{ formatCurrency(data.partiallyPaidAmount) }}
            </div>
            <div class="text-caption text-warning">
              {{ data.partiallyPaidCount }} invoices
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <!-- Aging Analysis -->
      <div class="mb-4">
        <h4 class="text-h6 font-weight-semibold mb-3">Aging Analysis</h4>
        <div
          v-for="bucket in data.agingBuckets"
          :key="bucket.label"
          class="d-flex align-center justify-space-between pa-2 border rounded mb-2"
        >
          <div>
            <div class="font-weight-medium text-body-2">{{ bucket.label }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ bucket.count }} invoices
            </div>
          </div>
          <div class="text-right" style="min-width: 100px">
            <div class="font-weight-bold">{{ formatCurrency(bucket.amount) }}</div>
            <v-progress-linear
              :model-value="getAgingPercentage(bucket.amount)"
              :color="getAgingProgressColor(bucket.daysMin)"
              height="6"
              rounded
              class="mt-1"
            ></v-progress-linear>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="d-flex ga-2">
        <v-btn
          text="View All"
          prepend-icon="mdi-eye"
          @click="$emit('view-all')"
          variant="outlined"
          class="flex-grow-1"
        />
        <v-btn
          text="Send Reminders"
          prepend-icon="mdi-send"
          @click="$emit('send-reminders')"
          variant="outlined"
          class="flex-grow-1"
          :disabled="data.overdueCount === 0"
        />
      </div>

      <!-- Top Overdue (if any) -->
      <div v-if="data.topOverdueInvoices?.length > 0" class="mt-4">
        <h4 class="text-h6 font-weight-semibold mb-3">Top Overdue Invoices</h4>
        <v-list lines="two" class="pa-0 bg-transparent">
          <v-list-item
            v-for="invoice in data.topOverdueInvoices.slice(0, 3)"
            :key="invoice.id"
            @click="$emit('view-invoice', invoice.id)"
            class="border rounded mb-2"
          >
            <v-list-item-title class="font-weight-medium text-body-2">{{
              invoice.invoiceNumber
            }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{
              invoice.institutionName
            }}</v-list-item-subtitle>
            <div class="text-caption text-error">
              {{ invoice.daysOverdue }} days overdue
            </div>

            <template v-slot:append>
              <div class="text-right">
                <div class="font-weight-bold text-error">
                  {{ formatCurrency(invoice.remainingAmount) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  of {{ formatCurrency(invoice.amount) }}
                </div>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue"

interface AgingBucket {
  label: string
  daysMin: number
  daysMax: number | null
  amount: number
  count: number
}

interface OutstandingInvoice {
  id: string
  invoiceNumber: string
  institutionName: string
  amount: number
  remainingAmount: number
  daysOverdue: number
  status: string
}

interface OutstandingInvoiceAnalytics {
  totalOutstanding: number
  overdueAmount: number
  overdueCount: number
  partiallyPaidAmount: number
  partiallyPaidCount: number
  agingBuckets: AgingBucket[]
  topOverdueInvoices: OutstandingInvoice[]
}

interface Props {
  data: OutstandingInvoiceAnalytics | null
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  "view-all": []
  "send-reminders": []
  "view-invoice": [id: string]
}>()

// Computed properties
const maxAgingAmount = computed(() => {
  if (!props.data?.agingBuckets || props.data.agingBuckets.length === 0) {
    return 0
  }
  return Math.max(...props.data.agingBuckets.map((bucket) => bucket.amount))
})

// Methods
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const getAgingPercentage = (amount: number): number => {
  if (maxAgingAmount.value === 0) return 0
  return (amount / maxAgingAmount.value) * 100
}

const getAgingProgressColor = (daysMin: number): string => {
  if (daysMin <= 30) return "success"
  if (daysMin <= 60) return "warning"
  return "error"
}
</script>
