import vue from "@vitejs/plugin-vue"
import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@medical-crm/shared": resolve(__dirname, "../shared/src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vue ecosystem
          vue: ['vue', 'vue-router', 'pinia'],
          // UI frameworks
          vuetify: ['vuetify'],
          // Charts and visualization
          charts: ['chart.js', 'vue-chartjs'],
          // Utilities
          utils: ['axios', 'socket.io-client', 'vue-i18n'],
          // Large views that can be lazy loaded
          segmentation: ['/src/views/segmentation/SegmentationView.vue'],
          tasks: ['/src/views/tasks/TasksView.vue'],
          team: ['/src/views/team/TeamView.vue'],
          billing: [
            '/src/views/billing/InvoicesView.vue',
            '/src/views/billing/QuotesView.vue',
            '/src/views/billing/InvoiceDetailView.vue'
          ],
        }
      }
    },
    // Increase chunk size warning limit for better UX
    chunkSizeWarningLimit: 1000
  }
})
