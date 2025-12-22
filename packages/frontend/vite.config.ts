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
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
      'mvo-crm.up.railway.app',
      '.railway.app', // Allow all Railway subdomains
    ],
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
          // Simplified chunking to avoid circular dependencies
          if (id.includes('node_modules')) {
            // Vuetify in separate chunk (large library)
            if (id.includes('vuetify')) {
              return 'vuetify'
            }
            // Charts in separate chunk
            if (id.includes('chart.js') || id.includes('vue-chartjs')) {
              return 'charts'
            }
            // All other vendor code together
            return 'vendor'
          }
        }
      }
    },
    // Increase chunk size warning limit (avoid unnecessary warnings for legitimate large chunks)
    chunkSizeWarningLimit: 1000
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
