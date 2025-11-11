import { settingsApi } from "@/services/api"
import { defineStore } from "pinia"

export interface FeatureFlags {
  quotes_enabled: boolean
  invoices_enabled: boolean
  tasks_enabled: boolean
  contacts_enabled: boolean
  segmentation_enabled: boolean
}

export interface SystemSettings {
  key: string
  value: any
  category: string
  isPublic: boolean
}

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    featureFlags: {
      quotes_enabled: true,
      invoices_enabled: true,
      tasks_enabled: true,
      contacts_enabled: true,
      segmentation_enabled: true,
    } as FeatureFlags,
    allSettings: [] as SystemSettings[],
    loading: false,
    initialized: false,
  }),

  getters: {
    isQuotesEnabled: (state) => state.featureFlags.quotes_enabled,
    isInvoicesEnabled: (state) => state.featureFlags.invoices_enabled,
    isTasksEnabled: (state) => state.featureFlags.tasks_enabled,
    isContactsEnabled: (state) => state.featureFlags.contacts_enabled,
    isSegmentationEnabled: (state) => state.featureFlags.segmentation_enabled,
    isBillingEnabled: (state) =>
      state.featureFlags.quotes_enabled || state.featureFlags.invoices_enabled,
  },

  actions: {
    /**
     * Load public settings (feature flags)
     * Should be called at app startup
     */
    async loadPublicSettings() {
      try {
        this.loading = true
        const response = await settingsApi.getPublic()
        const data = response.data || {}

        // Update feature flags from response
        if (data.features) {
          this.featureFlags = {
            quotes_enabled: data.features.quotes_enabled ?? true,
            invoices_enabled: data.features.invoices_enabled ?? true,
            tasks_enabled: data.features.tasks_enabled ?? true,
            contacts_enabled: data.features.contacts_enabled ?? true,
            segmentation_enabled: data.features.segmentation_enabled ?? true,
          }
        }

        this.initialized = true
      } catch (error) {
        console.error("Failed to load public settings:", error)
        // Keep defaults if loading fails
      } finally {
        this.loading = false
      }
    },

    /**
     * Load all settings (SUPER_ADMIN only)
     */
    async loadAllSettings() {
      try {
        this.loading = true
        const response = await settingsApi.getAll()
        this.allSettings = response.data || []
      } catch (error) {
        console.error("Failed to load all settings:", error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Update a single setting (SUPER_ADMIN only)
     */
    async updateSetting(key: string, value: any) {
      try {
        await settingsApi.updateSetting(key, value)
        // Reload settings to reflect changes
        await this.loadAllSettings()
        await this.loadPublicSettings()
      } catch (error) {
        console.error("Failed to update setting:", error)
        throw error
      }
    },

    /**
     * Bulk update settings (SUPER_ADMIN only)
     */
    async bulkUpdateSettings(settings: Array<{ key: string; value: any }>) {
      try {
        await settingsApi.bulkUpdate(settings)
        // Reload settings to reflect changes
        await this.loadAllSettings()
        await this.loadPublicSettings()
      } catch (error) {
        console.error("Failed to bulk update settings:", error)
        throw error
      }
    },

    /**
     * Get a specific feature flag value
     */
    getFeatureFlag(featureName: keyof FeatureFlags): boolean {
      return this.featureFlags[featureName]
    },
  },
})
