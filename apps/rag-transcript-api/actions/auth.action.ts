"use server";

type User = {
  id: string;
  email?: string;
  [key: string]: unknown;
};

export async function getAuthenticatedUser(): Promise<User> {
  const { getSession } = await import("@repo/neon-auth");
  try {
    const sessionResult = await getSession();
    const user = sessionResult.user;
    if (!user) {
      throw new Error("Unauthorized");
    }
    return user as User;
  } catch (error) {
    console.error("Error getting session:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      throw error;
    }
    throw new Error("Failed to verify authentication.");
  }
}
