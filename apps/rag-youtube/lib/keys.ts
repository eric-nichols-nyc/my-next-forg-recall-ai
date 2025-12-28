import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-").optional(),
      OPENAI_API_KEY: z.string().startsWith("sk-").optional(),
      DATABASE_URL: z.string().url().optional(),
    },
    runtimeEnv: {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });

