import { toNextJsHandler } from "@neondatabase/neon-auth-next";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
if (!baseUrl) {
  throw new Error("NEON_AUTH_BASE_URL environment variable is not set");
}

export const { GET, POST } = toNextJsHandler(baseUrl);
