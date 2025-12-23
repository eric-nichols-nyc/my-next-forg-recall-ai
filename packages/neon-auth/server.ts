import "server-only";
import { neonAuth } from "@neondatabase/neon-js/auth/next";

export async function getSession() {
  return await neonAuth();
}

