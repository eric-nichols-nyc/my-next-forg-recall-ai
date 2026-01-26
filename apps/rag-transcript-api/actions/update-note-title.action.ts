"use server";

import { database } from "@repo/prisma-neon";
import { z } from "zod";
import { getAuthenticatedUser } from "./auth.action";

const UpdateNoteTitleInput = z.object({
  noteId: z.string().uuid(),
  title: z.string().min(1, "Title cannot be empty"),
});

export async function updateNoteTitle(
  input: z.infer<typeof UpdateNoteTitleInput>
) {
  const { noteId, title } = UpdateNoteTitleInput.parse(input);
  const user = await getAuthenticatedUser();

  // Verify the note belongs to the authenticated user
  const note = await database.note.findUnique({
    where: { id: noteId },
    select: { ownerId: true },
  });

  if (!note) {
    throw new Error("Note not found");
  }

  if (note.ownerId !== user.id) {
    throw new Error("Unauthorized");
  }

  // Update the note title
  await database.note.update({
    where: { id: noteId },
    data: { title },
  });

  return { success: true };
}
