import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parse } from "dotenv"
import { defineConfig } from "vitest/config"

// Load .env into a plain object so vitest can inject it via `test.env`.
// Using dotenv directly (instead of the dotenv-cli wrapper) means every
// vitest invocation picks up the file — CLI runs, IDE runners, and debug
// sessions alike — without needing a script wrapper.
function loadDotenv(file: string): Record<string, string> {
  try {
    return parse(readFileSync(resolve(process.cwd(), file)))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {}
    throw err
  }
}

const dotenv = { ...loadDotenv(".env"), ...loadDotenv(".env.local") }

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: dotenv,
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
