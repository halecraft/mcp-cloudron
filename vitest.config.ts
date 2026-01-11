import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/helpers/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          testTimeout: 30000,
          // Run integration tests sequentially to avoid race conditions
          // when multiple tests operate on the same Cloudron instance
          fileParallelism: false,
        },
      },
    ],
  },
})
