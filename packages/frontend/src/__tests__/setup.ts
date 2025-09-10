import { config } from "@vue/test-utils"

// Mock Vuetify components
config.global.stubs = {
  "v-app": true,
  "v-main": true,
  "v-container": true,
  "v-row": true,
  "v-col": true,
  "v-btn": true,
  "v-icon": true,
  "v-card": true,
  "v-card-text": true,
  "v-card-title": true,
  "v-avatar": true,
  "v-footer": true,
  "v-divider": true,
  "v-list": true,
  "v-list-item": true,
  "v-list-item-title": true,
}