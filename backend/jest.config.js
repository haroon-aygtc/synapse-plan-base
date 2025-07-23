module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: [
    "**/*.(t|j)s",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/*.config.js",
    "!**/coverage/**",
  ],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  roots: ["<rootDir>/apps/", "<rootDir>/libs/"],
  moduleNameMapping: {
    "^@shared/(.*)$": "<rootDir>/libs/shared/src/$1",
    "^@database/(.*)$": "<rootDir>/libs/database/src/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  testTimeout: 30000,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
};
