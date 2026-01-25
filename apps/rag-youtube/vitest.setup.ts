import "@testing-library/react";
import { vi } from "vitest";

// Mock server-only to prevent import errors in test environment
vi.mock("server-only", () => ({}));

// Mock Next.js server modules
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

// Mock Neon auth
vi.mock("@neondatabase/neon-js/auth/next", () => ({
  neonAuth: vi.fn(),
}));

// Add global test setup here
// For example, MSW server setup, global mocks, etc.

