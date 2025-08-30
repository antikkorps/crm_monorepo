<template>
  <Card>
    <template #title>
      <div class="flex align-items-center gap-2">
        <i class="pi pi-exclamation-triangle text-orange-500"></i>
        <span>Outstanding Invoices</span>
      </div>
    </template>

    <template #content>
      <!-- Summary Metrics -->
      <div class="grid mb-4">
        <div class="col-12">
          <div class="text-center p-3 border-round bg-orange-50">
            <div class="text-orange-600 font-medium mb-1">Total Outstanding</div>
            <div class="text-3xl font-bold text-orange-900">
              {{ formatCurrency(data.totalOutstanding) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Breakdown -->
      <div class="grid mb-4">
        <div class="col-6">
          <div class="text-center p-2 border-round bg-red-50">
            <div class="text-red-600 text-sm font-medium mb-1">Overdue</div>
            <div class="text-lg font-bold text-red-900">
              {{ formatCurrency(data.overdueAmount) }}
            </div>
            <div class="text-xs text-red-600">{{ data.overdueCount }} invoices</div>
          </div>
        </div>
        <div class="col-6">
          <div class="text-center p-2 border-round bg-yellow-50">
            <div class="text-yellow-600 text-sm font-medium mb-1">Partial</div>
            <div class="text-lg font-bold text-yellow-900">
              {{ formatCurrency(data.partiallyPaidAmount) }}
            </div>
            <div class="text-xs text-yellow-600">
              {{ data.partiallyPaidCount }} invoices
            </div>
          </div>
        </div>
      </div>

      <!-- Aging Analysis -->
      <div class="mb-4">
        <h4 class="text-lg font-semibold mb-3">Aging Analysis</h4>
        <div class="space-y-2">
          <div
            v-for="bucket in data.agingBuckets"
            :key="bucket.label"
            class="flex align-items-center justify-content-between p-2 border-1 border-200 border-round"
          >
            <div class="flex-1">
              <div class="font-medium text-sm">{{ bucket.label }}</div>
              <div class="text-xs text-600">{{ bucket.count }} invoices</div>
            </div>
            <div class="text-right">
              <div class="font-bold">{{ formatCurrency(bucket.amount) }}</div>
              <ProgressBar
                :value="getAgingPercentage(bucket.amount)"
                :show-value="false"
                class="h-0-5rem mt-1"
                :class="getAgingProgressClass(bucket.daysMin)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex gap-2">
        <Button
          label="View All"
          icon="pi pi-eye"
          @click="$emit('view-all')"
          class="p-button-sm p-button-outlined flex-1"
        />
        <Button
          label="Send Reminders"
          icon="pi pi-send"
          @click="$emit('send-reminders')"
          class="p-button-sm p-button-outlined flex-1"
          :disabled="data.overdueCount === 0"
        />
      </div>

      <!-- Top Overdue (if any) -->
      <div
        v-if="data.topOverdueInvoices && data.topOverdueInvoices.length > 0"
        class="mt-4"
      >
        <h4 class="text-lg font-semibold mb-3">Top Overdue Invoices</h4>
        <div class="space-y-2">
          <div
            v-for="invoice in data.topOverdueInvoices.slice(0, 3)"
            :key="invoice.id"
            class="flex align-items-center justify-content-between p-2 border-1 border-200 border-round hover:bg-gray-50 cursor-pointer"
            @click="$emit('view-invoice', invoice.id)"
          >
            <div class="flex-1">
              <div class="font-medium text-sm">{{ invoice.invoiceNumber }}</div>
              <div class="text-xs text-600">{{ invoice.institutionName }}</div>
              <div class="text-xs text-red-600">
                {{ invoice.daysOverdue }} days overdue
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold text-red-600">
                {{ formatCurrency(invoice.remainingAmount) }}
              </div>
              <div class="text-xs text-600">of {{ formatCurrency(invoice.amount) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
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
  data: OutstandingInvoiceAnalytics
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

const getAgingProgressClass = (daysMin: number): string => {
  if (daysMin <= 30) return "p-progressbar-success"
  if (daysMin <= 60) return "p-progressbar-warning"
  if (daysMin <= 90) return "p-progressbar-danger"
  return "p-progressbar-danger"
}
</script>

<style scoped>
.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.h-0-5rem {
  height: 0.5rem;
}

.hover\:bg-gray-50:hover {
  background-color: #f9fafb;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
