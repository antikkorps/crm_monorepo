import { resolve } from "path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    // Run tests sequentially to avoid database conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Disable file parallelism to ensure sequential execution
    fileParallelism: false,
    // Increase timeout for database operations
    testTimeout: 10000,
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "dist/**",
        "src/__tests__/**",
        "src/migrations/**",
        "src/seeders/**",
        "src/scripts/**",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/index.ts",
      ],
      include: ["src/**/*.ts"],
      // Target 70-80% coverage
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
})
