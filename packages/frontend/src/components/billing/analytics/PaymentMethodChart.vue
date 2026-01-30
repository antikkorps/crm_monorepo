<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-credit-card-outline</v-icon>
        {{ t("billing.analytics.paymentMethods.title") }}
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Loading state -->
      <div v-if="!data" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!data.paymentsByMethod || data.paymentsByMethod.length === 0"
        class="text-center py-8"
      >
        <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-credit-card-off-outline</v-icon>
        <h3 class="text-h6 mb-2">{{ t("billing.analytics.paymentMethods.noData") }}</h3>
        <p class="text-body-2 text-medium-emphasis">
          {{ t("billing.analytics.paymentMethods.noDataHint") }}
        </p>
      </div>

      <!-- Data display -->
      <div v-else>
        <!-- Summary stats -->
        <div class="d-flex justify-space-between mb-4 px-2">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-primary">
              {{ formatCurrency(data.totalPayments) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t("billing.analytics.paymentMethods.totalReceived") }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-h5 font-weight-bold">
              {{ totalCount }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t("billing.analytics.paymentMethods.transactions") }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-secondary">
              {{ formatCurrency(data.averagePaymentAmount) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t("billing.analytics.paymentMethods.average") }}
            </div>
          </div>
        </div>

        <v-divider class="mb-4" />

        <!-- Payment methods breakdown -->
        <div class="payment-methods-list">
          <div
            v-for="method in data.paymentsByMethod"
            :key="method.method"
            class="payment-method-item mb-3"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <div class="d-flex align-center">
                <v-icon :color="getMethodColor(method.method)" size="20" class="mr-2">
                  {{ getMethodIcon(method.method) }}
                </v-icon>
                <span class="text-body-2 font-weight-medium">
                  {{ getMethodLabel(method.method) }}
                </span>
              </div>
              <div class="text-right">
                <span class="text-body-2 font-weight-bold">
                  {{ formatCurrency(method.amount) }}
                </span>
                <span class="text-caption text-medium-emphasis ml-2">
                  ({{ method.count }} {{ method.count > 1 ? t("billing.analytics.paymentMethods.payments") : t("billing.analytics.paymentMethods.payment") }})
                </span>
              </div>
            </div>
            <v-progress-linear
              :model-value="method.percentage"
              :color="getMethodColor(method.method)"
              height="8"
              rounded
            />
            <div class="d-flex justify-space-between mt-1">
              <span class="text-caption text-medium-emphasis">
                {{ method.percentage.toFixed(1) }}%
              </span>
              <span class="text-caption text-medium-emphasis">
                {{ t("billing.analytics.paymentMethods.avgPerTransaction") }}: {{ formatCurrency(method.averageAmount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { PaymentMethod } from "@medical-crm/shared"
import { computed } from "vue"
import { useI18n } from "vue-i18n"

interface PaymentMethodAnalytics {
  method: PaymentMethod
  amount: number
  count: number
  percentage: number
  averageAmount: number
}

interface PaymentAnalytics {
  totalPayments: number
  paymentsByMethod: PaymentMethodAnalytics[]
  averagePaymentAmount: number
}

interface Props {
  data?: PaymentAnalytics
}

const props = defineProps<Props>()
const { t } = useI18n()

const totalCount = computed(() => {
  if (!props.data?.paymentsByMethod) return 0
  return props.data.paymentsByMethod.reduce((sum, m) => sum + m.count, 0)
})

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0)
}

const getMethodIcon = (method: PaymentMethod | undefined): string => {
  if (!method) return "mdi-help-circle"
  const icons: Record<PaymentMethod, string> = {
    [PaymentMethod.BANK_TRANSFER]: "mdi-bank-transfer",
    [PaymentMethod.CHECK]: "mdi-checkbook",
    [PaymentMethod.CASH]: "mdi-cash",
    [PaymentMethod.CREDIT_CARD]: "mdi-credit-card",
    [PaymentMethod.OTHER]: "mdi-dots-horizontal-circle",
  }
  return icons[method] || "mdi-help-circle"
}

const getMethodColor = (method: PaymentMethod | undefined): string => {
  if (!method) return "grey"
  const colors: Record<PaymentMethod, string> = {
    [PaymentMethod.BANK_TRANSFER]: "blue",
    [PaymentMethod.CHECK]: "orange",
    [PaymentMethod.CASH]: "green",
    [PaymentMethod.CREDIT_CARD]: "purple",
    [PaymentMethod.OTHER]: "grey",
  }
  return colors[method] || "grey"
}

const getMethodLabel = (method: PaymentMethod | undefined): string => {
  if (!method) return t("billing.paymentMethods.other")
  return t(`billing.paymentMethods.${method}`)
}
</script>

<style scoped>
.payment-methods-list {
  max-height: 400px;
  overflow-y: auto;
}

.payment-method-item {
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.payment-method-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
