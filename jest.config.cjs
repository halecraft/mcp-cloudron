/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  projects: [
    {
      displayName: "unit",
      testMatch: ["<rootDir>/tests/**/*.test.ts"],
      testPathIgnorePatterns: ["/integration/"],
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
      transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
      },
    },
    {
      displayName: "integration",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      testTimeout: 30000,
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
      transform: {
        "^.+\\.ts$": ["ts-jest", { useESM: true }],
      },
    },
  ],
}
