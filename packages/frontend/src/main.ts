import Aura from "@primeuix/themes/aura"
import { createPinia } from "pinia"
import PrimeVue from "primevue/config"
import ConfirmationService from "primevue/confirmationservice"
import ToastService from "primevue/toastservice"
import Tooltip from "primevue/tooltip"
import { createApp } from "vue"

// PrimeVue theme and styles
import "primeflex/primeflex.css"
import "primeicons/primeicons.css"

import App from "./App.vue"
import router from "./router"

const app = createApp(App)
const pinia = createPinia()

// Configure PrimeVue
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
  ripple: true,
})

// Add PrimeVue services
app.use(ToastService)
app.use(ConfirmationService)

// Add PrimeVue directives
app.directive("tooltip", Tooltip)

// Add Pinia store
app.use(pinia)

// Add Vue Router
app.use(router)

app.mount("#app")
