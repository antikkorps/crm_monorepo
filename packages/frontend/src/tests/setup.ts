import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createI18n } from 'vue-i18n'
import { vi } from 'vitest'

// Mock global window methods that might be used
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true)
})

Object.defineProperty(window, 'alert', {
  value: vi.fn()
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  root: Element | Document | null = null
  rootMargin: string = ''
  thresholds: ReadonlyArray<number> = []
} as any

// Configure Vue Test Utils global plugins
config.global.plugins = [
  createVuetify(),
  createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        // Basic messages for tests
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.delete': 'Delete',
        'common.close': 'Close'
      }
    }
  })
]

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}