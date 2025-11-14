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
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            // Preserve CORS headers for all API responses, especially images
            if (proxyRes.headers['access-control-allow-origin']) {
              res.setHeader('Access-Control-Allow-Origin', proxyRes.headers['access-control-allow-origin']);
            }
            if (proxyRes.headers['access-control-allow-methods']) {
              res.setHeader('Access-Control-Allow-Methods', proxyRes.headers['access-control-allow-methods']);
            }
            if (proxyRes.headers['access-control-allow-headers']) {
              res.setHeader('Access-Control-Allow-Headers', proxyRes.headers['access-control-allow-headers']);
            }
          });
        }
      },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Reduce CSS code splitting for better caching
    cssCodeSplit: true,
    // Source maps for production debugging (optional, disable for smaller builds)
    sourcemap: false,
    // Minification with esbuild (faster than terser)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Improved chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          // Core dependencies
          if (id.includes('node_modules')) {
            // Vue core
            if (id.includes('vue') && !id.includes('vuetify')) {
              if (id.includes('vue-router')) return 'vue-router'
              if (id.includes('pinia')) return 'pinia'
              if (id.includes('vue-i18n')) return 'vue-i18n'
              if (id.includes('vue-chartjs')) return 'charts'
              return 'vue'
            }

            // Vuetify in separate chunk
            if (id.includes('vuetify')) {
              return 'vuetify'
            }

            // Charts
            if (id.includes('chart.js')) {
              return 'charts'
            }

            // HTTP & Socket
            if (id.includes('axios') || id.includes('socket.io-client')) {
              return 'utils'
            }

            // Other vendor code
            return 'vendor'
          }

          // Group views by feature
          if (id.includes('/views/')) {
            if (id.includes('/segmentation/')) return 'segmentation'
            if (id.includes('/tasks/')) return 'tasks'
            if (id.includes('/team/')) return 'team'
            if (id.includes('/billing/')) return 'billing'
            if (id.includes('/export/')) return 'export'
            if (id.includes('/webhooks/')) return 'webhooks'
            if (id.includes('/templates/')) return 'templates'
            if (id.includes('/settings/')) return 'settings'
          }
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 800
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev startup
    include: [
      'vue',
      'vue-router',
      'pinia',
      'vuetify',
      'axios',
      'socket.io-client',
      'vue-i18n',
      'chart.js',
      'vue-chartjs',
    ],
  },
})
