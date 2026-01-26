"use server";

import { database } from "@repo/prisma-neon";

type User = {
  id: string;
  email?: string;
  [key: string]: unknown;
};

async function getAuthenticatedUser(): Promise<User> {
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

export type NoteData = {
  id: string;
  sourceId: string;
  title: string;
  summaryMd: string;
  createdAt: Date;
  url: string | null;
};

export async function getNoteById(noteId: string): Promise<NoteData | null> {
  try {
    const user = await getAuthenticatedUser();

    const note = await database.note.findUnique({
      where: { id: noteId },
      include: { source: true },
    });

    if (!note) {
      return null;
    }

    // Verify the note belongs to the authenticated user
    if (note.ownerId !== user.id) {
      return null;
    }

    return {
      id: note.id,
      sourceId: note.sourceId,
      title: note.title ?? note.source?.title ?? "Untitled Note",
      summaryMd: note.summaryMd,
      createdAt: note.createdAt,
      url: note.source?.url ?? null,
    };
  } catch (error) {
    console.error("Error fetching note:", error);
    return null;
  }
}
