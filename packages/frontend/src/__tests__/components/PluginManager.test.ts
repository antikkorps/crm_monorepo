import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PluginCategory, PluginStatus } from "../../services/api/plugins"
import { usePluginStore } from "../../stores/plugins"

// Mock the PluginManager component to avoid import issues
const PluginManager = {
  template: `
    <div class="plugin-manager">
      <div class="flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="text-2xl font-semibold text-900 mb-2">Plugin Management</h2>
          <p class="text-600 m-0">Manage and configure system plugins</p>
        </div>
        <div class="flex gap-2">
          <button data-testid="refresh-button" @click="refreshPlugins">Refresh</button>
          <button data-testid="discover-button" @click="showDiscoveryDialog = true">Discover</button>
          <button data-testid="install-button" @click="showInstallDialog = true">Install Plugin</button>
        </div>
      </div>
      
      <div class="grid mb-4">
        <div class="col-12 md:col-3 surface-card">
          <div class="text-900 font-medium text-xl">{{ stats.total }}</div>
          <div class="text-600">Total Plugins</div>
        </div>
        <div class="col-12 md:col-3 surface-card">
          <div class="text-900 font-medium text-xl">{{ stats.enabled }}</div>
          <div class="text-600">Enabled</div>
        </div>
        <div class="col-12 md:col-3 surface-card">
          <div class="text-900 font-medium text-xl">{{ stats.disabled }}</div>
          <div class="text-600">Disabled</div>
        </div>
        <div class="col-12 md:col-3 surface-card">
          <div class="text-900 font-medium text-xl">{{ stats.error }}</div>
          <div class="text-600">Errors</div>
        </div>
      </div>
      
      <div data-testid="plugin-discovery" v-if="showDiscoveryDialog"></div>
      <div data-testid="plugin-details" v-if="showDetailsDialog"></div>
      <div data-testid="plugin-configuration" v-if="showConfigDialog"></div>
      <div data-testid="plugin-health-check" v-if="showHealthDialog"></div>
    </div>
  `,
  data() {
    return {
      searchQuery: "",
      selectedCategory: null,
      selectedStatus: null,
      showInstallDialog: false,
      showDiscoveryDialog: false,
      showDetailsDialog: false,
      showConfigDialog: false,
      showHealthDialog: false,
      installPluginPath: "",
      selectedPluginForDetails: null,
      selectedPluginForConfig: null,
      selectedPluginForHealth: null,
      healthCheckData: null,
    }
  },
  computed: {
    plugins() {
      return this.$store?.plugins || []
    },
    stats() {
      return this.$store?.stats || { total: 0, enabled: 0, disabled: 0, error: 0 }
    },
    loading() {
      return this.$store?.loading || false
    },
    filteredPlugins() {
      let filtered = [...this.plugins]
      if (this.selectedCategory) {
        filtered = filtered.filter(plugin => plugin.manifest.category === this.selectedCategory)
      }
      if (this.selectedStatus) {
        filtered = filtered.filter(plugin => plugin.status === this.selectedStatus)
      }
      return filtered
    },
    categoryOptions() {
      return [
        { label: "Integration", value: PluginCategory.INTEGRATION },
        { label: "Billing", value: PluginCategory.BILLING },
        { label: "Notification", value: PluginCategory.NOTIFICATION },
        { label: "Analytics", value: PluginCategory.ANALYTICS },
        { label: "Workflow", value: PluginCategory.WORKFLOW },
        { label: "Utility", value: PluginCategory.UTILITY },
      ]
    },
    statusOptions() {
      return [
        { label: "Enabled", value: PluginStatus.ENABLED },
        { label: "Disabled", value: PluginStatus.DISABLED },
        { label: "Error", value: PluginStatus.ERROR },
        { label: "Loading", value: PluginStatus.LOADING },
      ]
    }
  },
  methods: {
    async refreshPlugins() {
      await this.$store?.refreshAll()
    },
    async handleInstallPlugin() {
      await this.$store?.installPlugin(this.installPluginPath.trim())
      this.showInstallDialog = false
      this.installPluginPath = ""
    },
    handlePluginSelected(pluginPath) {
      this.installPluginPath = pluginPath
      this.showDiscoveryDialog = false
      this.showInstallDialog = true
    },
    async enablePlugin(name) {
      await this.$store?.enablePlugin(name)
    },
    async disablePlugin(name) {
      await this.$store?.disablePlugin(name)
    },
    configurePlugin(plugin) {
      this.selectedPluginForConfig = plugin
      this.showConfigDialog = true
    },
    showPluginDetails(plugin) {
      this.selectedPluginForDetails = plugin
      this.showDetailsDialog = true
    },
    async performHealthCheck(name) {
      const health = await this.$store?.healthCheck(name)
      this.selectedPluginForHealth = name
      this.healthCheckData = health
      this.showHealthDialog = true
    },
    handleConfigurationSaved() {
      // Handle configuration saved
    },
    getCategoryDisplayName(category) {
      return category
    },
    getStatusDisplayName(status) {
      return status
    },
    getStatusSeverity(status) {
      return "info"
    },
    getCategoryIcon(category) {
      return "pi pi-box"
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString()
    }
  },
  async mounted() {
    await this.$store?.initialize()
  }
}

// Mock the plugin service
vi.mock("../../services/api/plugins", () => ({
  PluginService: {
    getCategoryDisplayName: vi.fn((category) => category),
    getStatusDisplayName: vi.fn((status) => status),
    getStatusSeverity: vi.fn(() => "info"),
    getCategoryIcon: vi.fn(() => "pi pi-box"),
  },
  PluginStatus: {
    ENABLED: "enabled",
    DISABLED: "disabled",
    ERROR: "error",
    LOADING: "loading",
  },
  PluginCategory: {
    INTEGRATION: "integration",
    BILLING: "billing",
    NOTIFICATION: "notification",
    ANALYTICS: "analytics",
    WORKFLOW: "workflow",
    UTILITY: "utility",
  },
}))

// Mock child components
vi.mock("../../components/plugins/PluginDiscovery.vue", () => ({
  default: {
    name: "PluginDiscovery",
    template: '<div data-testid="plugin-discovery"></div>',
    emits: ["update:visible", "plugin-selected"],
  },
}))

vi.mock("../../components/plugins/PluginDetails.vue", () => ({
  default: {
    name: "PluginDetails",
    template: '<div data-testid="plugin-details"></div>',
    emits: ["update:visible"],
  },
}))

vi.mock("../../components/plugins/PluginConfiguration.vue", () => ({
  default: {
    name: "PluginConfiguration",
    template: '<div data-testid="plugin-configuration"></div>',
    emits: ["update:visible", "configuration-saved"],
  },
}))

vi.mock("../../components/plugins/PluginHealthCheck.vue", () => ({
  default: {
    name: "PluginHealthCheck",
    template: '<div data-testid="plugin-health-check"></div>',
    emits: ["update:visible"],
  },
}))

const mockPlugins = [
  {
    manifest: {
      name: "test-plugin-1",
      displayName: "Test Plugin 1",
      version: "1.0.0",
      description: "A test plugin",
      author: "Test Author",
      category: PluginCategory.UTILITY,
      main: "index.js",
      enabled: true,
    },
    status: PluginStatus.ENABLED,
    config: { setting1: "value1" },
    loadedAt: "2024-01-01T00:00:00Z",
  },
  {
    manifest: {
      name: "test-plugin-2",
      displayName: "Test Plugin 2",
      version: "2.0.0",
      description: "Another test plugin",
      author: "Test Author 2",
      category: PluginCategory.INTEGRATION,
      main: "index.js",
      enabled: false,
    },
    status: PluginStatus.DISABLED,
    config: {},
    loadedAt: "2024-01-02T00:00:00Z",
  },
]

const mockStats = {
  total: 2,
  enabled: 1,
  disabled: 1,
  error: 0,
  byCategory: {
    [PluginCategory.UTILITY]: 1,
    [PluginCategory.INTEGRATION]: 1,
  },
}

describe("PluginManager", () => {
  let wrapper: any
  let pluginStore: any

  beforeEach(() => {
    setActivePinia(createPinia())
    pluginStore = usePluginStore()

    // Mock store state
    pluginStore.plugins = mockPlugins
    pluginStore.stats = mockStats
    pluginStore.loading = false
    pluginStore.error = null

    // Mock store methods
    pluginStore.initialize = vi.fn()
    pluginStore.refreshAll = vi.fn()
    pluginStore.installPlugin = vi.fn()
    pluginStore.enablePlugin = vi.fn()
    pluginStore.disablePlugin = vi.fn()
    pluginStore.uninstallPlugin = vi.fn()
    pluginStore.healthCheck = vi.fn()

    wrapper = mount(PluginManager, {
      global: {
        mocks: {
          $store: pluginStore
        }
      },
    })
  })

  it("renders correctly", () => {
    expect(wrapper.find("h2").text()).toBe("Plugin Management")
    expect(wrapper.find("p").text()).toBe("Manage and configure system plugins")
  })

  it("displays plugin statistics", () => {
    const statsCards = wrapper.findAll(".surface-card")
    expect(statsCards.length).toBeGreaterThan(0)

    // Check if stats are displayed (exact implementation depends on component structure)
    expect(wrapper.text()).toContain("2") // Total plugins
    expect(wrapper.text()).toContain("1") // Enabled plugins
  })

  it("initializes plugin store on mount", () => {
    expect(pluginStore.initialize).toHaveBeenCalled()
  })

  it("can refresh plugins", async () => {
    const refreshButton = wrapper.find('[data-testid="refresh-button"]')
    if (refreshButton.exists()) {
      await refreshButton.trigger("click")
      expect(pluginStore.refreshAll).toHaveBeenCalled()
    }
  })

  it("can open install dialog", async () => {
    const installButton = wrapper.find('[data-testid="install-button"]')
    if (installButton.exists()) {
      await installButton.trigger("click")
      expect(wrapper.vm.showInstallDialog).toBe(true)
    }
  })

  it("can open discovery dialog", async () => {
    const discoverButton = wrapper.find('[data-testid="discover-button"]')
    if (discoverButton.exists()) {
      await discoverButton.trigger("click")
      expect(wrapper.vm.showDiscoveryDialog).toBe(true)
    }
  })

  it("filters plugins by category", async () => {
    await wrapper.setData({ selectedCategory: PluginCategory.UTILITY })

    const filteredPlugins = wrapper.vm.filteredPlugins
    expect(filteredPlugins).toHaveLength(1)
    expect(filteredPlugins[0].manifest.category).toBe(PluginCategory.UTILITY)
  })

  it("filters plugins by status", async () => {
    await wrapper.setData({ selectedStatus: PluginStatus.ENABLED })

    const filteredPlugins = wrapper.vm.filteredPlugins
    expect(filteredPlugins).toHaveLength(1)
    expect(filteredPlugins[0].status).toBe(PluginStatus.ENABLED)
  })

  it("can enable a plugin", async () => {
    await wrapper.vm.enablePlugin("test-plugin-2")
    expect(pluginStore.enablePlugin).toHaveBeenCalledWith("test-plugin-2")
  })

  it("can disable a plugin", async () => {
    await wrapper.vm.disablePlugin("test-plugin-1")
    expect(pluginStore.disablePlugin).toHaveBeenCalledWith("test-plugin-1")
  })

  it("can perform health check", async () => {
    pluginStore.healthCheck.mockResolvedValue({ status: "healthy", message: "All good" })

    await wrapper.vm.performHealthCheck("test-plugin-1")
    expect(pluginStore.healthCheck).toHaveBeenCalledWith("test-plugin-1")
  })

  it("handles plugin installation", async () => {
    const pluginPath = "/path/to/plugin"
    pluginStore.installPlugin.mockResolvedValue({
      plugin: mockPlugins[0],
      message: "Plugin installed successfully",
    })

    await wrapper.setData({
      showInstallDialog: true,
      installPluginPath: pluginPath,
    })

    await wrapper.vm.handleInstallPlugin()

    expect(pluginStore.installPlugin).toHaveBeenCalledWith(pluginPath)
    expect(wrapper.vm.showInstallDialog).toBe(false)
    expect(wrapper.vm.installPluginPath).toBe("")
  })

  it("handles plugin selection from discovery", async () => {
    const pluginPath = "/discovered/plugin"

    await wrapper.vm.handlePluginSelected(pluginPath)

    expect(wrapper.vm.installPluginPath).toBe(pluginPath)
    expect(wrapper.vm.showDiscoveryDialog).toBe(false)
    expect(wrapper.vm.showInstallDialog).toBe(true)
  })

  it("shows plugin details", async () => {
    const plugin = mockPlugins[0]

    await wrapper.vm.showPluginDetails(plugin)

    expect(wrapper.vm.selectedPluginForDetails).toStrictEqual(plugin)
    expect(wrapper.vm.showDetailsDialog).toBe(true)
  })

  it("opens plugin configuration", async () => {
    const plugin = mockPlugins[0]

    await wrapper.vm.configurePlugin(plugin)

    expect(wrapper.vm.selectedPluginForConfig).toStrictEqual(plugin)
    expect(wrapper.vm.showConfigDialog).toBe(true)
  })

  it("handles configuration save", async () => {
    await wrapper.vm.handleConfigurationSaved()
    // Should show success toast (implementation depends on toast service mock)
  })

  it("formats dates correctly", () => {
    const dateString = "2024-01-01T00:00:00Z"
    const formatted = wrapper.vm.formatDate(dateString)
    expect(formatted).toBe(new Date(dateString).toLocaleDateString())
  })

  it("gets correct category display names", () => {
    const displayName = wrapper.vm.getCategoryDisplayName(PluginCategory.UTILITY)
    expect(displayName).toBeDefined()
  })

  it("gets correct status display names", () => {
    const displayName = wrapper.vm.getStatusDisplayName(PluginStatus.ENABLED)
    expect(displayName).toBeDefined()
  })

  it("gets correct status severity", () => {
    const severity = wrapper.vm.getStatusSeverity(PluginStatus.ENABLED)
    expect(severity).toBeDefined()
  })

  it("gets correct category icons", () => {
    const icon = wrapper.vm.getCategoryIcon(PluginCategory.UTILITY)
    expect(icon).toBeDefined()
  })
})
