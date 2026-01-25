import { reactConfig } from "@repo/vitest-config";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  ...reactConfig,
  plugins: [react()],
  test: {
    ...reactConfig.test,
    include: ["__tests__/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    // Use node environment for API route tests (they use node: built-ins)
    environmentMatchGlobs: [
      ["__tests__/api/**", "node"],
      ["app/api/**/*.test.*", "node"],
    ],
    coverage: {
      ...reactConfig.test?.coverage,
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/__tests__/**",
        "**/node_modules/**",
        "**/.next/**",
        "**/dist/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
  optimizeDeps: {
    exclude: ["@neondatabase/neon-js"],
  },
});
