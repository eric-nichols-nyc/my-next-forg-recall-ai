"use server";

import { database } from "@repo/prisma-neon";
import { z } from "zod";
import { getAuthenticatedUser } from "./auth.action";

const DeleteInput = z.object({
  sourceId: z.string().uuid(),
});

export async function deleteTranscript(input: z.infer<typeof DeleteInput>) {
  const { sourceId } = DeleteInput.parse(input);
  const user = await getAuthenticatedUser();

  // Verify the source belongs to the user
  const source = await database.source.findFirst({
    where: {
      id: sourceId,
      ownerId: user.id,
      type: "youtube",
    },
  });

  if (!source) {
    throw new Error("Transcript not found or unauthorized");
  }

  // Delete chunks first (no cascade relationship)
  await database.chunk.deleteMany({
    where: {
      sourceId,
      ownerId: user.id,
    },
  });

  // Delete the source (cascade will delete related Note and SourceText)
  await database.source.delete({
    where: {
      id: sourceId,
    },
  });

  return { success: true };
}
