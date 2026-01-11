import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    server: "src/server.ts",
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  shims: false,
  splitting: false,
  sourcemap: false,
  target: "node18",
  outDir: "dist",
})
