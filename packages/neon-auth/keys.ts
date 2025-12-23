import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      NEON_AUTH_BASE_URL: z.string().url().optional(),
    },
    client: {
      NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
    },
    runtimeEnv: {
      NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    },
  });

