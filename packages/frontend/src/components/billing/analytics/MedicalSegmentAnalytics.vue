<template>
  <Card>
    <template #title>
      <div class="flex justify-content-between align-items-center">
        <span>Medical Institution Segments</span>
        <div class="flex gap-2">
          <Button
            :label="viewMode === 'chart' ? 'Chart View' : 'Table View'"
            :icon="viewMode === 'chart' ? 'pi pi-chart-bar' : 'pi pi-table'"
            @click="toggleViewMode"
            class="p-button-sm p-button-outlined"
          />
        </div>
      </div>
    </template>

    <template #content>
      <!-- Chart View -->
      <div v-if="viewMode === 'chart'" class="mb-4">
        <div class="grid mb-4">
          <div class="col-12 lg:col-8">
            <Chart
              type="bar"
              :data="segmentChartData"
              :options="segmentChartOptions"
              class="h-20rem"
            />
          </div>
          <div class="col-12 lg:col-4">
            <Chart
              type="doughnut"
              :data="segmentPieData"
              :options="segmentPieOptions"
              class="h-20rem"
            />
          </div>
        </div>
      </div>

      <!-- Segment Summary Cards -->
      <div class="grid mb-4">
        <div
          v-for="segment in data"
          :key="segment.segmentName"
          class="col-12 md:col-6 lg:col-4"
        >
          <Card class="segment-card h-full">
            <template #content>
              <div class="text-center">
                <div class="flex align-items-center justify-content-center mb-3">
                  <i
                    :class="getSegmentIcon(segment.segmentName)"
                    class="text-3xl mr-2"
                  ></i>
                  <h3 class="text-xl font-bold m-0">{{ segment.segmentName }}</h3>
                </div>

                <div class="grid text-center">
                  <div class="col-6">
                    <div class="text-2xl font-bold text-blue-600">
                      {{ formatCurrency(segment.totalRevenue) }}
                    </div>
                    <div class="text-sm text-600">Total Revenue</div>
                  </div>
                  <div class="col-6">
                    <div class="text-2xl font-bold text-green-600">
                      {{ segment.invoiceCount }}
                    </div>
                    <div class="text-sm text-600">Invoices</div>
                  </div>
                  <div class="col-6">
                    <div class="text-lg font-bold text-purple-600">
                      {{ formatCurrency(segment.averageInvoiceValue) }}
                    </div>
                    <div class="text-sm text-600">Avg Invoice</div>
                  </div>
                  <div class="col-6">
                    <div
                      class="text-lg font-bold"
                      :class="getPaymentRateColor(segment.paymentRate)"
                    >
                      {{ segment.paymentRate.toFixed(1) }}%
                    </div>
                    <div class="text-sm text-600">Payment Rate</div>
                  </div>
                </div>

                <div class="mt-3">
                  <ProgressBar
                    :value="segment.paymentRate"
                    :show-value="false"
                    class="h-0-5rem"
                    :class="getPaymentRateProgressClass(segment.paymentRate)"
                  />
                </div>

                <Button
                  label="View Details"
                  icon="pi pi-eye"
                  @click="showSegmentDetails(segment)"
                  class="p-button-sm p-button-outlined mt-3 w-full"
                />
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Table View -->
      <div v-if="viewMode === 'table'">
        <DataTable
          :value="data"
          :paginator="true"
          :rows="10"
          responsive-layout="scroll"
          class="p-datatable-sm"
        >
          <Column field="segmentName" header="Segment" sortable>
            <template #body="{ data }">
              <div class="flex align-items-center gap-2">
                <i :class="getSegmentIcon(data.segmentName)"></i>
                <span class="font-medium">{{ data.segmentName }}</span>
              </div>
            </template>
          </Column>

          <Column field="totalRevenue" header="Total Revenue" sortable>
            <template #body="{ data }">
              <span class="font-bold text-blue-600">{{
                formatCurrency(data.totalRevenue)
              }}</span>
            </template>
          </Column>

          <Column field="invoiceCount" header="Invoices" sortable>
            <template #body="{ data }">
              <Badge :value="data.invoiceCount" severity="info" />
            </template>
          </Column>

          <Column field="averageInvoiceValue" header="Avg Invoice" sortable>
            <template #body="{ data }">
              {{ formatCurrency(data.averageInvoiceValue) }}
            </template>
          </Column>

          <Column field="paymentRate" header="Payment Rate" sortable>
            <template #body="{ data }">
              <div class="flex align-items-center gap-2">
                <span :class="getPaymentRateColor(data.paymentRate)" class="font-medium">
                  {{ data.paymentRate.toFixed(1) }}%
                </span>
                <ProgressBar
                  :value="data.paymentRate"
                  :show-value="false"
                  class="flex-1 h-0-5rem"
                  :class="getPaymentRateProgressClass(data.paymentRate)"
                />
              </div>
            </template>
          </Column>

          <Column header="Actions">
            <template #body="{ data }">
              <Button
                icon="pi pi-eye"
                @click="showSegmentDetails(data)"
                class="p-button-sm p-button-outlined"
                v-tooltip.top="'View Details'"
              />
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- Segment Details Dialog -->
      <Dialog
        v-model:visible="showDetailsDialog"
        :header="`${selectedSegment?.segmentName} - Institution Details`"
        modal
        class="w-11 lg:w-8"
      >
        <div v-if="selectedSegment">
          <!-- Segment Summary -->
          <div class="grid mb-4">
            <div class="col-12 md:col-3">
              <div class="text-center p-3 border-round bg-blue-50">
                <div class="text-blue-600 font-medium mb-1">Total Revenue</div>
                <div class="text-xl font-bold text-blue-900">
                  {{ formatCurrency(selectedSegment.totalRevenue) }}
                </div>
              </div>
            </div>
            <div class="col-12 md:col-3">
              <div class="text-center p-3 border-round bg-green-50">
                <div class="text-green-600 font-medium mb-1">Institutions</div>
                <div class="text-xl font-bold text-green-900">
                  {{ selectedSegment.institutions.length }}
                </div>
              </div>
            </div>
            <div class="col-12 md:col-3">
              <div class="text-center p-3 border-round bg-purple-50">
                <div class="text-purple-600 font-medium mb-1">Avg Invoice</div>
                <div class="text-xl font-bold text-purple-900">
                  {{ formatCurrency(selectedSegment.averageInvoiceValue) }}
                </div>
              </div>
            </div>
            <div class="col-12 md:col-3">
              <div class="text-center p-3 border-round bg-orange-50">
                <div class="text-orange-600 font-medium mb-1">Payment Rate</div>
                <div class="text-xl font-bold text-orange-900">
                  {{ selectedSegment.paymentRate.toFixed(1) }}%
                </div>
              </div>
            </div>
          </div>

          <!-- Institution List -->
          <DataTable
            :value="selectedSegment.institutions"
            :paginator="true"
            :rows="5"
            responsive-layout="scroll"
            class="p-datatable-sm"
          >
            <Column field="institutionName" header="Institution" sortable>
              <template #body="{ data }">
                <div>
                  <div class="font-medium">{{ data.institutionName }}</div>
                  <div class="text-sm text-600">{{ data.institutionType }}</div>
                </div>
              </template>
            </Column>

            <Column field="totalRevenue" header="Revenue" sortable>
              <template #body="{ data }">
                <span class="font-bold">{{ formatCurrency(data.totalRevenue) }}</span>
              </template>
            </Column>

            <Column field="invoiceCount" header="Invoices" sortable>
              <template #body="{ data }">
                <Badge :value="data.invoiceCount" />
              </template>
            </Column>

            <Column field="paymentRate" header="Payment Rate" sortable>
              <template #body="{ data }">
                <span :class="getPaymentRateColor(data.paymentRate)" class="font-medium">
                  {{ data.paymentRate.toFixed(1) }}%
                </span>
              </template>
            </Column>

            <Column field="lastInvoiceDate" header="Last Invoice" sortable>
              <template #body="{ data }">
                <span class="text-sm">
                  {{ data.lastInvoiceDate ? formatDate(data.lastInvoiceDate) : "N/A" }}
                </span>
              </template>
            </Column>

            <Column header="Actions">
              <template #body="{ data }">
                <Button
                  icon="pi pi-external-link"
                  @click="$emit('view-institution', data.institutionId)"
                  class="p-button-sm p-button-outlined"
                  v-tooltip.top="'View Institution'"
                />
              </template>
            </Column>
          </DataTable>
        </div>
      </Dialog>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Chart from "primevue/chart"
import { computed, ref } from "vue"

interface InstitutionSegmentData {
  institutionId: string
  institutionName: string
  institutionType: string
  totalRevenue: number
  invoiceCount: number
  paymentRate: number
  lastInvoiceDate?: Date
}

interface MedicalInstitutionSegmentAnalytics {
  segmentName: string
  totalRevenue: number
  invoiceCount: number
  averageInvoiceValue: number
  paymentRate: number
  institutions: InstitutionSegmentData[]
}

interface Props {
  data: MedicalInstitutionSegmentAnalytics[]
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  "view-institution": [id: string]
}>()

const viewMode = ref<"chart" | "table">("chart")
const showDetailsDialog = ref(false)
const selectedSegment = ref<MedicalInstitutionSegmentAnalytics | null>(null)

// Computed properties
const segmentChartData = computed(() => {
  return {
    labels: props.data.map((segment) => segment.segmentName),
    datasets: [
      {
        label: "Total Revenue",
        data: props.data.map((segment) => segment.totalRevenue),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "#3b82f6",
        borderWidth: 1,
        yAxisID: "y",
      },
      {
        label: "Payment Rate (%)",
        data: props.data.map((segment) => segment.paymentRate),
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderColor: "#10b981",
        borderWidth: 1,
        type: "line",
        yAxisID: "y1",
      },
    ],
  }
})

const segmentPieData = computed(() => {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

  return {
    labels: props.data.map((segment) => segment.segmentName),
    datasets: [
      {
        data: props.data.map((segment) => segment.totalRevenue),
        backgroundColor: colors.slice(0, props.data.length),
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  }
})

const segmentChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          if (context.datasetIndex === 0) {
            return `Revenue: ${formatCurrency(context.parsed.y)}`
          } else {
            return `Payment Rate: ${context.parsed.y.toFixed(1)}%`
          }
        },
      },
    },
  },
  scales: {
    y: {
      type: "linear" as const,
      display: true,
      position: "left" as const,
      ticks: {
        callback: (value: any) => formatCurrency(value),
      },
    },
    y1: {
      type: "linear" as const,
      display: true,
      position: "right" as const,
      grid: {
        drawOnChartArea: false,
      },
      ticks: {
        callback: (value: any) => `${value}%`,
      },
    },
  },
}))

const segmentPieOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const segment = props.data[context.dataIndex]
          const percentage = ((segment.totalRevenue / totalRevenue.value) * 100).toFixed(
            1
          )
          return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`
        },
      },
    },
  },
}))

const totalRevenue = computed(() => {
  return props.data.reduce((sum, segment) => sum + segment.totalRevenue, 0)
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

const getSegmentIcon = (segmentName: string): string => {
  const icons = {
    hospital: "pi pi-building text-blue-500",
    clinic: "pi pi-home text-green-500",
    medical_center: "pi pi-sitemap text-purple-500",
    specialty_clinic: "pi pi-star text-orange-500",
  }

  const key = segmentName.toLowerCase().replace(/\s+/g, "_")
  return icons[key as keyof typeof icons] || "pi pi-building text-gray-500"
}

const getPaymentRateColor = (rate: number): string => {
  if (rate >= 80) return "text-green-600"
  if (rate >= 60) return "text-orange-600"
  return "text-red-600"
}

const getPaymentRateProgressClass = (rate: number): string => {
  if (rate >= 80) return "p-progressbar-success"
  if (rate >= 60) return "p-progressbar-warning"
  return "p-progressbar-danger"
}

const toggleViewMode = () => {
  viewMode.value = viewMode.value === "chart" ? "table" : "chart"
}

const showSegmentDetails = (segment: MedicalInstitutionSegmentAnalytics) => {
  selectedSegment.value = segment
  showDetailsDialog.value = true
}
</script>

<style scoped>
.segment-card {
  transition: transform 0.2s ease-in-out;
}

.segment-card:hover {
  transform: translateY(-2px);
}

.h-0-5rem {
  height: 0.5rem;
}

@media (max-width: 768px) {
  .chart-container {
    height: 16rem;
  }
}
</style>
