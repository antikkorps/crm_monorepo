<template>
  <div class="invoices-view">
    <div class="header">
      <h1>Invoices</h1>
      <div class="header-actions">
        <Button
          icon="pi pi-plus"
          label="New Invoice"
          @click="showCreateDialog = true"
          class="p-button-primary"
        />
      </div>
    </div>

    <!-- Filters -->
    <Card class="filters-card">
      <template #content>
        <div class="filters-grid">
          <div class="field">
            <label for="status-filter">Status</label>
            <Dropdown
              id="status-filter"
              v-model="filters.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              placeholder="All Statuses"
              show-clear
              @change="loadInvoices"
            />
          </div>

          <div class="field">
            <label for="institution-filter">Institution</label>
            <Dropdown
              id="institution-filter"
              v-model="filters.institutionId"
              :options="institutions"
              option-label="name"
              option-value="id"
              placeholder="All Institutions"
              show-clear
              filter
              @change="loadInvoices"
            />
          </div>

          <div class="field">
            <label for="date-from">Date From</label>
            <Calendar
              id="date-from"
              v-model="filters.dateFrom"
              placeholder="Select date"
              show-clear
              @date-select="loadInvoices"
            />
          </div>

          <div class="field">
            <label for="date-to">Date To</label>
            <Calendar
              id="date-to"
              v-model="filters.dateTo"
              placeholder="Select date"
              show-clear
              @date-select="loadInvoices"
            />
          </div>

          <div class="field">
            <label for="search">Search</label>
            <InputText
              id="search"
              v-model="filters.search"
              placeholder="Search invoices..."
              @input="debouncedSearch"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Statistics Cards -->
    <div class="stats-grid">
      <Card class="stat-card">
        <template #content>
          <div class="stat-content">
            <div class="stat-icon">
              <i class="pi pi-file-o"></i>
            </div>
            <div class="stat-details">
              <h3>{{ statistics.totalInvoices || 0 }}</h3>
              <p>Total Invoices</p>
            </div>
          </div>
        </template>
      </Card>

      <Card class="stat-card">
        <template #content>
          <div class="stat-content">
            <div class="stat-icon pending">
              <i class="pi pi-clock"></i>
            </div>
            <div class="stat-details">
              <h3>{{ statistics.pendingInvoices || 0 }}</h3>
              <p>Pending Payment</p>
            </div>
          </div>
        </template>
      </Card>

      <Card class="stat-card">
        <template #content>
          <div class="stat-content">
            <div class="stat-icon overdue">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <div class="stat-details">
              <h3>{{ statistics.overdueInvoices || 0 }}</h3>
              <p>Overdue</p>
            </div>
          </div>
        </template>
      </Card>

      <Card class="stat-card">
        <template #content>
          <div class="stat-content">
            <div class="stat-icon paid">
              <i class="pi pi-check-circle"></i>
            </div>
            <div class="stat-details">
              <h3>${{ formatCurrency(statistics.totalRevenue || 0) }}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Invoices Table -->
    <Card class="invoices-table-card">
      <template #content>
        <DataTable
          :value="invoices"
          :loading="loading"
          paginator
          :rows="20"
          :total-records="totalRecords"
          lazy
          @page="onPageChange"
          responsive-layout="scroll"
          class="invoices-table"
        >
          <Column field="invoiceNumber" header="Invoice #" sortable>
            <template #body="{ data }">
              <router-link :to="`/invoices/${data.id}`" class="invoice-link">
                {{ data.invoiceNumber }}
              </router-link>
            </template>
          </Column>

          <Column field="institution.name" header="Institution" sortable>
            <template #body="{ data }">
              <div class="institution-cell">
                <span class="institution-name">{{ data.institution?.name }}</span>
                <small class="institution-type">{{ data.institution?.type }}</small>
              </div>
            </template>
          </Column>

          <Column field="title" header="Title" sortable />

          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <Tag
                :value="getStatusLabel(data.status)"
                :severity="getStatusSeverity(data.status)"
                :icon="getStatusIcon(data.status)"
              />
            </template>
          </Column>

          <Column field="total" header="Amount" sortable>
            <template #body="{ data }">
              <div class="amount-cell">
                <span class="total-amount">${{ formatCurrency(data.total) }}</span>
                <div v-if="data.totalPaid > 0" class="payment-info">
                  <small class="paid-amount">
                    Paid: ${{ formatCurrency(data.totalPaid) }}
                  </small>
                  <small v-if="data.remainingAmount > 0" class="remaining-amount">
                    Remaining: ${{ formatCurrency(data.remainingAmount) }}
                  </small>
                </div>
              </div>
            </template>
          </Column>

          <Column field="dueDate" header="Due Date" sortable>
            <template #body="{ data }">
              <div class="due-date-cell">
                <span :class="getDueDateClass(data)">
                  {{ formatDate(data.dueDate) }}
                </span>
                <small v-if="data.daysOverdue" class="overdue-days">
                  {{ data.daysOverdue }} days overdue
                </small>
                <small v-else-if="data.daysUntilDue !== null" class="days-until-due">
                  {{ data.daysUntilDue }} days remaining
                </small>
              </div>
            </template>
          </Column>

          <Column field="assignedUser.firstName" header="Assigned To" sortable>
            <template #body="{ data }">
              {{ data.assignedUser?.firstName }} {{ data.assignedUser?.lastName }}
            </template>
          </Column>

          <Column header="Actions" :exportable="false">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button
                  icon="pi pi-eye"
                  class="p-button-text p-button-sm"
                  @click="viewInvoice(data.id)"
                  v-tooltip="'View Invoice'"
                />
                <Button
                  v-if="data.canBeModified"
                  icon="pi pi-pencil"
                  class="p-button-text p-button-sm"
                  @click="editInvoice(data.id)"
                  v-tooltip="'Edit Invoice'"
                />
                <Button
                  v-if="data.status === 'draft'"
                  icon="pi pi-send"
                  class="p-button-text p-button-sm"
                  @click="sendInvoice(data.id)"
                  v-tooltip="'Send Invoice'"
                />
                <Button
                  v-if="data.canReceivePayments"
                  icon="pi pi-dollar"
                  class="p-button-text p-button-sm"
                  @click="recordPayment(data)"
                  v-tooltip="'Record Payment'"
                />
                <Button
                  icon="pi pi-download"
                  class="p-button-text p-button-sm"
                  @click="downloadPdf(data.id)"
                  v-tooltip="'Download PDF'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Create Invoice Dialog -->
    <InvoiceForm v-model:visible="showCreateDialog" @invoice-created="onInvoiceCreated" />

    <!-- Record Payment Dialog -->
    <PaymentForm
      v-model:visible="showPaymentDialog"
      :invoice="selectedInvoice"
      @payment-recorded="onPaymentRecorded"
    />
  </div>
</template>

<script setup lang="ts">
import InvoiceForm from "@/components/billing/InvoiceForm.vue"
import PaymentForm from "@/components/billing/PaymentForm.vue"
import { institutionsApi, invoicesApi } from "@/services/api"
import type { Invoice, InvoiceStatus } from "@medical-crm/shared"
import { useToast } from "primevue/usetoast"
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const toast = useToast()

// Data
const invoices = ref<Invoice[]>([])
const institutions = ref<any[]>([])
const statistics = ref<any>({})
const loading = ref(false)
const totalRecords = ref(0)
const showCreateDialog = ref(false)
const showPaymentDialog = ref(false)
const selectedInvoice = ref<Invoice | null>(null)

// Filters
const filters = ref({
  status: null as InvoiceStatus | null,
  institutionId: null as string | null,
  dateFrom: null as Date | null,
  dateTo: null as Date | null,
  search: "",
})

// Status options
const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Partially Paid", value: "partially_paid" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
]

// Pagination
const currentPage = ref(0)
const rowsPerPage = ref(20)

// Debounced search
let searchTimeout: NodeJS.Timeout
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadInvoices()
  }, 500)
}

// Methods
const loadInvoices = async () => {
  try {
    loading.value = true

    const filterParams = {
      ...filters.value,
      page: currentPage.value + 1,
      limit: rowsPerPage.value,
    }

    const response = await invoicesApi.getAll(filterParams)

    if (response.success) {
      invoices.value = response.data
      totalRecords.value = response.meta?.total || 0
    }
  } catch (error) {
    console.error("Error loading invoices:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load invoices",
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

const loadInstitutions = async () => {
  try {
    const response = await institutionsApi.getAll()
    if (response.success) {
      institutions.value = response.data
    }
  } catch (error) {
    console.error("Error loading institutions:", error)
  }
}

const loadStatistics = async () => {
  try {
    const response = await invoicesApi.getStatistics()
    if (response.success) {
      statistics.value = response.data
    }
  } catch (error) {
    console.error("Error loading statistics:", error)
  }
}

const onPageChange = (event: any) => {
  currentPage.value = event.page
  rowsPerPage.value = event.rows
  loadInvoices()
}

const viewInvoice = (id: string) => {
  router.push(`/invoices/${id}`)
}

const editInvoice = (id: string) => {
  router.push(`/invoices/${id}/edit`)
}

const sendInvoice = async (id: string) => {
  try {
    const response = await invoicesApi.send(id)
    if (response.success) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Invoice sent successfully",
        life: 3000,
      })
      loadInvoices()
    }
  } catch (error) {
    console.error("Error sending invoice:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to send invoice",
      life: 3000,
    })
  }
}

const recordPayment = (invoice: Invoice) => {
  selectedInvoice.value = invoice
  showPaymentDialog.value = true
}

const downloadPdf = async (id: string) => {
  try {
    const response = await invoicesApi.generatePdf(id)

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }
  } catch (error) {
    console.error("Error downloading PDF:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to download PDF",
      life: 3000,
    })
  }
}

const onInvoiceCreated = () => {
  showCreateDialog.value = false
  loadInvoices()
  loadStatistics()
}

const onPaymentRecorded = () => {
  showPaymentDialog.value = false
  selectedInvoice.value = null
  loadInvoices()
  loadStatistics()
}

// Utility functions
const getStatusLabel = (status: InvoiceStatus) => {
  const statusMap = {
    draft: "Draft",
    sent: "Sent",
    partially_paid: "Partially Paid",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  }
  return statusMap[status] || status
}

const getStatusSeverity = (status: InvoiceStatus) => {
  const severityMap = {
    draft: "secondary",
    sent: "info",
    partially_paid: "warning",
    paid: "success",
    overdue: "danger",
    cancelled: "secondary",
  }
  return severityMap[status] || "secondary"
}

const getStatusIcon = (status: InvoiceStatus) => {
  const iconMap = {
    draft: "pi-file-edit",
    sent: "pi-send",
    partially_paid: "pi-clock",
    paid: "pi-check-circle",
    overdue: "pi-exclamation-triangle",
    cancelled: "pi-times-circle",
  }
  return iconMap[status] || "pi-file"
}

const getDueDateClass = (invoice: Invoice) => {
  if (invoice.status === "paid") return "due-date-paid"
  if (invoice.daysOverdue && invoice.daysOverdue > 0) return "due-date-overdue"
  if (invoice.daysUntilDue !== null && invoice.daysUntilDue <= 7) return "due-date-soon"
  return "due-date-normal"
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (date: string | Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

// Lifecycle
onMounted(() => {
  loadInvoices()
  loadInstitutions()
  loadStatistics()
})
</script>

<style scoped>
.invoices-view {
  padding: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header h1 {
  margin: 0;
  color: var(--text-color);
}

.filters-card {
  margin-bottom: 1.5rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
}

.field label {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--surface-card);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  color: white;
  font-size: 1.25rem;
}

.stat-icon.pending {
  background: var(--orange-500);
}

.stat-icon.overdue {
  background: var(--red-500);
}

.stat-icon.paid {
  background: var(--green-500);
}

.stat-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
}

.stat-details p {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.invoices-table-card {
  background: var(--surface-card);
}

.invoice-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
}

.invoice-link:hover {
  text-decoration: underline;
}

.institution-cell {
  display: flex;
  flex-direction: column;
}

.institution-name {
  font-weight: 600;
  color: var(--text-color);
}

.institution-type {
  color: var(--text-color-secondary);
  text-transform: capitalize;
}

.amount-cell {
  display: flex;
  flex-direction: column;
}

.total-amount {
  font-weight: 600;
  color: var(--text-color);
}

.payment-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.paid-amount {
  color: var(--green-600);
  font-size: 0.75rem;
}

.remaining-amount {
  color: var(--orange-600);
  font-size: 0.75rem;
}

.due-date-cell {
  display: flex;
  flex-direction: column;
}

.due-date-normal {
  color: var(--text-color);
}

.due-date-soon {
  color: var(--orange-600);
  font-weight: 600;
}

.due-date-overdue {
  color: var(--red-600);
  font-weight: 600;
}

.due-date-paid {
  color: var(--green-600);
}

.overdue-days {
  color: var(--red-600);
  font-size: 0.75rem;
  font-weight: 600;
}

.days-until-due {
  color: var(--text-color-secondary);
  font-size: 0.75rem;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

@media (max-width: 768px) {
  .invoices-view {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
