<template>
  <Card>
    <template #title>
      <div class="flex justify-content-between align-items-center">
        <span>Outstanding Invoices</span>
        <div class="flex gap-2">
          <Button
            label="Send Reminders"
            icon="pi pi-send"
            @click="$emit('send-reminders', selectedInvoices)"
            :disabled="!selectedInvoices.length"
            class="p-button-sm"
          />
          <Button
            label="Export"
            icon="pi pi-download"
            @click="exportData"
            class="p-button-sm p-button-outlined"
          />
        </div>
      </div>
    </template>

    <template #content>
      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-4 align-items-center">
        <div class="flex flex-column">
          <label class="text-sm font-medium mb-1">Status Filter</label>
          <MultiSelect
            v-model="statusFilter"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            placeholder="All Statuses"
            @change="applyFilters"
            class="w-12rem"
          />
        </div>

        <div class="flex flex-column">
          <label class="text-sm font-medium mb-1">Days Overdue</label>
          <Dropdown
            v-model="overdueFilter"
            :options="overdueOptions"
            option-label="label"
            option-value="value"
            placeholder="All"
            @change="applyFilters"
            class="w-10rem"
          />
        </div>

        <div class="flex flex-column">
          <label class="text-sm font-medium mb-1">Amount Range</label>
          <InputGroup class="w-12rem">
            <InputNumber
              v-model="minAmount"
              placeholder="Min"
              :min="0"
              @input="applyFilters"
              class="w-6rem"
            />
            <InputNumber
              v-model="maxAmount"
              placeholder="Max"
              :min="0"
              @input="applyFilters"
              class="w-6rem"
            />
          </InputGroup>
        </div>

        <Button
          icon="pi pi-filter-slash"
          label="Clear"
          @click="clearFilters"
          class="p-button-text"
          style="margin-top: 1.5rem"
        />
      </div>

      <!-- Data Table -->
      <DataTable
        v-model:selection="selectedInvoices"
        :value="filteredInvoices"
        :paginator="true"
        :rows="10"
        :rows-per-page-options="[10, 25, 50]"
        responsive-layout="scroll"
        selection-mode="multiple"
        :meta-key-selection="false"
        class="p-datatable-sm"
        :loading="loading"
        sort-field="daysOverdue"
        :sort-order="-1"
      >
        <template #empty>
          <div class="text-center p-4">
            <i class="pi pi-check-circle text-4xl text-green-500 mb-3"></i>
            <h3 class="text-xl font-semibold mb-2">No Outstanding Invoices</h3>
            <p class="text-600">All invoices are up to date!</p>
          </div>
        </template>

        <Column selection-mode="multiple" header-style="width: 3rem"></Column>

        <Column field="invoiceNumber" header="Invoice #" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center gap-2">
              <Button
                :label="data.invoiceNumber"
                @click="$emit('view-invoice', data.id)"
                class="p-button-link p-0"
              />
              <Badge
                v-if="data.daysOverdue > 0"
                :value="`${data.daysOverdue}d`"
                severity="danger"
                class="text-xs"
              />
            </div>
          </template>
        </Column>

        <Column field="institutionName" header="Institution" sortable>
          <template #body="{ data }">
            <div>
              <div class="font-medium">{{ data.institutionName }}</div>
              <div class="text-sm text-600">
                {{ formatInstitutionType(data.institutionType) }}
              </div>
            </div>
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag
              :value="formatStatus(data.status)"
              :severity="getStatusSeverity(data.status)"
            />
          </template>
        </Column>

        <Column field="amount" header="Total Amount" sortable>
          <template #body="{ data }">
            <span class="font-bold">{{ formatCurrency(data.amount) }}</span>
          </template>
        </Column>

        <Column field="remainingAmount" header="Outstanding" sortable>
          <template #body="{ data }">
            <div>
              <div class="font-bold text-red-600">
                {{ formatCurrency(data.remainingAmount) }}
              </div>
              <div class="text-sm text-600">
                {{ ((data.remainingAmount / data.amount) * 100).toFixed(0) }}% remaining
              </div>
            </div>
          </template>
        </Column>

        <Column field="dueDate" header="Due Date" sortable>
          <template #body="{ data }">
            <div>
              <div class="text-sm">{{ formatDate(data.dueDate) }}</div>
              <div v-if="data.daysOverdue > 0" class="text-xs text-red-600 font-medium">
                {{ data.daysOverdue }} days overdue
              </div>
              <div v-else-if="data.daysUntilDue !== null" class="text-xs text-600">
                {{ data.daysUntilDue }} days remaining
              </div>
            </div>
          </template>
        </Column>

        <Column field="lastPaymentDate" header="Last Payment" sortable>
          <template #body="{ data }">
            <span v-if="data.lastPaymentDate" class="text-sm">
              {{ formatDate(data.lastPaymentDate) }}
            </span>
            <span v-else class="text-sm text-500">No payments</span>
          </template>
        </Column>

        <Column header="Actions" style="width: 8rem">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button
                icon="pi pi-eye"
                @click="$emit('view-invoice', data.id)"
                class="p-button-sm p-button-outlined"
                v-tooltip.top="'View Invoice'"
              />
              <Button
                icon="pi pi-send"
                @click="$emit('send-reminder', data.id)"
                class="p-button-sm p-button-outlined"
                v-tooltip.top="'Send Reminder'"
                :disabled="data.daysOverdue <= 0"
              />
              <Button
                icon="pi pi-dollar"
                @click="$emit('record-payment', data.id)"
                class="p-button-sm p-button-outlined"
                v-tooltip.top="'Record Payment'"
              />
            </div>
          </template>
        </Column>
      </DataTable>

      <!-- Summary Footer -->
      <div
        class="flex justify-content-between align-items-center mt-4 p-3 bg-gray-50 border-round"
      >
        <div class="flex gap-4">
          <div>
            <span class="font-medium">Total Outstanding: </span>
            <span class="font-bold text-red-600">{{
              formatCurrency(totalOutstanding)
            }}</span>
          </div>
          <div>
            <span class="font-medium">Selected: </span>
            <span class="font-bold">{{ selectedInvoices.length }} invoices</span>
          </div>
          <div v-if="selectedInvoices.length > 0">
            <span class="font-medium">Selected Amount: </span>
            <span class="font-bold text-blue-600">{{
              formatCurrency(selectedAmount)
            }}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <Button
            label="Select All Overdue"
            @click="selectAllOverdue"
            class="p-button-sm p-button-outlined"
          />
          <Button
            label="Clear Selection"
            @click="selectedInvoices = []"
            class="p-button-sm p-button-text"
            :disabled="!selectedInvoices.length"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"

interface OutstandingInvoice {
  id: string
  invoiceNumber: string
  institutionName: string
  institutionType: string
  amount: number
  remainingAmount: number
  daysOverdue: number
  daysUntilDue: number | null
  status: string
  dueDate: Date
  lastPaymentDate?: Date
}

interface OutstandingInvoiceAnalytics {
  totalOutstanding: number
  overdueAmount: number
  overdueCount: number
  partiallyPaidAmount: number
  partiallyPaidCount: number
  agingBuckets: any[]
  topOverdueInvoices: OutstandingInvoice[]
}

interface Props {
  data: OutstandingInvoiceAnalytics
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  "view-invoice": [id: string]
  "send-reminder": [id: string]
  "send-reminders": [ids: string[]]
  "record-payment": [id: string]
}>()

// Reactive data
const loading = ref(false)
const selectedInvoices = ref<OutstandingInvoice[]>([])
const statusFilter = ref<string[]>([])
const overdueFilter = ref<string | null>(null)
const minAmount = ref<number | null>(null)
const maxAmount = ref<number | null>(null)

// Filter options
const statusOptions = [
  { label: "Sent", value: "sent" },
  { label: "Partially Paid", value: "partially_paid" },
  { label: "Overdue", value: "overdue" },
]

const overdueOptions = [
  { label: "All", value: null },
  { label: "Not Overdue", value: "not_overdue" },
  { label: "1-30 days", value: "1-30" },
  { label: "31-60 days", value: "31-60" },
  { label: "61-90 days", value: "61-90" },
  { label: "90+ days", value: "90+" },
]

// Computed properties
const allInvoices = computed(() => {
  // In a real implementation, this would come from a more comprehensive API call
  // For now, we'll use the top overdue invoices as a sample
  return props.data.topOverdueInvoices || []
})

const filteredInvoices = computed(() => {
  let filtered = [...allInvoices.value]

  // Status filter
  if (statusFilter.value.length > 0) {
    filtered = filtered.filter((invoice) => statusFilter.value.includes(invoice.status))
  }

  // Overdue filter
  if (overdueFilter.value) {
    switch (overdueFilter.value) {
      case "not_overdue":
        filtered = filtered.filter((invoice) => invoice.daysOverdue <= 0)
        break
      case "1-30":
        filtered = filtered.filter(
          (invoice) => invoice.daysOverdue >= 1 && invoice.daysOverdue <= 30
        )
        break
      case "31-60":
        filtered = filtered.filter(
          (invoice) => invoice.daysOverdue >= 31 && invoice.daysOverdue <= 60
        )
        break
      case "61-90":
        filtered = filtered.filter(
          (invoice) => invoice.daysOverdue >= 61 && invoice.daysOverdue <= 90
        )
        break
      case "90+":
        filtered = filtered.filter((invoice) => invoice.daysOverdue > 90)
        break
    }
  }

  // Amount filter
  if (minAmount.value !== null) {
    filtered = filtered.filter((invoice) => invoice.remainingAmount >= minAmount.value!)
  }
  if (maxAmount.value !== null) {
    filtered = filtered.filter((invoice) => invoice.remainingAmount <= maxAmount.value!)
  }

  return filtered
})

const totalOutstanding = computed(() => {
  return filteredInvoices.value.reduce((sum, invoice) => sum + invoice.remainingAmount, 0)
})

const selectedAmount = computed(() => {
  return selectedInvoices.value.reduce((sum, invoice) => sum + invoice.remainingAmount, 0)
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

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const formatInstitutionType = (type: string): string => {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const getStatusSeverity = (status: string): string => {
  switch (status) {
    case "sent":
      return "info"
    case "partially_paid":
      return "warning"
    case "overdue":
      return "danger"
    default:
      return "secondary"
  }
}

const applyFilters = () => {
  // Filters are applied automatically through computed property
  selectedInvoices.value = []
}

const clearFilters = () => {
  statusFilter.value = []
  overdueFilter.value = null
  minAmount.value = null
  maxAmount.value = null
  selectedInvoices.value = []
}

const selectAllOverdue = () => {
  selectedInvoices.value = filteredInvoices.value.filter(
    (invoice) => invoice.daysOverdue > 0
  )
}

const exportData = () => {
  // Create CSV data
  const headers = [
    "Invoice Number",
    "Institution Name",
    "Institution Type",
    "Status",
    "Total Amount",
    "Outstanding Amount",
    "Due Date",
    "Days Overdue",
    "Last Payment Date",
  ]

  const csvData = filteredInvoices.value.map((invoice) => [
    invoice.invoiceNumber,
    invoice.institutionName,
    invoice.institutionType,
    invoice.status,
    invoice.amount,
    invoice.remainingAmount,
    formatDate(invoice.dueDate),
    invoice.daysOverdue,
    invoice.lastPaymentDate ? formatDate(invoice.lastPaymentDate) : "No payments",
  ])

  const csvContent = [headers.join(","), ...csvData.map((row) => row.join(","))].join(
    "\n"
  )

  // Create download
  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `outstanding-invoices-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Watch for data changes to clear selection
watch(
  () => props.data,
  () => {
    selectedInvoices.value = []
  }
)
</script>

<style scoped>
.p-button-link {
  text-decoration: none;
}

.p-button-link:hover {
  text-decoration: underline;
}
</style>
