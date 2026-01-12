import { defineConfig } from "@halecraft/verify"

export default defineConfig({
  tasks: [
    {
      key: "format",
      run: "./node_modules/.bin/biome check --write --error-on-warnings .",
      parser: "biome",
    },
    {
      key: "types",
      parser: "tsc",
      reportingDependsOn: ["format"],
      children: [
        {
          key: "types:app",
          run: "./node_modules/.bin/tsgo --noEmit --skipLibCheck",
          parser: "tsc",
        },
        {
          key: "types:test",
          run: "./node_modules/.bin/tsgo --noEmit --skipLibCheck -p tests/tsconfig.json",
          parser: "tsc",
        },
      ],
    },
    {
      key: "test",
      run: "./node_modules/.bin/vitest run --project unit",
      parser: "vitest",
      reportingDependsOn: ["format", "types"],
    },
  ],
})
