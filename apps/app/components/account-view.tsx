"use client";

import { AccountView } from "@neondatabase/neon-js/auth/react/ui";

export function AccountViewWrapper({ path }: { path: string }) {
  return <AccountView path={path} />;
}

