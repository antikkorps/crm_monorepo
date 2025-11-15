import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from "fs/promises"
import * as path from "path"
import { DefaultPluginManager } from "../../services/PluginManager"
import { PluginCategory, PluginStatus } from "../../types/plugin"

// Mock the logger
vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  },
}))

// Mock fs promises
vi.mock("fs/promises")
const mockFs = fs as any

describe("PluginManager", () => {
  let pluginManager: DefaultPluginManager
  let testPluginDir: string

  beforeEach(() => {
    testPluginDir = "/test/plugins"
    pluginManager = new DefaultPluginManager(testPluginDir)
    vi.clearAllMocks()
  })

  afterEach(async () => {
    if (pluginManager.isInitialized()) {
      await pluginManager.shutdown()
    }
  })

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      // Mock directory operations
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readdir.mockResolvedValue([])

      await pluginManager.initialize()

      expect(pluginManager.isInitialized()).toBe(true)
    })

    it("should create plugin directory if it doesn't exist", async () => {
      // Mock directory doesn't exist, then exists after creation
      mockFs.access.mockRejectedValueOnce(new Error("ENOENT"))
      mockFs.mkdir.mockResolvedValue(undefined)
      mockFs.readdir.mockResolvedValue([])

      await pluginManager.initialize()

      expect(mockFs.mkdir).toHaveBeenCalledWith(testPluginDir, { recursive: true })
    })

    it("should not initialize twice", async () => {
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readdir.mockResolvedValue([])

      await pluginManager.initialize()
      await pluginManager.initialize() // Second call should be ignored

      expect(pluginManager.isInitialized()).toBe(true)
    })
  })

  describe("plugin discovery", () => {
    it("should discover plugins in directory", async () => {
      const mockEntries = [
        { name: "plugin1", isDirectory: () => true },
        { name: "plugin2", isDirectory: () => true },
        { name: "file.txt", isDirectory: () => false },
        { name: ".hidden", isDirectory: () => true },
        { name: "node_modules", isDirectory: () => true },
      ]

      mockFs.readdir.mockResolvedValue(mockEntries as any)
      mockFs.access.mockResolvedValue(undefined) // package.json exists

      const plugins = await pluginManager.discover(testPluginDir)

      expect(plugins).toEqual([
        path.join(testPluginDir, "plugin1"),
        path.join(testPluginDir, "plugin2"),
      ])
    })

    it("should handle non-existent directory", async () => {
      const error = new Error("ENOENT") as any
      error.code = "ENOENT"
      mockFs.readdir.mockRejectedValue(error)

      const plugins = await pluginManager.discover("/nonexistent")

      expect(plugins).toEqual([])
    })
  })

  describe("plugin installation", () => {
    const mockPlugin = {
      manifest: {
        name: "test-plugin",
        version: "1.0.0",
        description: "Test plugin",
        author: "Test Author",
        main: "index.js",
        displayName: "Test Plugin",
        category: PluginCategory.UTILITY,
        enabled: true,
      },
      onLoad: vi.fn(),
      onEnable: vi.fn(),
    }

    beforeEach(() => {
      // Mock plugin loading
      vi.doMock(path.join(testPluginDir, "test-plugin", "index.js"), () => mockPlugin, {
        virtual: true,
      })
    })

    it("should install a plugin successfully", async () => {
      // Mock file system operations
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPlugin.manifest))
      mockFs.access.mockResolvedValue(undefined)

      const instance = await pluginManager.install(
        path.join(testPluginDir, "test-plugin")
      )

      expect(instance.manifest.name).toBe("test-plugin")
      expect(instance.status).toBe(PluginStatus.INSTALLED)
      expect(mockPlugin.onLoad).toHaveBeenCalled()
    })

    it("should reject duplicate plugin installation", async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPlugin.manifest))
      mockFs.access.mockResolvedValue(undefined)

      await pluginManager.install(path.join(testPluginDir, "test-plugin"))

      await expect(
        pluginManager.install(path.join(testPluginDir, "test-plugin"))
      ).rejects.toThrow("already installed")
    })

    it("should handle invalid plugin path", async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => false } as any)

      await expect(pluginManager.install("/invalid/path")).rejects.toThrow(
        "not a directory"
      )
    })
  })

  describe("plugin lifecycle", () => {
    const mockPlugin = {
      manifest: {
        name: "lifecycle-plugin",
        version: "1.0.0",
        description: "Lifecycle test plugin",
        author: "Test Author",
        main: "index.js",
        displayName: "Lifecycle Plugin",
        category: PluginCategory.UTILITY,
        enabled: true,
      },
      onLoad: vi.fn(),
      onUnload: vi.fn(),
      onEnable: vi.fn(),
      onDisable: vi.fn(),
    }

    beforeEach(async () => {
      // Install plugin first
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPlugin.manifest))
      mockFs.access.mockResolvedValue(undefined)

      vi.doMock(
        path.join(testPluginDir, "lifecycle-plugin", "index.js"),
        () => mockPlugin,
        { virtual: true }
      )

      await pluginManager.install(path.join(testPluginDir, "lifecycle-plugin"))
    })

    it("should enable a plugin", async () => {
      await pluginManager.enable("lifecycle-plugin")

      expect(pluginManager.getStatus("lifecycle-plugin")).toBe(PluginStatus.ENABLED)
      expect(mockPlugin.onEnable).toHaveBeenCalled()
    })

    it("should disable a plugin", async () => {
      await pluginManager.enable("lifecycle-plugin")
      await pluginManager.disable("lifecycle-plugin")

      expect(pluginManager.getStatus("lifecycle-plugin")).toBe(PluginStatus.DISABLED)
      expect(mockPlugin.onDisable).toHaveBeenCalled()
    })

    it("should uninstall a plugin", async () => {
      await pluginManager.uninstall("lifecycle-plugin")

      expect(pluginManager.registry.get("lifecycle-plugin")).toBeUndefined()
      expect(mockPlugin.onUnload).toHaveBeenCalled()
    })

    it("should handle plugin errors gracefully", async () => {
      mockPlugin.onEnable.mockRejectedValue(new Error("Plugin error"))

      await expect(pluginManager.enable("lifecycle-plugin")).rejects.toThrow(
        "Plugin error"
      )
      expect(pluginManager.getStatus("lifecycle-plugin")).toBe(PluginStatus.ERROR)
    })
  })

  describe("plugin configuration", () => {
    const mockPlugin = {
      manifest: {
        name: "config-plugin",
        version: "1.0.0",
        description: "Config test plugin",
        author: "Test Author",
        main: "index.js",
        displayName: "Config Plugin",
        category: PluginCategory.UTILITY,
        enabled: true,
        defaultConfig: { setting1: "value1" },
      },
      validateConfig: vi.fn().mockResolvedValue(true),
      onConfigChange: vi.fn(),
    }

    beforeEach(async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPlugin.manifest))
      mockFs.access.mockResolvedValue(undefined)

      vi.doMock(
        path.join(testPluginDir, "config-plugin", "index.js"),
        () => mockPlugin,
        { virtual: true }
      )

      await pluginManager.install(path.join(testPluginDir, "config-plugin"))
    })

    it("should configure a plugin", async () => {
      const newConfig = { setting1: "newValue", setting2: "value2" }

      await pluginManager.configure("config-plugin", newConfig)

      expect(mockPlugin.validateConfig).toHaveBeenCalledWith(newConfig)
      expect(mockPlugin.onConfigChange).toHaveBeenCalledWith(
        newConfig,
        expect.any(Object)
      )

      const config = pluginManager.getConfig("config-plugin")
      expect(config.setting1).toBe("newValue")
      expect(config.setting2).toBe("value2")
    })

    it("should reject invalid configuration", async () => {
      mockPlugin.validateConfig.mockResolvedValue(false)

      await expect(
        pluginManager.configure("config-plugin", { invalid: true })
      ).rejects.toThrow("Invalid configuration")
    })
  })

  describe("health checks", () => {
    const mockPlugin = {
      manifest: {
        name: "health-plugin",
        version: "1.0.0",
        description: "Health test plugin",
        author: "Test Author",
        main: "index.js",
        displayName: "Health Plugin",
        category: PluginCategory.UTILITY,
        enabled: true,
      },
      healthCheck: vi.fn().mockResolvedValue({
        status: "healthy",
        message: "All good",
      }),
    }

    beforeEach(async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPlugin.manifest))
      mockFs.access.mockResolvedValue(undefined)

      vi.doMock(
        path.join(testPluginDir, "health-plugin", "index.js"),
        () => mockPlugin,
        { virtual: true }
      )

      await pluginManager.install(path.join(testPluginDir, "health-plugin"))
    })

    it("should perform health check on specific plugin", async () => {
      const health = await pluginManager.healthCheck("health-plugin")

      expect(health.status).toBe("healthy")
      expect(health.message).toBe("All good")
      expect(mockPlugin.healthCheck).toHaveBeenCalled()
    })

    it("should perform health check on all plugins", async () => {
      const health = await pluginManager.healthCheck()

      expect(health["health-plugin"]).toBeDefined()
      expect(health["health-plugin"].status).toBe("healthy")
    })

    it("should handle plugin without health check", async () => {
      const simplePlugin = {
        manifest: {
          name: "simple-plugin",
          version: "1.0.0",
          description: "Simple plugin",
          author: "Test Author",
          main: "index.js",
          displayName: "Simple Plugin",
          category: PluginCategory.UTILITY,
          enabled: true,
        },
      }

      vi.doMock(
        path.join(testPluginDir, "simple-plugin", "index.js"),
        () => simplePlugin,
        { virtual: true }
      )
      mockFs.readFile.mockResolvedValue(JSON.stringify(simplePlugin.manifest))

      await pluginManager.install(path.join(testPluginDir, "simple-plugin"))
      await pluginManager.enable("simple-plugin")

      const health = await pluginManager.healthCheck("simple-plugin")

      expect(health.status).toBe("healthy")
      expect(health.message).toContain("Plugin is enabled")
    })
  })

  describe("hook system", () => {
    it("should execute hooks", async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      pluginManager.hooks.register("test:event", callback1)
      pluginManager.hooks.register("test:event", callback2)

      await pluginManager.hooks.execute("test:event", "arg1", "arg2")

      expect(callback1).toHaveBeenCalledWith("arg1", "arg2")
      expect(callback2).toHaveBeenCalledWith("arg1", "arg2")
    })

    it("should execute first hook only", async () => {
      const callback1 = vi.fn().mockReturnValue("result1")
      const callback2 = vi.fn().mockReturnValue("result2")

      pluginManager.hooks.register("test:event", callback1)
      pluginManager.hooks.register("test:event", callback2)

      const result = await pluginManager.hooks.executeFirst("test:event", "arg1")

      expect(result).toBe("result1")
      expect(callback1).toHaveBeenCalledWith("arg1")
      expect(callback2).not.toHaveBeenCalled()
    })

    it("should handle hook errors gracefully", async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error("Hook error")
      })
      const successCallback = vi.fn()

      pluginManager.hooks.register("test:event", errorCallback)
      pluginManager.hooks.register("test:event", successCallback)

      const results = await pluginManager.hooks.execute("test:event")

      expect(results).toHaveLength(1) // Only successful callback result
      expect(successCallback).toHaveBeenCalled()
    })
  })

  describe("shutdown", () => {
    it("should shutdown gracefully", async () => {
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readdir.mockResolvedValue([])

      await pluginManager.initialize()
      await pluginManager.shutdown()

      expect(pluginManager.isInitialized()).toBe(false)
    })

    it("should disable all plugins during shutdown", async () => {
      const mockPlugin = {
        manifest: {
          name: "shutdown-plugin",
          version: "1.0.0",
          description: "Shutdown test plugin",
          author: "Test Author",
          main: "index.js",
          displayName: "Shutdown Plugin",
          category: PluginCategory.UTILITY,
          enabled: true,
        },
        onDisable: vi.fn(),
      }

      mockFs.stat.mockResolvedValue({ isDirectory: () => true } as any)
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPlugin.manifest))
      mockFs.access.mockResolvedValue(undefined)
      mockFs.readdir.mockResolvedValue([])

      vi.doMock(
        path.join(testPluginDir, "shutdown-plugin", "index.js"),
        () => mockPlugin,
        { virtual: true }
      )

      await pluginManager.initialize()
      await pluginManager.install(path.join(testPluginDir, "shutdown-plugin"))
      await pluginManager.enable("shutdown-plugin")

      await pluginManager.shutdown()

      expect(mockPlugin.onDisable).toHaveBeenCalled()
    })
  })
})
