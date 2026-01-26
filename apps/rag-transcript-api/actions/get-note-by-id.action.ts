"use server";

import { database } from "@repo/prisma-neon";
import { getAuthenticatedUser } from "./auth.action";

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
