/**
 * Chart Theme Utilities
 * Provides Vuetify theme integration for ApexCharts
 */

import { computed } from 'vue'
import { useTheme } from 'vuetify'
import type { ChartThemeColors } from '../types'

/**
 * Composable for chart colors integrated with Vuetify theme
 */
export function useChartColors() {
  const theme = useTheme()

  // Extract theme colors
  const chartColors = computed<ChartThemeColors>(() => ({
    primary: theme.current.value.colors.primary,
    secondary: theme.current.value.colors.secondary,
    success: theme.current.value.colors.success,
    warning: theme.current.value.colors.warning,
    error: theme.current.value.colors.error,
    info: theme.current.value.colors.info,
    surface: theme.current.value.colors.surface,
    background: theme.current.value.colors.background,
  }))

  // Default color palette for charts
  const defaultPalette = computed(() => [
    chartColors.value.primary,
    chartColors.value.success,
    chartColors.value.warning,
    chartColors.value.error,
    chartColors.value.info,
    chartColors.value.secondary,
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ])

  // Revenue-specific palette (won, pipeline, lost)
  const revenuePalette = computed(() => [
    chartColors.value.success, // Won - green
    chartColors.value.primary, // Pipeline - blue
    chartColors.value.error,   // Lost - red
  ])

  // Status palette (success, warning, error, info)
  const statusPalette = computed(() => [
    chartColors.value.success,
    chartColors.value.warning,
    chartColors.value.error,
    chartColors.value.info,
  ])

  // Check if dark mode
  const isDark = computed(() => theme.current.value.dark)

  // Text color based on theme
  const textColor = computed(() =>
    isDark.value ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)'
  )

  // Muted text color
  const textMutedColor = computed(() =>
    isDark.value ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'
  )

  // Grid line color
  const gridColor = computed(() =>
    isDark.value ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  )

  // Tooltip background
  const tooltipBackground = computed(() =>
    isDark.value ? '#1E1E1E' : '#FFFFFF'
  )

  // Card/surface background for charts
  const surfaceColor = computed(() =>
    isDark.value ? '#1E1E1E' : '#FFFFFF'
  )

  return {
    chartColors,
    defaultPalette,
    revenuePalette,
    statusPalette,
    isDark,
    textColor,
    textMutedColor,
    gridColor,
    tooltipBackground,
    surfaceColor,
  }
}

/**
 * Get base ApexCharts options with theme integration
 */
export function getBaseChartOptions(colors: ReturnType<typeof useChartColors>) {
  return computed(() => ({
    chart: {
      background: 'transparent',
      fontFamily: 'inherit',
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 400,
      },
    },
    theme: {
      mode: colors.isDark.value ? 'dark' : 'light',
    },
    tooltip: {
      theme: colors.isDark.value ? 'dark' : 'light',
      style: {
        fontSize: '12px',
      },
    },
    legend: {
      labels: {
        colors: colors.textColor.value,
      },
    },
    grid: {
      borderColor: colors.gridColor.value,
    },
    xaxis: {
      labels: {
        style: {
          colors: colors.textMutedColor.value,
        },
      },
      axisBorder: {
        color: colors.gridColor.value,
      },
      axisTicks: {
        color: colors.gridColor.value,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: colors.textMutedColor.value,
        },
      },
    },
  }))
}
