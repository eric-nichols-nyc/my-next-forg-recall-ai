import { defineConfig } from "vitest/config";

/**
 * Shared Vitest configuration for the monorepo
 * Apps and packages can extend this base config
 */
export const sharedConfig = defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/__tests__/**",
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
      ],
    },
  },
});

/**
 * Base config for React/Next.js apps
 */
export const reactConfig = defineConfig({
  test: {
    ...sharedConfig.test,
    environment: "jsdom",
  },
});
