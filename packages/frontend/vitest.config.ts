import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@medical-crm/shared": resolve(__dirname, "../shared/src"),
    },
  },
})