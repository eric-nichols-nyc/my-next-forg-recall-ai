# @repo/vitest-config

Shared Vitest configuration for the monorepo. This package provides base configurations that can be extended by apps and packages.

## Installation

This package is part of the monorepo workspace and is automatically available to all apps and packages.

## Usage

### For React/Next.js Apps

Import and extend the `reactConfig` for apps that use React:

```typescript
// vitest.config.ts
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
  },
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
```

### For Node.js Packages

Import and extend the `sharedConfig` for packages that don't use React:

```typescript
// vitest.config.ts
import { sharedConfig } from "@repo/vitest-config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  ...sharedConfig,
  test: {
    ...sharedConfig.test,
    include: ["**/*.test.ts", "**/__tests__/**/*.ts"],
  },
});
```

## Available Configurations

### `sharedConfig`

Base configuration for Node.js environments:
- `globals: true` - Enables global test functions (describe, it, expect, etc.)
- `environment: "node"` - Node.js test environment
- Coverage configuration with v8 provider
- Standard test file patterns

### `reactConfig`

Configuration for React/Next.js apps:
- Extends `sharedConfig`
- `environment: "jsdom"` - Browser-like environment for React components
- Same coverage and globals settings

## Test Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Example Test File

```typescript
import { describe, it, expect } from "vitest";

describe("My Feature", () => {
  it("should work correctly", () => {
    expect(true).toBe(true);
  });
});
```

## Related Packages

- `@repo/typescript-config` - Shared TypeScript configuration

