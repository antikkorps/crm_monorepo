import { createPinia } from "pinia"
import { createApp } from "vue"

// Vuetify optimized configuration (tree-shaking enabled)
import vuetify from "./plugins/vuetify"

// i18n
import i18n from "./i18n"

// Shepherd.js tours CSS
import "shepherd.js/dist/css/shepherd.css"
import "./assets/tour-theme.css"

import App from "./App.vue"
import Card from "./components/base/Card.vue"
import router from "./router"

const app = createApp(App)
const pinia = createPinia()

// Add Vuetify
app.use(vuetify)

// Add Pinia store
app.use(pinia)

// Add Vue Router
app.use(router)

// Add i18n
app.use(i18n)

// Register lightweight compatibility components
app.component("Card", Card)

app.mount("#app")
