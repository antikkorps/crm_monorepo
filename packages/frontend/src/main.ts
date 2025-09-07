import { createPinia } from "pinia"
import { createApp } from "vue"

// Vuetify
import "@mdi/font/css/materialdesignicons.css"
import { createVuetify } from "vuetify"
import * as components from "vuetify/components"
import * as directives from "vuetify/directives"
import "vuetify/styles"

// i18n
import i18n from "./i18n"

import App from "./App.vue"
import Card from "./components/base/Card.vue"
import router from "./router"
// PrimeVue services for backward compatibility

const app = createApp(App)
const pinia = createPinia()

// Create Vuetify instance
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "light",
    themes: {
      light: {
        dark: false,
        colors: {
          primary: "#00695C",
          secondary: "#616161",
          accent: "#4FC3F7",
          error: "#D32F2F",
          info: "#1976D2",
          success: "#388E3C",
          warning: "#FBC02D",
          surface: "#F5F5F5",
          background: "#FFFFFF",
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: "#26A69A", // Un bleu-vert plus clair pour le mode sombre
          secondary: "#757575",
          accent: "#81D4FA",
          error: "#EF5350",
          info: "#42A5F5",
          success: "#66BB6A",
          warning: "#FFEE58",
          surface: "#272727", // Surface sombre pour les cartes
          background: "#121212",
        },
      },
    },
  },
  icons: {
    defaultSet: "mdi",
  },
})

// Add Vuetify
app.use(vuetify)

// Add Pinia store
app.use(pinia)

// Add Vue Router
app.use(router)

// Add i18n
app.use(i18n)

// No PrimeVue: we rely solely on Vuetify now

// Register lightweight compatibility components
app.component("Card", Card)

app.mount("#app")
