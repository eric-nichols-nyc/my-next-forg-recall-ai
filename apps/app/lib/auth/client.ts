"use client";

import {
  createNeonAuthClient,
  type NeonAuthClient,
} from "@repo/neon-auth/client";

export const authClient: NeonAuthClient = createNeonAuthClient();
