"use server";

import { database } from "@repo/prisma-neon";
import { getAuthenticatedUser } from "./auth.action";

export async function getUserTranscripts() {
  const user = await getAuthenticatedUser();

  const transcripts = await database.source.findMany({
    where: {
      ownerId: user.id,
      type: "youtube",
    },
    include: {
      notes: {
        select: {
          id: true,
          title: true,
          summaryMd: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return transcripts.map((transcript) => ({
    id: transcript.id,
    url: transcript.url,
    title: transcript.title,
    createdAt: transcript.createdAt,
    note: transcript.notes
      ? {
          id: transcript.notes.id,
          title: transcript.notes.title,
          summaryMd: transcript.notes.summaryMd,
          createdAt: transcript.notes.createdAt,
        }
      : null,
  }));
}
