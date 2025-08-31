import { createPinia } from "pinia"
import { createApp } from "vue"

// Vuetify
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

// i18n
import i18n from './i18n'

import App from "./App.vue"
import router from "./router"

const app = createApp(App)
const pinia = createPinia()

// Create Vuetify instance
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
        }
      }
    }
  },
  icons: {
    defaultSet: 'mdi'
  }
})

// Add Vuetify
app.use(vuetify)

// Add Pinia store
app.use(pinia)

// Add Vue Router
app.use(router)

// Add i18n
app.use(i18n)

app.mount("#app")
