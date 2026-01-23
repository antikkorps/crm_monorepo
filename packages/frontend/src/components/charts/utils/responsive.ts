/**
 * Responsive Chart Configuration
 * Mobile-first responsive breakpoints for ApexCharts
 */

import type { ApexOptions } from 'apexcharts'

/**
 * Default responsive breakpoints for charts
 * Mobile-first approach: base config is for mobile, breakpoints add desktop enhancements
 */
export function getResponsiveOptions(baseHeight = 350): ApexOptions['responsive'] {
  return [
    {
      // Mobile (< 600px)
      breakpoint: 600,
      options: {
        chart: {
          height: Math.min(baseHeight, 280),
          toolbar: { show: false },
        },
        legend: {
          position: 'bottom',
          fontSize: '11px',
          itemMargin: {
            horizontal: 8,
            vertical: 4,
          },
        },
        xaxis: {
          labels: {
            rotate: -45,
            rotateAlways: true,
            style: { fontSize: '10px' },
            trim: true,
            maxHeight: 60,
          },
        },
        yaxis: {
          labels: {
            style: { fontSize: '10px' },
          },
        },
        dataLabels: {
          style: {
            fontSize: '10px',
          },
        },
        plotOptions: {
          bar: {
            columnWidth: '70%',
          },
          pie: {
            donut: {
              labels: {
                name: { fontSize: '12px' },
                value: { fontSize: '14px' },
              },
            },
          },
        },
      },
    },
    {
      // Tablet (600px - 960px)
      breakpoint: 960,
      options: {
        chart: {
          height: Math.min(baseHeight, 320),
        },
        legend: {
          fontSize: '12px',
        },
        xaxis: {
          labels: {
            rotate: -45,
            style: { fontSize: '11px' },
          },
        },
      },
    },
  ]
}

/**
 * Responsive options specifically for donut charts
 */
export function getDonutResponsiveOptions(baseHeight = 350): ApexOptions['responsive'] {
  return [
    {
      breakpoint: 600,
      options: {
        chart: {
          height: Math.min(baseHeight, 260),
        },
        legend: {
          position: 'bottom',
          fontSize: '11px',
          horizontalAlign: 'center',
        },
        plotOptions: {
          pie: {
            donut: {
              size: '60%',
              labels: {
                show: true,
                name: { fontSize: '11px' },
                value: { fontSize: '16px' },
                total: { fontSize: '11px' },
              },
            },
          },
        },
      },
    },
    {
      breakpoint: 960,
      options: {
        chart: {
          height: Math.min(baseHeight, 300),
        },
        legend: {
          fontSize: '12px',
        },
      },
    },
  ]
}

/**
 * Responsive options for horizontal bar charts
 */
export function getHorizontalBarResponsiveOptions(baseHeight = 350): ApexOptions['responsive'] {
  return [
    {
      breakpoint: 600,
      options: {
        chart: {
          height: Math.min(baseHeight, 280),
        },
        plotOptions: {
          bar: {
            horizontal: true,
            barHeight: '60%',
          },
        },
        xaxis: {
          labels: {
            style: { fontSize: '10px' },
          },
        },
        yaxis: {
          labels: {
            style: { fontSize: '10px' },
            maxWidth: 100,
          },
        },
        dataLabels: {
          style: { fontSize: '10px' },
        },
      },
    },
    {
      breakpoint: 960,
      options: {
        chart: {
          height: Math.min(baseHeight, 320),
        },
        yaxis: {
          labels: {
            maxWidth: 120,
          },
        },
      },
    },
  ]
}

/**
 * Responsive options for sparklines (mini charts)
 */
export function getSparklineResponsiveOptions(): ApexOptions['responsive'] {
  return [
    {
      breakpoint: 600,
      options: {
        chart: {
          height: 40,
        },
      },
    },
  ]
}

/**
 * Get dynamic height based on number of items (for horizontal bars)
 */
export function getDynamicHeight(itemCount: number, minHeight = 200, itemHeight = 40): number {
  return Math.max(minHeight, itemCount * itemHeight + 60) // 60px for padding/legend
}
