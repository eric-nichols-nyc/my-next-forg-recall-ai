"use client";

import { AuthView } from "@neondatabase/neon-js/auth/react/ui";

export function AuthViewWrapper({ path }: { path: string }) {
  return <AuthView path={path} />;
}

