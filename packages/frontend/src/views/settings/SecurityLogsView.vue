<template>
  <AppLayout>
    <v-container fluid>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon class="mr-2">mdi-shield-lock</v-icon>
              Security Logs
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                variant="outlined"
                @click="loadLogs"
                :loading="loading"
              >
                <v-icon left>mdi-refresh</v-icon>
                Refresh
              </v-btn>
            </v-card-title>

            <v-card-text>
              <!-- Filters -->
              <v-row class="mb-4">
                <v-col cols="12" md="3">
                  <v-select
                    v-model="filters.severity"
                    :items="severityOptions"
                    label="Severity"
                    clearable
                    density="compact"
                    @update:model-value="loadLogs"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="filters.action"
                    :items="actionOptions"
                    label="Action"
                    clearable
                    density="compact"
                    @update:model-value="loadLogs"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="filters.status"
                    :items="statusOptions"
                    label="Status"
                    clearable
                    density="compact"
                    @update:model-value="loadLogs"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="filters.ipAddress"
                    label="IP Address"
                    clearable
                    density="compact"
                    @update:model-value="debouncedLoadLogs"
                  ></v-text-field>
                </v-col>
              </v-row>

              <!-- Data Table -->
              <v-data-table
                :headers="headers"
                :items="logs"
                :loading="loading"
                :items-per-page="pagination.limit"
                :page="pagination.page"
                @update:page="onPageChange"
                class="elevation-1"
              >
                <template v-slot:item.severity="{ item }">
                  <v-chip
                    :color="getSeverityColor(item.severity)"
                    size="small"
                    variant="flat"
                  >
                    {{ item.severity }}
                  </v-chip>
                </template>

                <template v-slot:item.status="{ item }">
                  <v-chip
                    :color="item.status === 'success' ? 'success' : 'error'"
                    size="small"
                    variant="flat"
                  >
                    {{ item.status }}
                  </v-chip>
                </template>

                <template v-slot:item.action="{ item }">
                  <v-chip size="small" variant="outlined">
                    {{ item.action }}
                  </v-chip>
                </template>

                <template v-slot:item.user="{ item }">
                  <span v-if="item.user">
                    {{ item.user.firstName }} {{ item.user.lastName }}
                    <br />
                    <small class="text-grey">{{ item.user.email }}</small>
                  </span>
                  <span v-else class="text-grey">Anonymous</span>
                </template>

                <template v-slot:item.createdAt="{ item }">
                  {{ formatDate(item.createdAt) }}
                </template>

                <template v-slot:item.details="{ item }">
                  <v-tooltip v-if="item.details" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon
                        size="small"
                        variant="text"
                      >
                        <v-icon>mdi-information</v-icon>
                      </v-btn>
                    </template>
                    <span>{{ item.details }}</span>
                  </v-tooltip>
                </template>
              </v-data-table>

              <!-- Pagination Info -->
              <div class="text-center mt-4">
                <span class="text-grey">
                  Showing {{ logs.length }} of {{ pagination.total }} logs
                </span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Statistics Card -->
      <v-row class="mt-4">
        <v-col cols="12" md="3" v-for="stat in stats" :key="stat.severity">
          <v-card>
            <v-card-text>
              <div class="text-h6">{{ stat.count }}</div>
              <div class="text-caption text-grey">
                {{ stat.severity }} severity logs
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import AppLayout from "@/components/layout/AppLayout.vue"

interface SecurityLog {
  id: string
  userId?: string
  action: string
  resource: string
  resourceId?: string
  ipAddress: string
  userAgent: string
  status: string
  severity: string
  details?: string
  createdAt: string
  user?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const logs = ref<SecurityLog[]>([])
const loading = ref(false)
const pagination = ref<Pagination>({
  page: 1,
  limit: 50,
  total: 0,
  pages: 0,
})
const stats = ref<Array<{ severity: string; count: number }>>([])

const filters = ref({
  severity: null as string | null,
  action: null as string | null,
  status: null as string | null,
  ipAddress: null as string | null,
})

const headers = [
  { title: "Date", key: "createdAt", sortable: false },
  { title: "User", key: "user", sortable: false },
  { title: "Action", key: "action", sortable: false },
  { title: "Resource", key: "resource", sortable: false },
  { title: "Status", key: "status", sortable: false },
  { title: "Severity", key: "severity", sortable: false },
  { title: "IP Address", key: "ipAddress", sortable: false },
  { title: "Details", key: "details", sortable: false },
]

const severityOptions = ["low", "medium", "high", "critical"]
const statusOptions = ["success", "failure"]
const actionOptions = [
  "auth.login",
  "auth.logout",
  "auth.failed",
  "data.read",
  "data.create",
  "data.update",
  "data.delete",
  "data.export",
  "permission.denied",
]

const loadLogs = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.append("page", pagination.value.page.toString())
    params.append("limit", pagination.value.limit.toString())

    if (filters.value.severity) params.append("severity", filters.value.severity)
    if (filters.value.action) params.append("action", filters.value.action)
    if (filters.value.status) params.append("status", filters.value.status)
    if (filters.value.ipAddress) params.append("ipAddress", filters.value.ipAddress)

    const response = await fetch(`/api/security-logs?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    if (!response.ok) throw new Error("Failed to load security logs")

    const data = await response.json()
    logs.value = data.logs
    pagination.value = data.pagination
  } catch (error) {
    console.error("Error loading security logs:", error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await fetch("/api/security-logs/stats", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    if (!response.ok) throw new Error("Failed to load stats")

    const data = await response.json()
    stats.value = data.bySeverity
  } catch (error) {
    console.error("Error loading stats:", error)
  }
}

let debounceTimeout: number | null = null
const debouncedLoadLogs = () => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = window.setTimeout(() => {
    loadLogs()
  }, 500)
}

const onPageChange = (page: number) => {
  pagination.value.page = page
  loadLogs()
}

const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    low: "grey",
    medium: "info",
    high: "warning",
    critical: "error",
  }
  return colors[severity] || "grey"
}

const formatDate = (date: string): string => {
  return new Date(date).toLocaleString()
}

onMounted(() => {
  loadLogs()
  loadStats()
})
</script>
